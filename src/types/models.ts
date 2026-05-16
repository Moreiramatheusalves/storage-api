export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface ApplicationTokenRecord {
  id: string;
  name: string;
  tokenHash: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type FileAction = 'UPLOAD' | 'READ' | 'LIST' | 'DELETE' | 'ADMIN_DELETE';

export interface FileEvent {
  id: string;
  applicationId: string;
  applicationName: string;
  action: FileAction;
  relativePath: string;
  filename: string;
  sizeBytes?: number;
  mimeType?: string;
  sha256?: string;
  requestIp?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'ERROR';
  createdAt: string;
}

export interface DataStore {
  adminUsers: AdminUser[];
  applications: ApplicationTokenRecord[];
  history: FileEvent[];
}
