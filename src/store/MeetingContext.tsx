import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Meeting, PageType, Clip } from '../types'
import { createMockMeeting, mockHistoricalMeetings } from '../data/mockData'

interface MeetingContextType {
  currentPage: PageType
  setCurrentPage: (page: PageType) => void
  meeting: Meeting
  setMeeting: React.Dispatch<React.SetStateAction<Meeting>>
  historicalMeetings: typeof mockHistoricalMeetings
  addClip: (clip: Omit<Clip, 'id' | 'createdAt'>) => void
  toggleFavorite: (clipId: string) => void
  deleteClip: (clipId: string) => void
  updateManualReview: (review: string) => void
}

const MeetingContext = createContext<MeetingContextType | null>(null)

export function MeetingProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<PageType>('input')
  const [meeting, setMeeting] = useState<Meeting>(createMockMeeting())
  const historicalMeetings = mockHistoricalMeetings

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
      currentPage, setCurrentPage, meeting, setMeeting,
      historicalMeetings, addClip, toggleFavorite, deleteClip, updateManualReview
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
