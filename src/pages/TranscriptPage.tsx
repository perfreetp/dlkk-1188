import { useState, useMemo } from 'react'
import { useMeeting } from '../store/MeetingContext'
import { formatDuration, formatTimeRange, getInitials } from '../utils'
import { TranscriptSegment } from '../types'

type FilterType = 'all' | 'interruption' | 'silence' | 'speaker'

function TranscriptPage() {
  const { meeting, addClip } = useMeeting()
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [showClipModal, setShowClipModal] = useState(false)
  const [clipSegment, setClipSegment] = useState<TranscriptSegment | null>(null)
  const [clipName, setClipName] = useState('')
  const [clipTags, setClipTags] = useState('')

  const speakerStats = useMemo(() => {
    const stats = new Map<string, { duration: number; count: number }>()
    meeting.transcripts.forEach(t => {
      if (t.isSilence) return
      if (!stats.has(t.speakerId)) stats.set(t.speakerId, { duration: 0, count: 0 })
      const s = stats.get(t.speakerId)!
      s.duration += (t.endTime - t.startTime)
      s.count += 1
    })
    const totalDuration = Array.from(stats.values()).reduce((sum, s) => sum + s.duration, 0)
    return { stats, totalDuration }
  }, [meeting.transcripts])

  const interruptionCount = meeting.transcripts.filter(t => t.isInterruption).length
  const silenceDuration = meeting.transcripts.filter(t => t.isSilence).reduce((sum, t) => sum + (t.endTime - t.startTime), 0)
  const totalDuration = meeting.transcripts.length > 0 ? meeting.transcripts[meeting.transcripts.length - 1].endTime : 0

  const filteredTranscripts = useMemo(() => {
    return meeting.transcripts.filter(t => {
      if (filter === 'interruption' && !t.isInterruption) return false
      if (filter === 'silence' && !t.isSilence) return false
      if (filter === 'speaker' && selectedSpeakerId && t.speakerId !== selectedSpeakerId) return false
      if (searchText && !t.text.toLowerCase().includes(searchText.toLowerCase())) return false
      return true
    })
  }, [meeting.transcripts, filter, selectedSpeakerId, searchText])

  const getSpeaker = (id: string) => meeting.speakers.find(s => s.id === id)

  const handleCreateClip = (segment: TranscriptSegment) => {
    setClipSegment(segment)
    setClipName(segment.text.slice(0, 30) + '...')
    setClipTags('')
    setShowClipModal(true)
  }

  const handleSaveClip = () => {
    if (!clipSegment || !clipName.trim()) return
    addClip({
      name: clipName.trim(),
      startTime: clipSegment.startTime,
      endTime: clipSegment.endTime,
      transcript: clipSegment.text,
      isFavorite: false,
      tags: clipTags.split(/[,，]/).map(t => t.trim()).filter(Boolean)
    })
    setShowClipModal(false)
    setClipSegment(null)
  }

  return (
    <div>
      <h1 className="page-title">AI 转写</h1>
      <p className="page-subtitle">自动语音转写、发言人识别、发言分析，支持快速定位关键片段</p>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">会议总时长</div>
          <div className="stat-value">{formatDuration(totalDuration)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">发言人数</div>
          <div className="stat-value">{meeting.speakers.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">打断次数</div>
          <div className="stat-value" style={{ color: interruptionCount > 3 ? '#ef4444' : '#1e293b' }}>{interruptionCount}</div>
          {interruptionCount > 3 && <div className="stat-trend down">⚠️ 打断次数偏多</div>}
        </div>
        <div className="stat-card">
          <div className="stat-label">沉默时长</div>
          <div className="stat-value">{formatDuration(silenceDuration)}</div>
          {silenceDuration > 30 && <div className="stat-trend down">占比 {((silenceDuration / totalDuration) * 100).toFixed(1)}%</div>}
        </div>
      </div>

      <div className="two-column">
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h2 className="card-title">📊 发言时长统计</h2>
            </div>
            <div>
              {meeting.speakers.map(speaker => {
                const stat = speakerStats.stats.get(speaker.id)
                const duration = stat?.duration || 0
                const percent = speakerStats.totalDuration > 0 ? (duration / speakerStats.totalDuration) * 100 : 0
                return (
                  <div key={speaker.id} className="speaker-stat">
                    <div className="speaker-avatar" style={{ background: speaker.color }}>
                      {getInitials(speaker.name)}
                    </div>
                    <div className="speaker-info">
                      <div className="speaker-name">{speaker.name}</div>
                      <div className="speaker-role">{speaker.role || '未设置'} · {stat?.count || 0} 次发言</div>
                    </div>
                    <div className="speaker-duration">
                      <div className="speaker-duration-value">{formatDuration(duration)}</div>
                      <div className="speaker-duration-bar">
                        <div
                          className="speaker-duration-fill"
                          style={{ width: `${percent}%`, background: speaker.color }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">⏱️ 会议时间线</h2>
            </div>
            <div className="timeline-container">
              {meeting.transcripts.map(t => {
                const width = totalDuration > 0 ? ((t.endTime - t.startTime) / totalDuration) * 100 : 0
                if (t.isSilence) {
                  return <div key={t.id} className="timeline-segment silence" style={{ width: `${width}%` }} title={`沉默 ${formatDuration(t.endTime - t.startTime)}`} />
                }
                const speaker = getSpeaker(t.speakerId)
                return (
                  <div
                    key={t.id}
                    className={`timeline-segment ${t.isInterruption ? 'interruption' : ''}`}
                    style={{
                      width: `${width}%`,
                      background: t.isInterruption ? '#ef4444' : speaker?.color || '#94a3b8'
                    }}
                    title={`${speaker?.name || '未知'}: ${t.text.slice(0, 30)}`}
                  />
                )
              })}
            </div>
            <div className="timeline-legend">
              {meeting.speakers.map(s => (
                <div key={s.id} className="legend-item">
                  <div className="legend-color" style={{ background: s.color }} />
                  <span>{s.name}</span>
                </div>
              ))}
              <div className="legend-item">
                <div className="legend-color silence" />
                <span>沉默</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: '#ef4444' }} />
                <span>打断</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📝 转写内容</h2>
            <span className="badge">{filteredTranscripts.length}</span>
          </div>

          <div className="list-filter">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => { setFilter('all'); setSelectedSpeakerId(null) }}
            >全部</button>
            <button
              className={`filter-btn ${filter === 'interruption' ? 'active' : ''}`}
              onClick={() => { setFilter('interruption'); setSelectedSpeakerId(null) }}
            >打断 ({interruptionCount})</button>
            <button
              className={`filter-btn ${filter === 'silence' ? 'active' : ''}`}
              onClick={() => { setFilter('silence'); setSelectedSpeakerId(null) }}
            >沉默</button>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {meeting.speakers.map(s => (
                <button
                  key={s.id}
                  className={`filter-btn ${filter === 'speaker' && selectedSpeakerId === s.id ? 'active' : ''}`}
                  onClick={() => { setFilter('speaker'); setSelectedSpeakerId(s.id) }}
                  style={filter === 'speaker' && selectedSpeakerId === s.id ? { background: s.color } : {}}
                >{s.name}</button>
              ))}
            </div>
            <div className="search-box">
              <input
                type="text"
                className="form-input"
                placeholder="🔍 搜索内容..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </div>

          <div className="transcript-list" style={{ maxHeight: 600, overflowY: 'auto', paddingRight: 8 }}>
            {filteredTranscripts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <div className="empty-title">没有找到匹配的内容</div>
              </div>
            ) : (
              filteredTranscripts.map(t => {
                const speaker = getSpeaker(t.speakerId)
                if (t.isSilence) {
                  return (
                    <div key={t.id} className="transcript-item silence">
                      <div className="transcript-avatar" style={{ background: '#f59e0b' }}>⏸</div>
                      <div className="transcript-body">
                        <div className="transcript-header">
                          <span className="transcript-speaker">沉默片段</span>
                          <span className="transcript-time">{formatTimeRange(t.startTime, t.endTime)} · {formatDuration(t.endTime - t.startTime)}</span>
                        </div>
                        <div className="transcript-text" style={{ fontStyle: 'italic' }}>（沉默 {formatDuration(t.endTime - t.startTime)}）</div>
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={t.id} className={`transcript-item ${t.isInterruption ? 'interruption' : ''}`}>
                    <div className="transcript-avatar" style={{ background: speaker?.color || '#94a3b8' }}>
                      {speaker ? getInitials(speaker.name) : '?'}
                    </div>
                    <div className="transcript-body">
                      <div className="transcript-header">
                        <span className="transcript-speaker">{speaker?.name || '未知发言人'}</span>
                        <span className="transcript-time">{formatTimeRange(t.startTime, t.endTime)}</span>
                        {t.isInterruption && <span className="tag tag-danger">打断</span>}
                      </div>
                      <div className="transcript-text">{t.text}</div>
                    </div>
                    <div className="transcript-indicator">
                      <button
                        className="clip-icon-btn"
                        title="收藏为素材"
                        onClick={() => handleCreateClip(t)}
                      >⭐</button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {showClipModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: 480 }}>
            <div className="card-header">
              <h2 className="card-title">⭐ 收藏为素材</h2>
            </div>
            <div className="form-group">
              <label className="form-label">片段名称</label>
              <input
                type="text" className="form-input"
                value={clipName}
                onChange={(e) => setClipName(e.target.value)}
                placeholder="给这个片段起个名字"
              />
            </div>
            <div className="form-group">
              <label className="form-label">标签（用逗号分隔）</label>
              <input
                type="text" className="form-input"
                value={clipTags}
                onChange={(e) => setClipTags(e.target.value)}
                placeholder="如：客户痛点,异议处理,最佳实践"
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowClipModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSaveClip}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TranscriptPage
