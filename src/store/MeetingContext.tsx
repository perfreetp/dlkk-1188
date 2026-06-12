import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { Meeting, PageType, Clip, HistoricalMeeting } from '../types'
import { createMockMeeting } from '../data/mockData'

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
  isSaving: boolean
  lastSavedAt: string | null
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

  const historicalMeetings: HistoricalMeeting[] = allHistoryMeetings.map(meetingToHistorical)

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

  return (
    <MeetingContext.Provider value={{
      currentPage, setCurrentPage,
      meeting, setMeeting,
      historicalMeetings, allHistoryMeetings,
      loadHistory, createNewMeeting, switchToMeeting, deleteHistoryMeeting, saveCurrentToHistory,
      addClip, toggleFavorite, deleteClip, updateManualReview,
      isSaving, lastSavedAt
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
