import { useState, useMemo, useEffect } from 'react'
import { useMeeting } from '../store/MeetingContext'
import { getScoreLevel, formatDuration, formatDate } from '../utils'
import { Meeting } from '../types'

function ScorePage() {
  const {
    meeting, setMeeting, allHistoryMeetings,
    switchToMeeting, updateManualReview,
    saveCurrentToHistory, isSaving, lastSavedAt
  } = useMeeting()
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingScore, setEditingScore] = useState<{ id: string; score: number; comment: string } | null>(null)
  const [objectiveState, setObjectiveState] = useState<boolean[]>(() => meeting.objectives.map(() => true))
  const [showHistorySelector, setShowHistorySelector] = useState(false)

  useEffect(() => {
    setObjectiveState(meeting.objectives.map(() => true))
  }, [meeting.id, meeting.objectives.length])

  const { level, desc } = getScoreLevel(meeting.score.overall)

  const historyForCompare: Meeting[] = useMemo(() => {
    const currentIdx = allHistoryMeetings.findIndex(m => m.id === meeting.id)
    const withoutCurrent = allHistoryMeetings.filter(m => m.id !== meeting.id)
    const recentOthers = withoutCurrent.slice(Math.max(0, withoutCurrent.length - 3))
    const list = [...recentOthers]
    if (currentIdx >= 0 || !list.find(m => m.id === meeting.id)) {
      list.push(meeting)
    }
    return list.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  }, [meeting, allHistoryMeetings])

  const bestScore = Math.max(...historyForCompare.map(d => d.score?.overall || 0))
  const avgScore = historyForCompare.length > 0
    ? Math.round(historyForCompare.reduce((s, d) => s + (d.score?.overall || 0), 0) / historyForCompare.length)
    : 0
  const isBest = meeting.score.overall >= bestScore && historyForCompare.length > 1

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            会议评分
            {allHistoryMeetings.length > 0 && (
              <button
                className="btn btn-outline btn-sm"
                style={{ marginLeft: 12, fontSize: 12, padding: '4px 12px' }}
                onClick={() => setShowHistorySelector(!showHistorySelector)}
              >
                {showHistorySelector ? '收起历史 ▲' : '查看历史会议 ▼'}
              </button>
            )}
          </h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            多维度评估会议质量，对比历史表现，输出专业点评
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastSavedAt && (
            <span style={{ fontSize: 12, color: isSaving ? '#f59e0b' : '#22c55e' }}>
              {isSaving ? '💾 正在保存...' : `✅ 已保存 ${lastSavedAt}`}
            </span>
          )}
          <button className="btn btn-secondary btn-sm" onClick={saveCurrentToHistory}>💾 立即保存</button>
        </div>
      </div>

      {showHistorySelector && allHistoryMeetings.length > 0 && (
        <div className="card" style={{ marginTop: 16, marginBottom: 20 }}>
          <div className="card-header" style={{ marginBottom: 12 }}>
            <h2 className="card-title">🕒 选择要查看/对比的会议（共 {allHistoryMeetings.length} 个）</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {allHistoryMeetings.map(m => {
              const isCurrent = m.id === meeting.id
              return (
                <div
                  key={m.id}
                  onClick={() => {
                    if (!isCurrent) switchToMeeting(m.id)
                  }}
                  style={{
                    padding: 12, borderRadius: 8, cursor: 'pointer',
                    border: isCurrent ? '2px solid #6366f1' : '1px solid #e2e8f0',
                    background: isCurrent ? '#eef2ff' : '#fff',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={m.title}>
                      {m.title || '未命名会议'}
                    </div>
                    {isCurrent && <span className="tag tag-primary" style={{ marginLeft: 6, fontSize: 11 }}>当前</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{m.date}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                    <span style={{ color: '#6366f1', fontWeight: 600 }}>{m.score?.overall || 0} 分</span>
                    <span style={{ color: '#94a3b8' }}>{formatDuration(m.transcripts?.length > 0 ? m.transcripts[m.transcripts.length - 1].endTime : 0)}</span>
                    <span style={{ color: '#94a3b8' }}>{m.topics?.length || 0} 议题</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
          <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>对比均值</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#1e293b' }}>
                {meeting.score.overall - avgScore >= 0 ? '+' : ''}{meeting.score.overall - avgScore}
                <span style={{ fontSize: 14, color: '#94a3b8', marginLeft: 4 }}>（均值 {avgScore}）</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>历史最高分</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#22c55e' }}>{bestScore}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>目标完成</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#6366f1' }}>{objectiveProgress}/{meeting.objectives.length}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>历史会议数</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#1e293b' }}>{allHistoryMeetings.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 20 }}>
        {(['si1', 'si2', 'si3', 'si6'] as const).map(id => {
          const item = meeting.score.items.find(i => i.id === id)
          if (!item) return null
          return (
            <div className="stat-card" key={id}>
              <div className="stat-label">{item.name}</div>
              <div className="stat-value">{Math.round(item.score)}</div>
              <div className="stat-trend up">权重 {(item.weight * 100).toFixed(0)}%</div>
            </div>
          )
        })}
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
                        background: `linear-gradient(90deg, ${getScoreColor(Math.max(0, item.score - 1), item.maxScore)}, ${getScoreColor(item.score, item.maxScore)})`
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button className="clip-icon-btn" onClick={() => handleScoreChange(item.id, -0.5)}>−</button>
                    <span className="score-item-value">{item.score}/{item.maxScore}</span>
                    <button className="clip-icon-btn" onClick={() => handleScoreChange(item.id, 0.5)}>+</button>
                    <button className="clip-icon-btn" title="编辑评语" onClick={() => handleOpenEdit(item.id, item.score, item.comment)}>✎</button>
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
                  <input type="checkbox" className="objective-check" checked={objectiveState[idx]} onChange={() => toggleObjective(idx)} />
                  <span className="objective-text" style={{
                    textDecoration: objectiveState[idx] ? 'none' : 'line-through',
                    opacity: objectiveState[idx] ? 1 : 0.5,
                    color: objectiveState[idx] ? '#1e293b' : '#94a3b8'
                  }}>
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
          <span className="tag tag-info">共 {historyForCompare.length} 次会议</span>
        </div>

        {historyForCompare.length < 2 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <div className="empty-title">暂无足够的历史对比数据</div>
            <div className="empty-desc">分析并保存 2 个以上会议后，将在这里显示多会议对比图表</div>
          </div>
        ) : (
          <>
            <div className="history-compare">
              {historyForCompare.map(d => (
                <div key={d.id} className="history-bar-item">
                  <div
                    className={`history-bar ${d.id === meeting.id ? 'current' : ''}`}
                    style={{ height: `${((d.score?.overall || 0) / 100) * 180 + 40}px` }}
                    title={`${d.title}：${d.score?.overall || 0} 分`}
                  >
                    <strong>{d.score?.overall || 0}</strong>
                  </div>
                  <div className="history-bar-label">
                    <div style={{ fontWeight: d.id === meeting.id ? 600 : 400, color: d.id === meeting.id ? '#6366f1' : '#475569' }}>
                      {d.id === meeting.id ? '本次' : formatDate(d.date || '').slice(5)}
                    </div>
                    <div style={{ fontSize: 11, marginTop: 2, color: '#94a3b8' }}>{(d.title || '未命名').slice(0, 6)}...</div>
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
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#475569' }}>对比均值</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#475569' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {historyForCompare.map(d => {
                    const diff = (d.score?.overall || 0) - avgScore
                    const isCurrent = d.id === meeting.id
                    return (
                      <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9', background: isCurrent ? '#eef2ff' : 'transparent' }}>
                        <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: isCurrent ? 600 : 400 }}>
                          {d.title || '未命名会议'}
                          {isCurrent && <span className="tag tag-primary" style={{ marginLeft: 8 }}>本次</span>}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 14, color: '#64748b' }}>{d.date || '-'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 14, color: '#64748b' }}>
                          {formatDuration(d.transcripts?.length > 0 ? d.transcripts[d.transcripts.length - 1].endTime : 0)}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 14, color: '#64748b' }}>{d.topics?.length || 0} 个</td>
                        <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 600, color: getScoreColor(d.score?.overall || 0, 100) }}>
                          {d.score?.overall || 0}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 14 }}>
                          <span className={`stat-trend ${diff >= 0 ? 'up' : 'down'}`}>
                            {diff >= 0 ? '↑' : '↓'} {Math.abs(diff)} 分
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 14 }}>
                          {!isCurrent && (
                            <button className="btn btn-outline btn-sm" onClick={() => switchToMeeting(d.id)}>
                              查看详情
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
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
                  type="range" min={0} max={10} step={0.5}
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
