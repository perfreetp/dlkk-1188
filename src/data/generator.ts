import {
  Meeting, Speaker, TranscriptSegment, Topic, CustomerQuestion,
  FollowUpAction, ScoreItem, Clip, MediaFile
} from '../types'

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#22c55e', '#0ea5e9']

function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const SCENARIOS = [
  {
    title: '客户合作方案沟通会',
    speakers: [
      { name: '张伟', role: '销售主管' },
      { name: '李娜', role: '客户代表' },
      { name: '王芳', role: '产品经理' },
      { name: '刘强', role: '技术顾问' }
    ],
    description: '与客户沟通季度合作方案，了解业务痛点，介绍 CRM 解决方案',
    objectives: [
      '了解客户当前数据管理的痛点',
      '介绍 CRM 解决方案的核心价值',
      '解答客户疑虑，推进下一步合作'
    ],
    dialogues: [
      { spk: 0, text: '各位好，今天我们来讨论一下季度的客户合作方案，主要想了解贵公司目前的业务痛点。', int: false, sil: 0 },
      { spk: 1, text: '谢谢张主管。我们目前在客户数据管理这块比较混乱，销售线索跟进效率不高，很多机会都流失了。', int: false, sil: 0 },
      { spk: 2, text: '请问李总，你们现在用的是什么系统？数据主要是存在哪里？', int: false, sil: 2 },
      { spk: 1, text: '我们现在用的是 Excel 表格，加上一些零散的笔记，销售团队每个人的习惯都不一样，数据很难统一。', int: true, sil: 0 },
      { spk: 0, text: '明白，这确实是很多成长型企业都会遇到的问题。我们的系统正好可以解决这个问题，可以实现客户数据统一管理、销售流程标准化。', int: false, sil: 0 },
      { spk: 3, text: '从技术角度来说，我们的系统支持 Excel 批量导入，还可以和你们现有的企业微信打通，销售跟进记录自动同步，管理层可以实时看到销售漏斗数据。', int: false, sil: 0 },
      { spk: 1, text: '听起来不错。但我们比较关心的是实施周期，还有数据安全的问题。毕竟客户数据是我们最核心的资产。另外，我们销售团队的 IT 水平参差不齐，系统不能太复杂。', int: false, sil: 0 },
      { spk: 2, text: '李总问的这几个问题非常关键。首先实施周期，标准版本一般 2-3 周就可以上线。数据安全这块，我们通过了 ISO27001 认证，数据是加密存储的，还支持私有化部署。', int: false, sil: 3 },
      { spk: 0, text: '对，没错，关于易用性，我们的界面设计是面向一线销售人员的，操作非常简单，我们还提供 3 天的培训课程，确保每个人都会用。我们可以安排一次上门演示，你们看什么时间方便？', int: true, sil: 0 },
      { spk: 1, text: '下周二下午可以，你们准备一个详细的方案，重点讲一下数据迁移方案和培训计划。另外，能不能给我们看一些同行业的成功案例？', int: false, sil: 0 },
      { spk: 0, text: '没问题，我们一定准备好。下周二下午 2 点，我们带技术团队过来。', int: false, sil: 0 }
    ],
    topics: [
      { title: '客户业务痛点介绍', summary: '客户反馈当前使用 Excel 管理客户数据，存在数据不统一、销售跟进效率低、线索容易流失的问题。' },
      { title: '解决方案介绍', summary: '介绍了系统的核心功能：客户数据统一管理、销售流程标准化、Excel 批量导入、企业微信打通、实时销售漏斗分析。' },
      { title: '客户核心疑虑解答', summary: '解答了客户关于实施周期、数据安全、系统易用性三个方面的核心疑虑，并确认了上门演示安排。' },
      { title: '下一步行动确认', summary: '确认下周二下午 2 点上门演示，需要准备详细方案（含数据迁移、培训计划）和同行业成功案例。' }
    ],
    questions: [
      { content: '你们现在用的是什么系统？数据主要是存在哪里？', category: '背景了解', priority: 'low' as const },
      { content: '实施周期需要多久？', category: '产品能力', priority: 'high' as const },
      { content: '数据安全如何保障？', category: '风险顾虑', priority: 'high' as const },
      { content: '系统对非技术人员是否友好？', category: '产品能力', priority: 'medium' as const },
      { content: '能否提供同行业的成功案例？', category: '信任建立', priority: 'medium' as const }
    ],
    followUps: [
      { content: '准备客户定制化方案，重点包含数据迁移方案和培训计划', responsible: '王芳', deadline: '下周一 18:00', status: 'pending' as const },
      { content: '整理同行业成功案例（3-5 个），制作案例手册', responsible: '张伟', deadline: '下周一 18:00', status: 'pending' as const },
      { content: '协调技术团队下周二下午 2 点上门演示', responsible: '刘强', deadline: '下周一 12:00', status: 'in_progress' as const },
      { content: '发送会议纪要给客户确认会议安排', responsible: '张伟', deadline: '本周五 18:00', status: 'completed' as const }
    ]
  },
  {
    title: '新员工入职培训复盘会',
    speakers: [
      { name: '陈静', role: '培训讲师' },
      { name: '赵磊', role: '新员工代表' },
      { name: '孙丽', role: '人力资源' },
      { name: '周凯', role: '部门经理' }
    ],
    description: '针对本次新员工入职培训效果进行复盘，收集学员反馈，优化后续培训方案',
    objectives: [
      '了解新员工对本次培训的整体满意度',
      '收集培训内容和形式方面的改进建议',
      '确认学员对业务知识的掌握情况'
    ],
    dialogues: [
      { spk: 0, text: '大家好，今天我们针对上周的新员工入职培训做一个复盘。首先请各位分享一下整体感受。', int: false, sil: 0 },
      { spk: 1, text: '整体感觉培训节奏有点快，第一天的公司文化和制度讲得比较细，第二天产品知识信息量太大，消化不了。', int: false, sil: 0 },
      { spk: 2, text: '赵磊说的这点很重要，我们已经注意到有几位学员在第二天下午出现走神的情况。陈老师，你怎么看？', int: false, sil: 2 },
      { spk: 0, text: '确实，第二天的内容安排得比较满。主要是因为产品功能比较多，想让大家尽快上手。后续可能需要拆分一下，分成两天讲。', int: false, sil: 0 },
      { spk: 3, text: '我这边补充一下，从业务部门的角度，我们更希望培训能多一些实战演练。新员工进来之后，还是需要一段时间才能真正独立对接客户。', int: false, sil: 0 },
      { spk: 1, text: '对，实战演练这块确实少了点。特别是客户沟通的模拟，如果能多一些角色扮演就更好了。', int: true, sil: 0 },
      { spk: 0, text: '好建议。角色扮演我们可以在下次培训里加上。另外，大家对培训师有没有什么反馈？', int: false, sil: 3 },
      { spk: 2, text: '培训师整体不错，就是案例可以再多准备一些贴近我们行业的。另外，培训资料希望能提前发，方便预习。', int: false, sil: 0 },
      { spk: 3, text: '我同意，提前发资料很重要。还有，建议培训结束后有一个小测试，检验一下学习效果，也能引起大家重视。', int: false, sil: 0 },
      { spk: 0, text: '这些建议都非常好。我整理一下：一是内容拆分、节奏放缓；二是增加实战演练和角色扮演；三是增加行业案例；四是提前发资料并增加课后测试。大家还有补充吗？', int: false, sil: 0 },
      { spk: 1, text: '暂时没有了，期待下次培训的改进！', int: false, sil: 0 }
    ],
    topics: [
      { title: '培训整体满意度反馈', summary: '学员反馈培训节奏偏快，第二天产品知识信息量过大，部分学员出现走神情况。' },
      { title: '培训内容和形式优化', summary: '建议拆分内容、增加实战演练和角色扮演、补充行业相关案例、培训资料提前发放。' },
      { title: '培训效果评估机制', summary: '部门建议增加课后小测试，检验学习效果，同时提高学员重视程度。' },
      { title: '改进方案确认', summary: '确认 4 项改进措施：内容拆分节奏放缓、增加实战演练角色扮演、增加行业案例、提前发资料加课后测试。' }
    ],
    questions: [
      { content: '大家对本次培训整体感受如何？', category: '反馈收集', priority: 'medium' as const },
      { content: '对培训师有什么反馈？', category: '反馈收集', priority: 'low' as const },
      { content: '培训内容对实际工作帮助大吗？', category: '效果评估', priority: 'high' as const },
      { content: '后续希望增加哪些培训主题？', category: '需求收集', priority: 'medium' as const }
    ],
    followUps: [
      { content: '重新设计培训课程大纲，拆分产品知识为两天', responsible: '陈静', deadline: '本周三 18:00', status: 'pending' as const },
      { content: '准备 5 个客户沟通角色扮演脚本', responsible: '陈静', deadline: '本周五 18:00', status: 'pending' as const },
      { content: '收集整理 10 个行业典型案例', responsible: '周凯', deadline: '下周一 18:00', status: 'in_progress' as const },
      { content: '设计培训课后测试题（单选+多选+问答）', responsible: '孙丽', deadline: '本周五 18:00', status: 'pending' as const },
      { content: '建立培训资料提前 3 天发放的流程', responsible: '孙丽', deadline: '本周内', status: 'completed' as const }
    ]
  },
  {
    title: '季度销售团队复盘会',
    speakers: [
      { name: '黄海', role: '销售总监' },
      { name: '吴敏', role: '销售主管A' },
      { name: '徐峰', role: '销售主管B' },
      { name: '马琳', role: '运营支持' }
    ],
    description: 'Q2 季度销售团队复盘，分析目标完成情况，总结经验教训，制定 Q3 行动计划',
    objectives: [
      '回顾 Q2 销售目标完成情况',
      '分析各团队表现差异及原因',
      '制定 Q3 季度目标及关键行动'
    ],
    dialogues: [
      { spk: 0, text: '各位，今天咱们做 Q2 复盘。先看一下整体数据：Q2 目标完成率 87%，离目标差 13 个百分点。吴敏，先说说你们团队的情况。', int: false, sil: 0 },
      { spk: 1, text: '我们团队完成率 94%，主要是老客户续费做的不错，新客户开发比目标少了 2 家。主要问题是 5 月份有两个大项目延期了，推到 Q3 了。', int: false, sil: 0 },
      { spk: 2, text: '我们团队完成率只有 76%，拖了后腿。主要是两位新人还在成长期，出单比较慢，加上两个资深销售离职，客户交接有断档。', int: false, sil: 3 },
      { spk: 0, text: '人员问题确实影响比较大。马琳，离职率这块有没有数据？', int: false, sil: 0 },
      { spk: 3, text: 'Q2 销售团队整体离职率 15%，比 Q1 高了 5 个百分点。主要集中在入职半年以内的新人，离职原因访谈主要是压力大和客户资源分配问题。', int: false, sil: 0 },
      { spk: 1, text: '客户资源分配确实是个问题。新人分到的线索质量比较差，很难转化。能不能考虑让老人带新人，共享客户？', int: true, sil: 0 },
      { spk: 2, text: '我同意，我们团队试过老带新，效果还不错，新人上手速度能快一倍。就是老人的积极性需要激励一下。', int: false, sil: 0 },
      { spk: 0, text: '这个思路很好，老带新的激励机制我们可以定一下。接下来 Q3 目标，公司给的是比 Q2 增长 20%。大家觉得有没有压力？', int: false, sil: 2 },
      { spk: 1, text: '20% 有点挑战，不过如果 Q2 延期的两个大项目能落地，加上新人逐步出单，应该可以冲一冲。', int: false, sil: 0 },
      { spk: 2, text: '我们团队需要补充 1-2 个有经验的销售，不然只靠新人很难完成。另外希望运营能提供更多的优质线索。', int: false, sil: 0 },
      { spk: 3, text: '运营这边 Q3 计划上线新的线索评分模型，预计优质线索占比能从目前的 30% 提升到 50%，大家可以期待一下。', int: false, sil: 0 },
      { spk: 0, text: '很好。我来总结一下 Q3 关键动作：一是推行老带新机制并配套激励；二是紧急招聘 2 名资深销售；三是运营上线线索评分模型；四是重点跟进 Q2 延期项目。大家有没有问题？', int: false, sil: 0 },
      { spk: 1, text: '没有，按这个来！', int: false, sil: 0 }
    ],
    topics: [
      { title: 'Q2 目标完成情况回顾', summary: '整体完成率 87%，团队 A 完成 94%（老客户续费好，新客户略少），团队 B 完成 76%（人员流失和新人成长期影响）。' },
      { title: '团队表现差异原因分析', summary: '核心原因在人员：新人转化率低、资深销售离职导致客户断档、离职率 15%（主因压力大、资源分配）。' },
      { title: '改进措施讨论', summary: '提出并确认推行老带新共享客户机制、配套激励政策、提升线索质量、补充资深销售等措施。' },
      { title: 'Q3 目标及关键行动', summary: 'Q3 目标较 Q2 增长 20%；关键行动 4 项：老带新机制、招聘 2 人、上线线索评分模型、跟进延期项目。' }
    ],
    questions: [
      { content: '团队 A 新客户开发未达标的原因是什么？', category: '原因分析', priority: 'high' as const },
      { content: '团队 B 完成率偏低的主要障碍是什么？', category: '原因分析', priority: 'high' as const },
      { content: 'Q2 销售团队离职率和主要离职原因？', category: '人员问题', priority: 'high' as const },
      { content: '运营侧 Q3 能提供什么支持？', category: '资源支持', priority: 'medium' as const },
      { content: 'Q3 目标增长 20% 是否合理？', category: '目标设定', priority: 'medium' as const }
    ],
    followUps: [
      { content: '制定老带新激励方案并在团队内宣贯', responsible: '黄海', deadline: '7月10日', status: 'pending' as const },
      { content: '启动资深销售招聘，目标 2 人到岗', responsible: '马琳', deadline: '7月20日', status: 'pending' as const },
      { content: '上线新的线索评分模型，提升优质线索占比到 50%', responsible: '马琳', deadline: '7月31日', status: 'in_progress' as const },
      { content: '梳理 Q2 延期的 2 个大项目，制定推进计划', responsible: '吴敏', deadline: '7月5日', status: 'pending' as const },
      { content: '每周复盘 Q3 目标进度，及时调整策略', responsible: '黄海', deadline: 'Q3 全程', status: 'pending' as const }
    ]
  },
  {
    title: '产品需求评审会',
    speakers: [
      { name: '林涛', role: '产品经理' },
      { name: '郭鹏', role: '研发负责人' },
      { name: '何雪', role: '设计负责人' },
      { name: '郑华', role: '测试负责人' }
    ],
    description: '评审 V2.5 版本的新功能需求，评估技术可行性、设计资源和排期',
    objectives: [
      '对齐 V2.5 版本的功能需求范围',
      '评估各模块的研发和设计工作量',
      '确认版本上线时间和关键里程碑'
    ],
    dialogues: [
      { spk: 0, text: '今天评审 V2.5 的需求，我先过一遍范围：主要有数据看板升级、移动端审批流、客户标签体系三个大模块。大家先看一下 PRD。', int: false, sil: 0 },
      { spk: 2, text: '设计这边，数据看板的可视化组件比较多，交互也复杂，预计需要 10 个工作日。移动端审批流相对简单，3 个工作日够了。', int: false, sil: 0 },
      { spk: 1, text: '研发这边压力比较大。客户标签体系要改底层数据模型，风险点比较多，我预估需要 15 个工作日，还要考虑兼容历史数据。', int: false, sil: 3 },
      { spk: 0, text: '15 个工作日是不是有点久？能不能拆一下，核心标签能力先上，高级筛选后面再迭代？', int: false, sil: 0 },
      { spk: 1, text: '可以这样，核心标签增删改查 + 基础筛选 8 个工作日，高级筛选和批量操作可以放到 V2.5.1。', int: false, sil: 0 },
      { spk: 3, text: '测试这边要提醒一下，标签体系涉及历史数据迁移，一定要准备充分的回归测试用例。另外移动端审批流需要适配多种机型，兼容性测试工作量不小。', int: false, sil: 0 },
      { spk: 2, text: '移动端我补充一点，我们的设计规范在 iOS 和安卓上差异比较大，这次要不要统一一下？', int: true, sil: 0 },
      { spk: 0, text: '好问题，我觉得可以趁这次做一次规范统一，虽然会多 2 天设计时间，但长期来看是值得的。郭鹏，研发这边对统一设计规范有什么看法？', int: false, sil: 2 },
      { spk: 1, text: '我们支持统一规范，但是要预留重构的时间，大概 3 个工作日。而且需要设计先出规范文档，我们再动手。', int: false, sil: 0 },
      { spk: 3, text: '这样一来整体排期会不会紧张？原本说的是 8 月底上线，我粗算一下现在加起来差不多要 6 周了。', int: false, sil: 0 },
      { spk: 0, text: '我来捋一下：设计 15 天、研发 20 天（并行）、测试 10 天。8 月底上线没问题，关键是设计规范这周必须先定稿。还有问题吗？', int: false, sil: 0 },
      { spk: 1, text: '没有了，按这个节奏来。', int: false, sil: 0 }
    ],
    topics: [
      { title: 'V2.5 版本需求范围对齐', summary: '确认三大模块：数据看板升级、移动端审批流、客户标签体系。' },
      { title: '设计与研发工作量评估', summary: '设计约 15 天（含设计规范统一），研发核心标签 8 天+高级功能后续迭代，移动端和看板合计约 20 天。' },
      { title: '风险与质量关注点', summary: '客户标签底层数据模型改动风险高，需重点回归测试；移动端多机型兼容性测试工作量大；历史数据迁移需充分验证。' },
      { title: '排期与里程碑确认', summary: '整体 8 月底上线；关键里程碑：设计规范本周定稿 → 研发 6 周 → 测试 2 周。' }
    ],
    questions: [
      { content: '客户标签体系能否分期上线？', category: '排期策略', priority: 'high' as const },
      { content: '移动端设计规范是否可以统一？', category: '长期架构', priority: 'medium' as const },
      { content: '历史数据迁移的测试覆盖度如何保证？', category: '质量风险', priority: 'high' as const },
      { content: '8 月底上线目标是否可达成？', category: '排期确认', priority: 'high' as const }
    ],
    followUps: [
      { content: '本周内完成移动端设计规范统一文档并发布', responsible: '何雪', deadline: '本周五 18:00', status: 'pending' as const },
      { content: '拆分客户标签体系为 V2.5 核心版 + V2.5.1 增强版', responsible: '林涛', deadline: '本周三 18:00', status: 'in_progress' as const },
      { content: '准备标签数据迁移脚本和回滚方案', responsible: '郭鹏', deadline: '测试前', status: 'pending' as const },
      { content: '制定 V2.5 版本测试计划（含兼容性和回归）', responsible: '郑华', deadline: '7月20日', status: 'pending' as const },
      { content: '每周同步 V2.5 进度，风险提前预警', responsible: '林涛', deadline: '版本上线前', status: 'pending' as const }
    ]
  }
]

const COMMENT_TEMPLATES = [
  '会议目标明确，开场即说明会议目的和议程。',
  '整体节奏把控良好，议题讨论充分。',
  '需求挖掘比较深入，触及了客户的核心顾虑。',
  '方案匹配度较好，回答了客户关心的大部分问题。',
  '沟通中出现少量打断，建议适当控制发言顺序。',
  '异议处理比较专业，给出了有说服力的回答。',
  '下一步行动非常清晰，有人负责、有时间节点。',
  '可以进一步追问客户的预算和决策链信息。',
  '部分议题讨论时间偏长，建议下次做好时间控制。',
  '会前准备充分，材料和数据都比较齐全。'
]

export function generateMeetingFromMedia(
  mediaFile: MediaFile,
  title?: string,
  date?: string
): Meeting {
  const seed = hashString(mediaFile.name + mediaFile.size + mediaFile.path)
  const scenario = pick(SCENARIOS, seed)

  const speakers: Speaker[] = scenario.speakers.map((s, i) => ({
    id: `s${i}`,
    name: s.name,
    role: s.role,
    color: COLORS[i % COLORS.length]
  }))

  let timeCursor = 0
  const transcripts: TranscriptSegment[] = []
  const shuffledDialogues = shuffle(scenario.dialogues, seed)

  shuffledDialogues.forEach((d, idx) => {
    if (d.sil > 0) {
      const silenceStart = timeCursor
      timeCursor += d.sil
      transcripts.push({
        id: `sil${idx}`,
        speakerId: speakers[d.spk].id,
        startTime: silenceStart,
        endTime: timeCursor,
        text: '',
        isSilence: true
      })
    }
    const duration = Math.max(8, Math.round((d.text.length / 5) + (seed % 10)))
    const start = timeCursor
    const end = start + duration
    transcripts.push({
      id: `t${idx}`,
      speakerId: speakers[d.spk].id,
      startTime: start,
      endTime: end,
      text: d.text,
      isInterruption: d.int
    })
    timeCursor = end
  })

  const totalDuration = timeCursor
  const topicsCount = scenario.topics.length
  const topics: Topic[] = scenario.topics.map((t, idx) => {
    const tStart = Math.round((idx / topicsCount) * totalDuration)
    const tEnd = Math.round(((idx + 1) / topicsCount) * totalDuration)
    const segIds = transcripts
      .filter(tr => !tr.isSilence && tr.startTime >= tStart && tr.startTime < tEnd)
      .map(tr => tr.id)
    return {
      id: `top${idx}`,
      title: t.title,
      startTime: tStart,
      endTime: tEnd,
      summary: t.summary,
      segmentIds: segIds
    }
  })

  const transcriptIds = transcripts.filter(t => !t.isSilence).map(t => t.id)
  const questions: CustomerQuestion[] = scenario.questions.map((q, idx) => ({
    id: `q${idx}`,
    content: q.content,
    segmentId: transcriptIds[idx % transcriptIds.length] || transcriptIds[0],
    category: q.category,
    priority: q.priority
  }))

  const followUps: FollowUpAction[] = scenario.followUps.map((f, idx) => ({
    id: `f${idx}`,
    content: f.content,
    responsible: f.responsible,
    deadline: f.deadline,
    status: f.status
  }))

  const baseScore = 65 + (seed % 30)
  const scoreItems: ScoreItem[] = [
    { id: 'si1', name: '会议目标清晰度', score: 0, maxScore: 10, weight: 0.15, comment: '' },
    { id: 'si2', name: '客户需求挖掘深度', score: 0, maxScore: 10, weight: 0.20, comment: '' },
    { id: 'si3', name: '解决方案匹配度', score: 0, maxScore: 10, weight: 0.20, comment: '' },
    { id: 'si4', name: '沟通效率与节奏', score: 0, maxScore: 10, weight: 0.15, comment: '' },
    { id: 'si5', name: '异议处理能力', score: 0, maxScore: 10, weight: 0.15, comment: '' },
    { id: 'si6', name: '下一步行动明确度', score: 0, maxScore: 10, weight: 0.15, comment: '' }
  ].map((item, idx) => {
    const variance = ((seed >> (idx * 2)) & 7) - 2
    const score = Math.max(5, Math.min(10, Math.round(baseScore / 10) + variance))
    const comment = shuffle(COMMENT_TEMPLATES, seed + idx)[0]
    return { ...item, score, comment }
  })

  const totalWeighted = scoreItems.reduce((sum, item) => sum + (item.score / item.maxScore) * item.weight * 100, 0)

  const clipCandidates = transcripts.filter(t => !t.isSilence && t.text.length > 20)
  const clips: Clip[] = shuffle(clipCandidates, seed).slice(0, 3 + (seed % 2)).map((t, idx) => ({
    id: `c${idx}`,
    name: t.text.slice(0, 20) + (t.text.length > 20 ? '...' : ''),
    startTime: t.startTime,
    endTime: t.endTime,
    transcript: t.text,
    isFavorite: idx === 0,
    tags: shuffle(['客户痛点', '需求', '异议处理', '最佳实践', '关键信息', '会议收尾', '推进技巧'], seed + idx).slice(0, 2),
    createdAt: new Date().toLocaleString('zh-CN')
  }))

  const meetingId = `m_${Date.now()}_${seed}`
  const now = new Date().toISOString()

  return {
    id: meetingId,
    title: title || (mediaFile.name.replace(/\.[^.]+$/, '') || scenario.title),
    date: date || new Date().toLocaleString('zh-CN', { hour12: false }).slice(0, 16).replace(/\//g, '-'),
    description: scenario.description,
    objectives: [...scenario.objectives],
    mediaFile,
    speakers,
    transcripts,
    topics,
    questions,
    followUps,
    score: {
      overall: Math.round(totalWeighted),
      items: scoreItems,
      totalWeighted
    },
    clips,
    manualReview: '',
    createdAt: now,
    updatedAt: now
  }
}

export { createMockMeeting } from './mockData'
