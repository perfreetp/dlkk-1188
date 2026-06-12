import { useState, useMemo } from 'react'
import { useMeeting } from '../store/MeetingContext'
import { getScoreLevel, formatDuration, formatDate } from '../utils'

function ScorePage() {
  const { meeting, setMeeting, historicalMeetings, updateManualReview } = useMeeting()
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingScore, setEditingScore] = useState<{ id: string; score: number; comment: string } | null>(null)
  const [objectiveState, setObjectiveState] = useState<boolean[]>(() => meeting.objectives.map(() => true))

  const { level, desc } = getScoreLevel(meeting.score.overall)

  const historicalData = useMemo(() => {
    const history = [...historicalMeetings].slice(-3)
    return [
      ...history.map(h => ({
        id: h.id,
        title: h.title,
        date: h.date,
        score: h.overallScore,
        duration: h.duration,
        topics: h.topicsCount,
        current: false
      })),
      {
        id: meeting.id,
        title: meeting.title,
        date: meeting.date,
        score: meeting.score.overall,
        duration: meeting.transcripts.length > 0 ? meeting.transcripts[meeting.transcripts.length - 1].endTime : 0,
        topics: meeting.topics.length,
        current: true
      }
    ]
  }, [meeting, historicalMeetings])

  const bestScore = Math.max(...historicalData.map(d => d.score))
  const avgScore = Math.round(historicalData.reduce((s, d) => s + d.score, 0) / historicalData.length)
  const isBest = meeting.score.overall >= bestScore

  const objectiveProgress = objectiveState.filter(Boolean).length

  const getScoreColor = (score: number, maxScore: number) => {
    const pct = score / maxScore
    if (pct >= 0.9) return '#22c55e'
    if (pct >= 0.75) return '#6366f1'
    if (pct >= 0.6) return '#f59e0b'
    return '#ef4444'
  }

  const handleScoreChange = (id: string, delta: number) => {
    setMeeting(prev => {
      const items = prev.score.items.map(item => {
        if (item.id !== id) return item
        const newScore = Math.max(0, Math.min(item.maxScore, item.score + delta))
        return { ...item, score: newScore }
      })
      const totalWeighted = items.reduce((sum, item) => sum + (item.score / item.maxScore) * item.weight * 100, 0)
      return {
        ...prev,
        score: {
          ...prev.score,
          items,
          overall: Math.round(totalWeighted),
          totalWeighted
        }
      }
    })
  }

  const toggleObjective = (idx: number) => {
    setObjectiveState(prev => {
      const next = [...prev]
      next[idx] = !next[idx]
      return next
    })
  }

  const handleOpenEdit = (id: string, score: number, comment: string) => {
    setEditingScore({ id, score, comment })
    setShowEditModal(true)
  }

  const handleSaveEdit = () => {
    if (!editingScore) return
    setMeeting(prev => {
      const items = prev.score.items.map(item => {
        if (item.id !== editingScore.id) return item
        return { ...item, score: Math.max(0, Math.min(item.maxScore, editingScore.score)), comment: editingScore.comment }
      })
      const totalWeighted = items.reduce((sum, item) => sum + (item.score / item.maxScore) * item.weight * 100, 0)
      return {
        ...prev,
        score: {
          ...prev.score,
          items,
          overall: Math.round(totalWeighted),
          totalWeighted
        }
      }
    })
    setShowEditModal(false)
    setEditingScore(null)
  }

  return (
    <div>
      <h1 className="page-title">会议评分</h1>
      <p className="page-subtitle">多维度评估会议质量，对比历史表现，输出专业点评</p>

      <div className="score-overview">
        <div className="score-circle">
          <div className="score-number">{meeting.score.overall}</div>
          <div className="score-label">综合评分</div>
        </div>
        <div className="score-insights">
          <div className="score-level">
            {level}
            {isBest && <span className="tag tag-success" style={{ marginLeft: 10 }}>🏆 历史最佳</span>}
          </div>
          <div className="score-desc">{desc}</div>
          <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>历史平均分</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#1e293b' }}>{avgScore}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>历史最高分</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#22c55e' }}>{bestScore}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>目标完成</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#6366f1' }}>{objectiveProgress}/{meeting.objectives.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">目标清晰度</div>
          <div className="stat-value">{Math.round(meeting.score.items.find(i => i.id === 'si1')?.score || 0)}</div>
          <div className="stat-trend up">权重 {(meeting.score.items.find(i => i.id === 'si1')?.weight || 0) * 100}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">需求挖掘深度</div>
          <div className="stat-value">{Math.round(meeting.score.items.find(i => i.id === 'si2')?.score || 0)}</div>
          <div className="stat-trend up">权重 {(meeting.score.items.find(i => i.id === 'si2')?.weight || 0) * 100}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">方案匹配度</div>
          <div className="stat-value">{Math.round(meeting.score.items.find(i => i.id === 'si3')?.score || 0)}</div>
          <div className="stat-trend up">权重 {(meeting.score.items.find(i => i.id === 'si3')?.weight || 0) * 100}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">推进明确度</div>
          <div className="stat-value">{Math.round(meeting.score.items.find(i => i.id === 'si6')?.score || 0)}</div>
          <div className="stat-trend up">权重 {(meeting.score.items.find(i => i.id === 'si6')?.weight || 0) * 100}%</div>
        </div>
      </div>

      <div className="two-column">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📊 详细评分</h2>
          </div>
          <div>
            {meeting.score.items.map(item => (
              <div key={item.id}>
                <div className="score-item-row">
                  <div className="score-item-name">{item.name}</div>
                  <div className="score-item-bar">
                    <div
                      className="score-item-fill"
                      style={{
                        width: `${(item.score / item.maxScore) * 100}%`,
                        background: `linear-gradient(90deg, ${getScoreColor(item.score - 1, item.maxScore)}, ${getScoreColor(item.score, item.maxScore)})`
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      className="clip-icon-btn"
                      onClick={() => handleScoreChange(item.id, -0.5)}
                    >−</button>
                    <span className="score-item-value">{item.score}/{item.maxScore}</span>
                    <button
                      className="clip-icon-btn"
                      onClick={() => handleScoreChange(item.id, 0.5)}
                    >+</button>
                    <button
                      className="clip-icon-btn"
                      title="编辑评语"
                      onClick={() => handleOpenEdit(item.id, item.score, item.comment)}
                    >✎</button>
                  </div>
                </div>
                {item.comment && (
                  <div className="score-item-comment">💡 {item.comment}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h2 className="card-title">🎯 会议目标达成</h2>
            </div>
            {meeting.objectives.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎯</div>
                <div className="empty-title">未设置会议目标</div>
                <div className="empty-desc">前往录入页添加会议目标</div>
              </div>
            ) : (
              meeting.objectives.map((obj, idx) => (
                <div key={idx} className="objective-item">
                  <input
                    type="checkbox"
                    className="objective-check"
                    checked={objectiveState[idx]}
                    onChange={() => toggleObjective(idx)}
                  />
                  <span className="objective-text" style={{ textDecoration: objectiveState[idx] ? 'none' : 'line-through', opacity: objectiveState[idx] ? 1 : 0.5, color: objectiveState[idx] ? '#1e293b' : '#94a3b8' }}>
                    {obj || `目标 ${idx + 1}`}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">📝 人工点评</h2>
            </div>
            <textarea
              className="form-textarea"
              style={{ minHeight: 160 }}
              placeholder="请输入对本次会议的整体评价、亮点总结、待改进点..."
              value={meeting.manualReview}
              onChange={(e) => updateManualReview(e.target.value)}
            />
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['会前准备充分', '沟通节奏良好', '需求挖掘到位', '异议处理专业', '客户反馈积极', '推进清晰有力'].map(tag => (
                <button
                  key={tag}
                  className="tag tag-default"
                  style={{ cursor: 'pointer', padding: '4px 12px' }}
                  onClick={() => updateManualReview(meeting.manualReview ? `${meeting.manualReview}，${tag}` : tag)}
                >+ {tag}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h2 className="card-title">📈 历史表现对比</h2>
        </div>

        <div className="history-compare">
          {historicalData.map(d => (
            <div key={d.id} className="history-bar-item">
              <div
                className={`history-bar ${d.current ? 'current' : ''}`}
                style={{ height: `${(d.score / 100) * 180 + 40}px` }}
              >
                <strong>{d.score}</strong>
              </div>
              <div className="history-bar-label">
                <div style={{ fontWeight: d.current ? 600 : 400, color: d.current ? '#6366f1' : '#475569' }}>
                  {d.current ? '本次' : formatDate(d.date).slice(5)}
                </div>
                <div style={{ fontSize: 11, marginTop: 2 }}>{d.title.slice(0, 6)}...</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#475569' }}>会议</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#475569' }}>日期</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#475569' }}>时长</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#475569' }}>议题数</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#475569' }}>评分</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#475569' }}>对比</th>
              </tr>
            </thead>
            <tbody>
              {historicalData.map(d => {
                const diff = d.score - avgScore
                return (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9', background: d.current ? '#eef2ff' : 'transparent' }}>
                    <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: d.current ? 600 : 400 }}>
                      {d.title} {d.current && <span className="tag tag-primary" style={{ marginLeft: 8 }}>本次</span>}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 14, color: '#64748b' }}>{d.date}</td>
                    <td style={{ padding: '10px 14px', fontSize: 14, color: '#64748b' }}>{formatDuration(d.duration)}</td>
                    <td style={{ padding: '10px 14px', fontSize: 14, color: '#64748b' }}>{d.topics} 个</td>
                    <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 600, color: getScoreColor(d.score, 100) }}>{d.score}</td>
                    <td style={{ padding: '10px 14px', fontSize: 14 }}>
                      <span className={`stat-trend ${diff >= 0 ? 'up' : 'down'}`}>
                        {diff >= 0 ? '↑' : '↓'} {Math.abs(diff)} 分 vs 均值
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showEditModal && editingScore && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: 480 }}>
            <div className="card-header">
              <h2 className="card-title">✎ 编辑评分项</h2>
            </div>
            <div className="form-group">
              <label className="form-label">评分（0-10）</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={editingScore.score}
                  onChange={(e) => setEditingScore({ ...editingScore, score: parseFloat(e.target.value) })}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: 24, fontWeight: 700, color: '#6366f1', width: 60, textAlign: 'center' }}>{editingScore.score}</span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">评语</label>
              <textarea
                className="form-textarea"
                style={{ minHeight: 100 }}
                placeholder="输入评分理由和建议..."
                value={editingScore.comment}
                onChange={(e) => setEditingScore({ ...editingScore, comment: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScorePage
