import { useState, useMemo } from 'react'
import { useMeeting } from '../store/MeetingContext'
import { formatDuration, formatTimeRange, getScoreLevel } from '../utils'
import { buildExportZip, ExportOptions } from '../utils/export'
import { Clip } from '../types'

type FilterType = 'all' | 'favorite' | 'tag'

function MaterialPage() {
  const { meeting, toggleFavorite, deleteClip, saveCurrentToHistory, isSaving, lastSavedAt } = useMeeting()
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    minutes: true,
    transcript: true,
    score: true,
    followUps: true,
    clips: true,
    favoriteClipsOnly: false
  })
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStatus, setExportStatus] = useState('')
  const [exportResult, setExportResult] = useState<{ success: boolean; message: string } | null>(null)
  const [selectedClipIds, setSelectedClipIds] = useState<Set<string>>(new Set())

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

  const toggleClipSelection = (clipId: string) => {
    setSelectedClipIds(prev => {
      const next = new Set(prev)
      if (next.has(clipId)) {
        next.delete(clipId)
      } else {
        next.add(clipId)
      }
      return next
    })
  }

  const selectAllVisible = () => {
    setSelectedClipIds(prev => {
      const next = new Set(prev)
      filteredClips.forEach(c => next.add(c.id))
      return next
    })
  }

  const deselectAllVisible = () => {
    setSelectedClipIds(prev => {
      const next = new Set(prev)
      filteredClips.forEach(c => next.delete(c.id))
      return next
    })
  }

  const clearSelection = () => {
    setSelectedClipIds(new Set())
  }

  const getSelectedItemsCount = () => {
    let n = 0
    if (exportOptions.minutes) n++
    if (exportOptions.transcript) n++
    if (exportOptions.score) n++
    if (exportOptions.followUps) n++
    if (exportOptions.clips) n++
    return n
  }

  const handleExport = async () => {
    if (getSelectedItemsCount() === 0) {
      alert('请至少选择一项导出内容')
      return
    }
    setIsExporting(true)
    setExportProgress(0)
    setExportStatus('正在整理资料...')
    setExportResult(null)

    try {
      const defaultName = (meeting.title || '会议资料包').replace(/[\\/:*?"<>|]/g, '_')

      setExportStatus('正在生成资料包...')
      setExportProgress(25)
      const finalOptions: ExportOptions = {
        ...exportOptions,
        selectedClipIds: selectedClipIds.size > 0 ? Array.from(selectedClipIds) : undefined
      }
      const zipBuffer = await buildExportZip(meeting, finalOptions)

      setExportStatus('正在选择保存位置...')
      setExportProgress(60)

      let savePath: string | null = null
      try {
        // @ts-ignore
        if (window.electronAPI?.selectSaveZipPath) {
          // @ts-ignore
          savePath = await window.electronAPI.selectSaveZipPath(defaultName)
        }
      } catch (e) {
        console.warn('选择保存路径失败，将使用浏览器下载', e)
      }

      if (!savePath) {
        setExportStatus('正在浏览器下载...')
        setExportProgress(80)
        const blob = new Blob([zipBuffer], { type: 'application/zip' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = defaultName + '.zip'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        setExportProgress(100)
        setExportResult({ success: true, message: `浏览器已开始下载：${defaultName}.zip` })
      } else {
        setExportStatus('正在写入本地文件...')
        setExportProgress(80)
        // @ts-ignore
        const result = await window.electronAPI.writeBinaryFile(savePath, zipBuffer)
        setExportProgress(100)
        if (result?.success) {
          setExportResult({ success: true, message: `资料包已成功保存到：\n${savePath}` })
        } else {
          setExportResult({ success: false, message: `保存失败：${result?.error || '未知错误'}\n请尝试更换保存路径。` })
        }
      }
    } catch (e: any) {
      console.error('导出失败', e)
      setExportResult({ success: false, message: `导出失败：${e?.message || String(e)}` })
    } finally {
      setIsExporting(false)
      setExportProgress(0)
      setExportStatus('')
      if (exportResult?.success) {
        setTimeout(() => {
          setShowExportModal(false)
          setExportResult(null)
        }, 3000)
      }
    }
  }

  const generateMinutesPreview = () => {
    const { level } = getScoreLevel(meeting.score.overall)
    let content = `# ${meeting.title} - 会议纪要\n\n`
    content += `> 预览（实际导出文件内容更完整）\n\n`
    content += `**时间：** ${meeting.date}\n\n`
    content += `**参会人员：** ${meeting.speakers.map(s => s.name + (s.role ? `（${s.role}）` : '')).join('、')}\n\n`
    content += `**综合评分：${meeting.score.overall}/100（${level}）**\n\n`
    content += `---\n\n`
    content += `## 会议概述\n${meeting.description || '（无描述）'}\n\n`
    content += `## 议题回顾（${meeting.topics.length}个）\n`
    meeting.topics.slice(0, 3).forEach((t, i) => {
      content += `${i + 1}. **${t.title}** — ${formatTimeRange(t.startTime, t.endTime)}\n`
    })
    if (meeting.topics.length > 3) content += `... 共 ${meeting.topics.length} 个议题\n`
    content += `\n## 跟进事项（${meeting.followUps.length}项）\n`
    meeting.followUps.slice(0, 3).forEach((f, i) => {
      content += `${i + 1}. ${f.content}（${f.responsible}）\n`
    })
    return content
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>素材库</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>收藏优秀片段、管理会议素材、一键打包导出供团队学习</p>
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

      <div className="grid-4" style={{ marginBottom: 24, marginTop: 16 }}>
        <div className="stat-card">
          <div className="stat-label">素材总数</div>
          <div className="stat-value">{meeting.clips.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">收藏数</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>⭐ {favoriteCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">已勾选</div>
          <div className="stat-value" style={{ color: selectedClipIds.size > 0 ? '#6366f1' : '#1e293b' }}>☑️ {selectedClipIds.size}</div>
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
          <div style={{ marginLeft: 12, display: 'flex', gap: 6, borderLeft: '1px solid #e2e8f0', paddingLeft: 12 }}>
            <button className="btn btn-outline btn-sm" onClick={selectAllVisible} title="全选当前筛选结果">
              ☑️ 全选当前
            </button>
            <button className="btn btn-outline btn-sm" onClick={deselectAllVisible} title="取消当前筛选结果的勾选">
              ⬜ 取消当前
            </button>
            <button className="btn btn-outline btn-sm" onClick={clearSelection} title="清空所有勾选">
              清空勾选
            </button>
          </div>
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
          <button className="btn btn-secondary" onClick={() => {
            const text = generateMinutesPreview()
            const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            window.open(url, '_blank')
            setTimeout(() => URL.revokeObjectURL(url), 5000)
          }}>
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
              isSelected={selectedClipIds.has(clip.id)}
              onToggleFavorite={() => toggleFavorite(clip.id)}
              onDelete={() => deleteClip(clip.id)}
              onToggleSelect={() => toggleClipSelection(clip.id)}
            />
          ))}
        </div>
      )}

      {showExportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: 560, maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="card-header">
              <h2 className="card-title">📦 导出会议资料包</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => { setShowExportModal(false); setExportResult(null) }}>✕</button>
            </div>

            {isExporting ? (
              <div style={{ padding: '20px 0' }}>
                <div style={{ marginBottom: 10, fontSize: 14, color: '#64748b' }}>{exportStatus}</div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${exportProgress}%` }} />
                </div>
                <div style={{ marginTop: 8, textAlign: 'center', fontSize: 16, fontWeight: 600, color: '#6366f1' }}>{Math.round(exportProgress)}%</div>
              </div>
            ) : exportResult ? (
              <div style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>{exportResult.success ? '✅' : '❌'}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: exportResult.success ? '#15803d' : '#991b1b', marginBottom: 12 }}>
                  {exportResult.success ? '导出成功' : '导出失败'}
                </div>
                <div style={{ fontSize: 14, color: '#475569', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                  {exportResult.message}
                </div>
                {exportResult.success && (
                  <div style={{ marginTop: 16, fontSize: 12, color: '#64748b' }}>
                    本窗口将在 3 秒后自动关闭
                  </div>
                )}
                {!exportResult.success && (
                  <div style={{ marginTop: 20 }}>
                    <button className="btn btn-secondary" onClick={() => setExportResult(null)}>返回重新导出</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16, fontSize: 14, color: '#64748b' }}>选择需要导出的内容：</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: 10, borderRadius: 8, background: exportOptions.minutes ? '#eef2ff' : '#f8fafc' }}>
                    <input
                      type="checkbox"
                      checked={exportOptions.minutes}
                      onChange={(e) => setExportOptions({ ...exportOptions, minutes: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: '#1e293b' }}>📝 会议纪要（Markdown）</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>包含会议概述、议题回顾、问题汇总、跟进事项、评分等</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: 10, borderRadius: 8, background: exportOptions.transcript ? '#eef2ff' : '#f8fafc' }}>
                    <input
                      type="checkbox"
                      checked={exportOptions.transcript}
                      onChange={(e) => setExportOptions({ ...exportOptions, transcript: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: '#1e293b' }}>🎙️ 完整转写（TXT）</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>逐句语音转写，带发言人、时间戳、打断/沉默标记</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: 10, borderRadius: 8, background: exportOptions.score ? '#eef2ff' : '#f8fafc' }}>
                    <input
                      type="checkbox"
                      checked={exportOptions.score}
                      onChange={(e) => setExportOptions({ ...exportOptions, score: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: '#1e293b' }}>⭐ 评分报告（含人工点评）</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>6 维度分项评分、可视化分数条、AI 评语和人工点评</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: 10, borderRadius: 8, background: exportOptions.followUps ? '#eef2ff' : '#f8fafc' }}>
                    <input
                      type="checkbox"
                      checked={exportOptions.followUps}
                      onChange={(e) => setExportOptions({ ...exportOptions, followUps: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: '#1e293b' }}>📋 跟进事项清单（CSV）</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Excel 可打开的表格，含状态、内容、负责人、截止时间</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: 10, borderRadius: 8, background: exportOptions.clips ? '#eef2ff' : '#f8fafc' }}>
                    <input
                      type="checkbox"
                      checked={exportOptions.clips}
                      onChange={(e) => setExportOptions({ ...exportOptions, clips: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>📑 素材片段索引与文本</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          {selectedClipIds.size > 0
                            ? `已勾选 ${selectedClipIds.size} 个片段，将仅导出选中内容`
                            : '导出片段的 Markdown 索引和完整文本内容，每个片段单独文件'}
                        </div>
                      </div>
                      {exportOptions.clips && selectedClipIds.size === 0 && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 10, fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>
                          <input
                            type="checkbox"
                            checked={exportOptions.favoriteClipsOnly}
                            onChange={(e) => setExportOptions({ ...exportOptions, favoriteClipsOnly: e.target.checked })}
                          />
                          仅收藏（{favoriteCount}）
                        </label>
                      )}
                      {selectedClipIds.size > 0 && (
                        <span className="tag tag-primary" style={{ marginLeft: 10 }}>☑️ {selectedClipIds.size} 个</span>
                      )}
                    </div>
                  </label>
                </div>

                <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                  <strong>导出预览：</strong>已选择 <strong style={{ color: '#6366f1' }}>{getSelectedItemsCount()}</strong> 项内容，将生成 ZIP 压缩包，包含上述 Markdown / TXT / CSV 文件，可直接分享给团队成员打开查看。
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

function ClipCard({ clip, isSelected, onToggleFavorite, onDelete, onToggleSelect }: {
  clip: Clip
  isSelected: boolean
  onToggleFavorite: () => void
  onDelete: () => void
  onToggleSelect: () => void
}) {
  const [showConfirm, setShowConfirm] = useState(false)
  return (
    <div className="clip-card" style={{ border: isSelected ? '2px solid #6366f1' : undefined, background: isSelected ? '#eef2ff' : undefined }}>
      <div className="clip-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            style={{ width: 18, height: 18, cursor: 'pointer' }}
            title="勾选此片段用于导出"
          />
          <div className="clip-name" title={clip.name} style={{ flex: 1 }}>{clip.name}</div>
        </div>
        <div className="clip-actions">
          <button
            className={`clip-icon-btn ${clip.isFavorite ? 'active' : ''}`}
            title={clip.isFavorite ? '取消收藏' : '收藏'}
            onClick={onToggleFavorite}
          >{clip.isFavorite ? '⭐' : '☆'}</button>
          <button
            className="clip-icon-btn"
            title="复制文本"
            onClick={() => {
              navigator.clipboard?.writeText(clip.transcript)
            }}
          >📋</button>
          <button
            className="clip-icon-btn"
            title="查看全文"
            onClick={() => {
              const blob = new Blob([`【${clip.name}】\n\n时间：${formatTimeRange(clip.startTime, clip.endTime)}\n标签：${clip.tags.join('、') || '无'}\n\n${clip.transcript}`], { type: 'text/plain;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              window.open(url, '_blank')
              setTimeout(() => URL.revokeObjectURL(url), 5000)
            }}
          >�</button>
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
            <button className="btn btn-danger btn-sm" onClick={() => { onDelete(); setShowConfirm(false) }}>删除</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MaterialPage
