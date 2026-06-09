/**
 * Application Type Definitions
 */

export enum UserRole {
  BOARD_MEMBER = 'board_member',
  MANAGER = 'manager'
}

export interface ConnectedAccount {
  provider: 'zoom' | 'teams' | 'google';
  connected: boolean;
  email?: string;
}

export interface User {
  email: string;
  role: UserRole;
  isAuthenticated: boolean;
  connectedAccounts?: ConnectedAccount[];
}

export interface Bookmark {
  id: string;
  time: number;
  comment: string;
  createdAt: string;
}

export interface Folder {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
}

export interface Recording {
  id: string;
  title: string;
  timestamp: string;
  duration: number;
  note: string;
  blobId: string;
  status: 'ready' | 'uploading' | 'shared';
  transcription?: string;
  isTranscribing?: boolean;
  language?: string;
  keyInsights?: string;
  isInsightsGenerating?: boolean;
  bookmarks?: Bookmark[];
  smartSummary?: string;
  isSmartSummaryGenerating?: boolean;
  folderId?: string;
  keywords?: string[];
  tags?: string[];
}

export interface AuthState {
  step: 'email' | 'code' | 'authenticated';
  email: string;
  loading: boolean;
  error?: string;
}

export interface AudioContextType {
  isRecording: boolean;
  recordingTime: number;
  analyserData: Uint8Array | null;
}