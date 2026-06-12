import { useMeeting } from './store/MeetingContext'
import { PageType } from './types'
import InputPage from './pages/InputPage'
import TranscriptPage from './pages/TranscriptPage'
import ReviewPage from './pages/ReviewPage'
import ScorePage from './pages/ScorePage'
import MaterialPage from './pages/MaterialPage'

const NAV_ITEMS: { key: PageType; label: string; icon: string }[] = [
  { key: 'input', label: '录入', icon: '📝' },
  { key: 'transcript', label: '转写', icon: '🎙️' },
  { key: 'review', label: '复盘', icon: '🔍' },
  { key: 'score', label: '评分', icon: '⭐' },
  { key: 'material', label: '素材', icon: '📚' }
]

function App() {
  const { currentPage, setCurrentPage, meeting } = useMeeting()

  const renderPage = () => {
    switch (currentPage) {
      case 'input': return <InputPage />
      case 'transcript': return <TranscriptPage />
      case 'review': return <ReviewPage />
      case 'score': return <ScorePage />
      case 'material': return <MaterialPage />
      default: return <InputPage />
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-logo">
          <div className="app-logo-icon">🤝</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>AI 会议复盘工具</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={meeting.title || '未选择会议'}>
              {meeting.title ? `📋 ${meeting.title}` : '📋 未选择会议'}
            </div>
          </div>
        </div>
        <nav className="app-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`nav-item ${currentPage === item.key ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div style={{ width: 200, textAlign: 'right', fontSize: 12, color: '#64748b' }}>
          {meeting.date}
        </div>
      </header>
      <main className="app-content animate-in">
        <div className="page-container">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}

export default App
