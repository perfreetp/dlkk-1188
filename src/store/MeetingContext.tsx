import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { Meeting, PageType, Clip, HistoricalMeeting, TranscriptSegment, Topic, CustomerQuestion, FollowUpAction, MeetingScore } from '../types'
import { createMockMeeting } from '../data/mockData'
import { regenerateFromTranscripts, RegeneratedData, listDiffFields } from '../utils/aiRegenerate'

export interface PendingChanges {
  regeneratedAt: string
  data: RegeneratedData
  acceptedTopics: Set<string>
  acceptedQuestions: Set<string>
  acceptedFollowUps: Set<string>
  acceptedScore: boolean
}

interface MeetingContextType {
  currentPage: PageType
  setCurrentPage: (page: PageType) => void
  meeting: Meeting
  setMeeting: React.Dispatch<React.SetStateAction<Meeting>>
  historicalMeetings: HistoricalMeeting[]
  allHistoryMeetings: Meeting[]
  loadHistory: () => Promise<void>
  createNewMeeting: () => void
  switchToMeeting: (meetingId: string) => Promise<void>
  deleteHistoryMeeting: (meetingId: string) => Promise<void>
  saveCurrentToHistory: () => Promise<void>
  addClip: (clip: Omit<Clip, 'id' | 'createdAt'>) => void
  toggleFavorite: (clipId: string) => void
  deleteClip: (clipId: string) => void
  updateManualReview: (review: string) => void
  updateTranscriptSegment: (segmentId: string, updates: Partial<TranscriptSegment>) => void
  recalculateMeetingStats: () => void
  isSaving: boolean
  lastSavedAt: string | null
  pendingChanges: PendingChanges | null
  triggerRegenerate: () => void
  acceptAllPending: () => void
  discardAllPending: () => void
  acceptPartialPending: (options: {
    topicIds?: string[]
    questionIds?: string[]
    followUpIds?: string[]
    score?: boolean
  }) => void
}

const MeetingContext = createContext<MeetingContextType | null>(null)

function meetingToHistorical(m: Meeting): HistoricalMeeting {
  const duration = m.transcripts.length > 0 ? m.transcripts[m.transcripts.length - 1].endTime : 0
  return {
    id: m.id,
    title: m.title,
    date: m.date,
    overallScore: m.score.overall,
    duration,
    topicsCount: m.topics.length
  }
}

export function MeetingProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<PageType>('input')
  const [meeting, setMeeting] = useState<Meeting>(createMockMeeting())
  const [allHistoryMeetings, setAllHistoryMeetings] = useState<Meeting[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [pendingChanges, setPendingChanges] = useState<PendingChanges | null>(null)

  const historicalMeetings: HistoricalMeeting[] = allHistoryMeetings.map(meetingToHistorical)

  const triggerRegenerate = useCallback(() => {
    if (meeting.transcripts.length === 0) return
    const data = regenerateFromTranscripts(meeting)
    setPendingChanges({
      regeneratedAt: new Date().toLocaleString('zh-CN'),
      data,
      acceptedTopics: new Set(data.topics.map(t => t.id)),
      acceptedQuestions: new Set(data.questions.map(q => q.id)),
      acceptedFollowUps: new Set(data.followUps.map(f => f.id)),
      acceptedScore: true
    })
  }, [meeting])

  const acceptAllPending = useCallback(() => {
    if (!pendingChanges) return
    setMeeting(prev => ({
      ...prev,
      topics: pendingChanges.data.topics,
      questions: pendingChanges.data.questions,
      followUps: pendingChanges.data.followUps,
      score: pendingChanges.data.score
    }))
    setPendingChanges(null)
  }, [pendingChanges])

  const discardAllPending = useCallback(() => {
    setPendingChanges(null)
  }, [])

  const acceptPartialPending = useCallback((options: {
    topicIds?: string[]
    questionIds?: string[]
    followUpIds?: string[]
    score?: boolean
  }) => {
    if (!pendingChanges) return
    let newTopics = meeting.topics
    let newQuestions = meeting.questions
    let newFollowUps = meeting.followUps
    let newScore = meeting.score

    if (options.topicIds && options.topicIds.length > 0) {
      const topicMap = new Map(pendingChanges.data.topics.map(t => [t.id, t]))
      newTopics = meeting.topics.map(oldT => {
        if (options.topicIds!.includes(oldT.id)) {
          const nt = topicMap.get(oldT.id)
          return nt ? { ...oldT, summary: nt.summary, startTime: nt.startTime, endTime: nt.endTime }
            : oldT
        }
        return oldT
      })
    }
    if (options.questionIds && options.questionIds.length > 0) {
      newQuestions = [...meeting.questions]
      pendingChanges.data.questions.forEach(nq => {
        if (options.questionIds!.includes(nq.id)) {
          if (!newQuestions.find(x => x.id === nq.id)) newQuestions.push(nq)
        }
      })
    }
    if (options.followUpIds && options.followUpIds.length > 0) {
      newFollowUps = [...meeting.followUps]
      pendingChanges.data.followUps.forEach(nf => {
        if (options.followUpIds!.includes(nf.id)) {
          if (!newFollowUps.find(x => x.id === nf.id)) newFollowUps.push(nf)
        }
      })
    }
    if (options.score) {
      newScore = pendingChanges.data.score
    }

    setMeeting(prev => ({
      ...prev,
      topics: newTopics,
      questions: newQuestions,
      followUps: newFollowUps,
      score: newScore
    }))
    setPendingChanges(null)
  }, [pendingChanges, meeting.topics, meeting.questions, meeting.followUps, meeting.score])

  const loadHistory = useCallback(async () => {
    try {
      // @ts-ignore
      if (window.electronAPI?.loadHistoryMeetings) {
        // @ts-ignore
        const list: any[] = await window.electronAPI.loadHistoryMeetings()
        if (list && list.length > 0) {
          setAllHistoryMeetings(list as Meeting[])
        }
      }
    } catch (e) {
      console.error('加载历史会议失败', e)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const saveCurrentToHistory = useCallback(async () => {
    setIsSaving(true)
    try {
      const toSave: Meeting = {
        ...meeting,
        updatedAt: new Date().toISOString()
      }
      // @ts-ignore
      if (window.electronAPI?.saveMeetingToHistory) {
        // @ts-ignore
        const res = await window.electronAPI.saveMeetingToHistory(toSave)
        if (res?.success) {
          setAllHistoryMeetings(res.list as Meeting[])
          setLastSavedAt(new Date().toLocaleString('zh-CN'))
        }
      }
    } catch (e) {
      console.error('保存会议失败', e)
    } finally {
      setIsSaving(false)
    }
  }, [meeting])

  useEffect(() => {
    const t = setTimeout(() => {
      if (meeting && meeting.mediaFile) {
        saveCurrentToHistory()
      }
    }, 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    meeting.title, meeting.date, meeting.description, meeting.objectives,
    meeting.speakers, meeting.transcripts, meeting.topics, meeting.questions,
    meeting.followUps, meeting.score, meeting.clips, meeting.manualReview
  ])

  const createNewMeeting = useCallback(() => {
    const empty: Meeting = {
      id: `m_empty_${Date.now()}`,
      title: '',
      date: new Date().toLocaleString('zh-CN', { hour12: false }).slice(0, 16).replace(/\//g, '-'),
      description: '',
      objectives: [],
      mediaFile: null,
      speakers: [],
      transcripts: [],
      topics: [],
      questions: [],
      followUps: [],
      score: { overall: 0, items: [], totalWeighted: 0 },
      clips: [],
      manualReview: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    setMeeting(empty)
    setPendingChanges(null)
    setCurrentPage('input')
  }, [])

  const switchToMeeting = useCallback(async (meetingId: string) => {
    try {
      // @ts-ignore
      if (window.electronAPI?.getMeetingFromHistory) {
        // @ts-ignore
        const data = await window.electronAPI.getMeetingFromHistory(meetingId)
        if (data) {
          setMeeting(data as Meeting)
          setPendingChanges(null)
          setCurrentPage('transcript')
        }
      }
    } catch (e) {
      console.error('切换会议失败', e)
    }
  }, [])

  const deleteHistoryMeeting = useCallback(async (meetingId: string) => {
    try {
      // @ts-ignore
      if (window.electronAPI?.deleteMeetingFromHistory) {
        // @ts-ignore
        const res = await window.electronAPI.deleteMeetingFromHistory(meetingId)
        if (res?.success) {
          setAllHistoryMeetings(res.list as Meeting[])
          if (meeting.id === meetingId) {
            createNewMeeting()
          }
        }
      }
    } catch (e) {
      console.error('删除会议失败', e)
    }
  }, [meeting.id, createNewMeeting])

  const addClip = (clipData: Omit<Clip, 'id' | 'createdAt'>) => {
    const newClip: Clip = {
      ...clipData,
      id: `c${Date.now()}`,
      createdAt: new Date().toLocaleString('zh-CN')
    }
    setMeeting(prev => ({ ...prev, clips: [...prev.clips, newClip] }))
  }

  const toggleFavorite = (clipId: string) => {
    setMeeting(prev => ({
      ...prev,
      clips: prev.clips.map(c => c.id === clipId ? { ...c, isFavorite: !c.isFavorite } : c)
    }))
  }

  const deleteClip = (clipId: string) => {
    setMeeting(prev => ({
      ...prev,
      clips: prev.clips.filter(c => c.id !== clipId)
    }))
  }

  const updateManualReview = (review: string) => {
    setMeeting(prev => ({ ...prev, manualReview: review }))
  }

  const updateTranscriptSegment = (segmentId: string, updates: Partial<TranscriptSegment>) => {
    setMeeting(prev => {
      const newTranscripts = prev.transcripts.map(t =>
        t.id === segmentId ? { ...t, ...updates } : t
      )
      return { ...prev, transcripts: newTranscripts }
    })
  }

  const recalculateMeetingStats = useCallback(() => {
    setMeeting(prev => {
      if (prev.transcripts.length === 0) return prev
      const newTranscripts = [...prev.transcripts].sort((a, b) => a.startTime - b.startTime)
      const speakerDurations = new Map<string, number>()
      let newTopics = [...prev.topics]
      newTranscripts.forEach(t => {
        if (t.isSilence) return
        const current = speakerDurations.get(t.speakerId) || 0
        speakerDurations.set(t.speakerId, current + (t.endTime - t.startTime))
      })
      newTopics = newTopics.map(topic => {
        const relatedSegments = newTranscripts.filter(t => topic.segmentIds.includes(t.id))
        if (relatedSegments.length === 0) return topic
        const newStartTime = Math.min(...relatedSegments.map(s => s.startTime))
        const newEndTime = Math.max(...relatedSegments.map(s => s.endTime))
        return { ...topic, startTime: newStartTime, endTime: newEndTime }
      })
      return { ...prev, transcripts: newTranscripts, topics: newTopics }
    })
    setTimeout(() => triggerRegenerate(), 80)
  }, [triggerRegenerate])

  return (
    <MeetingContext.Provider value={{
      currentPage, setCurrentPage,
      meeting, setMeeting,
      historicalMeetings, allHistoryMeetings,
      loadHistory, createNewMeeting, switchToMeeting, deleteHistoryMeeting, saveCurrentToHistory,
      addClip, toggleFavorite, deleteClip, updateManualReview,
      updateTranscriptSegment, recalculateMeetingStats,
      isSaving, lastSavedAt,
      pendingChanges, triggerRegenerate, acceptAllPending, discardAllPending, acceptPartialPending
    }}>
      {children}
    </MeetingContext.Provider>
  )
}

export function useMeeting() {
  const ctx = useContext(MeetingContext)
  if (!ctx) throw new Error('useMeeting must be used within MeetingProvider')
  return ctx
}
