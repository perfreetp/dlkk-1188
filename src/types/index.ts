export interface MediaFile {
  path: string
  name: string
  type: 'audio' | 'video'
  size: number
  duration?: number
}

export interface Speaker {
  id: string
  name: string
  role?: string
  color: string
}

export interface TranscriptSegment {
  id: string
  speakerId: string
  startTime: number
  endTime: number
  text: string
  isInterruption?: boolean
  isSilence?: boolean
}

export interface Topic {
  id: string
  title: string
  startTime: number
  endTime: number
  summary: string
  segmentIds: string[]
}

export interface CustomerQuestion {
  id: string
  content: string
  segmentId: string
  category: string
  priority: 'high' | 'medium' | 'low'
}

export interface FollowUpAction {
  id: string
  content: string
  responsible: string
  deadline: string
  status: 'pending' | 'in_progress' | 'completed'
}

export interface ScoreItem {
  id: string
  name: string
  score: number
  maxScore: number
  weight: number
  comment: string
}

export interface MeetingScore {
  overall: number
  items: ScoreItem[]
  totalWeighted: number
}

export interface Clip {
  id: string
  name: string
  startTime: number
  endTime: number
  transcript: string
  isFavorite: boolean
  tags: string[]
  createdAt: string
}

export interface HistoricalMeeting {
  id: string
  title: string
  date: string
  overallScore: number
  duration: number
  topicsCount: number
}

export interface Meeting {
  id: string
  title: string
  date: string
  description: string
  objectives: string[]
  mediaFile: MediaFile | null
  speakers: Speaker[]
  transcripts: TranscriptSegment[]
  topics: Topic[]
  questions: CustomerQuestion[]
  followUps: FollowUpAction[]
  score: MeetingScore
  clips: Clip[]
  manualReview: string
  createdAt: string
  updatedAt: string
}

export type PageType = 'input' | 'transcript' | 'review' | 'score' | 'material'
