import { promises as fs } from 'fs';
import { join } from 'path';
import { 
  AgentConfig, 
  ConfigStatus, 
  TemplateConfig,
  TemplateFile,
  ValidationResult,
  ValidationError,
  ValidationWarning
} from '../types';

export const CONFIG_FILE = 'agent.config.json';
export const PROMPTS_FILE = 'prompts.yaml';
export const ENVIRONMENT_TYPES = ['development', 'staging', 'production'];

export class ConfigManager {
  private configPath: string;
  private promptsPath: string;

  constructor(baseDir: string = process.cwd()) {
    this.configPath = join(baseDir, CONFIG_FILE);
    this.promptsPath = join(baseDir, PROMPTS_FILE);
  }

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  async load(): Promise<AgentConfig> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw error;
    }
  }

  async save(config: AgentConfig): Promise<void> {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      throw error;
    }
  }

  async initialize(template: string = 'default', force: boolean = false): Promise<void> {
    if (!force && await this.exists()) {
      throw new Error('Configuration already exists. Use --force to overwrite.');
    }

    const templateConfig = this.getTemplate(template);
    const config: AgentConfig = {
      version: '1.0.0',
      initialized: true,
      templates: {
        [template]: templateConfig
      },
      sync: {
        autoSync: false
      },
      features: {
        autoComplete: true,
        validation: true,
        backup: false
      }
    };

    await this.save(config);
    await this.createPromptsFile(templateConfig);
  }

  async getStatus(): Promise<ConfigStatus> {
    const configExists = await this.exists();
    
    if (!configExists) {
      return {
        initialized: false,
        configFiles: [],
        version: '1.0.0',
        features: [],
        health: {
          score: 0,
          issues: ['Configuration not initialized'],
          recommendations: ['Run "agent-config init" to set up configuration']
        }
      };
    }

    const config = await this.load();
    const configFiles = [CONFIG_FILE];
    
    try {
      await fs.access(this.promptsPath);
      configFiles.push(PROMPTS_FILE);
    } catch {
      // Prompts file doesn't exist
    }

    // Calculate health score
    const healthScore = this.calculateHealthScore(config, configFiles);
    const { issues, recommendations } = this.getHealthDetails(config);

    return {
      initialized: config.initialized,
      configFiles,
      lastSync: config.sync.lastSync,
      version: config.version,
      template: Object.keys(config.templates)[0],
      features: Object.keys(config.features).filter(key => config.features[key]),
      environment: config.environment?.name,
      health: {
        score: healthScore,
        issues,
        recommendations
      }
    };
  }

  async updateSyncInfo(remote?: string): Promise<void> {
    const config = await this.load();
    config.sync.lastSync = new Date().toISOString();
    if (remote) {
      config.sync.remote = remote;
    }
    await this.save(config);
  }

  private getTemplate(templateName: string): TemplateConfig {
    const templates: { [key: string]: TemplateConfig } = {
      default: {
        name: 'Default Template',
        description: 'Basic agent configuration template',
        version: '1.0.0',
        author: 'agent-config',
        files: [
          {
            path: 'agent.config.json',
            content: '',
            encoding: 'utf-8'
          },
          {
            path: 'prompts.yaml',
            content: '',
            encoding: 'utf-8'
          }
        ],
        variables: {
          agentName: {
            type: 'string',
            default: 'DefaultAgent',
            required: true,
            description: 'Name of the AI agent'
          },
          version: {
            type: 'string',
            default: '1.0.0',
            required: true,
            description: 'Version of the agent configuration'
          }
        },
        compatibility: {
          minVersion: '1.0.0'
        }
      },
      advanced: {
        name: 'Advanced Template',
        description: 'Advanced agent configuration with multiple features',
        version: '1.1.0',
        author: 'agent-config',
        files: [
          {
            path: 'agent.config.json',
            content: '',
            encoding: 'utf-8'
          },
          {
            path: 'prompts.yaml',
            content: '',
            encoding: 'utf-8'
          },
          {
            path: 'workflows.yaml',
            content: '',
            encoding: 'utf-8'
          }
        ],
        variables: {
          agentName: {
            type: 'string',
            default: 'AdvancedAgent',
            required: true,
            description: 'Name of the AI agent'
          },
          version: {
            type: 'string',
            default: '1.1.0',
            required: true,
            description: 'Version of the agent configuration'
          },
          features: {
            type: 'array',
            default: ['validation', 'backup', 'monitoring'],
            required: false,
            description: 'List of enabled features'
          }
        },
        dependencies: ['yaml-parser'],
        compatibility: {
          minVersion: '1.0.0',
          maxVersion: '2.0.0'
        }
      }
    };

    const template = templates[templateName];
    if (!template) {
      throw new Error(`Template '${templateName}' not found. Available templates: ${Object.keys(templates).join(', ')}`);
    }

    return template;
  }

  private async createPromptsFile(template: TemplateConfig): Promise<void> {
    const promptsContent = `# Agent Prompts Configuration
# Generated by agent-config CLI

system_prompt: |
  You are ${template.variables?.agentName?.default || 'an AI agent'} configured for task automation.
  Version: ${template.version}

prompts:
  welcome: "Hello! I'm your configured AI agent."
  help: "Here are the available commands and features."
  
templates:
  task_completion: "Task completed successfully: {task_name}"
  error_handling: "An error occurred: {error_message}"
`;

    await fs.writeFile(this.promptsPath, promptsContent);
  }

  async validateConfiguration(config?: AgentConfig): Promise<ValidationResult> {
    const startTime = process.hrtime.bigint();
    const configToValidate = config || await this.load();
    const errors: ValidationError[] = [];
    let rulesApplied = 0;

    // Version validation
    rulesApplied++;
    if (!configToValidate.version || !/^\d+\.\d+\.\d+$/.test(configToValidate.version)) {
      errors.push({
        field: 'version',
        message: 'Version must follow semantic versioning (x.y.z)',
        code: 'INVALID_VERSION',
        severity: 'error',
        suggestion: 'Use format like "1.0.0"'
      });
    }

    // Template validation
    rulesApplied++;
    if (!configToValidate.templates || Object.keys(configToValidate.templates).length === 0) {
      errors.push({
        field: 'templates',
        message: 'At least one template must be configured',
        code: 'NO_TEMPLATES',
        severity: 'error',
        suggestion: 'Add a default template configuration'
      });
    }

    // Environment validation
    if (configToValidate.environment) {
      rulesApplied++;
      if (!ENVIRONMENT_TYPES.includes(configToValidate.environment.type)) {
        errors.push({
          field: 'environment.type',
          message: 'Environment type must be development, staging, or production',
          code: 'INVALID_ENVIRONMENT_TYPE',
          severity: 'error'
        });
      }
    }

    const durationInMs = Number(process.hrtime.bigint() - startTime) / 1e6;

    return {
      valid: errors.length === 0,
      errors,
      warnings: [] as ValidationWarning[],
      metadata: {
        timestamp: new Date().toISOString(),
        duration: durationInMs,
        rulesApplied,
        version: configToValidate.version
      }
    };
  }

  private calculateHealthScore(config: AgentConfig, configFiles: string[]): number {
    const maxScore = 100;
    const points = {
      INITIALIZED: 20,
      HAS_TEMPLATES: 15,
      HAS_SYNC: 10,
      HAS_FEATURES: 5,
      CONFIG_FILE_EXISTS: 10,
      PROMPTS_FILE_EXISTS: 10,
      HAS_ENVIRONMENT: 10,
      HAS_VALIDATION: 10,
      AUTOSYNC_ENABLED: 5,
      BACKUP_ENABLED: 5,
    };

    let score = 0;

    if (config.initialized) score += points.INITIALIZED;
    if (config.templates && Object.keys(config.templates).length > 0) score += points.HAS_TEMPLATES;
    if (config.sync) score += points.HAS_SYNC;
    if (config.features) score += points.HAS_FEATURES;
    if (configFiles.includes(CONFIG_FILE)) score += points.CONFIG_FILE_EXISTS;
    if (configFiles.includes(PROMPTS_FILE)) score += points.PROMPTS_FILE_EXISTS;
    if (config.environment) score += points.HAS_ENVIRONMENT;
    if (config.validation) score += points.HAS_VALIDATION;
    if (config.sync?.autoSync) score += points.AUTOSYNC_ENABLED;
    if (config.sync?.backupBeforeSync) score += points.BACKUP_ENABLED;

    return Math.min(score, maxScore);
  }

  private getHealthDetails(config: AgentConfig): { issues: string[], recommendations: string[] } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const HEALTH_MESSAGES = {
      NO_SYNC_HISTORY: {
        issue: 'No sync history found',
        recommendation: 'Set up remote synchronization for backup',
      },
      MISSING_ENVIRONMENT: {
        issue: 'Environment configuration missing',
        recommendation: 'Configure environment settings for better organization',
      },
      NO_VALIDATION_SETUP: {
        issue: 'Validation configuration not set up',
        recommendation: 'Enable validation for better configuration management',
      },
      NO_FEATURES_ENABLED: {
        issue: 'No features enabled',
        recommendation: 'Enable useful features like autoComplete and validation',
      },
    };

    if (!config.sync?.lastSync) {
      issues.push(HEALTH_MESSAGES.NO_SYNC_HISTORY.issue);
      recommendations.push(HEALTH_MESSAGES.NO_SYNC_HISTORY.recommendation);
    }

    if (!config.environment) {
      issues.push(HEALTH_MESSAGES.MISSING_ENVIRONMENT.issue);
      recommendations.push(HEALTH_MESSAGES.MISSING_ENVIRONMENT.recommendation);
    }

    if (!config.validation) {
      issues.push(HEALTH_MESSAGES.NO_VALIDATION_SETUP.issue);
      recommendations.push(HEALTH_MESSAGES.NO_VALIDATION_SETUP.recommendation);
    }

    if (Object.keys(config.features).length === 0) {
      issues.push(HEALTH_MESSAGES.NO_FEATURES_ENABLED.issue);
      recommendations.push(HEALTH_MESSAGES.NO_FEATURES_ENABLED.recommendation);
    }

    return { issues, recommendations };
  }
}

export const validateInput = (input: string, type: 'url' | 'template' | 'path'): boolean => {
  switch (type) {
    case 'url':
      try {
        new URL(input);
        return true;
      } catch {
        return false;
      }
    case 'template':
      return /^[a-zA-Z0-9_-]+$/.test(input);
    case 'path':
      return input.length > 0 && !input.includes('..');
    default:
      return false;
  }
};