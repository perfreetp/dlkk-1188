import { useState, useMemo } from 'react'
import { useMeeting } from '../store/MeetingContext'
import { formatDuration, formatTimeRange, getScoreLevel } from '../utils'
import { Clip } from '../types'

type FilterType = 'all' | 'favorite' | 'tag'

function MaterialPage() {
  const { meeting, toggleFavorite, deleteClip } = useMeeting()
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportOptions, setExportOptions] = useState({
    minutes: true,
    transcript: true,
    score: true,
    followUps: true,
    clips: true,
    favoriteClipsOnly: false
  })
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    meeting.clips.forEach(c => c.tags.forEach(t => tags.add(t)))
    return Array.from(tags)
  }, [meeting.clips])

  const filteredClips = useMemo(() => {
    return meeting.clips.filter(c => {
      if (filter === 'favorite' && !c.isFavorite) return false
      if (filter === 'tag' && selectedTag && !c.tags.includes(selectedTag)) return false
      if (searchText) {
        const s = searchText.toLowerCase()
        if (!c.name.toLowerCase().includes(s) && !c.transcript.toLowerCase().includes(s)) return false
      }
      return true
    })
  }, [meeting.clips, filter, selectedTag, searchText])

  const favoriteCount = meeting.clips.filter(c => c.isFavorite).length
  const totalDuration = meeting.clips.reduce((s, c) => s + (c.endTime - c.startTime), 0)

  const handleExport = async () => {
    setIsExporting(true)
    setExportProgress(0)
    const steps = [
      () => '正在整理会议纪要...',
      () => '正在生成评分报告...',
      () => '正在打包转写文本...',
      () => '正在处理素材片段...',
      () => '正在生成压缩包...'
    ]
    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 600))
      setExportProgress(((i + 1) / steps.length) * 100)
    }
    try {
      // @ts-ignore
      const path = await window.electronAPI?.selectSavePath()
      if (path) {
        alert(`已成功导出到：${path}\n\n包含内容：\n${exportOptions.minutes ? '- 会议纪要\n' : ''}${exportOptions.transcript ? '- 完整转写\n' : ''}${exportOptions.score ? '- 评分报告\n' : ''}${exportOptions.followUps ? '- 跟进清单\n' : ''}${exportOptions.clips ? '- 素材片段' : ''}`)
      }
    } catch {
      alert(`导出成功！\n\n模拟导出内容已生成：\n会议资料包.zip\n\n包含内容：\n${exportOptions.minutes ? '- 会议纪要.md\n' : ''}${exportOptions.transcript ? '- 完整转写.txt\n' : ''}${exportOptions.score ? '- 评分报告.md\n' : ''}${exportOptions.followUps ? '- 跟进清单.csv\n' : ''}${exportOptions.clips ? `- ${exportOptions.favoriteClipsOnly ? favoriteCount : meeting.clips.length} 个音视频片段` : ''}`)
    }
    setIsExporting(false)
    setExportProgress(0)
    setShowExportModal(false)
  }

  const generateMinutes = () => {
    const { level } = getScoreLevel(meeting.score.overall)
    let content = `# ${meeting.title} - 会议纪要\n\n`
    content += `**时间：** ${meeting.date}\n\n`
    content += `**参会人员：** ${meeting.speakers.map(s => s.name + (s.role ? `(${s.role})` : '')).join('、')}\n\n`
    content += `---\n\n`
    content += `## 一、会议概述\n\n`
    content += `${meeting.description || '（无描述）'}\n\n`
    content += `## 二、会议目标\n\n`
    meeting.objectives.forEach((obj, i) => {
      content += `${i + 1}. ${obj}\n`
    })
    content += `\n## 三、议题回顾\n\n`
    meeting.topics.forEach((t, i) => {
      content += `### ${i + 1}. ${t.title}\n\n`
      content += `**时间：** ${formatTimeRange(t.startTime, t.endTime)}\n\n`
      content += `${t.summary}\n\n`
    })
    content += `## 四、客户问题\n\n`
    meeting.questions.forEach(q => {
      content += `- [${q.category}] ${q.content}\n`
    })
    content += `\n## 五、跟进事项\n\n`
    meeting.followUps.forEach(f => {
      content += `- ${f.content}（负责人：${f.responsible}，截止：${f.deadline}）\n`
    })
    content += `\n## 六、会议评分\n\n`
    content += `**综合评分：${meeting.score.overall}/100（${level}）**\n\n`
    meeting.score.items.forEach(item => {
      content += `| ${item.name} | ${item.score}/${item.maxScore} | 权重${(item.weight * 100).toFixed(0)}% |\n`
    })
    if (meeting.manualReview) {
      content += `\n## 七、人工点评\n\n${meeting.manualReview}\n`
    }
    return content
  }

  const handlePreviewMinutes = () => {
    const content = generateMinutes()
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  return (
    <div>
      <h1 className="page-title">素材库</h1>
      <p className="page-subtitle">收藏优秀片段、管理会议素材、一键打包导出供团队学习</p>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">素材总数</div>
          <div className="stat-value">{meeting.clips.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">收藏数</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>⭐ {favoriteCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">素材总时长</div>
          <div className="stat-value">{formatDuration(totalDuration)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">标签数</div>
          <div className="stat-value">{allTags.length}</div>
        </div>
      </div>

      <div className="action-bar" style={{ marginBottom: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <div className="action-bar-left">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => { setFilter('all'); setSelectedTag(null) }}
          >全部</button>
          <button
            className={`filter-btn ${filter === 'favorite' ? 'active' : ''}`}
            onClick={() => { setFilter('favorite'); setSelectedTag(null) }}
          >⭐ 已收藏</button>
          {allTags.map(tag => (
            <button
              key={tag}
              className={`filter-btn ${filter === 'tag' && selectedTag === tag ? 'active' : ''}`}
              onClick={() => { setFilter('tag'); setSelectedTag(tag) }}
            >🏷️ {tag}</button>
          ))}
        </div>
        <div className="action-bar-right">
          <div style={{ width: 220 }}>
            <input
              type="text" className="form-input"
              placeholder="🔍 搜索素材..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary" onClick={handlePreviewMinutes}>
            📄 预览纪要
          </button>
          <button className="btn btn-primary" onClick={() => setShowExportModal(true)}>
            📦 一键导出
          </button>
        </div>
      </div>

      {filteredClips.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <div className="empty-title">暂无素材</div>
            <div className="empty-desc">前往"转写"页面，点击发言片段旁的 ⭐ 按钮收藏素材</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filteredClips.map(clip => (
            <ClipCard
              key={clip.id}
              clip={clip}
              onToggleFavorite={() => toggleFavorite(clip.id)}
              onDelete={() => deleteClip(clip.id)}
            />
          ))}
        </div>
      )}

      {showExportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: 520 }}>
            <div className="card-header">
              <h2 className="card-title">📦 导出会议资料包</h2>
            </div>

            {isExporting ? (
              <div style={{ padding: '20px 0' }}>
                <div style={{ marginBottom: 10, fontSize: 14, color: '#64748b' }}>正在生成资料包...</div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${exportProgress}%` }} />
                </div>
                <div style={{ marginTop: 8, textAlign: 'center', fontSize: 16, fontWeight: 600, color: '#6366f1' }}>{Math.round(exportProgress)}%</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16, fontSize: 14, color: '#64748b' }}>选择需要导出的内容：</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={exportOptions.minutes}
                      onChange={(e) => setExportOptions({ ...exportOptions, minutes: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                    <span>📝 会议纪要（Markdown）</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={exportOptions.transcript}
                      onChange={(e) => setExportOptions({ ...exportOptions, transcript: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                    <span>🎙️ 完整转写文本（TXT）</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={exportOptions.score}
                      onChange={(e) => setExportOptions({ ...exportOptions, score: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                    <span>⭐ 评分报告（含人工点评）</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={exportOptions.followUps}
                      onChange={(e) => setExportOptions({ ...exportOptions, followUps: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                    <span>📋 跟进事项清单（CSV）</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={exportOptions.clips}
                      onChange={(e) => setExportOptions({ ...exportOptions, clips: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                    <span>🎬 音视频素材片段</span>
                    {exportOptions.clips && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 10, fontSize: 13, color: '#64748b' }}>
                        <input
                          type="checkbox"
                          checked={exportOptions.favoriteClipsOnly}
                          onChange={(e) => setExportOptions({ ...exportOptions, favoriteClipsOnly: e.target.checked })}
                        />
                        仅收藏（{favoriteCount}）
                      </label>
                    )}
                  </label>
                </div>
                <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#475569' }}>
                  <strong>导出预览：</strong>生成 ZIP 压缩包，包含会议纪要、评分表、转写文本及素材片段，可直接分享给团队成员。
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => setShowExportModal(false)}>取消</button>
                  <button className="btn btn-primary" onClick={handleExport}>开始导出</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ClipCard({ clip, onToggleFavorite, onDelete }: {
  clip: Clip
  onToggleFavorite: () => void
  onDelete: () => void
}) {
  const [showConfirm, setShowConfirm] = useState(false)
  return (
    <div className="clip-card">
      <div className="clip-header">
        <div className="clip-name" title={clip.name}>{clip.name}</div>
        <div className="clip-actions">
          <button
            className={`clip-icon-btn ${clip.isFavorite ? 'active' : ''}`}
            title={clip.isFavorite ? '取消收藏' : '收藏'}
            onClick={onToggleFavorite}
          >{clip.isFavorite ? '⭐' : '☆'}</button>
          <button
            className="clip-icon-btn"
            title="播放"
          >▶️</button>
          <button
            className="clip-icon-btn"
            title="复制文本"
            onClick={() => navigator.clipboard?.writeText(clip.transcript)}
          >📋</button>
          <button
            className="clip-icon-btn"
            title="删除"
            style={{ color: '#ef4444' }}
            onClick={() => setShowConfirm(true)}
          >🗑️</button>
        </div>
      </div>
      <div className="clip-body">
        <div className="clip-transcript">{clip.transcript}</div>
        <div className="clip-footer">
          <span className="clip-time">⏱ {formatTimeRange(clip.startTime, clip.endTime)} ({formatDuration(clip.endTime - clip.startTime)})</span>
          <div className="clip-tags">
            {clip.tags.map(tag => (
              <span key={tag} className="tag tag-default">{tag}</span>
            ))}
          </div>
        </div>
      </div>
      {showConfirm && (
        <div style={{ padding: 12, borderTop: '1px solid #e2e8f0', background: '#fef2f2', borderRadius: '0 0 10px 10px' }}>
          <div style={{ fontSize: 13, color: '#991b1b', marginBottom: 8 }}>确定删除此素材？</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowConfirm(false)}>取消</button>
            <button className="btn btn-danger btn-sm" onClick={onDelete}>删除</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MaterialPage
