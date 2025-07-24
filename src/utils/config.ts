import { promises as fs } from 'fs';
import { join } from 'path';
import { 
  AgentConfig, 
  ConfigStatus, 
  TemplateConfig,
  ValidationResult,
  ValidationError,
  ValidationWarning
} from '../types';
import { FileConfigManager, ConfigFormat, convertConfigFormat } from './file-config';

export const CONFIG_FILE = 'agent.config.json';
export const PROMPTS_FILE = 'prompts.yaml';
export const ENVIRONMENT_TYPES = ['development', 'staging', 'production'];

export class ConfigManager {
  private configPath: string;
  private promptsPath: string;
  private fileConfigManager: FileConfigManager;

  constructor(baseDir: string = process.cwd(), format: ConfigFormat = 'yaml') {
    this.configPath = join(baseDir, CONFIG_FILE);
    this.promptsPath = join(baseDir, PROMPTS_FILE);
    
    // Initialize enhanced file configuration manager
    this.fileConfigManager = new FileConfigManager({
      format,
      createDirs: true,
      backup: true,
      merge: true
    });
  }

  async exists(): Promise<boolean> {
    return await this.fileConfigManager.exists();
  }

  async load(): Promise<AgentConfig> {
    return await this.fileConfigManager.loadMerged();
  }

  async save(config: AgentConfig, path?: string): Promise<void> {
    await this.fileConfigManager.save(config, path, { backup: true });
  }

  async initialize(template: string = 'default', force: boolean = false): Promise<void> {
    try {
      // Use the enhanced file manager for initialization
      await this.fileConfigManager.initialize(template, force);
      
      // Create prompts file with template-specific content
      const templateConfig = this.getTemplate(template);
      try {
        await this.createPromptsFile(templateConfig);
      } catch (promptsError) {
        // If prompts file creation fails, attempt to revert config initialization
        await this.fileConfigManager.revertInitialize();
        throw new Error(`Failed to create prompts file: ${(promptsError as Error).message}`, { cause: promptsError });
      }
    } catch (error) {
      throw new Error(`Failed to initialize configuration: ${(error as Error).message}`, { cause: error });
    }
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
    const paths = this.getPaths();
    const configFiles: string[] = [];
    
    // Check for various configuration files
    if (await this.fileConfigManager.exists(paths.global)) {
      configFiles.push(paths.global);
    }
    if (await this.fileConfigManager.exists(paths.local)) {
      configFiles.push(paths.local);
    }
    if (await this.fileConfigManager.exists(this.promptsPath)) {
      configFiles.push(PROMPTS_FILE);
    }

    // Calculate health score with enhanced features
    const healthScore = this.calculateHealthScore(config, configFiles);
    const { issues, recommendations } = this.getHealthDetails(config);

    return {
      initialized: config.initialized,
      configFiles,
      lastSync: config.sync?.lastSync,
      version: config.version,
      template: config.templates ? Object.keys(config.templates)[0] : undefined,
      features: config.features ? Object.keys(config.features).filter(key => config.features[key]) : [],
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
    try {
      // Use enhanced file manager validation first
      const enhancedValidation = await this.fileConfigManager.validate();
      
      // Add custom business logic validation
      const startTime = process.hrtime.bigint();
      const configToValidate = config || await this.load();
      const errors: ValidationError[] = [...enhancedValidation.errors];
      const warnings: ValidationWarning[] = [...enhancedValidation.warnings];
      let rulesApplied = enhancedValidation.metadata.rulesApplied;

      // Additional business rules validation
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
        warnings,
        metadata: {
          timestamp: new Date().toISOString(),
          duration: durationInMs + enhancedValidation.metadata.duration,
          rulesApplied,
          version: configToValidate.version
        }
      };
    } catch (error) {
      throw new Error(`Validation failed: ${(error as Error).message}`, { cause: error });
    }
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

  // Enhanced functionality exposed from file manager
  async createBackup(): Promise<string> {
    return await this.fileConfigManager.createBackup();
  }

  async listBackups(): Promise<Array<{ path: string; created: Date; size: number }>> {
    return await this.fileConfigManager.listBackups();
  }

  async restoreFromBackup(backupPath: string): Promise<void> {
    return await this.fileConfigManager.restoreFromBackup(backupPath);
  }

  getPaths() {
    return this.fileConfigManager.getPaths();
  }

  async convertFormat(targetFormat: ConfigFormat, path?: string): Promise<void> {
    const targetPath = path || (targetFormat === 'yaml' ? 
      this.getPaths().local.replace(/\.json$/, '.yml') : 
      this.getPaths().local.replace(/\.yml$/, '.json'));
    
    await convertConfigFormat(this.getPaths().local, targetPath, targetFormat);
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