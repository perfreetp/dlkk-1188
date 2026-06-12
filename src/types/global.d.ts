export {}

declare global {
  interface Window {
    electronAPI: {
      selectMediaFile: () => Promise<string | null>
      selectSavePath: () => Promise<string | null>
    }
  }
}
