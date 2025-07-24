/**
 * Central type definitions export
 */

// Core configuration types
export type {
  AgentConfig,
  SyncConfig,
  EnvironmentConfig,
  TemplateConfig,
  TemplateFile,
  TemplateVariable,
  ValidationConfig,
  ConfigStatus
} from './config';

// Template system types
export type {
  TemplateMetadata,
  TemplateRegistry,
  TemplateInstallOptions,
  TemplateInstallResult,
  TemplateContext,
  TemplateProcessor
} from './template';

// Synchronization types
export type {
  SyncProvider,
  SyncResult,
  SyncConflict,
  SyncStatus,
  SyncPolicy,
  SyncEvent,
  SyncLog
} from './sync';

// Validation system types
export type {
  ValidationRule,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationMetadata,
  ValidatorConfig,
  ValidationContext,
  ValidationPlugin,
  ValidationProfile,
  CustomValidationRule,
  ValidationReport,
  ValidationCache,
  ValidationScheduler
} from './validation';

// Common utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type ConfigurationMode = 'development' | 'staging' | 'production' | 'test';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface BaseResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends BaseResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    [component: string]: {
      status: 'pass' | 'fail' | 'warn';
      message?: string;
      duration?: number;
    };
  };
  timestamp: string;
  version: string;
}