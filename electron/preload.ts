import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  selectMediaFile: () => ipcRenderer.invoke('select-media-file'),
  selectSavePath: () => ipcRenderer.invoke('select-save-path')
})
