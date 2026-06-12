import JSZip from 'jszip'
import { Meeting } from '../types'
import { formatDuration, formatTimeRange, getScoreLevel } from './index'

function generateMinutesMarkdown(meeting: Meeting): string {
  const { level } = getScoreLevel(meeting.score.overall)
  let md = `# ${meeting.title} - 会议纪要\n\n`
  md += `> 本文件由 AI 会议复盘工具自动生成\n\n`
  md += `| 项目 | 内容 |\n| --- | --- |\n`
  md += `| **会议时间** | ${meeting.date} |\n`
  md += `| **参会人员** | ${meeting.speakers.map(s => s.name + (s.role ? `（${s.role}）` : '')).join('、')} |\n`
  md += `| **媒体文件** | ${meeting.mediaFile?.name || '无'} |\n`
  md += `| **会议时长** | ${formatDuration(meeting.transcripts.length > 0 ? meeting.transcripts[meeting.transcripts.length - 1].endTime : 0)} |\n`
  md += `| **综合评分** | ${meeting.score.overall}/100（${level}） |\n\n`
  md += `---\n\n`

  md += `## 一、会议概述\n\n`
  md += `${meeting.description || '（无描述）'}\n\n`

  md += `## 二、会议目标\n\n`
  if (meeting.objectives.length === 0) {
    md += `（未设置会议目标）\n\n`
  } else {
    meeting.objectives.forEach((obj, i) => {
      md += `${i + 1}. ${obj}\n`
    })
    md += '\n'
  }

  md += `## 三、议题回顾\n\n`
  meeting.topics.forEach((t, i) => {
    md += `### ${i + 1}. ${t.title}\n\n`
    md += `- **时间**：${formatTimeRange(t.startTime, t.endTime)}（${formatDuration(t.endTime - t.startTime)}）\n\n`
    md += `${t.summary}\n\n`
  })

  md += `## 四、客户问题汇总\n\n`
  if (meeting.questions.length === 0) {
    md += `（本次会议未提取到客户问题）\n\n`
  } else {
    md += `| 优先级 | 类别 | 问题内容 |\n| --- | --- | --- |\n`
    meeting.questions.forEach(q => {
      const p = q.priority === 'high' ? '🔴 高' : q.priority === 'medium' ? '🟡 中' : '🟢 低'
      md += `| ${p} | ${q.category} | ${q.content} |\n`
    })
    md += '\n'
  }

  md += `## 五、跟进事项\n\n`
  if (meeting.followUps.length === 0) {
    md += `（暂无跟进事项）\n\n`
  } else {
    md += `| 状态 | 内容 | 负责人 | 截止时间 |\n| --- | --- | --- | --- |\n`
    meeting.followUps.forEach(f => {
      const s = f.status === 'completed' ? '✅ 已完成' : f.status === 'in_progress' ? '🔄 进行中' : '⏳ 待处理'
      md += `| ${s} | ${f.content} | ${f.responsible} | ${f.deadline} |\n`
    })
    md += '\n'
  }

  md += `## 六、会议评分报告\n\n`
  md += `### 综合评分：${meeting.score.overall}/100 —— ${level}\n\n`
  md += `| 评分维度 | 得分 | 权重 | 评语 |\n| --- | --- | --- | --- |\n`
  meeting.score.items.forEach(item => {
    md += `| ${item.name} | ${item.score}/${item.maxScore} | ${(item.weight * 100).toFixed(0)}% | ${item.comment || '-'} |\n`
  })
  md += '\n'

  if (meeting.manualReview && meeting.manualReview.trim()) {
    md += `## 七、人工点评\n\n`
    md += `${meeting.manualReview}\n\n`
  }

  return md
}

function generateTranscriptText(meeting: Meeting): string {
  let txt = `=====================================\n`
  txt += `${meeting.title} - 会议完整转写\n`
  txt += `生成时间：${new Date().toLocaleString('zh-CN')}\n`
  txt += `=====================================\n\n`

  meeting.transcripts.forEach(t => {
    const speaker = meeting.speakers.find(s => s.id === t.speakerId)
    const time = formatTimeRange(t.startTime, t.endTime)
    if (t.isSilence) {
      txt += `[${time}] （沉默 ${formatDuration(t.endTime - t.startTime)}）\n\n`
    } else {
      const name = speaker?.name || '未知发言人'
      const mark = t.isInterruption ? ' ⚠️[打断]' : ''
      txt += `[${time}] ${name}${mark}：\n${t.text}\n\n`
    }
  })

  txt += `========== 转写结束 ==========\n`
  return txt
}

function generateScoreReportMarkdown(meeting: Meeting): string {
  const { level, desc } = getScoreLevel(meeting.score.overall)
  let md = `# ${meeting.title} - 评分报告\n\n`
  md += `## 综合评价\n\n`
  md += `| 项目 | 内容 |\n| --- | --- |\n`
  md += `| **综合评分** | **${meeting.score.overall}/100** |\n`
  md += `| **评级** | ${level} |\n`
  md += `| **评价** | ${desc} |\n\n`

  md += `## 分项评分详情\n\n`
  meeting.score.items.forEach(item => {
    const pct = (item.score / item.maxScore) * 100
    const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5))
    md += `### ${item.name}（权重 ${(item.weight * 100).toFixed(0)}%）\n\n`
    md += `\`${bar}\` **${item.score}/${item.maxScore}**（${pct.toFixed(0)}%）\n\n`
    if (item.comment) md += `> 💡 ${item.comment}\n\n`
  })

  if (meeting.manualReview) {
    md += `## 人工点评\n\n${meeting.manualReview}\n\n`
  }

  return md
}

function generateFollowUpsCSV(meeting: Meeting): string {
  let csv = '\uFEFF' + '状态,内容,负责人,截止时间\n'
  meeting.followUps.forEach(f => {
    const s = f.status === 'completed' ? '已完成' : f.status === 'in_progress' ? '进行中' : '待处理'
    const content = `"${f.content.replace(/"/g, '""')}"`
    csv += `${s},${content},"${f.responsible}","${f.deadline}"\n`
  })
  return csv
}

function generateClipsIndexMarkdown(meeting: Meeting, onlyFavorite: boolean): string {
  const clips = onlyFavorite ? meeting.clips.filter(c => c.isFavorite) : meeting.clips
  let md = `# 素材片段索引\n\n`
  md += `共 ${clips.length} 个片段${onlyFavorite ? '（仅收藏）' : ''}\n\n`

  if (clips.length === 0) {
    md += `（暂无素材）\n`
    return md
  }

  clips.forEach((c, idx) => {
    md += `## ${idx + 1}. ${c.name}${c.isFavorite ? ' ⭐' : ''}\n\n`
    md += `- **时间**：${formatTimeRange(c.startTime, c.endTime)}（${formatDuration(c.endTime - c.startTime)}）\n`
    if (c.tags.length > 0) md += `- **标签**：${c.tags.map(t => `\`${t}\``).join(' ')}\n`
    md += `- **创建时间**：${c.createdAt}\n\n`
    md += `> ${c.transcript}\n\n`
  })

  return md
}

function generateClipTranscriptText(meeting: Meeting, onlyFavorite: boolean): string {
  const clips = onlyFavorite ? meeting.clips.filter(c => c.isFavorite) : meeting.clips
  let txt = `素材片段文本内容\n\n`
  clips.forEach((c, idx) => {
    txt += `【${idx + 1}】${c.name}${c.isFavorite ? ' ⭐' : ''}\n`
    txt += `时间：${formatTimeRange(c.startTime, c.endTime)}\n`
    txt += `标签：${c.tags.join('、') || '无'}\n`
    txt += `${c.transcript}\n\n`
  })
  return txt
}

export interface ExportOptions {
  minutes: boolean
  transcript: boolean
  score: boolean
  followUps: boolean
  clips: boolean
  favoriteClipsOnly: boolean
}

export async function buildExportZip(
  meeting: Meeting,
  options: ExportOptions
): Promise<ArrayBuffer> {
  const zip = new JSZip()
  const baseName = meeting.title.replace(/[\\/:*?"<>|]/g, '_') || '会议资料'
  const folder = zip.folder(baseName) || zip

  if (options.minutes) {
    folder.file('1-会议纪要.md', generateMinutesMarkdown(meeting))
  }
  if (options.score) {
    folder.file('2-评分报告.md', generateScoreReportMarkdown(meeting))
  }
  if (options.transcript) {
    folder.file('3-完整转写.txt', generateTranscriptText(meeting))
  }
  if (options.followUps) {
    folder.file('4-跟进清单.csv', generateFollowUpsCSV(meeting))
  }
  if (options.clips) {
    const sub = folder.folder('5-素材片段') || folder
    sub.file('素材索引.md', generateClipsIndexMarkdown(meeting, options.favoriteClipsOnly))
    sub.file('素材文本内容.txt', generateClipTranscriptText(meeting, options.favoriteClipsOnly))
  }

  folder.file('README.txt', `AI 会议复盘工具 - 资料导出包
生成时间：${new Date().toLocaleString('zh-CN')}
会议主题：${meeting.title}
会议时间：${meeting.date}

文件说明：
- 1-会议纪要.md：Markdown 格式的完整会议纪要
- 2-评分报告.md：多维度评分报告，含图表和评语
- 3-完整转写.txt：逐句转写文本（含发言人、时间戳、打断/沉默标记）
- 4-跟进清单.csv：Excel 可打开的跟进事项清单
- 5-素材片段/：收藏的精彩片段索引与文本
`)

  const blob = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  return blob
}
