import { promises as fs } from 'fs';
import { join } from 'path';
import { 
  AgentConfig, 
  ConfigStatus, 
  TemplateConfig,
  TemplateFile,
  ValidationResult,
  ValidationError 
} from '../types';

const CONFIG_FILE = 'agent.config.json';
const PROMPTS_FILE = 'prompts.yaml';

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
    const issues = this.identifyIssues(config);
    const recommendations = this.generateRecommendations(config, issues);

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
    const configToValidate = config || await this.load();
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Version validation
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
      if (!['development', 'staging', 'production'].includes(configToValidate.environment.type)) {
        errors.push({
          field: 'environment.type',
          message: 'Environment type must be development, staging, or production',
          code: 'INVALID_ENVIRONMENT_TYPE',
          severity: 'error'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        timestamp: new Date().toISOString(),
        duration: 0,
        rulesApplied: 3,
        version: configToValidate.version
      }
    };
  }

  private calculateHealthScore(config: AgentConfig, configFiles: string[]): number {
    let score = 0;
    const maxScore = 100;

    // Basic initialization (20 points)
    if (config.initialized) score += 20;

    // Configuration completeness (30 points)
    if (config.templates && Object.keys(config.templates).length > 0) score += 15;
    if (config.sync) score += 10;
    if (config.features) score += 5;

    // File presence (20 points)
    if (configFiles.includes(CONFIG_FILE)) score += 10;
    if (configFiles.includes(PROMPTS_FILE)) score += 10;

    // Advanced features (30 points)
    if (config.environment) score += 10;
    if (config.validation) score += 10;
    if (config.sync?.autoSync) score += 5;
    if (config.sync?.backupBeforeSync) score += 5;

    return Math.min(score, maxScore);
  }

  private identifyIssues(config: AgentConfig): string[] {
    const issues: string[] = [];

    if (!config.sync?.lastSync) {
      issues.push('No sync history found');
    }

    if (!config.environment) {
      issues.push('Environment configuration missing');
    }

    if (!config.validation) {
      issues.push('Validation configuration not set up');
    }

    if (Object.keys(config.features).length === 0) {
      issues.push('No features enabled');
    }

    return issues;
  }

  private generateRecommendations(config: AgentConfig, issues: string[]): string[] {
    const recommendations: string[] = [];

    if (issues.includes('No sync history found')) {
      recommendations.push('Set up remote synchronization for backup');
    }

    if (issues.includes('Environment configuration missing')) {
      recommendations.push('Configure environment settings for better organization');
    }

    if (issues.includes('Validation configuration not set up')) {
      recommendations.push('Enable validation for better configuration management');
    }

    if (issues.includes('No features enabled')) {
      recommendations.push('Enable useful features like autoComplete and validation');
    }

    return recommendations;
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