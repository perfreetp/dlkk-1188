import { useState } from 'react'
import { useMeeting } from '../store/MeetingContext'
import { formatFileSize } from '../utils'
import { MediaFile, Speaker } from '../types'

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#22c55e', '#0ea5e9']
const ROLES = ['培训讲师', '销售主管', '团队负责人', '产品经理', '技术顾问', '客户代表', '其他']

function InputPage() {
  const { meeting, setMeeting, setCurrentPage } = useMeeting()
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [newSpeakerName, setNewSpeakerName] = useState('')
  const [newSpeakerRole, setNewSpeakerRole] = useState('')

  const handleFileSelect = async () => {
    try {
      // @ts-ignore
      const filePath: string | null = await window.electronAPI?.selectMediaFile()
      if (filePath) {
        await processFile(filePath)
      }
    } catch {
      const mockFile: MediaFile = {
        path: 'C:/Meetings/Q3客户合作方案沟通会.mp4',
        name: 'Q3客户合作方案沟通会.mp4',
        type: 'video',
        size: 125_000_000,
        duration: 430
      }
      setMeeting(prev => ({ ...prev, mediaFile: mockFile }))
    }
  }

  const processFile = async (filePath: string) => {
    const name = filePath.split(/[/\\]/).pop() || ''
    const ext = name.split('.').pop()?.toLowerCase() || ''
    const type = ['mp4', 'mov', 'avi', 'mkv'].includes(ext) ? 'video' : 'audio'
    const file: MediaFile = {
      path: filePath,
      name,
      type,
      size: Math.floor(Math.random() * 200_000_000) + 10_000_000,
      duration: Math.floor(Math.random() * 3000) + 600
    }
    setMeeting(prev => ({ ...prev, mediaFile: file }))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      const type = ['mp4', 'mov', 'avi', 'mkv'].includes(ext) ? 'video' : 'audio'
      const mediaFile: MediaFile = {
        path: file.name,
        name: file.name,
        type,
        size: file.size,
        duration: 430
      }
      setMeeting(prev => ({ ...prev, mediaFile }))
    }
  }

  const handleRemoveMedia = () => {
    setMeeting(prev => ({ ...prev, mediaFile: null }))
  }

  const handleProcessAI = () => {
    setIsProcessing(true)
    setProgress(0)
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer)
          setIsProcessing(false)
          setTimeout(() => setCurrentPage('transcript'), 300)
          return 100
        }
        return prev + 5
      })
    }, 100)
  }

  const handleAddSpeaker = () => {
    if (!newSpeakerName.trim()) return
    const newSpeaker: Speaker = {
      id: `s${Date.now()}`,
      name: newSpeakerName.trim(),
      role: newSpeakerRole || undefined,
      color: COLORS[meeting.speakers.length % COLORS.length]
    }
    setMeeting(prev => ({ ...prev, speakers: [...prev.speakers, newSpeaker] }))
    setNewSpeakerName('')
    setNewSpeakerRole('')
  }

  const handleRemoveSpeaker = (id: string) => {
    setMeeting(prev => ({ ...prev, speakers: prev.speakers.filter(s => s.id !== id) }))
  }

  const handleObjectiveChange = (index: number, value: string) => {
    setMeeting(prev => {
      const objectives = [...prev.objectives]
      objectives[index] = value
      return { ...prev, objectives }
    })
  }

  const handleAddObjective = () => {
    setMeeting(prev => ({ ...prev, objectives: [...prev.objectives, ''] }))
  }

  const handleRemoveObjective = (index: number) => {
    setMeeting(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index)
    }))
  }

  return (
    <div>
      <h1 className="page-title">会议录入</h1>
      <p className="page-subtitle">导入会议录音或视频，填写会议基本信息，开始 AI 智能分析</p>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📁 会议媒体文件</h2>
        </div>

        {!meeting.mediaFile ? (
          <div
            className={`upload-area ${isDragging ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={handleFileSelect}
          >
            <div className="upload-icon">🎬</div>
            <div className="upload-title">点击或拖拽上传音视频文件</div>
            <div className="upload-desc">支持 MP3、WAV、M4A、MP4、MOV、AVI、MKV 格式，最大 2GB</div>
          </div>
        ) : (
          <div className="media-info">
            <div className="media-icon">{meeting.mediaFile.type === 'video' ? '🎬' : '🎵'}</div>
            <div className="media-details">
              <div className="media-name">{meeting.mediaFile.name}</div>
              <div className="media-meta">
                {meeting.mediaFile.type === 'video' ? '视频文件' : '音频文件'} · {formatFileSize(meeting.mediaFile.size)} · 时长约 7 分 10 秒
              </div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={handleRemoveMedia}>更换文件</button>
          </div>
        )}

        {meeting.mediaFile && (
          <div style={{ marginTop: 20 }}>
            {isProcessing ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 14, color: '#64748b' }}>
                    AI 正在分析音频内容...</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#6366f1' }}>{progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
                  {progress < 30 ? '正在提取音频特征...' : progress < 60 ? '正在语音转写...' : progress < 90 ? '正在分析对话内容...' : '正在生成分析结果...'}
                </div>
              </div>
            ) : (
                <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-primary" onClick={handleProcessAI}>
                  🚀 开始 AI 分析
                </button>
                <button className="btn btn-secondary" onClick={() => setCurrentPage('transcript')}>
                  跳过，使用示例数据
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📋 会议基本信息</h2>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">会议主题</label>
            <input
              type="text" className="form-input"
              value={meeting.title}
              onChange={(e) => setMeeting(prev => ({ ...prev, title: e.target.value }))}
              placeholder="请输入会议主题"
            />
          </div>
          <div className="form-group">
            <label className="form-label">会议时间</label>
            <input
              type="text" className="form-input"
              value={meeting.date}
              onChange={(e) => setMeeting(prev => ({ ...prev, date: e.target.value }))}
              placeholder="如：2024-01-15 10:00"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">会议描述</label>
          <textarea
            className="form-textarea"
            value={meeting.description}
            onChange={(e) => setMeeting(prev => ({ ...prev, description: e.target.value }))}
            placeholder="简要描述本次会议的背景和目的"
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">🎯 会议目标</h2>
          <button className="btn btn-outline btn-sm" onClick={handleAddObjective}>+ 添加目标</button>
        </div>

        {meeting.objectives.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <div className="empty-title">还没有设置会议目标</div>
            <div className="empty-desc">点击上方按钮添加会议目标，后续 AI 将基于目标评估会议达成度</div>
          </div>
        ) : (
          meeting.objectives.map((obj, idx) => (
            <div key={idx} className="objective-item">
              <span style={{ fontSize: 14, fontWeight: 600, color: '#6366f1', marginTop: 10 }}>{idx + 1}.</span>
              <input
                type="text" className="form-input"
                value={obj}
                onChange={(e) => handleObjectiveChange(idx, e.target.value)}
                placeholder="请输入会议目标"
              />
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleRemoveObjective(idx)}
                style={{ color: '#ef4444' }}
              >
                删除
              </button>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">👥 参会人员</h2>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input
            type="text" className="form-input"
            style={{ flex: 1 }}
            placeholder="姓名"
            value={newSpeakerName}
            onChange={(e) => setNewSpeakerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSpeaker()}
          />
          <select
            className="form-select"
            style={{ width: 160 }}
            value={newSpeakerRole}
            onChange={(e) => setNewSpeakerRole(e.target.value)}
          >
            <option value="">选择角色</option>
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
          <button className="btn btn-primary" onClick={handleAddSpeaker}>添加</button>
        </div>

        {meeting.speakers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <div className="empty-title">还没有添加参会人员</div>
            <div className="empty-desc">AI 会自动识别发言人，您也可以手动添加后进行修正</div>
          </div>
        ) : (
          <div>
            {meeting.speakers.map(speaker => (
              <div key={speaker.id} className="speaker-stat">
                <div className="speaker-avatar" style={{ background: speaker.color }}>
                  {speaker.name.charAt(0)}
                </div>
                <div className="speaker-info">
                  <div className="speaker-name">{speaker.name}</div>
                  <div className="speaker-role">{speaker.role || '未设置角色'}</div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => handleRemoveSpeaker(speaker.id)}>
                  移除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default InputPage
