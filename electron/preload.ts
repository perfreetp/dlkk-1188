import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  selectMediaFile: () => ipcRenderer.invoke('select-media-file'),
  selectSaveZipPath: (defaultName?: string) => ipcRenderer.invoke('select-save-zip-path', defaultName),
  writeBinaryFile: (filePath: string, data: ArrayBuffer) =>
    ipcRenderer.invoke('write-binary-file', filePath, data),
  loadHistoryMeetings: () => ipcRenderer.invoke('load-history-meetings'),
  saveMeetingToHistory: (meeting: any) => ipcRenderer.invoke('save-meeting-to-history', meeting),
  deleteMeetingFromHistory: (meetingId: string) =>
    ipcRenderer.invoke('delete-meeting-from-history', meetingId),
  getMeetingFromHistory: (meetingId: string) =>
    ipcRenderer.invoke('get-meeting-from-history', meetingId)
})
