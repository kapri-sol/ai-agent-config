/**
 * Synchronization system type definitions
 */

export interface SyncProvider {
  name: string;
  type: 'git' | 'http' | 'ftp' | 'cloud' | 'custom';
  authenticate(): Promise<boolean>;
  push(localPath: string, remotePath: string): Promise<SyncResult>;
  pull(remotePath: string, localPath: string): Promise<SyncResult>;
  status(): Promise<SyncStatus>;
}

export interface SyncResult {
  success: boolean;
  operation: 'push' | 'pull';
  filesChanged: number;
  duration: number;
  errors: string[];
  conflicts: SyncConflict[];
}

export interface SyncConflict {
  file: string;
  type: 'content' | 'permission' | 'deletion';
  localVersion: string;
  remoteVersion: string;
  resolution?: 'local' | 'remote' | 'merge' | 'skip';
}

export interface SyncStatus {
  connected: boolean;
  lastSync?: string;
  pendingChanges: number;
  conflicts: number;
  remoteVersion?: string;
  localVersion: string;
}

export interface SyncPolicy {
  autoSync: boolean;
  syncInterval: number; // in minutes
  conflictResolution: 'local' | 'remote' | 'prompt' | 'merge';
  backupBeforeSync: boolean;
  includePatterns: string[];
  excludePatterns: string[];
  retryAttempts: number;
  timeout: number; // in seconds
}

export interface SyncEvent {
  timestamp: string;
  type: 'sync_start' | 'sync_complete' | 'sync_error' | 'conflict_detected';
  details: { [key: string]: any };
  duration?: number;
}

export interface SyncLog {
  events: SyncEvent[];
  startDate: string;
  endDate?: string;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
}