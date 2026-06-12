import {
  Meeting, Topic, CustomerQuestion, FollowUpAction, ScoreItem, TranscriptSegment, Speaker
} from '../types'

export interface RegeneratedData {
  topics: Topic[]
  questions: CustomerQuestion[]
  followUps: FollowUpAction[]
  score: {
    overall: number
    items: ScoreItem[]
    totalWeighted: number
  }
}

const QUESTION_KEYWORDS = ['？', '?', '怎么', '如何', '什么', '哪', '多少', '几', '是否', '能不能', '可以', '有没有', '请问', '请教']
const PRIORITY_HIGH = ['安全', '周期', '多久', '多少钱', '价格', '成本', '风险']
const CATEGORY_MAP: Record<string, string> = {
  安全: '风险顾虑', 周期: '产品能力', 多久: '产品能力', 钱: '商务合作',
  价格: '商务合作', 成本: '商务合作', 功能: '产品能力', 培训: '服务支持',
  案例: '信任建立', 实施: '服务支持', 数据: '风险顾虑', 支持: '服务支持',
  售后: '服务支持', 效果: '产品能力', 试用: '产品能力'
}

const FOLLOWUP_HINTS = [
  { key: '方案', key2: '计划', suggestion: '整理并发送详细方案给客户确认' },
  { key: '演示', key2: '演示', suggestion: '安排产品演示会议并发送邀请' },
  { key: '培训', key2: '培训', suggestion: '准备培训材料并与客户确认时间' },
  { key: '案例', key2: '案例', suggestion: '收集整理相关行业成功案例发送给客户' },
  { key: '合同', key2: '签约', suggestion: '起草合同/协议草案并发送审核' },
  { key: '报价', key2: '价格', suggestion: '整理正式报价单并发送给客户' },
  { key: '测试', key2: '试用', suggestion: '准备测试环境和账号给客户' },
  { key: '资料', key2: '材料', suggestion: '准备相关资料并打包发送' }
]

const SCORE_WEIGHTS: Array<{ id: string; name: string; weight: number }> = [
  { id: 'si1', name: '会议目标清晰度', weight: 0.15 },
  { id: 'si2', name: '客户需求挖掘深度', weight: 0.20 },
  { id: 'si3', name: '解决方案匹配度', weight: 0.20 },
  { id: 'si4', name: '沟通效率与节奏', weight: 0.15 },
  { id: 'si5', name: '异议处理能力', weight: 0.15 },
  { id: 'si6', name: '下一步行动明确度', weight: 0.15 }
]

function detectQuestions(segments: TranscriptSegment[]): Array<{ segment: TranscriptSegment; priority: 'high' | 'medium' | 'low'; category: string }> {
  const results: Array<{ segment: TranscriptSegment; priority: 'high' | 'medium' | 'low'; category: string }> = []
  segments.forEach(seg => {
    if (seg.isSilence || !seg.text || seg.text.length < 5) return
    const isQuestion = QUESTION_KEYWORDS.some(k => seg.text!.includes(k))
    if (isQuestion) {
      let priority: 'high' | 'medium' | 'low' = 'low'
      const hasHigh = PRIORITY_HIGH.some(k => seg.text!.includes(k))
      if (hasHigh) priority = 'high'
      else if (seg.text!.length > 20) priority = 'medium'
      let category = '需求了解'
      for (const [kw, cat] of Object.entries(CATEGORY_MAP)) {
        if (seg.text!.includes(kw)) { category = cat; break }
      }
      results.push({ segment: seg, priority, category })
    }
  })
  return results
}

function summarizeTopic(segs: TranscriptSegment[], speakers: Speaker[]): string {
  const speeches = segs.filter(s => !s.isSilence && s.text)
  const full = speeches.map(s => {
    const sp = speakers.find(x => x.id === s.speakerId)?.name || ''
    return `${sp}：${s.text}`
  }).join('；')
  if (!full) return '（该议题暂无有效发言内容）'
  let summary = full.slice(0, 120)
  if (full.length > 120) summary += '...'
  return `主要讨论了：${summary}`
}

function detectActionItems(segments: TranscriptSegment[]): string[] {
  const actions: string[] = []
  const actionKeywords = ['安排', '准备', '发送', '确认', '下周', '明天', '周二', '周三', '周四', '周五', '周一', '下次', '后续', '尽快', '必须', '需要']
  segments.forEach(seg => {
    if (seg.isSilence || !seg.text) return
    if (actionKeywords.some(k => seg.text!.includes(k))) {
      if (seg.text!.length > 10 && seg.text!.length < 80) {
        actions.push(seg.text!)
      }
    }
  })
  return actions
}

export function regenerateFromTranscripts(meeting: Meeting): RegeneratedData {
  const { transcripts, speakers, topics: originalTopics } = meeting
  const validSegs = transcripts.filter(t => !t.isSilence)
  const totalDuration = transcripts.length > 0
    ? transcripts[transcripts.length - 1].endTime
    : 0

  // ===== 1. 重新计算议题时间范围和摘要 =====
  const newTopics: Topic[] = originalTopics.map((topic) => {
    const relatedSegs = transcripts.filter(t => topic.segmentIds.includes(t.id))
    if (relatedSegs.length === 0) return topic
    const newStart = Math.min(...relatedSegs.map(s => s.startTime))
    const newEnd = Math.max(...relatedSegs.map(s => s.endTime))
    const newSummary = summarizeTopic(relatedSegs, speakers)
    return {
      ...topic,
      startTime: newStart,
      endTime: newEnd,
      summary: newSummary
    }
  })

  // ===== 2. 重新检测问题 =====
  const detected = detectQuestions(validSegs)
  const newQuestions: CustomerQuestion[] = detected.map((d, i) => ({
    id: `q_regen_${i}`,
    content: d.segment.text,
    segmentId: d.segment.id,
    category: d.category,
    priority: d.priority
  }))

  // ===== 3. 重新生成跟进事项 =====
  const detectedActions = detectActionItems(validSegs)
  const suggestedFollowUps: FollowUpAction[] = []
  detectedActions.forEach((act, i) => {
    if (i < 3) {
      suggestedFollowUps.push({
        id: `f_regen_${i}`,
        content: act,
        responsible: speakers[0]?.name || '未指派',
        deadline: '本周内',
        status: 'pending'
      })
    }
  })
  if (suggestedFollowUps.length < 3) {
    const cats = new Set(newQuestions.map(q => q.category))
    cats.forEach(cat => {
      const hint = FOLLOWUP_HINTS.find(h =>
        newQuestions.some(q => q.category === cat && (q.content.includes(h.key) || q.content.includes(h.key2)))
      )
      if (hint && !suggestedFollowUps.find(f => f.content.includes(hint.suggestion.slice(0, 5)))) {
        suggestedFollowUps.push({
          id: `f_regen_sug_${suggestedFollowUps.length}`,
          content: hint.suggestion,
          responsible: speakers[0]?.name || '未指派',
          deadline: '下周内',
          status: 'pending'
        })
      }
    })
  }

  // ===== 4. 重新计算评分 =====
  const speakerDurations = new Map<string, number>()
  let interruptionCount = 0
  let silenceDuration = 0
  transcripts.forEach(t => {
    if (t.isSilence) {
      silenceDuration += t.endTime - t.startTime
      return
    }
    if (t.isInterruption) interruptionCount++
    const cur = speakerDurations.get(t.speakerId) || 0
    speakerDurations.set(t.speakerId, cur + (t.endTime - t.startTime))
  })

  const interruptionRatio = totalDuration > 0 ? interruptionCount / (totalDuration / 300) : 0
  const silenceRatio = totalDuration > 0 ? silenceDuration / totalDuration : 0
  const questionCount = newQuestions.length

  const newScoreItems: ScoreItem[] = SCORE_WEIGHTS.map(sw => {
    let base = 8
    let comment = ''
    switch (sw.id) {
      case 'si1': {
        const opening = validSegs.slice(0, Math.ceil(validSegs.length * 0.2))
        const hasOpeningGoal = opening.some(s => s.text && (s.text.includes('今天') || s.text.includes('讨论')))
        base = hasOpeningGoal ? 8.5 : 7
        comment = hasOpeningGoal
          ? '会议开场明确了会议主题和讨论方向。'
          : '建议开场更明确说明会议目标与议程。'
        break
      }
      case 'si2': {
        base = 6 + Math.min(3, questionCount * 0.8)
        comment = questionCount >= 4
          ? '客户需求挖掘比较充分，捕获了多个关键问题。'
          : '需求挖掘尚可，可进一步深入追问。'
        break
      }
      case 'si3': {
        const midSegs = validSegs.filter((_, i) => i >= validSegs.length * 0.3 && i <= validSegs.length * 0.7)
        const midSpeakers = new Set(midSegs.map(s => s.speakerId)).size
        base = midSpeakers >= 2 ? 8 : 7
        comment = midSpeakers >= 2
          ? '双方进行了充分的方案讨论与互动。'
          : '方案讨论可更深入，增加双向互动。'
        break
      }
      case 'si4': {
        base = 9 - interruptionRatio * 2 - silenceRatio * 30
        if (interruptionCount === 0 && silenceRatio < 0.05) {
          comment = '沟通节奏良好，无打断和长时间沉默。'
        } else if (interruptionCount > 2) {
          comment = `存在 ${interruptionCount} 次打断，建议控制发言顺序。`
        } else {
          comment = `沉默占比约 ${(silenceRatio * 100).toFixed(0)}%，建议加强互动。`
        }
        break
      }
      case 'si5': {
        const highPct = newQuestions.filter(q => q.priority === 'high').length
        base = 7 + Math.min(2, highPct * 0.5)
        comment = highPct > 0
          ? '对客户核心疑虑给出了专业回应。'
          : '无明显客户异议，整体推进顺利。'
        break
      }
      case 'si6': {
        const closing = validSegs.slice(-Math.max(2, Math.floor(validSegs.length * 0.2)))
        const hasClose = closing.some(s => s.text && (
          s.text.includes('下次') || s.text.includes('安排') || s.text.includes('下周') ||
          s.text.includes('明天') || s.text.includes('确认')
        ))
        base = hasClose ? 9 : 6.5
        comment = hasClose
          ? '明确了后续行动安排与时间节点。'
          : '建议明确下次沟通计划、时间节点与责任人。'
        break
      }
    }
    const score = Math.max(5, Math.min(10, Math.round(base * 2) / 2))
    return {
      id: sw.id,
      name: sw.name,
      score,
      maxScore: 10,
      weight: sw.weight,
      comment
    }
  })

  const totalWeighted = newScoreItems.reduce((sum, item) => sum + (item.score / item.maxScore) * item.weight * 100, 0)

  return {
    topics: newTopics,
    questions: newQuestions,
    followUps: suggestedFollowUps,
    score: {
      overall: Math.round(totalWeighted),
      items: newScoreItems,
      totalWeighted
    }
  }
}

export function listDiffFields(oldList: any[], newList: any[], idKey: string = 'id'): {
  added: any[]; removed: any[]; unchanged: any[]; changedId: string[]
} {
  const oldMap = new Map(oldList.map(x => [x[idKey], x]))
  const newMap = new Map(newList.map(x => [x[idKey], x]))
  const added: any[] = []; const removed: any[] = []; const unchanged: any[] = []; const changedId: string[] = []
  const allIds = new Set([...oldMap.keys(), ...newMap.keys()])
  allIds.forEach(id => {
    const oldVal = oldMap.get(id)
    const newVal = newMap.get(id)
    if (!oldVal && newVal) added.push(newVal)
    else if (oldVal && !newVal) removed.push(oldVal)
    else if (oldVal && newVal) {
      const diff = JSON.stringify(oldVal) !== JSON.stringify(newVal)
      if (diff) changedId.push(String(id))
      else unchanged.push(newVal)
    }
  })
  return { added, removed, unchanged, changedId }
}
