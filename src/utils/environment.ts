import { join } from 'path';
import { homedir } from 'os';
import { ConfigurationMode } from '../types';

/**
 * Environment configuration options
 */
export interface EnvironmentOptions {
  baseDir?: string;
  format?: 'yaml' | 'json';
}

/**
 * Environment detection result
 */
export interface EnvironmentInfo {
  mode: ConfigurationMode;
  nodeEnv: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isStaging: boolean;
  isTest: boolean;
  paths: EnvironmentPaths;
}

/**
 * Environment-specific file paths
 */
export interface EnvironmentPaths {
  global: string;
  local: string;
  environment: string;
  override: string;
}

/**
 * Environment detection and configuration utility
 */
export class EnvironmentManager {
  private baseDir: string;
  private format: 'yaml' | 'json';

  constructor(options: EnvironmentOptions = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.format = options.format || 'yaml';
  }

  /**
   * Detect current environment mode from various sources
   */
  detectEnvironment(): EnvironmentInfo {
    // Priority order for environment detection:
    // 1. AGENT_ENV environment variable
    // 2. NODE_ENV environment variable
    // 3. CI environment detection
    // 4. Default to development

    let mode: ConfigurationMode = 'development';
    const nodeEnv = process.env.NODE_ENV || 'development';
    const agentEnv = process.env.AGENT_ENV;

    if (agentEnv) {
      mode = this.validateEnvironmentMode(agentEnv);
    } else if (nodeEnv === 'production') {
      mode = 'production';
    } else if (nodeEnv === 'staging') {
      mode = 'staging';
    } else if (nodeEnv === 'test') {
      mode = 'test';
    } else if (this.isCI()) {
      mode = 'staging'; // Default CI to staging
    }

    const paths = this.getEnvironmentPaths(mode);

    return {
      mode,
      nodeEnv,
      isProduction: mode === 'production',
      isDevelopment: mode === 'development',
      isStaging: mode === 'staging',
      isTest: mode === 'test',
      paths
    };
  }

  /**
   * Get configuration file paths for environment
   */
  getEnvironmentPaths(mode: ConfigurationMode): EnvironmentPaths {
    const extension = this.format === 'yaml' ? 'yml' : 'json';
    const globalDir = join(homedir(), '.config', 'aisync');

    return {
      // Global configuration: ~/.config/aisync/config.yml
      global: join(globalDir, `config.${extension}`),
      
      // Local configuration: ./agent.config.yml
      local: join(this.baseDir, `agent.config.${extension}`),
      
      // Environment-specific: ./agent.config.development.yml
      environment: join(this.baseDir, `agent.config.${mode}.${extension}`),
      
      // Local override: ./agent.config.local.yml (highest priority)
      override: join(this.baseDir, `agent.config.local.${extension}`)
    };
  }

  /**
   * Get configuration file priority order
   * Higher priority files override lower priority ones
   */
  getConfigurationPriority(mode?: ConfigurationMode): string[] {
    const env = mode || this.detectEnvironment().mode;
    const paths = this.getEnvironmentPaths(env);

    // Priority order (highest to lowest):
    // 1. Local override (agent.config.local.yml)
    // 2. Environment-specific (agent.config.development.yml)
    // 3. Local config (agent.config.yml)
    // 4. Global config (~/.config/aisync/config.yml)
    return [
      paths.override,    // Highest priority
      paths.environment,
      paths.local,
      paths.global      // Lowest priority
    ];
  }

  /**
   * Validate and normalize environment mode
   */
  private validateEnvironmentMode(env: string): ConfigurationMode {
    const normalized = env.toLowerCase();
    
    switch (normalized) {
      case 'dev':
      case 'develop':
      case 'development':
        return 'development';
      case 'stage':
      case 'staging':
        return 'staging';
      case 'prod':
      case 'production':
        return 'production';
      case 'test':
      case 'testing':
        return 'test';
      default:
        console.warn(`Unknown environment "${env}", defaulting to development`);
        return 'development';
    }
  }

  /**
   * Detect if running in CI environment
   */
  private isCI(): boolean {
    return !!(
      process.env.CI ||
      process.env.CONTINUOUS_INTEGRATION ||
      process.env.BUILD_NUMBER ||
      process.env.GITHUB_ACTIONS ||
      process.env.GITLAB_CI ||
      process.env.CIRCLECI ||
      process.env.TRAVIS ||
      process.env.JENKINS_URL
    );
  }

  /**
   * Get environment variables with prefixes
   */
  getEnvironmentVariables(prefix: string = 'AGENT_'): Record<string, string> {
    const envVars: Record<string, string> = {};
    
    Object.keys(process.env).forEach(key => {
      if (key.startsWith(prefix) && process.env[key]) {
        envVars[key] = process.env[key]!;
      }
    });

    return envVars;
  }

  /**
   * Set environment mode programmatically
   */
  setEnvironment(mode: ConfigurationMode): void {
    process.env.AGENT_ENV = mode;
    process.env.NODE_ENV = mode === 'development' ? 'development' : mode;
  }

  /**
   * Create environment-specific configuration template
   */
  createEnvironmentTemplate(mode: ConfigurationMode): Partial<any> {
    const baseConfig = {
      version: '1.0.0',
      initialized: true,
      environment: {
        name: mode,
        type: mode,
        variables: this.getEnvironmentVariables(),
        paths: {
          config: this.getEnvironmentPaths(mode).environment,
          templates: join(this.baseDir, 'templates'),
          cache: join(homedir(), '.cache', 'aisync'),
          logs: join(homedir(), '.local', 'share', 'aisync', 'logs')
        },
        security: {
          encryptionEnabled: mode === 'production',
          trustedSources: mode === 'production' 
            ? ['https://api.aisync.dev'] 
            : ['https://api.aisync.dev', 'http://localhost:*']
        }
      }
    };

    // Environment-specific configurations
    switch (mode) {
      case 'development':
        return {
          ...baseConfig,
          features: {
            debug: true,
            hotReload: true,
            validation: true,
            backup: true
          },
          sync: {
            autoSync: false,
            syncInterval: 300000, // 5 minutes
            conflictResolution: 'prompt',
            backupBeforeSync: true
          }
        };

      case 'staging':
        return {
          ...baseConfig,
          features: {
            debug: false,
            hotReload: false,
            validation: true,
            backup: true,
            monitoring: true
          },
          sync: {
            autoSync: true,
            syncInterval: 180000, // 3 minutes
            conflictResolution: 'remote',
            backupBeforeSync: true
          }
        };

      case 'production':
        return {
          ...baseConfig,
          features: {
            debug: false,
            hotReload: false,
            validation: true,
            backup: true,
            monitoring: true,
            encryption: true
          },
          sync: {
            autoSync: true,
            syncInterval: 60000, // 1 minute
            conflictResolution: 'remote',
            backupBeforeSync: true
          }
        };

      case 'test':
        return {
          ...baseConfig,
          features: {
            debug: true,
            hotReload: false,
            validation: false,
            backup: false,
            testMode: true
          },
          sync: {
            autoSync: false,
            syncInterval: 0,
            conflictResolution: 'local',
            backupBeforeSync: false
          }
        };

      default:
        return baseConfig;
    }
  }
}

/**
 * Global environment manager instance
 */
export const environmentManager = new EnvironmentManager();

/**
 * Utility functions for environment detection
 */
export const detectEnvironment = () => environmentManager.detectEnvironment();
export const getEnvironmentPaths = (mode?: ConfigurationMode) => 
  environmentManager.getEnvironmentPaths(mode || detectEnvironment().mode);
export const getConfigurationPriority = (mode?: ConfigurationMode) => 
  environmentManager.getConfigurationPriority(mode);