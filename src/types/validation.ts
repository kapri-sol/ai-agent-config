/**
 * Validation system type definitions
 */

/**
 * Validation rule definition
 */
export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'custom';
  value?: any;
  message?: string;
  validator?: (value: any) => boolean;
}

/**
 * Comprehensive validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: ValidationMetadata;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'critical';
  suggestion?: string;
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  suggestion?: string;
}

/**
 * Validation process metadata
 */
export interface ValidationMetadata {
  timestamp: string;
  duration: number;
  rulesApplied: number;
  version: string;
}

export interface ValidatorConfig {
  name: string;
  enabled: boolean;
  severity: 'error' | 'warning' | 'info';
  options: { [key: string]: any };
}

export interface ValidationContext {
  filePath?: string;
  fieldPath?: string;
  value: any;
  schema?: any;
  environment?: string;
  customData?: { [key: string]: any };
}

export interface ValidationPlugin {
  name: string;
  version: string;
  validate(value: any, context: ValidationContext): Promise<ValidationResult>;
  supports(type: string): boolean;
  configure(options: { [key: string]: any }): void;
}

export interface ValidationProfile {
  name: string;
  description: string;
  validators: ValidatorConfig[];
  strictMode: boolean;
  stopOnFirstError: boolean;
  customRules: CustomValidationRule[];
}

export interface CustomValidationRule {
  id: string;
  name: string;
  description: string;
  validator: (value: any, context: ValidationContext) => Promise<boolean>;
  errorMessage: string;
  warningMessage?: string;
}

export interface ValidationReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  results: ValidationResult[];
  duration: number;
  timestamp: string;
  profile: string;
}

export interface ValidationCache {
  key: string;
  result: ValidationResult;
  timestamp: string;
  ttl: number; // time to live in seconds
  dependencies: string[]; // files or values that affect this validation
}

export interface ValidationScheduler {
  schedule: string; // cron expression
  profiles: string[];
  enabled: boolean;
  notifications: {
    onSuccess: boolean;
    onFailure: boolean;
    recipients: string[];
  };
}