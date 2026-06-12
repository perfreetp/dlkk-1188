export {}

declare global {
  interface Window {
    electronAPI: {
      selectMediaFile: () => Promise<string | null>
      selectSaveZipPath: (defaultName?: string) => Promise<string | null>
      writeBinaryFile: (filePath: string, data: ArrayBuffer) => Promise<{ success: boolean; path?: string; error?: string }>
      loadHistoryMeetings: () => Promise<any[]>
      saveMeetingToHistory: (meeting: any) => Promise<{ success: boolean; list: any[] }>
      deleteMeetingFromHistory: (meetingId: string) => Promise<{ success: boolean; list: any[] }>
      getMeetingFromHistory: (meetingId: string) => Promise<any | null>
    }
  }
}
