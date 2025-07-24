import * as yaml from 'js-yaml';
import * as fs from 'fs-extra';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { AgentConfig, ValidationWarning, ValidationResult, ValidationError, ConfigurationMode } from '../types';
import { EnvironmentManager, EnvironmentInfo } from './environment';

export type ConfigFormat = 'yaml' | 'json';

export interface ConfigPaths {
  global: string;
  local: string;
  backup: string;
}

export interface FileConfigOptions {
  format?: ConfigFormat;
  createDirs?: boolean;
  backup?: boolean;
  merge?: boolean;
}

/**
 * Enhanced configuration file manager supporting YAML/JSON formats
 * with backup, restore, and merging capabilities
 */
export class FileConfigManager {
  private readonly globalConfigPath: string;
  private readonly localConfigPath: string;
  private readonly backupDir: string;
  private readonly format: ConfigFormat;
  private readonly environmentManager: EnvironmentManager;

  constructor(options: FileConfigOptions = {}) {
    this.format = options.format || 'yaml';
    this.environmentManager = new EnvironmentManager({ 
      baseDir: process.cwd(), 
      format: this.format 
    });
    
    // Global config path: ~/.config/aisync/config.yml
    const configDir = join(homedir(), '.config', 'aisync');
    const extension = this.format === 'yaml' ? 'yml' : 'json';
    this.globalConfigPath = join(configDir, `config.${extension}`);
    
    // Local config path: ./agent.config.yml or ./agent.config.json
    this.localConfigPath = join(process.cwd(), `agent.config.${extension}`);
    
    // Backup directory
    this.backupDir = join(configDir, 'backups');
    
    if (options.createDirs) {
      this.ensureDirectories();
    }
  }

  /**
   * Get all relevant configuration paths
   */
  getPaths(): ConfigPaths {
    return {
      global: this.globalConfigPath,
      local: this.localConfigPath,
      backup: this.backupDir
    };
  }

  /**
   * Get environment-aware configuration paths
   */
  getEnvironmentPaths(): Record<string, string> {
    const environment = this.environmentManager.detectEnvironment();
    const paths = this.environmentManager.getEnvironmentPaths(environment.mode);
    
    return {
      global: paths.global,
      local: paths.local,
      environment: paths.environment,
      override: paths.override,
      backup: this.backupDir
    };
  }

  /**
   * Get current environment information
   */
  getEnvironmentInfo(): EnvironmentInfo {
    return this.environmentManager.detectEnvironment();
  }

  /**
   * Check if configuration file exists at specified path
   */
  async exists(path?: string): Promise<boolean> {
    const targetPath = path || this.globalConfigPath;
    return fs.pathExists(targetPath);
  }

  /**
   * Load configuration from file with format auto-detection
   */
  async load(path?: string): Promise<AgentConfig> {
    const targetPath = path || this.globalConfigPath;
    
    if (!(await this.exists(targetPath))) {
      throw new Error(`Configuration file not found: ${targetPath}`);
    }

    try {
      const content = await fs.readFile(targetPath, 'utf-8');
      const format = this.detectFormat(targetPath);
      
      if (format === 'yaml') {
        return yaml.load(content) as AgentConfig;
      } else {
        return JSON.parse(content);
      }
    } catch (error: unknown) {
      throw new Error(`Failed to load configuration from ${targetPath}: ${(error as Error).message}`);
    }
  }

  /**
   * Save configuration to file with proper formatting
   */
  async save(config: AgentConfig, path?: string, options: FileConfigOptions = {}): Promise<void> {
    const targetPath = path || this.globalConfigPath;
    const format = options.format || this.detectFormat(targetPath);
    
    // Create backup if requested
    if (options.backup && await this.exists(targetPath)) {
      await this.createBackup(targetPath);
    }

    // Ensure directory exists
    await fs.ensureDir(dirname(targetPath));

    try {
      let content: string;
      
      if (format === 'yaml') {
        content = yaml.dump(config, {
          indent: 2,
          lineWidth: 120,
          noRefs: true,
          sortKeys: true
        });
      } else {
        content = JSON.stringify(config, null, 2);
      }

      await fs.writeFile(targetPath, content, 'utf-8');
    } catch (error: unknown) {
      throw new Error(`Failed to save configuration to ${targetPath}: ${(error as Error).message}`);
    }
  }

  /**
   * Load and merge multiple configuration files with environment awareness
   * Priority: local override > environment-specific > local > global > defaults
   */
  async loadMerged(defaultConfig?: Partial<AgentConfig>): Promise<AgentConfig> {
    const environment = this.environmentManager.detectEnvironment();
    const configPaths = this.environmentManager.getConfigurationPriority(environment.mode);
    
    let mergedConfig: AgentConfig = defaultConfig as AgentConfig || this.getDefaultConfig();

    // Apply environment-specific default configuration
    const envTemplate = this.environmentManager.createEnvironmentTemplate(environment.mode);
    mergedConfig = this.mergeConfigs(mergedConfig, envTemplate as AgentConfig);

    // Load configurations in priority order (lowest to highest priority)
    for (let i = configPaths.length - 1; i >= 0; i--) {
      const configPath = configPaths[i];
      if (await this.exists(configPath)) {
        try {
          const config = await this.load(configPath);
          mergedConfig = this.mergeConfigs(mergedConfig, config);
        } catch (error) {
          console.warn(`Failed to load configuration from ${configPath}: ${(error as Error).message}`);
        }
      }
    }

    // Ensure environment information is properly set in the final config
    const envPaths = this.environmentManager.getEnvironmentPaths(environment.mode);
    mergedConfig.environment = {
      ...mergedConfig.environment,
      name: environment.mode,
      type: environment.mode,
      variables: {
        ...mergedConfig.environment?.variables,
        ...this.environmentManager.getEnvironmentVariables()
      },
      paths: mergedConfig.environment?.paths || {
        config: envPaths.local,
        templates: join(process.cwd(), 'templates'),
        cache: join(homedir(), '.cache', 'aisync'),
        logs: join(homedir(), '.local', 'share', 'aisync', 'logs')
      },
      security: mergedConfig.environment?.security || {
        encryptionEnabled: environment.mode === 'production',
        trustedSources: environment.mode === 'production' 
          ? ['https://api.aisync.dev'] 
          : ['https://api.aisync.dev', 'http://localhost:*']
      }
    };

    return mergedConfig;
  }

  /**
   * Create a timestamped backup of configuration file
   */
  async createBackup(sourcePath?: string): Promise<string> {
    const targetPath = sourcePath || this.globalConfigPath;
    
    if (!(await this.exists(targetPath))) {
      throw new Error(`Cannot backup non-existent file: ${targetPath}`);
    }

    await fs.ensureDir(this.backupDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `config-backup-${timestamp}.${this.format === 'yaml' ? 'yml' : 'json'}`;
    const backupPath = join(this.backupDir, filename);

    await fs.copy(targetPath, backupPath);
    
    // Keep only last 10 backups
    await this.cleanupOldBackups();
    
    return backupPath;
  }

  /**
   * Restore configuration from a backup file
   */
  async restoreFromBackup(backupPath: string, targetPath?: string): Promise<void> {
    const destination = targetPath || this.globalConfigPath;
    
    if (!(await fs.pathExists(backupPath))) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    // Validate backup file format
    try {
      await this.load(backupPath);
    } catch (error: unknown) {
      throw new Error(`Invalid backup file format: ${(error as Error).message}`);
    }

    // Create backup of current file before restoring
    if (await this.exists(destination)) {
      await this.createBackup(destination);
    }

    await fs.copy(backupPath, destination);
  }

  /**
   * List available backup files with metadata
   */
  async listBackups(): Promise<Array<{ path: string; created: Date; size: number }>> {
    if (!(await fs.pathExists(this.backupDir))) {
      return [];
    }

    const files = await fs.readdir(this.backupDir);
    const backups = [];

    for (const file of files) {
      if (file.startsWith('config-backup-')) {
        const filePath = join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        
        backups.push({
          path: filePath,
          created: stats.mtime,
          size: stats.size
        });
      }
    }

    return backups.sort((a, b) => b.created.getTime() - a.created.getTime());
  }

  /**
   * Initialize configuration with default template
   */
  async initialize(template: string = 'default', force: boolean = false): Promise<void> {
    const targetPath = this.globalConfigPath;
    
    if (!force && await this.exists(targetPath)) {
      throw new Error('Configuration already exists. Use force=true to overwrite.');
    }

    const defaultConfig = this.getDefaultConfigTemplate(template);
    await this.save(defaultConfig, targetPath, { backup: !force });
    
    // Also create local config with project-specific settings
    const localConfig = {
      ...defaultConfig,
      sync: {
        ...defaultConfig.sync,
        autoSync: false // Local configs default to manual sync
      },
      environment: {
        name: 'local',
        type: 'development' as const,
        variables: {},
        paths: {
          config: process.cwd(),
          templates: join(process.cwd(), 'templates'),
          cache: join(process.cwd(), '.cache'),
          logs: join(process.cwd(), 'logs')
        },
        security: {
          encryptionEnabled: false,
          trustedSources: []
        }
      }
    };
    
    await this.save(localConfig, this.localConfigPath);
  }

  /**
   * Validate configuration file structure and content
   */
  async validate(path?: string): Promise<ValidationResult> {
    const targetPath = path || this.globalConfigPath;
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const config = await this.load(targetPath);
      
      // Basic structure validation
      if (!config.version) {
        errors.push({
          field: 'version',
          message: 'Version field is required',
          code: 'MISSING_VERSION',
          severity: 'error'
        });
      }

      if (!config.templates || Object.keys(config.templates).length === 0) {
        errors.push({
          field: 'templates',
          message: 'No templates configured',
          code: 'NO_TEMPLATES',
          severity: 'error'
        });
      }

      // Format-specific validation
      const format = this.detectFormat(targetPath);
      if (format === 'yaml') {
        // YAML-specific validations
        const content = await fs.readFile(targetPath, 'utf-8');
        if (content.includes('\t')) {
          errors.push({
            field: 'format',
            message: 'YAML files should use spaces instead of tabs for indentation',
            code: 'YAML_TABS',
            severity: 'error'
          });
        }
      }

    } catch (error: unknown) {
      errors.push({
        field: 'file',
        message: `Failed to parse configuration: ${(error as Error).message}`,
        code: 'PARSE_ERROR',
        severity: 'error'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        timestamp: new Date().toISOString(),
        duration: 0,
        rulesApplied: 4,
        version: '1.0.0'
      }
    };
  }

  /**
   * Merge two configuration objects with deep merging
   */
  private mergeConfigs(base: AgentConfig, override: AgentConfig): AgentConfig {
    const merged = { ...base };

    // Merge top-level properties
    Object.keys(override).forEach(key => {
      if (key === 'templates' && override.templates) {
        merged.templates = { ...merged.templates, ...override.templates };
      } else if (key === 'features' && override.features) {
        merged.features = { ...merged.features, ...override.features };
      } else if (key === 'sync' && override.sync) {
        merged.sync = { ...merged.sync, ...override.sync };
      } else if (key === 'environment' && override.environment) {
        merged.environment = { ...merged.environment, ...override.environment };
      } else if (key === 'validation' && override.validation) {
        merged.validation = { ...merged.validation, ...override.validation };
      } else {
        (merged as any)[key] = (override as any)[key];
      }
    });

    return merged;
  }

  /**
   * Detect configuration file format from extension
   */
  private detectFormat(filePath: string): ConfigFormat {
    if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) {
      return 'yaml';
    }
    return 'json';
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    await fs.ensureDir(dirname(this.globalConfigPath));
    await fs.ensureDir(this.backupDir);
  }

  /**
   * Clean up old backup files, keeping only the most recent 10
   */
  private async cleanupOldBackups(): Promise<void> {
    const backups = await this.listBackups();
    
    if (backups.length > 10) {
      const toDelete = backups.slice(10);
      
      for (const backup of toDelete) {
        await fs.remove(backup.path);
      }
    }
  }

  /**
   * Get default configuration template
   */
  private getDefaultConfig(): AgentConfig {
    return {
      version: '1.0.0',
      initialized: true,
      templates: {},
      sync: {
        autoSync: false,
        conflictResolution: 'prompt',
        backupBeforeSync: true
      },
      features: {
        validation: true,
        backup: true,
        autoComplete: true
      }
    };
  }

  /**
   * Get specific configuration template
   */
  private getDefaultConfigTemplate(templateName: string): AgentConfig {
    const baseConfig = this.getDefaultConfig();
    
    const templates = {
      default: {
        name: 'Default Configuration',
        description: 'Basic agent configuration for general use',
        version: '1.0.0',
        author: 'aisync',
        files: [
          {
            path: 'config.yml',
            content: yaml.dump(baseConfig),
            encoding: 'utf-8'
          }
        ],
        variables: {
          agentName: {
            type: 'string' as const,
            default: 'DefaultAgent',
            required: true,
            description: 'Name of the AI agent'
          }
        },
        compatibility: {
          minVersion: '1.0.0'
        }
      },
      claude: {
        name: 'Claude Code Configuration',
        description: 'Optimized configuration for Claude Code integration',
        version: '1.1.0',
        author: 'aisync',
        files: [
          {
            path: 'config.yml',
            content: '',
            encoding: 'utf-8'
          },
          {
            path: 'prompts.yml',
            content: '',
            encoding: 'utf-8'
          }
        ],
        variables: {
          claudeApiKey: {
            type: 'string' as const,
            required: true,
            description: 'Claude API key for authentication'
          }
        },
        compatibility: {
          minVersion: '1.0.0'
        }
      },
      enterprise: {
        name: 'Enterprise Configuration',
        description: 'Enterprise-grade configuration with security features',
        version: '1.2.0',
        author: 'aisync',
        files: [
          {
            path: 'config.yml',
            content: '',
            encoding: 'utf-8'
          }
        ],
        variables: {
          organizationId: {
            type: 'string' as const,
            required: true,
            description: 'Organization identifier'
          },
          securityLevel: {
            type: 'string' as const,
            default: 'high',
            required: true,
            description: 'Security level (low, medium, high)'
          }
        },
        compatibility: {
          minVersion: '1.0.0'
        }
      }
    };

    baseConfig.templates = {
      [templateName]: templates[templateName as keyof typeof templates] || templates.default
    };

    return baseConfig;
  }

  /**
   * Get configuration override status for visualization
   */
  async getOverrideStatus(): Promise<{
    environment: EnvironmentInfo;
    loadedConfigs: Array<{
      path: string;
      exists: boolean;
      priority: number;
      source: 'global' | 'local' | 'environment' | 'override';
      description: string;
    }>;
    mergeOrder: string[];
    finalConfig?: Partial<AgentConfig>;
  }> {
    const environment = this.environmentManager.detectEnvironment();
    const configPaths = this.environmentManager.getConfigurationPriority(environment.mode);
    const envPaths = this.getEnvironmentPaths();
    
    const loadedConfigs = [];
    const mergeOrder = [];

    // Check each configuration file
    const pathInfo = [
      { path: envPaths.global, source: 'global' as const, description: 'Global configuration' },
      { path: envPaths.local, source: 'local' as const, description: 'Local project configuration' },
      { path: envPaths.environment, source: 'environment' as const, description: `Environment-specific (${environment.mode})` },
      { path: envPaths.override, source: 'override' as const, description: 'Local override configuration' }
    ];

    for (let i = 0; i < pathInfo.length; i++) {
      const { path, source, description } = pathInfo[i];
      const exists = await this.exists(path);
      
      loadedConfigs.push({
        path,
        exists,
        priority: i + 1,
        source,
        description
      });

      if (exists) {
        mergeOrder.push(path);
      }
    }

    // Get final merged configuration
    let finalConfig: Partial<AgentConfig> | undefined;
    try {
      finalConfig = await this.loadMerged();
    } catch (error) {
      console.warn('Failed to load merged configuration for status:', (error as Error).message);
    }

    return {
      environment,
      loadedConfigs,
      mergeOrder,
      finalConfig
    };
  }
}

/**
 * Utility function to convert between configuration formats
 */
export async function convertConfigFormat(
  sourcePath: string, 
  targetPath: string, 
  targetFormat: ConfigFormat
): Promise<void> {
  const manager = new FileConfigManager({ format: targetFormat });
  const config = await manager.load(sourcePath);
  await manager.save(config, targetPath);
}

/**
 * Utility function to merge multiple configuration files
 */
export async function mergeConfigFiles(
  filePaths: string[], 
  outputPath: string, 
  format: ConfigFormat = 'yaml'
): Promise<void> {
  const manager = new FileConfigManager({ format });
  let mergedConfig = manager['getDefaultConfig']();

  for (const filePath of filePaths) {
    if (await manager.exists(filePath)) {
      const config = await manager.load(filePath);
      mergedConfig = manager['mergeConfigs'](mergedConfig, config);
    }
  }

  await manager.save(mergedConfig, outputPath);
}