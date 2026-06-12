import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'

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

ipcMain.handle('select-save-path', async () => {
  const result = await dialog.showSaveDialog({
    title: '选择导出路径',
    defaultPath: '会议复盘资料包',
    filters: [{ name: 'ZIP 压缩包', extensions: ['zip'] }]
  })
  return result.canceled ? null : result.filePath
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
