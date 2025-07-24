// Import validation types
import type { ValidationRule } from './validation';

/**
 * Core configuration schema interface
 */
export interface AgentConfig {
  version: string;
  initialized: boolean;
  templates: {
    [key: string]: TemplateConfig;
  };
  sync: SyncConfig;
  features: {
    [key: string]: boolean;
  };
  environment?: EnvironmentConfig;
  validation?: ValidationConfig;
}

/**
 * Sync configuration with enhanced metadata
 */
export interface SyncConfig {
  remote?: string;
  lastSync?: string;
  autoSync: boolean;
  syncInterval?: number;
  conflictResolution?: 'local' | 'remote' | 'prompt';
  backupBeforeSync?: boolean;
}

/**
 * Environment-specific configuration
 */
export interface EnvironmentConfig {
  name: string;
  type: 'development' | 'staging' | 'production' | 'test';
  variables: { [key: string]: string };
  paths: {
    config: string;
    templates: string;
    cache: string;
    logs: string;
  };
  security: {
    encryptionEnabled: boolean;
    keyStorePath?: string;
    trustedSources: string[];
  };
}

/**
 * Template configuration with enhanced metadata
 */
export interface TemplateConfig {
  name: string;
  description: string;
  version: string;
  author?: string;
  files: TemplateFile[];
  variables?: { [key: string]: TemplateVariable };
  dependencies?: string[];
  compatibility?: {
    minVersion: string;
    maxVersion?: string;
  };
}

/**
 * Template file specification
 */
export interface TemplateFile {
  path: string;
  content: string;
  permissions?: string;
  encoding?: string;
  conditional?: {
    variable: string;
    operator: 'equals' | 'notEquals' | 'contains';
    value: any;
  }; // Condition for including this file
}

/**
 * Template variable definition
 */
export interface TemplateVariable {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  default?: any;
  required?: boolean;
  description?: string;
  validation?: ValidationRule;
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  strictMode: boolean;
  customRules: ValidationRule[];
  skipValidation: string[];
}

/**
 * Configuration status with detailed information
 */
export interface ConfigStatus {
  initialized: boolean;
  configFiles: string[];
  lastSync?: string;
  version: string;
  template?: string;
  features: string[];
  environment?: string;
  health: {
    score: number;
    issues: string[];
    recommendations: string[];
  };
}