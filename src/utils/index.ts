export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function formatTimeRange(start: number, end: number): string {
  return `${formatDuration(start)} - ${formatDuration(end)}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function getInitials(name: string): string {
  if (!name) return '?'
  const trimmed = name.trim()
  if (trimmed.length <= 2) return trimmed
  return trimmed.charAt(0)
}

export function getScoreLevel(score: number): { level: string; desc: string } {
  if (score >= 90) return { level: '优秀', desc: '会议整体表现非常出色，目标达成度高，沟通高效，建议将优秀片段作为团队培训案例。' }
  if (score >= 80) return { level: '良好', desc: '会议整体表现良好，主要目标已达成，部分细节可以进一步优化。' }
  if (score >= 70) return { level: '合格', desc: '会议基本达成预期目标，但在沟通效率、需求挖掘等方面有较大提升空间。' }
  if (score >= 60) return { level: '待改进', desc: '会议效果未达预期，建议复盘改进点，加强会前准备和会中节奏把控。' }
  return { level: '不合格', desc: '会议存在较多问题，建议重新审视会议目标和流程设计。' }
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  return dateStr
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}
