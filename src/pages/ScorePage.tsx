import { useState, useMemo, useEffect } from 'react'
import { useMeeting } from '../store/MeetingContext'
import { getScoreLevel, formatDuration, formatDate, formatTimeRange } from '../utils'
import { Meeting } from '../types'

type CompareTab = 'scores' | 'speakers' | 'interruptions'

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
  const [compareMeetingIds, setCompareMeetingIds] = useState<Set<string>>(new Set())
  const [compareTab, setCompareTab] = useState<CompareTab>('scores')

  useEffect(() => {
    setObjectiveState(meeting.objectives.map(() => true))
  }, [meeting.id, meeting.objectives.length])

  const { level, desc } = getScoreLevel(meeting.score.overall)

  const toggleCompareMeeting = (id: string) => {
    setCompareMeetingIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= 3) {
          alert('最多选择 3 场会议进行对比')
          return prev
        }
        next.add(id)
      }
      return next
    })
  }

  const compareMeetings: Meeting[] = useMemo(() => {
    const list: Meeting[] = []
    if (compareMeetingIds.size > 0) {
      allHistoryMeetings.forEach(m => {
        if (compareMeetingIds.has(m.id)) list.push(m)
      })
      if (compareMeetingIds.has(meeting.id) && !list.find(m => m.id === meeting.id)) {
        list.push(meeting)
      }
    }
    return list.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  }, [meeting, allHistoryMeetings, compareMeetingIds])

  const bestScore = compareMeetings.length > 0
    ? Math.max(...compareMeetings.map(d => d.score?.overall || 0))
    : meeting.score.overall
  const avgScore = compareMeetings.length > 0
    ? Math.round(compareMeetings.reduce((s, d) => s + (d.score?.overall || 0), 0) / compareMeetings.length)
    : meeting.score.overall
  const isBest = compareMeetings.length > 1 && meeting.score.overall >= bestScore

  const objectiveProgress = objectiveState.filter(Boolean).length

  const getScoreColor = (score: number, maxScore: number) => {
    const pct = score / maxScore
    if (pct >= 0.9) return '#22c55e'
    if (pct >= 0.75) return '#6366f1'
    if (pct >= 0.6) return '#f59e0b'
    return '#ef4444'
  }

  const getMeetingStats = (m: Meeting) => {
    const totalDuration = m.transcripts.length > 0 ? m.transcripts[m.transcripts.length - 1].endTime : 0
    const interruptionCount = m.transcripts.filter(t => t.isInterruption).length
    const silenceDuration = m.transcripts.filter(t => t.isSilence).reduce((s, t) => s + (t.endTime - t.startTime), 0)
    const speakerStats = new Map<string, number>()
    m.transcripts.forEach(t => {
      if (t.isSilence) return
      const current = speakerStats.get(t.speakerId) || 0
      speakerStats.set(t.speakerId, current + (t.endTime - t.startTime))
    })
    const totalSpeak = Array.from(speakerStats.values()).reduce((s, v) => s + v, 0)
    return { totalDuration, interruptionCount, silenceDuration, speakerStats, totalSpeak }
  }

  const previousMeeting = compareMeetings.length >= 2
    ? compareMeetings[compareMeetings.length - 2]
    : null

  const calculateImprovements = () => {
    if (!previousMeeting) return null
    const currentStats = getMeetingStats(meeting)
    const prevStats = getMeetingStats(previousMeeting)
    const scoreDiff = (meeting.score?.overall || 0) - (previousMeeting.score?.overall || 0)
    const interruptionDiff = currentStats.interruptionCount - prevStats.interruptionCount
    const silenceDiff = currentStats.silenceDuration - prevStats.silenceDuration

    const improvements: { category: string; current: number; prev: number; diff: number; unit: string; isBetter: boolean }[] = []
    improvements.push({
      category: '综合评分',
      current: meeting.score?.overall || 0,
      prev: previousMeeting.score?.overall || 0,
      diff: scoreDiff,
      unit: '分',
      isBetter: scoreDiff >= 0
    })
    meeting.score.items.forEach(item => {
      const prevItem = previousMeeting.score.items.find(p => p.id === item.id)
      if (prevItem) {
        const diff = item.score - prevItem.score
        improvements.push({
          category: item.name,
          current: item.score,
          prev: prevItem.score,
          diff,
          unit: '分',
          isBetter: diff >= 0
        })
      }
    })
    improvements.push({
      category: '打断次数',
      current: currentStats.interruptionCount,
      prev: prevStats.interruptionCount,
      diff: interruptionDiff,
      unit: '次',
      isBetter: interruptionDiff <= 0
    })
    improvements.push({
      category: '沉默时长',
      current: currentStats.silenceDuration,
      prev: prevStats.silenceDuration,
      diff: silenceDiff,
      unit: '秒',
      isBetter: silenceDiff <= 0
    })
    return improvements
  }

  const improvements = calculateImprovements()

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

  const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b']

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

      {showHistorySelector && (
        <div className="card" style={{ marginTop: 16, marginBottom: 20 }}>
          <div className="card-header" style={{ marginBottom: 12 }}>
            <h2 className="card-title">🕒 选择要对比的会议（共 {allHistoryMeetings.length + 1} 个）</h2>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 1.7 }}>
              💡 点击非当前卡片可切换会议；<strong>☑️ 勾选</strong>可加入对比（最多 3 场）。
              当前会议也需要<strong className="text-primary">主动勾选</strong>才会参与对比。
              已选 <span style={{ color: '#6366f1', fontWeight: 600 }}>{compareMeetingIds.size}</span> 场
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {(() => {
              const currentIsInHistory = allHistoryMeetings.some(m => m.id === meeting.id)
              const listToRender: Meeting[] = []
              if (!currentIsInHistory) listToRender.push(meeting)
              listToRender.push(...allHistoryMeetings)
              return listToRender.map(m => {
                const isCurrent = m.id === meeting.id
                const isSelected = compareMeetingIds.has(m.id)
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      if (!isCurrent) switchToMeeting(m.id)
                    }}
                    style={{
                      padding: 12, borderRadius: 8, cursor: isCurrent ? 'default' : 'pointer',
                      border: isCurrent ? '2px solid #6366f1' : isSelected ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
                      background: isCurrent ? 'linear-gradient(135deg,#eef2ff,#f5f3ff)' : isSelected ? '#f5f3ff' : '#fff',
                      transition: 'all 0.2s', position: 'relative'
                    }}
                  >
                    {isCurrent && !currentIsInHistory && (
                      <div style={{ position: 'absolute', top: -8, right: 8, padding: '2px 8px', fontSize: 11, background: '#6366f1', color: '#fff', borderRadius: 8 }}>
                        当前会议（未保存）
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation()
                            toggleCompareMeeting(m.id)
                          }}
                          style={{ width: 16, height: 16 }}
                        />
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={m.title}>
                          {m.title || '未命名会议'}
                        </div>
                      </div>
                      {isCurrent && currentIsInHistory && <span className="tag tag-primary" style={{ marginLeft: 6, fontSize: 11 }}>当前</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{m.date}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                      <span style={{ color: '#6366f1', fontWeight: 600 }}>{m.score?.overall || 0} 分</span>
                      <span style={{ color: '#94a3b8' }}>{formatDuration(m.transcripts?.length > 0 ? m.transcripts[m.transcripts.length - 1].endTime : 0)}</span>
                      <span style={{ color: '#94a3b8' }}>{m.topics?.length || 0} 议题</span>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
          {compareMeetingIds.size > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                📌 已勾选 {compareMeetingIds.size} 场，下方对比面板将<strong>只展示这些会议</strong>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setCompareMeetingIds(new Set())}>
                清空对比选择
              </button>
            </div>
          )}
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
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>对比会议</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#1e293b' }}>{compareMeetings.length} 场</div>
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

      {improvements && compareMeetings.length >= 2 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h2 className="card-title">📈 相比上一场「{previousMeeting?.title || '上一场会议'}」变化分析</h2>
            <span className="tag tag-info">{compareMeetings.length} 场会议对比</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {improvements.map((imp, idx) => (
              <div
                key={imp.category}
                style={{
                  padding: 14, borderRadius: 10,
                  background: imp.isBetter ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${imp.isBetter ? '#bbf7d0' : '#fecaca'}`
                }}
              >
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{imp.category}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: imp.isBetter ? '#15803d' : '#b91c1c' }}>
                    {imp.category === '沉默时长' ? formatDuration(imp.current) : imp.current}
                  </div>
                  <div style={{ fontSize: 13, color: imp.isBetter ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                    {imp.diff >= 0 ? '+' : ''}{imp.category === '沉默时长' ? formatDuration(imp.diff) : `${imp.diff}${imp.unit}`}
                    {imp.isBetter ? ' ✅' : ' ⚠️'}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  上一场：{imp.category === '沉默时长' ? formatDuration(imp.prev) : `${imp.prev}${imp.unit}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <h2 className="card-title">📊 多会议对比分析</h2>
          <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 8 }}>
            {[
              { key: 'scores', label: '📈 评分维度对比' },
              { key: 'speakers', label: '👥 发言占比对比' },
              { key: 'interruptions', label: '⚠️ 打断/沉默对比' }
            ].map(tab => (
              <button
                key={tab.key}
                className={`btn ${compareTab === tab.key ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setCompareTab(tab.key as CompareTab)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="tag tag-info">共 {compareMeetings.length} 场会议</span>
        </div>

        {compareMeetings.length < 2 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <div className="empty-title">暂无足够的历史对比数据</div>
            <div className="empty-desc">分析并保存 2 个以上会议后，或在上方勾选要对比的会议，将在这里显示多维度对比</div>
          </div>
        ) : (
          <>
            {compareTab === 'scores' && (
              <>
                <div className="history-compare" style={{ marginBottom: 24 }}>
                  {compareMeetings.map((d, di) => (
                    <div key={d.id} className="history-bar-item">
                      <div
                        className={`history-bar ${d.id === meeting.id ? 'current' : ''}`}
                        style={{
                          height: `${((d.score?.overall || 0) / 100) * 180 + 40}px`,
                          background: d.id === meeting.id ? 'linear-gradient(180deg, #6366f1, #4f46e5)' : `linear-gradient(180deg, ${COLORS[di % COLORS.length]}, ${COLORS[(di + 1) % COLORS.length]})`
                        }}
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

                <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#475569', minWidth: 100 }}>评分维度</th>
                        {compareMeetings.map(m => (
                          <th key={m.id} style={{ textAlign: 'center', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: m.id === meeting.id ? '#6366f1' : '#475569', minWidth: 90 }}>
                            {m.id === meeting.id ? '本次' : (m.title || '未命名').slice(0, 6)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#fafafa' }}>
                        <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 600 }}>综合评分</td>
                        {compareMeetings.map(m => (
                          <td key={m.id} style={{ textAlign: 'center', padding: '10px 14px', fontSize: 16, fontWeight: 700, color: getScoreColor(m.score?.overall || 0, 100) }}>
                            {m.score?.overall || 0}
                          </td>
                        ))}
                      </tr>
                      {meeting.score.items.map(item => {
                        const maxVal = Math.max(...compareMeetings.map(m => m.score.items.find(i => i.id === item.id)?.score || 0))
                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 14px', fontSize: 14 }}>{item.name}</td>
                            {compareMeetings.map(m => {
                              const s = m.score.items.find(i => i.id === item.id)
                              const val = s?.score || 0
                              const isMax = val === maxVal && maxVal > 0
                              const barWidth = maxVal > 0 ? (val / maxVal) * 80 : 0
                              return (
                                <td key={m.id} style={{ textAlign: 'center', padding: '10px 14px', fontSize: 14, fontWeight: isMax ? 700 : 400, color: isMax ? '#15803d' : '#475569' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: barWidth + '%', height: 6, borderRadius: 3, background: isMax ? '#22c55e' : '#cbd5e1', minWidth: 4 }} />
                                    <span>{val}{isMax && ' ★'}</span>
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {compareTab === 'speakers' && (
              <div>
                {compareMeetings.map((m, mi) => {
                  const stats = getMeetingStats(m)
                  return (
                    <div key={m.id} className="card" style={{ marginBottom: 12, background: mi === compareMeetings.length - 1 ? '#eef2ff' : '#fff' }}>
                      <div className="card-header">
                        <h3 style={{ margin: 0, fontSize: 15 }}>
                          {m.id === meeting.id ? '📌 本次' : '📅'} {m.title}
                          <span style={{ marginLeft: 8, fontSize: 12, color: '#94a3b8', fontWeight: 400 }}>{m.date}</span>
                        </h3>
                      </div>
                      <div style={{ padding: '0 16px 16px' }}>
                        {m.speakers.length === 0 ? (
                          <div style={{ color: '#94a3b8', fontSize: 13 }}>暂无发言人数据</div>
                        ) : (
                          m.speakers.map(s => {
                            const duration = stats.speakerStats.get(s.id) || 0
                            const percent = stats.totalSpeak > 0 ? (duration / stats.totalSpeak) * 100 : 0
                            return (
                              <div key={s.id} className="speaker-stat">
                                <div className="speaker-avatar" style={{ background: s.color }}>
                                  {s.name.slice(0, 1)}
                                </div>
                                <div className="speaker-info">
                                  <div className="speaker-name">{s.name}</div>
                                  <div className="speaker-role">{s.role || '未设置'}</div>
                                </div>
                                <div className="speaker-duration">
                                  <div className="speaker-duration-value">{formatDuration(duration)} ({percent.toFixed(1)}%)</div>
                                  <div className="speaker-duration-bar">
                                    <div className="speaker-duration-fill" style={{ width: `${percent}%`, background: s.color }} />
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {compareTab === 'interruptions' && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#475569' }}>会议</th>
                      <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#475569' }}>总时长</th>
                      <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#475569' }}>打断次数</th>
                      <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#475569' }}>沉默时长</th>
                      <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#475569' }}>沉默占比</th>
                      <th style={{ textAlign: 'center', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#475569' }}>综合评分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareMeetings.map(m => {
                      const stats = getMeetingStats(m)
                      const silenceRatio = stats.totalDuration > 0 ? ((stats.silenceDuration / stats.totalDuration) * 100).toFixed(1) : '0'
                      const interruptionColor = stats.interruptionCount > 3 ? '#ef4444' : stats.interruptionCount > 1 ? '#f59e0b' : '#22c55e'
                      const silenceColor = parseFloat(silenceRatio) > 10 ? '#f59e0b' : '#22c55e'
                      return (
                        <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', background: m.id === meeting.id ? '#eef2ff' : 'transparent' }}>
                          <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: m.id === meeting.id ? 600 : 400 }}>
                            {m.id === meeting.id ? '📌 ' : ''}{m.title || '未命名会议'}
                          </td>
                          <td style={{ textAlign: 'center', padding: '10px 14px', fontSize: 14, color: '#64748b' }}>{formatDuration(stats.totalDuration)}</td>
                          <td style={{ textAlign: 'center', padding: '10px 14px', fontSize: 14, fontWeight: 600, color: interruptionColor }}>
                            {stats.interruptionCount} 次
                            {stats.interruptionCount > 3 && ' ⚠️'}
                          </td>
                          <td style={{ textAlign: 'center', padding: '10px 14px', fontSize: 14, color: silenceColor }}>{formatDuration(stats.silenceDuration)}</td>
                          <td style={{ textAlign: 'center', padding: '10px 14px', fontSize: 14, fontWeight: 600, color: silenceColor }}>{silenceRatio}%</td>
                          <td style={{ textAlign: 'center', padding: '10px 14px', fontSize: 14, fontWeight: 600, color: getScoreColor(m.score?.overall || 0, 100) }}>
                            {m.score?.overall || 0}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {compareMeetings.length >= 2 && (
                  <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>💡 趋势分析</div>
                    <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.8 }}>
                      {compareMeetings.length >= 2 && (() => {
                        const first = getMeetingStats(compareMeetings[0])
                        const last = getMeetingStats(compareMeetings[compareMeetings.length - 1])
                        const trend = []
                        if (last.interruptionCount < first.interruptionCount) {
                          trend.push(`✅ 打断次数从 ${first.interruptionCount} 次减少到 ${last.interruptionCount} 次，沟通秩序有所改善`)
                        } else if (last.interruptionCount > first.interruptionCount) {
                          trend.push(`⚠️ 打断次数从 ${first.interruptionCount} 次增加到 ${last.interruptionCount} 次，建议关注会议秩序`)
                        }
                        if (last.silenceDuration < first.silenceDuration) {
                          trend.push(`✅ 沉默时长从 ${formatDuration(first.silenceDuration)} 减少到 ${formatDuration(last.silenceDuration)}，沟通效率提升`)
                        } else if (last.silenceDuration > first.silenceDuration) {
                          trend.push(`⚠️ 沉默时长从 ${formatDuration(first.silenceDuration)} 增加到 ${formatDuration(last.silenceDuration)}，建议加强互动`)
                        }
                        if (trend.length === 0) trend.push('ℹ️ 各项指标保持稳定，继续保持')
                        return trend.map((t, i) => <div key={i}>• {t}</div>)
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 20, overflowX: 'auto' }}>
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
                  {compareMeetings.map(d => {
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
