import { useState } from 'react'
import { useMeeting } from '../store/MeetingContext'
import { formatFileSize, formatDuration } from '../utils'
import { MediaFile, Speaker } from '../types'
import { generateMeetingFromMedia } from '../data/generator'

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#22c55e', '#0ea5e9']
const ROLES = ['培训讲师', '销售主管', '团队负责人', '产品经理', '技术顾问', '客户代表', '其他']

function InputPage() {
  const {
    meeting, setMeeting, setCurrentPage,
    allHistoryMeetings, switchToMeeting, deleteHistoryMeeting,
    createNewMeeting, saveCurrentToHistory, isSaving, lastSavedAt
  } = useMeeting()
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processPhase, setProcessPhase] = useState('')
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
        path: 'C:/Meetings/' + Date.now() + '.mp4',
        name: '会议录音_' + Date.now() + '.mp4',
        type: 'video',
        size: 80_000_000 + Math.floor(Math.random() * 120_000_000),
        duration: 600 + Math.floor(Math.random() * 2400)
      }
      setMeeting(prev => ({ ...prev, mediaFile: mockFile }))
    }
  }

  const processFile = async (filePath: string) => {
    const name = filePath.split(/[/\\]/).pop() || ''
    const ext = name.split('.').pop()?.toLowerCase() || ''
    const type = ['mp4', 'mov', 'avi', 'mkv'].includes(ext) ? 'video' : 'audio'
    const size = 20_000_000 + Math.floor(Math.random() * 300_000_000)
    const duration = 480 + Math.floor(Math.random() * 3600)
    const file: MediaFile = { path: filePath, name, type, size, duration }
    setMeeting(prev => ({
      ...prev,
      mediaFile: file,
      title: name.replace(/\.[^.]+$/, '')
    }))
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
        duration: 600 + Math.floor(Math.random() * 2400)
      }
      setMeeting(prev => ({
        ...prev,
        mediaFile,
        title: file.name.replace(/\.[^.]+$/, '')
      }))
    }
  }

  const handleRemoveMedia = () => {
    setMeeting(prev => ({ ...prev, mediaFile: null }))
  }

  const handleProcessAI = () => {
    if (!meeting.mediaFile) return
    setIsProcessing(true)
    setProgress(0)
    const phases = [
      '正在提取音频特征...',
      '正在进行语音转写...',
      '正在识别发言人...',
      '正在切分会议议题...',
      '正在提取客户问题...',
      '正在生成评分报告...',
      '正在整理分析结果...'
    ]
    let phaseIdx = 0
    setProcessPhase(phases[0])
    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + 3
        const newPhaseIdx = Math.min(Math.floor(next / (100 / phases.length)), phases.length - 1)
        if (newPhaseIdx !== phaseIdx) {
          phaseIdx = newPhaseIdx
          setProcessPhase(phases[phaseIdx])
        }
        if (next >= 100) {
          clearInterval(timer)
          setTimeout(() => {
            const generated = generateMeetingFromMedia(meeting.mediaFile!, meeting.title, meeting.date)
            setMeeting({
              ...generated,
              id: `m_${Date.now()}`,
              title: meeting.title || meeting.mediaFile?.name?.replace(/\.[^.]+$/, '') || generated.title,
              date: meeting.date || generated.date,
              description: meeting.description || generated.description,
              objectives: meeting.objectives.length > 0 ? meeting.objectives : generated.objectives,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
            setIsProcessing(false)
            setProgress(0)
            setTimeout(() => setCurrentPage('transcript'), 400)
          }, 400)
          return 100
        }
        return next
      })
    }, 120)
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>会议录入</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>导入会议录音或视频，填写会议基本信息，开始 AI 智能分析</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastSavedAt && (
            <span style={{ fontSize: 12, color: isSaving ? '#f59e0b' : '#22c55e' }}>
              {isSaving ? '💾 正在保存...' : `✅ 已保存 ${lastSavedAt}`}
            </span>
          )}
          <button className="btn btn-outline btn-sm" onClick={createNewMeeting}>
            ＋ 新建会议
          </button>
          <button className="btn btn-secondary btn-sm" onClick={saveCurrentToHistory}>
            💾 立即保存
          </button>
        </div>
      </div>

      {allHistoryMeetings.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <h2 className="card-title">🕒 历史会议（共 {allHistoryMeetings.length} 个）</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {allHistoryMeetings.slice(0, 8).map(m => (
              <div
                key={m.id}
                style={{
                  padding: 14, borderRadius: 10, border: m.id === meeting.id ? '2px solid #6366f1' : '1px solid #e2e8f0',
                  background: m.id === meeting.id ? '#eef2ff' : '#fff', cursor: 'pointer', transition: 'all 0.2s'
                }}
                onClick={() => switchToMeeting(m.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.title}>
                    {m.title || '未命名会议'}
                  </div>
                  {m.id === meeting.id && <span className="tag tag-primary" style={{ marginLeft: 6 }}>当前</span>}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{m.date}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                    <span style={{ color: '#6366f1', fontWeight: 600 }}>{m.score?.overall || 0}分</span>
                    <span style={{ color: '#94a3b8' }}>{formatDuration(m.transcripts?.length > 0 ? m.transcripts[m.transcripts.length - 1].endTime : 0)}</span>
                    <span style={{ color: '#94a3b8' }}>{m.topics?.length || 0}议题</span>
                  </div>
                  <button
                    className="clip-icon-btn"
                    title="删除"
                    style={{ color: '#ef4444' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`确定删除会议"${m.title}"吗？`)) {
                        deleteHistoryMeeting(m.id)
                      }
                    }}
                  >🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
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
                {meeting.mediaFile.type === 'video' ? '视频文件' : '音频文件'} · {formatFileSize(meeting.mediaFile.size)}
                {meeting.mediaFile.duration ? ` · 时长约 ${formatDuration(meeting.mediaFile.duration)}` : ''}
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
                  <span style={{ fontSize: 14, color: '#64748b' }}>{processPhase}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#6366f1' }}>{progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-primary" onClick={handleProcessAI}>
                  🚀 开始 AI 分析
                </button>
                <button className="btn btn-secondary" onClick={() => setCurrentPage('transcript')}>
                  跳过，直接查看
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
            <div className="empty-desc">AI 分析后会自动识别发言人，您也可以手动添加</div>
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
