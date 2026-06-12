import { Meeting, Speaker, TranscriptSegment, Topic, CustomerQuestion, FollowUpAction, ScoreItem, Clip, HistoricalMeeting } from '../types'

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#22c55e', '#0ea5e9']

export const mockSpeakers: Speaker[] = [
  { id: 's1', name: '张伟', role: '销售主管', color: COLORS[0] },
  { id: 's2', name: '李娜', role: '客户代表', color: COLORS[1] },
  { id: 's3', name: '王芳', role: '产品经理', color: COLORS[2] },
  { id: 's4', name: '刘强', role: '技术顾问', color: COLORS[3] }
]

export const mockTranscripts: TranscriptSegment[] = [
  { id: 't1', speakerId: 's1', startTime: 0, endTime: 15, text: '各位好，今天我们来讨论一下 Q3 的客户合作方案，主要想了解贵公司目前的业务痛点。' },
  { id: 't2', speakerId: 's2', startTime: 15, endTime: 45, text: '谢谢张主管。我们目前在客户数据管理这块比较混乱，销售线索跟进效率不高，很多机会都流失了。' },
  { id: 't3', speakerId: 's3', startTime: 45, endTime: 47, text: '', isSilence: true },
  { id: 't4', speakerId: 's3', startTime: 47, endTime: 75, text: '请问李总，你们现在用的是什么系统？数据主要是存在哪里？' },
  { id: 't5', speakerId: 's2', startTime: 72, endTime: 80, text: '我插一句——', isInterruption: true },
  { id: 't6', speakerId: 's2', startTime: 80, endTime: 120, text: '我们现在用的是 Excel 表格，加上一些零散的笔记，销售团队每个人的习惯都不一样，数据很难统一。' },
  { id: 't7', speakerId: 's1', startTime: 120, endTime: 160, text: '明白，这确实是很多成长型企业都会遇到的问题。我们的 CRM 系统正好可以解决这个问题，可以实现客户数据统一管理、销售流程标准化。' },
  { id: 't8', speakerId: 's4', startTime: 160, endTime: 210, text: '从技术角度来说，我们的系统支持 Excel 批量导入，还可以和你们现有的微信、企业微信打通，销售跟进记录自动同步，管理层可以实时看到销售漏斗数据。' },
  { id: 't9', speakerId: 's2', startTime: 210, endTime: 260, text: '听起来不错。但我们比较关心的是实施周期，还有数据安全的问题。毕竟客户数据是我们最核心的资产。另外，我们销售团队的 IT 水平参差不齐，系统不能太复杂。' },
  { id: 't10', speakerId: 's3', startTime: 260, endTime: 263, text: '', isSilence: true },
  { id: 't11', speakerId: 's3', startTime: 263, endTime: 310, text: '李总问的这几个问题非常关键。首先实施周期，标准版本一般 2-3 周就可以上线。数据安全这块，我们通过了 ISO27001 认证，数据是加密存储的，还支持私有化部署。' },
  { id: 't12', speakerId: 's1', startTime: 305, endTime: 307, text: '对，没错——', isInterruption: true },
  { id: 't13', speakerId: 's1', startTime: 307, endTime: 360, text: '关于易用性，我们的界面设计是面向一线销售人员的，操作非常简单，我们还提供 3 天的培训课程，确保每个人都会用。我们可以安排一次上门演示，你们看什么时间方便？' },
  { id: 't14', speakerId: 's2', startTime: 360, endTime: 400, text: '下周二下午可以，你们准备一个详细的方案，重点讲一下数据迁移方案和培训计划。另外，能不能给我们看一些同行业的成功案例？' },
  { id: 't15', speakerId: 's1', startTime: 400, endTime: 430, text: '没问题，我们一定准备好。下周二下午 2 点，我们带技术团队过来。' }
]

export const mockTopics: Topic[] = [
  {
    id: 'top1',
    title: '客户业务痛点介绍',
    startTime: 0,
    endTime: 80,
    summary: '客户反馈当前使用 Excel 管理客户数据，存在数据不统一、销售跟进效率低、线索容易流失的问题。',
    segmentIds: ['t1', 't2', 't3', 't4', 't5', 't6']
  },
  {
    id: 'top2',
    title: 'CRM 解决方案介绍',
    startTime: 80,
    endTime: 260,
    summary: '介绍了 CRM 系统的核心功能：客户数据统一管理、销售流程标准化、Excel 批量导入、企业微信打通、实时销售漏斗分析。',
    segmentIds: ['t7', 't8']
  },
  {
    id: 'top3',
    title: '客户核心疑虑解答',
    startTime: 260,
    endTime: 400,
    summary: '解答了客户关于实施周期、数据安全、系统易用性三个方面的核心疑虑，并确认了上门演示安排。',
    segmentIds: ['t9', 't10', 't11', 't12', 't13']
  },
  {
    id: 'top4',
    title: '下一步行动确认',
    startTime: 400,
    endTime: 430,
    summary: '确认下周二下午 2 点上门演示，需要准备详细方案（含数据迁移、培训计划）和同行业成功案例。',
    segmentIds: ['t14', 't15']
  }
]

export const mockQuestions: CustomerQuestion[] = [
  { id: 'q1', content: '你们现在用的是什么系统？数据主要是存在哪里？', segmentId: 't4', category: '背景了解', priority: 'low' },
  { id: 'q2', content: '实施周期需要多久？', segmentId: 't9', category: '产品能力', priority: 'high' },
  { id: 'q3', content: '数据安全如何保障？', segmentId: 't9', category: '风险顾虑', priority: 'high' },
  { id: 'q4', content: '系统对非技术人员是否友好？', segmentId: 't9', category: '产品能力', priority: 'medium' },
  { id: 'q5', content: '能否提供同行业的成功案例？', segmentId: 't14', category: '信任建立', priority: 'medium' }
]

export const mockFollowUps: FollowUpAction[] = [
  { id: 'f1', content: '准备客户定制化方案，重点包含数据迁移方案和培训计划', responsible: '王芳', deadline: '下周一 18:00', status: 'pending' },
  { id: 'f2', content: '整理同行业成功案例（3-5 个），制作案例手册', responsible: '张伟', deadline: '下周一 18:00', status: 'pending' },
  { id: 'f3', content: '协调技术团队下周二下午 2 点上门演示', responsible: '刘强', deadline: '下周一 12:00', status: 'in_progress' },
  { id: 'f4', content: '发送会议纪要给客户确认会议安排', responsible: '张伟', deadline: '本周五 18:00', status: 'completed' },
  { id: 'f5', content: '准备系统演示账号和演示环境', responsible: '刘强', deadline: '下周一 18:00', status: 'pending' }
]

export const mockScoreItems: ScoreItem[] = [
  { id: 'si1', name: '会议目标清晰度', score: 9, maxScore: 10, weight: 0.15, comment: '会议目标明确，开场即说明会议目的和议程。' },
  { id: 'si2', name: '客户需求挖掘深度', score: 8, maxScore: 10, weight: 0.2, comment: '成功挖掘了客户 3 个核心痛点，但可以进一步追问预算范围。' },
  { id: 'si3', name: '解决方案匹配度', score: 8.5, maxScore: 10, weight: 0.2, comment: '方案很好地回应了客户需求，但缺少量化的效果数据。' },
  { id: 'si4', name: '沟通效率与节奏', score: 7, maxScore: 10, weight: 0.15, comment: '出现 2 次打断和 2 次沉默，整体节奏可以把控得更好。' },
  { id: 'si5', name: '异议处理能力', score: 9, maxScore: 10, weight: 0.15, comment: '对客户的三个核心疑虑都给出了专业的回答。' },
  { id: 'si6', name: '下一步行动明确度', score: 9.5, maxScore: 10, weight: 0.15, comment: '下一步行动非常清晰，有人负责、有时间节点、有交付物。' }
]

export const mockClips: Clip[] = [
  { id: 'c1', name: '客户核心痛点描述', startTime: 15, endTime: 45, transcript: '我们目前在客户数据管理这块比较混乱，销售线索跟进效率不高，很多机会都流失了。', isFavorite: true, tags: ['客户痛点', '需求'], createdAt: '2024-01-15 10:30' },
  { id: 'c2', name: '客户核心三连问', startTime: 210, endTime: 260, transcript: '实施周期...数据安全...系统不能太复杂。', isFavorite: true, tags: ['客户疑虑', '关键信息'], createdAt: '2024-01-15 10:35' },
  { id: 'c3', name: '异议处理范例-数据安全', startTime: 263, endTime: 310, transcript: '李总问的这几个问题非常关键。首先实施周期...数据安全这块，我们通过了 ISO27001 认证...', isFavorite: false, tags: ['异议处理', '最佳实践'], createdAt: '2024-01-15 10:40' },
  { id: 'c4', name: '会议收尾敲定下次时间', startTime: 360, endTime: 430, transcript: '下周二下午可以...下周二下午 2 点，我们带技术团队过来。', isFavorite: false, tags: ['会议收尾', '推进技巧'], createdAt: '2024-01-15 10:45' }
]

export const mockHistoricalMeetings: HistoricalMeeting[] = [
  { id: 'h1', title: 'XX科技初次沟通', date: '2024-01-08', overallScore: 78, duration: 2100, topicsCount: 3 },
  { id: 'h2', title: 'YY集团需求调研', date: '2024-01-10', overallScore: 82, duration: 3600, topicsCount: 5 },
  { id: 'h3', title: 'ZZ公司方案演示', date: '2024-01-12', overallScore: 75, duration: 2400, topicsCount: 4 }
]

export function createMockMeeting(): Meeting {
  const totalWeighted = mockScoreItems.reduce((sum, item) => sum + (item.score / item.maxScore) * item.weight * 100, 0)
  return {
    id: 'm1',
    title: 'Q3客户合作方案沟通会',
    date: '2024-01-15 10:00',
    description: '与客户沟通 Q3 合作方案，了解业务痛点，介绍 CRM 解决方案',
    objectives: [
      '了解客户当前数据管理的痛点',
      '介绍 CRM 解决方案的核心价值',
      '解答客户疑虑，推进下一步合作'
    ],
    mediaFile: null,
    speakers: mockSpeakers,
    transcripts: mockTranscripts,
    topics: mockTopics,
    questions: mockQuestions,
    followUps: mockFollowUps,
    score: {
      overall: Math.round(totalWeighted),
      items: mockScoreItems,
      totalWeighted
    },
    clips: mockClips,
    manualReview: '',
    createdAt: '2024-01-15 10:00',
    updatedAt: '2024-01-15 10:00'
  }
}
