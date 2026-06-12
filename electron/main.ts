import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'

function getStorePath(): string {
  const userData = app.getPath('userData')
  const storeDir = path.join(userData, 'ai-meeting-review')
  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true })
  }
  return storeDir
}

function getHistoryFilePath(): string {
  return path.join(getStorePath(), 'meetings-history.json')
}

function readHistoryFile(): any[] {
  const file = getHistoryFilePath()
  try {
    if (!fs.existsSync(file)) return []
    const content = fs.readFileSync(file, 'utf-8')
    return JSON.parse(content || '[]')
  } catch (e) {
    console.error('读取历史记录失败:', e)
    return []
  }
}

function writeHistoryFile(data: any[]): void {
  const file = getHistoryFilePath()
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
  } catch (e) {
    console.error('写入历史记录失败:', e)
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'AI 会议复盘工具',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'))
  }
}

ipcMain.handle('select-media-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: '媒体文件', extensions: ['mp3', 'wav', 'm4a', 'mp4', 'mov', 'avi', 'mkv'] },
      { name: '音频文件', extensions: ['mp3', 'wav', 'm4a'] },
      { name: '视频文件', extensions: ['mp4', 'mov', 'avi', 'mkv'] }
    ]
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('select-save-zip-path', async (_e, defaultName: string) => {
  const result = await dialog.showSaveDialog({
    title: '保存会议资料包',
    defaultPath: defaultName || '会议复盘资料包',
    filters: [{ name: 'ZIP 压缩包', extensions: ['zip'] }]
  })
  return result.canceled ? null : result.filePath
})

ipcMain.handle('write-binary-file', async (_e, filePath: string, data: ArrayBuffer) => {
  try {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, Buffer.from(data))
    return { success: true, path: filePath }
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) }
  }
})

ipcMain.handle('load-history-meetings', async () => {
  return readHistoryFile()
})

ipcMain.handle('save-meeting-to-history', async (_e, meeting: any) => {
  const list = readHistoryFile()
  const idx = list.findIndex((m: any) => m.id === meeting.id)
  if (idx >= 0) {
    list[idx] = { ...meeting, updatedAt: new Date().toISOString() }
  } else {
    list.unshift({ ...meeting, createdAt: meeting.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() })
  }
  writeHistoryFile(list)
  return { success: true, list }
})

ipcMain.handle('delete-meeting-from-history', async (_e, meetingId: string) => {
  const list = readHistoryFile().filter((m: any) => m.id !== meetingId)
  writeHistoryFile(list)
  return { success: true, list }
})

ipcMain.handle('get-meeting-from-history', async (_e, meetingId: string) => {
  const list = readHistoryFile()
  return list.find((m: any) => m.id === meetingId) || null
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
