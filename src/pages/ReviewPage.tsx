import { useState, useMemo } from 'react'
import { useMeeting } from '../store/MeetingContext'
import { formatDuration, formatTimeRange } from '../utils'
import { CustomerQuestion, FollowUpAction } from '../types'
import { listDiffFields } from '../utils/aiRegenerate'

type TabType = 'topics' | 'questions' | 'followups' | 'checklist'
type DiffTab = 'topics' | 'questions' | 'followups' | 'score'

const FOLLOWUP_SUGGESTIONS = [
  '发送会议纪要给所有参会人员确认',
  '整理客户需求清单，同步给产品团队评估',
  '准备下一次会议的演示材料和方案',
  '内部复盘会议表现，整理可优化点',
  '跟进客户反馈的问题并给出书面回复',
  '协调相关资源，确保项目按时推进'
]

const REVIEW_CHECKLIST = [
  { id: 'r1', text: '会议目标是否清晰传达？', category: '会前准备' },
  { id: 'r2', text: '参会人员是否都做了充分准备？', category: '会前准备' },
  { id: 'r3', text: '客户核心需求是否充分挖掘？', category: '会议过程' },
  { id: 'r4', text: '是否存在过多偏离主题的讨论？', category: '会议过程' },
  { id: 'r5', text: '打断次数是否控制在合理范围？', category: '会议过程' },
  { id: 'r6', text: '沉默/等待时间是否过长？', category: '会议过程' },
  { id: 'r7', text: '客户异议是否都得到妥善回应？', category: '会议过程' },
  { id: 'r8', text: '是否明确了下一步行动和责任人？', category: '会议收尾' },
  { id: 'r9', text: '是否约定了下一次沟通的时间？', category: '会议收尾' },
  { id: 'r10', text: '会议纪要是否已及时发送？', category: '会后跟进' }
]

const SCRIPT_TEMPLATES = [
  {
    title: '会后跟进邮件',
    content: `尊敬的{clientName}：\n\n感谢您今天抽出宝贵时间与我们沟通。通过本次会议，我们深入了解了贵公司在{painPoint}方面的需求。\n\n针对您提到的几个核心问题，我们整理如下：\n{questions}\n\n后续我们将在{deadline}前准备好详细的方案，计划于{nextMeeting}安排上门演示。\n\n如有任何疑问，请随时与我联系。\n\n此致\n{myName}`
  },
  {
    title: '异议处理话术',
    content: `关于您提到的"{question}"这个问题，我非常理解您的顾虑。\n\n实际上，我们已有很多同行业客户也遇到过类似情况。他们通过{solution}，成功实现了{benefit}。\n\n具体来说，我们可以从以下几个方面来解决：\n1. ...\n2. ...\n3. ...\n\n您看这样的思路是否符合您的预期？`
  },
  {
    title: '下次会议邀约',
    content: `{clientName}您好，\n\n继上次沟通后，我们已根据您的需求准备好了定制化方案。\n\n想和您确认下{date}是否方便，我们安排一次详细的方案演示，预计{duration}，将涵盖：\n- 方案整体架构\n- 针对贵司痛点的功能亮点\n- 实施计划和时间安排\n- 成功案例分享\n\n如时间不合适，请告知您方便的时段。\n\n期待与您进一步交流！\n\n{myName}`
  }
]

function ReviewPage() {
  const {
    meeting, setMeeting, saveCurrentToHistory, isSaving, lastSavedAt, setCurrentPage,
    pendingChanges, triggerRegenerate, acceptAllPending, discardAllPending, acceptPartialPending
  } = useMeeting()

  const [activeTab, setActiveTab] = useState<TabType>('topics')
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({})
  const [expandedTopic, setExpandedTopic] = useState<string | null>(meeting.topics[0]?.id || null)
  const [showScriptModal, setShowScriptModal] = useState(false)
  const [selectedScript, setSelectedScript] = useState(SCRIPT_TEMPLATES[0])
  const [newFollowUp, setNewFollowUp] = useState('')
  const [newResponsible, setNewResponsible] = useState('')
  const [newDeadline, setNewDeadline] = useState('')

  const [showDiffModal, setShowDiffModal] = useState(false)
  const [diffTab, setDiffTab] = useState<DiffTab>('topics')
  const [selTopicIds, setSelTopicIds] = useState<Set<string>>(new Set())
  const [selQuestionIds, setSelQuestionIds] = useState<Set<string>>(new Set())
  const [selFollowUpIds, setSelFollowUpIds] = useState<Set<string>>(new Set())
  const [selScore, setSelScore] = useState(true)

  const topicDiff = useMemo(() => {
    if (!pendingChanges) return null
    return listDiffFields(meeting.topics, pendingChanges.data.topics, 'id')
  }, [pendingChanges, meeting.topics])

  const questionDiff = useMemo(() => {
    if (!pendingChanges) return null
    return listDiffFields(meeting.questions, pendingChanges.data.questions, 'id')
  }, [pendingChanges, meeting.questions])

  const followUpDiff = useMemo(() => {
    if (!pendingChanges) return null
    return listDiffFields(meeting.followUps, pendingChanges.data.followUps, 'id')
  }, [pendingChanges, meeting.followUps])

  const scoreDiff = useMemo(() => {
    if (!pendingChanges) return null
    const oldItems = meeting.score.items
    const newItems = pendingChanges.data.score.items
    const changed: Array<{ id: string; name: string; oldScore: number; newScore: number }> = []
    oldItems.forEach(oi => {
      const ni = newItems.find(x => x.id === oi.id)
      if (ni && Math.abs(ni.score - oi.score) > 0.1) {
        changed.push({ id: oi.id, name: oi.name, oldScore: oi.score, newScore: ni.score })
      }
    })
    return {
      oldOverall: meeting.score.overall,
      newOverall: pendingChanges.data.score.overall,
      changed
    }
  }, [pendingChanges, meeting.score])

  const openDiffModal = () => {
    if (!pendingChanges) return
    setSelTopicIds(new Set(pendingChanges.data.topics.map(t => t.id)))
    setSelQuestionIds(new Set(pendingChanges.data.questions.map(q => q.id)))
    setSelFollowUpIds(new Set(pendingChanges.data.followUps.map(f => f.id)))
    setSelScore(true)
    setShowDiffModal(true)
  }

  const toggleId = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setter(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handlePartialAccept = () => {
    acceptPartialPending({
      topicIds: Array.from(selTopicIds),
      questionIds: Array.from(selQuestionIds),
      followUpIds: Array.from(selFollowUpIds),
      score: selScore
    })
    setShowDiffModal(false)
  }

  const toggleChecklist = (id: string) => {
    setChecklistState(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const completedCount = Object.values(checklistState).filter(Boolean).length

  const getPriorityColor = (p: CustomerQuestion['priority']) => {
    if (p === 'high') return 'tag-danger'
    if (p === 'medium') return 'tag-warning'
    return 'tag-info'
  }

  const getStatusStyle = (s: FollowUpAction['status']) => {
    if (s === 'completed') return { bg: '#dcfce7', color: '#15803d', text: '已完成' }
    if (s === 'in_progress') return { bg: '#fef3c7', color: '#b45309', text: '进行中' }
    return { bg: '#e0f2fe', color: '#0369a1', text: '待处理' }
  }

  const handleAddFollowUp = () => {
    if (!newFollowUp.trim()) return
    const item: FollowUpAction = {
      id: `f${Date.now()}`,
      content: newFollowUp.trim(),
      responsible: newResponsible || '未指派',
      deadline: newDeadline || '待定',
      status: 'pending'
    }
    setMeeting(prev => ({ ...prev, followUps: [...prev.followUps, item] }))
    setNewFollowUp('')
    setNewResponsible('')
    setNewDeadline('')
  }

  const toggleFollowUpStatus = (id: string) => {
    setMeeting(prev => ({
      ...prev,
      followUps: prev.followUps.map(f => {
        if (f.id !== id) return f
        const order: FollowUpAction['status'][] = ['pending', 'in_progress', 'completed']
        const idx = order.indexOf(f.status)
        return { ...f, status: order[(idx + 1) % order.length] }
      })
    }))
  }

  const groupedChecklist = REVIEW_CHECKLIST.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, typeof REVIEW_CHECKLIST>)

  const renderDiffBadge = (status: string) => {
    if (status === 'added') return <span className="tag tag-success" style={{ fontSize: 11 }}>新增</span>
    if (status === 'removed') return <span className="tag tag-danger" style={{ fontSize: 11 }}>移除</span>
    if (status === 'changed') return <span className="tag tag-warning" style={{ fontSize: 11 }}>变更</span>
    return null
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>智能复盘</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>AI 自动切分议题、提取客户问题、生成跟进话术，辅助全面复盘</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastSavedAt && (
            <span style={{ fontSize: 12, color: isSaving ? '#f59e0b' : '#22c55e' }}>
              {isSaving ? '💾 正在保存...' : `✅ 已保存 ${lastSavedAt}`}
            </span>
          )}
          {meeting.transcripts.length > 0 && (
            <button className="btn btn-outline btn-sm" onClick={() => triggerRegenerate()}>
              🔄 重新 AI 分析
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={saveCurrentToHistory}>💾 立即保存</button>
        </div>
      </div>

      {pendingChanges && meeting.transcripts.length > 0 && (
        <div
          style={{
            marginTop: 16,
            padding: '14px 18px',
            background: 'linear-gradient(135deg, #fef3c7, #fff7ed)',
            border: '1px solid #fdba74',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280 }}>
            <span style={{ fontSize: 28 }}>🤖</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#92400e', marginBottom: 2 }}>
                发现基于最新转写的 AI 分析结果（{pendingChanges.regeneratedAt}）
              </div>
              <div style={{ fontSize: 12, color: '#b45309' }}>
                {topicDiff && (topicDiff.added.length + topicDiff.changedId.length) > 0 && `议题 ${topicDiff.added.length + topicDiff.changedId.length} 处变更 · `}
                {questionDiff && questionDiff.added.length > 0 && `新增问题 ${questionDiff.added.length} 条 · `}
                {followUpDiff && followUpDiff.added.length > 0 && `新增跟进 ${followUpDiff.added.length} 项 · `}
                {scoreDiff && scoreDiff.changed.length > 0 && `评分 ${scoreDiff.changed.length} 项调整`}
                请先预览差异再决定是否应用
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={() => discardAllPending()}>
              保留原内容
            </button>
            <button className="btn btn-primary btn-sm" onClick={openDiffModal}>
              🔍 预览差异并确认
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => acceptAllPending()}>
              全部接受
            </button>
          </div>
        </div>
      )}
      <div style={{ marginTop: 16 }} />

      {meeting.transcripts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="empty-icon" style={{ fontSize: 64 }}>📋</div>
          <div className="empty-title" style={{ fontSize: 20, marginBottom: 8 }}>暂无可复盘的会议数据</div>
          <div className="empty-desc" style={{ color: '#64748b', marginBottom: 24, maxWidth: 500, margin: '0 auto' }}>
            请先在录入页上传会议录音或视频，AI 分析完成后即可进行智能复盘
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => setCurrentPage('input')}>
              📝 前往录入页
            </button>
            {meeting.mediaFile && (
              <button className="btn btn-outline" onClick={() => setCurrentPage('input')}>
                🔄 开始 AI 分析
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="tab-bar">
              <button className={`tab-item ${activeTab === 'topics' ? 'active' : ''}`} onClick={() => setActiveTab('topics')}>
                📑 议题切分 ({meeting.topics.length})
              </button>
              <button className={`tab-item ${activeTab === 'questions' ? 'active' : ''}`} onClick={() => setActiveTab('questions')}>
                ❓ 客户问题 ({meeting.questions.length})
              </button>
              <button className={`tab-item ${activeTab === 'followups' ? 'active' : ''}`} onClick={() => setActiveTab('followups')}>
                📋 跟进事项 ({meeting.followUps.length})
              </button>
              <button className={`tab-item ${activeTab === 'checklist' ? 'active' : ''}`} onClick={() => setActiveTab('checklist')}>
                ✅ 复盘清单 ({completedCount}/{REVIEW_CHECKLIST.length})
              </button>
              <div style={{ flex: 1 }} />
              <button className="btn btn-primary btn-sm" onClick={() => setShowScriptModal(true)}>
                💬 生成跟进话术
              </button>
            </div>

            {activeTab === 'topics' && (
              <div>
                <div className="grid-4" style={{ marginBottom: 20 }}>
                  <div className="stat-card">
                    <div className="stat-label">议题数量</div>
                    <div className="stat-value">{meeting.topics.length}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">平均议题时长</div>
                    <div className="stat-value">
                      {meeting.topics.length > 0
                        ? formatDuration(Math.round(meeting.topics.reduce((s, t) => s + (t.endTime - t.startTime), 0) / meeting.topics.length))
                        : formatDuration(0)}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">最长议题</div>
                    <div className="stat-value" style={{ fontSize: 16 }}>
                      {meeting.topics.length > 0
                        ? meeting.topics.reduce((a, b) => (a.endTime - a.startTime) > (b.endTime - b.startTime) ? a : b).title.slice(0, 8) + '...'
                        : '—'}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">议题覆盖率</div>
                    <div className="stat-value">
                      {meeting.topics.length > 0 && meeting.transcripts.length > 0
                        ? Math.round((meeting.topics.reduce((s, t) => s + (t.endTime - t.startTime), 0) / (meeting.transcripts[meeting.transcripts.length - 1].endTime || 1)) * 100)
                        : 0}%
                    </div>
                  </div>
                </div>

                <div>
                  {meeting.topics.map((topic, idx) => (
                    <div key={topic.id} className="topic-card">
                      <div className="topic-header" style={{ cursor: 'pointer' }} onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            width: 28, height: 28, borderRadius: 6, background: '#6366f1', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600
                          }}>{idx + 1}</span>
                          <span className="topic-title">{topic.title}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <span className="topic-time">{formatTimeRange(topic.startTime, topic.endTime)}</span>
                          <span className="tag tag-primary">{formatDuration(topic.endTime - topic.startTime)}</span>
                          <span>{expandedTopic === topic.id ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      {expandedTopic === topic.id && (
                        <div style={{ paddingTop: 12 }}>
                          <div style={{ marginBottom: 12, fontSize: 13, color: '#64748b', fontWeight: 500 }}>AI 摘要：</div>
                          <div className="topic-summary" style={{ padding: 14, background: '#f8fafc', borderRadius: 8 }}>{topic.summary}</div>
                          <div style={{ marginTop: 12, fontSize: 13, color: '#64748b', fontWeight: 500 }}>相关转写片段：</div>
                          <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto', paddingRight: 8 }}>
                            {meeting.transcripts.filter(t => topic.segmentIds.includes(t.id)).map(t => {
                              const speaker = meeting.speakers.find(s => s.id === t.speakerId)
                              return (
                                <div key={t.id} style={{ padding: '8px 0', fontSize: 13, borderBottom: '1px solid #f1f5f9' }}>
                                  <span style={{ color: speaker?.color, fontWeight: 600, marginRight: 8 }}>{speaker?.name || '未知'}:</span>
                                  <span style={{ color: '#475569' }}>{t.text}</span>
                                  <span style={{ color: '#94a3b8', marginLeft: 8, fontSize: 12 }}>{formatTimeRange(t.startTime, t.endTime)}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'questions' && (
              <div>
                <div className="grid-3" style={{ marginBottom: 20 }}>
                  <div className="stat-card">
                    <div className="stat-label">高优先级问题</div>
                    <div className="stat-value" style={{ color: '#ef4444' }}>
                      {meeting.questions.filter(q => q.priority === 'high').length}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">中优先级问题</div>
                    <div className="stat-value" style={{ color: '#f59e0b' }}>
                      {meeting.questions.filter(q => q.priority === 'medium').length}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">问题类别数</div>
                    <div className="stat-value">
                      {new Set(meeting.questions.map(q => q.category)).size}
                    </div>
                  </div>
                </div>

                {meeting.questions.map(q => (
                  <div key={q.id} className="question-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div className="question-content" style={{ flex: 1 }}>
                        <span style={{ fontSize: 16, marginRight: 8 }}>❓</span>
                        {q.content}
                      </div>
                      <span className={`tag ${getPriorityColor(q.priority)}`}>
                        {q.priority === 'high' ? '高优先' : q.priority === 'medium' ? '中优先' : '低优先'}
                      </span>
                    </div>
                    <div className="question-meta">
                      <span className="tag tag-default">{q.category}</span>
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>
                        出现在 {formatDuration(meeting.transcripts.find(t => t.id === q.segmentId)?.startTime || 0)}
                      </span>
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: 24, padding: 16, background: '#eef2ff', borderRadius: 10 }}>
                  <div style={{ fontWeight: 600, color: '#4f46e5', marginBottom: 8 }}>💡 AI 建议</div>
                  <div style={{ fontSize: 14, color: '#4338ca', lineHeight: 1.7 }}>
                    本次会议客户提出了 {meeting.questions.filter(q => q.priority === 'high').length} 个高优先级问题，
                    建议在后续跟进中重点回应 <strong>实施周期</strong> 和 <strong>数据安全</strong> 方面的顾虑，
                    可准备相关的认证文件和案例数据增强说服力。
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'followups' && (
              <div>
                <div style={{ marginBottom: 20, padding: 16, background: '#f8fafc', borderRadius: 10 }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 10 }}>快速添加（AI 建议）：</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {FOLLOWUP_SUGGESTIONS.map(s => (
                      <button key={s} className="tag tag-primary" style={{ padding: '6px 14px', cursor: 'pointer' }} onClick={() => setNewFollowUp(s)}>
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <input type="text" className="form-input" style={{ flex: 2 }} placeholder="待办事项内容"
                    value={newFollowUp} onChange={(e) => setNewFollowUp(e.target.value)} />
                  <input type="text" className="form-input" style={{ width: 120 }} placeholder="负责人"
                    value={newResponsible} onChange={(e) => setNewResponsible(e.target.value)} />
                  <input type="text" className="form-input" style={{ width: 140 }} placeholder="截止时间"
                    value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} />
                  <button className="btn btn-primary" onClick={handleAddFollowUp}>添加</button>
                </div>

                {meeting.followUps.map(f => {
                  const style = getStatusStyle(f.status)
                  return (
                    <div key={f.id} className="followup-item">
                      <input type="checkbox" className="followup-checkbox" checked={f.status === 'completed'}
                        onChange={() => toggleFollowUpStatus(f.id)} />
                      <div className="followup-body">
                        <div className="followup-content" style={{
                          textDecoration: f.status === 'completed' ? 'line-through' : 'none',
                          opacity: f.status === 'completed' ? 0.6 : 1
                        }}>
                          {f.content}
                        </div>
                        <div className="followup-meta">
                          <span>👤 {f.responsible}</span>
                          <span>⏰ {f.deadline}</span>
                          <span className="tag" style={{ background: style.bg, color: style.color }}>{style.text}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {activeTab === 'checklist' && (
              <div>
                <div style={{ marginBottom: 20, padding: 20, background: 'linear-gradient(135deg, #eef2ff, #fce7f3)', borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>复盘完成度</div>
                      <div style={{ fontSize: 14, color: '#64748b' }}>逐项检查，确保复盘全面深入</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 36, fontWeight: 700, color: '#6366f1' }}>{completedCount}<span style={{ fontSize: 18, color: '#94a3b8' }}>/{REVIEW_CHECKLIST.length}</span></div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>{Math.round((completedCount / REVIEW_CHECKLIST.length) * 100)}% 已完成</div>
                    </div>
                  </div>
                  <div className="progress-bar" style={{ marginTop: 16 }}>
                    <div className="progress-fill" style={{ width: `${(completedCount / REVIEW_CHECKLIST.length) * 100}%` }} />
                  </div>
                </div>

                {Object.entries(groupedChecklist).map(([category, items]) => (
                  <div key={category} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>{category}</div>
                    {items.map(item => (
                      <div key={item.id} className="checklist-item">
                        <input type="checkbox" className="checklist-checkbox" checked={!!checklistState[item.id]}
                          onChange={() => toggleChecklist(item.id)} />
                        <span className={`checklist-text ${checklistState[item.id] ? 'done' : ''}`}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showDiffModal && pendingChanges && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: 820, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
              <div>
                <h2 className="card-title">🔍 AI 分析差异预览</h2>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  基于 {pendingChanges.regeneratedAt} 的最新转写重新生成 · 勾选希望应用的项目
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDiffModal(false)}>✕</button>
            </div>

            <div className="tab-bar" style={{ borderBottom: '1px solid #e2e8f0', marginBottom: 0 }}>
              {[
                { k: 'topics', label: `📑 议题 (${(topicDiff?.changedId.length || 0) + (topicDiff?.added.length || 0) + (topicDiff?.removed.length || 0)})` },
                { k: 'questions', label: `❓ 问题 (+${questionDiff?.added.length || 0})` },
                { k: 'followups', label: `📋 跟进 (+${followUpDiff?.added.length || 0})` },
                { k: 'score', label: `⭐ 评分 (${scoreDiff?.changed.length || 0})` }
              ].map(t => (
                <button key={t.k} className={`tab-item ${diffTab === t.k ? 'active' : ''}`}
                  style={{ fontSize: 13, padding: '8px 14px' }}
                  onClick={() => setDiffTab(t.k as DiffTab)}>
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 4px' }}>
              {diffTab === 'topics' && topicDiff && (
                <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pendingChanges.data.topics.map((t, i) => {
                    const oldT = meeting.topics.find(x => x.id === t.id)
                    const changed = oldT ? (oldT.summary !== t.summary || oldT.startTime !== t.startTime || oldT.endTime !== t.endTime) : true
                    if (!changed && oldT) return null
                    const isNew = !oldT
                    const checked = selTopicIds.has(t.id)
                    return (
                      <div key={t.id} style={{
                        padding: 12, borderRadius: 10,
                        border: `1px solid ${checked ? '#a78bfa' : '#e2e8f0'}`,
                        background: checked ? '#f5f3ff' : '#fafafa'
                      }}>
                        <label style={{ display: 'flex', gap: 10, cursor: 'pointer', alignItems: 'flex-start' }}>
                          <input type="checkbox" checked={checked} style={{ marginTop: 4 }}
                            onChange={() => toggleId(setSelTopicIds, t.id)} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <span style={{ fontWeight: 600 }}>#{i + 1} {t.title}</span>
                              {isNew ? renderDiffBadge('added') : renderDiffBadge('changed')}
                            </div>
                            {oldT && (
                              <div style={{ marginBottom: 8, padding: 8, background: '#fef2f2', borderRadius: 6, fontSize: 12, color: '#991b1b' }}>
                                <strong>原摘要：</strong>{oldT.summary}
                                <div style={{ marginTop: 4, color: '#b91c1c' }}>
                                  原时间：{formatTimeRange(oldT.startTime, oldT.endTime)}
                                </div>
                              </div>
                            )}
                            <div style={{ padding: 8, background: '#ecfdf5', borderRadius: 6, fontSize: 12, color: '#065f46' }}>
                              <strong>新摘要：</strong>{t.summary}
                              <div style={{ marginTop: 4, color: '#047857' }}>
                                新时间：{formatTimeRange(t.startTime, t.endTime)}
                              </div>
                            </div>
                          </div>
                        </label>
                      </div>
                    )
                  })}
                  {pendingChanges.data.topics.filter(t => !meeting.topics.find(x => x.id === t.id)).length === 0 &&
                    meeting.topics.filter(t => !pendingChanges.data.topics.find(x => x.id === t.id)).length === 0 &&
                    meeting.topics.every(t => {
                      const nt = pendingChanges.data.topics.find(x => x.id === t.id)
                      return nt && nt.summary === t.summary && nt.startTime === t.startTime && nt.endTime === t.endTime
                    }) && (
                      <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>议题无变化</div>
                    )}
                </div>
              )}

              {diffTab === 'questions' && (
                <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pendingChanges.data.questions.map((q, i) => {
                    const exists = meeting.questions.find(x => x.id === q.id)
                    if (exists) return null
                    const checked = selQuestionIds.has(q.id)
                    return (
                      <label key={q.id} style={{
                        display: 'flex', gap: 10, padding: 12, borderRadius: 10, cursor: 'pointer',
                        border: `1px solid ${checked ? '#a78bfa' : '#e2e8f0'}`,
                        background: checked ? '#f5f3ff' : '#ecfdf5'
                      }}>
                        <input type="checkbox" checked={checked} style={{ marginTop: 4 }}
                          onChange={() => toggleId(setSelQuestionIds, q.id)} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            {renderDiffBadge('added')}
                            <span className={`tag ${getPriorityColor(q.priority)}`} style={{ fontSize: 11 }}>
                              {q.priority === 'high' ? '高优先' : q.priority === 'medium' ? '中优先' : '低优先'}
                            </span>
                            <span className="tag tag-default" style={{ fontSize: 11 }}>{q.category}</span>
                          </div>
                          <div style={{ fontSize: 13, color: '#1e293b' }}>❓ {q.content}</div>
                        </div>
                      </label>
                    )
                  })}
                  {pendingChanges.data.questions.filter(q => !meeting.questions.find(x => x.id === q.id)).length === 0 && (
                    <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>无新增问题</div>
                  )}
                </div>
              )}

              {diffTab === 'followups' && (
                <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pendingChanges.data.followUps.map((f, i) => {
                    const exists = meeting.followUps.find(x => x.id === f.id)
                    if (exists) return null
                    const checked = selFollowUpIds.has(f.id)
                    return (
                      <label key={f.id} style={{
                        display: 'flex', gap: 10, padding: 12, borderRadius: 10, cursor: 'pointer',
                        border: `1px solid ${checked ? '#a78bfa' : '#e2e8f0'}`,
                        background: checked ? '#f5f3ff' : '#ecfdf5'
                      }}>
                        <input type="checkbox" checked={checked} style={{ marginTop: 4 }}
                          onChange={() => toggleId(setSelFollowUpIds, f.id)} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            {renderDiffBadge('added')}
                            <span className="tag tag-default" style={{ fontSize: 11 }}>👤 {f.responsible}</span>
                            <span className="tag tag-default" style={{ fontSize: 11 }}>⏰ {f.deadline}</span>
                          </div>
                          <div style={{ fontSize: 13, color: '#1e293b' }}>📋 {f.content}</div>
                        </div>
                      </label>
                    )
                  })}
                  {pendingChanges.data.followUps.filter(f => !meeting.followUps.find(x => x.id === f.id)).length === 0 && (
                    <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>无新增跟进事项</div>
                  )}
                </div>
              )}

              {diffTab === 'score' && scoreDiff && (
                <div style={{ padding: '0 12px' }}>
                  <label style={{
                    display: 'flex', gap: 10, padding: 14, borderRadius: 10, cursor: 'pointer', marginBottom: 14,
                    border: `1px solid ${selScore ? '#a78bfa' : '#e2e8f0'}`,
                    background: selScore ? '#f5f3ff' : '#fafafa'
                  }}>
                    <input type="checkbox" checked={selScore} onChange={() => setSelScore(!selScore)} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 10 }}>应用所有评分调整</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 10 }}>
                        <div style={{ padding: 10, borderRadius: 8, background: 'linear-gradient(135deg,#fef3c7,#fde68a)' }}>
                          <div style={{ fontSize: 12, color: '#92400e', marginBottom: 4 }}>综合评分</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: '#b45309' }}>
                            {scoreDiff.oldOverall} → <span style={{ color: scoreDiff.newOverall >= scoreDiff.oldOverall ? '#15803d' : '#b91c1c' }}>
                              {scoreDiff.newOverall}
                              ({scoreDiff.newOverall - scoreDiff.oldOverall >= 0 ? '+' : ''}{scoreDiff.newOverall - scoreDiff.oldOverall})
                            </span>
                          </div>
                        </div>
                        {scoreDiff.changed.map(c => (
                          <div key={c.id} style={{ padding: 10, borderRadius: 8, background: c.newScore >= c.oldScore ? '#ecfdf5' : '#fef2f2' }}>
                            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{c.name}</div>
                            <div style={{ fontSize: 16, fontWeight: 600, color: c.newScore >= c.oldScore ? '#15803d' : '#b91c1c' }}>
                              {c.oldScore} → {c.newScore}
                              ({c.newScore - c.oldScore >= 0 ? '+' : ''}{(c.newScore - c.oldScore).toFixed(1)})
                            </div>
                          </div>
                        ))}
                        {scoreDiff.changed.length === 0 && (
                          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                            各评分项无变化，综合评分 {scoreDiff.oldOverall} → {scoreDiff.newOverall}
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                </div>
              )}
            </div>

            <div style={{ padding: '14px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowDiffModal(false)}>取消</button>
              <button className="btn btn-outline" onClick={() => discardAllPending()}>保留原内容</button>
              <button className="btn btn-danger" onClick={() => { acceptAllPending(); setShowDiffModal(false) }}>全部接受</button>
              <button className="btn btn-primary" onClick={handlePartialAccept}>
                应用已勾选 ({selTopicIds.size + selQuestionIds.size + selFollowUpIds.size + (selScore ? 1 : 0)})
              </button>
            </div>
          </div>
        </div>
      )}

      {showScriptModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: 640, maxHeight: '80vh', overflow: 'auto' }}>
            <div className="card-header">
              <h2 className="card-title">💬 AI 跟进话术模板</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowScriptModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {SCRIPT_TEMPLATES.map(t => (
                <button key={t.title}
                  className={`btn ${selectedScript.title === t.title ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => setSelectedScript(t)}>{t.title}</button>
              ))}
            </div>
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, marginBottom: 16, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.8, color: '#334155' }}>
              {selectedScript.content}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => navigator.clipboard?.writeText(selectedScript.content)}>📋 复制模板</button>
              <button className="btn btn-primary" onClick={() => setShowScriptModal(false)}>确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReviewPage
