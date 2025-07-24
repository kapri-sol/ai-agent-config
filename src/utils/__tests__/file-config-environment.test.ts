import { FileConfigManager } from '../file-config';
import { EnvironmentManager } from '../environment';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';

// Mock fs-extra and js-yaml
jest.mock('fs-extra');
jest.mock('js-yaml');
jest.mock('../environment');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedYaml = yaml as jest.Mocked<typeof yaml>;
const MockedEnvironmentManager = EnvironmentManager as jest.MockedClass<typeof EnvironmentManager>;

describe('FileConfigManager Environment Integration', () => {
  let fileConfigManager: FileConfigManager;
  let mockEnvironmentManager: jest.Mocked<EnvironmentManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock EnvironmentManager
    mockEnvironmentManager = {
      detectEnvironment: jest.fn(),
      getEnvironmentPaths: jest.fn(),
      getConfigurationPriority: jest.fn(),
      createEnvironmentTemplate: jest.fn(),
      getEnvironmentVariables: jest.fn(),
      setEnvironment: jest.fn()
    } as any;

    MockedEnvironmentManager.mockImplementation(() => mockEnvironmentManager);

    fileConfigManager = new FileConfigManager({
      format: 'yaml',
      createDirs: true,
      backup: true,
      merge: true
    });

    // Setup default mocks
    mockEnvironmentManager.detectEnvironment.mockReturnValue({
      mode: 'development',
      nodeEnv: 'development',
      isDevelopment: true,
      isProduction: false,
      isStaging: false,
      isTest: false,
      paths: {
        global: '/home/.config/aisync/config.yml',
        local: '/project/agent.config.yml',
        environment: '/project/agent.config.development.yml',
        override: '/project/agent.config.local.yml'
      }
    });

    mockEnvironmentManager.getConfigurationPriority.mockReturnValue([
      '/project/agent.config.local.yml',     // Highest priority
      '/project/agent.config.development.yml',
      '/project/agent.config.yml',
      '/home/.config/aisync/config.yml'      // Lowest priority
    ]);

    mockEnvironmentManager.createEnvironmentTemplate.mockReturnValue({
      version: '1.0.0',
      initialized: true,
      templates: {},
      sync: { autoSync: false },
      features: { debug: true, hotReload: true },
      environment: {
        name: 'development',
        type: 'development',
        variables: {},
        paths: {
          config: '/project',
          templates: '/project/templates',
          cache: '/home/.cache/aisync',
          logs: '/home/.local/share/aisync/logs'
        },
        security: {
          encryptionEnabled: false,
          trustedSources: ['https://api.aisync.dev', 'http://localhost:*']
        }
      }
    });

    mockEnvironmentManager.getEnvironmentVariables.mockReturnValue({
      'AGENT_DEBUG': 'true'
    });
  });

  describe('loadMerged with environment awareness', () => {
    test('loads configurations in correct priority order', async () => {
      // Mock file existence
      (mockedFs.pathExists as any).mockImplementation(async (path: string) => {
        return [
          '/home/.config/aisync/config.yml',
          '/project/agent.config.yml',
          '/project/agent.config.development.yml'
        ].includes(path);
      });

      // Mock file reading
      (mockedFs.readFile as any).mockImplementation(async (path: string) => {
        const configs = {
          '/home/.config/aisync/config.yml': 'version: "1.0.0"\ninitialized: true\nglobal: true',
          '/project/agent.config.yml': 'version: "1.0.0"\ninitialized: true\nlocal: true',
          '/project/agent.config.development.yml': 'version: "1.0.0"\ninitialized: true\ndev: true'
        };
        return configs[path as keyof typeof configs] || '';
      });

      // Mock YAML parsing
      mockedYaml.load.mockImplementation((content: string) => {
        if (content.includes('global: true')) {
          return { version: '1.0.0', initialized: true, global: true };
        }
        if (content.includes('local: true')) {
          return { version: '1.0.0', initialized: true, local: true };
        }
        if (content.includes('dev: true')) {
          return { version: '1.0.0', initialized: true, dev: true };
        }
        return {};
      });

      const result = await fileConfigManager.loadMerged();

      // Verify environment detection was called
      expect(mockEnvironmentManager.detectEnvironment).toHaveBeenCalled();
      expect(mockEnvironmentManager.getConfigurationPriority).toHaveBeenCalledWith('development');
      expect(mockEnvironmentManager.createEnvironmentTemplate).toHaveBeenCalledWith('development');

      // Verify files were read in correct order
      expect(mockedFs.readFile).toHaveBeenCalledWith('/home/.config/aisync/config.yml', 'utf-8');
      expect(mockedFs.readFile).toHaveBeenCalledWith('/project/agent.config.yml', 'utf-8');
      expect(mockedFs.readFile).toHaveBeenCalledWith('/project/agent.config.development.yml', 'utf-8');

      // Result should have environment information
      expect(result.environment).toBeDefined();
      expect(result.environment?.name).toBe('development');
      expect(result.environment?.type).toBe('development');
    });

    test('handles missing configuration files gracefully', async () => {
      // Mock only global config exists
      (mockedFs.pathExists as any).mockImplementation(async (path: string) => {
        return path === '/home/.config/aisync/config.yml';
      });

      (mockedFs.readFile as any).mockImplementation(async (path: string) => {
        if (path === '/home/.config/aisync/config.yml') {
          return 'version: "1.0.0"\ninitialized: true\nglobal: true';
        }
        throw new Error('File not found');
      });

      mockedYaml.load.mockReturnValue({ version: '1.0.0', initialized: true, global: true });

      const result = await fileConfigManager.loadMerged();

      // Should still work with only global config
      expect(result).toBeDefined();
      expect(result.environment?.name).toBe('development');
    });

    test('applies environment variables to final configuration', async () => {
      (mockedFs.pathExists as any).mockResolvedValue(false); // No config files exist
      
      const result = await fileConfigManager.loadMerged();

      expect(result.environment?.variables).toHaveProperty('AGENT_DEBUG', 'true');
      expect(mockEnvironmentManager.getEnvironmentVariables).toHaveBeenCalled();
    });

    test('handles different environment modes correctly', async () => {
      // Test production environment
      mockEnvironmentManager.detectEnvironment.mockReturnValue({
        mode: 'production',
        nodeEnv: 'production',
        isDevelopment: false,
        isProduction: true,
        isStaging: false,
        isTest: false,
        paths: {
          global: '/home/.config/aisync/config.yml',
          local: '/project/agent.config.yml',
          environment: '/project/agent.config.production.yml',
          override: '/project/agent.config.local.yml'
        }
      });

      mockEnvironmentManager.createEnvironmentTemplate.mockReturnValue({
        version: '1.0.0',
        initialized: true,
        templates: {},
        sync: { autoSync: true },
        features: { debug: false, encryption: true },
        environment: {
          name: 'production',
          type: 'production',
          variables: {},
          paths: {
            config: '/project',
            templates: '/project/templates',
            cache: '/home/.cache/aisync',
            logs: '/home/.local/share/aisync/logs'
          },
          security: {
            encryptionEnabled: true,
            trustedSources: ['https://api.aisync.dev']
          }
        }
      });

      (mockedFs.pathExists as any).mockResolvedValue(false);

      const result = await fileConfigManager.loadMerged();

      expect(result.environment?.type).toBe('production');
      expect(mockEnvironmentManager.createEnvironmentTemplate).toHaveBeenCalledWith('production');
    });
  });

  describe('getEnvironmentPaths', () => {
    test('returns environment-aware paths', () => {
      mockEnvironmentManager.getEnvironmentPaths.mockReturnValue({
        global: '/home/.config/aisync/config.yml',
        local: '/project/agent.config.yml',
        environment: '/project/agent.config.development.yml',
        override: '/project/agent.config.local.yml'
      });

      const paths = fileConfigManager.getEnvironmentPaths();

      expect(paths).toEqual({
        global: '/home/.config/aisync/config.yml',
        local: '/project/agent.config.yml',
        environment: '/project/agent.config.development.yml',
        override: '/project/agent.config.local.yml',
        backup: expect.stringContaining('backups')
      });

      expect(mockEnvironmentManager.detectEnvironment).toHaveBeenCalled();
      expect(mockEnvironmentManager.getEnvironmentPaths).toHaveBeenCalledWith('development');
    });
  });

  describe('getEnvironmentInfo', () => {
    test('returns current environment information', () => {
      const mockEnvInfo = {
        mode: 'staging' as const,
        nodeEnv: 'staging',
        isDevelopment: false,
        isProduction: false,
        isStaging: true,
        isTest: false,
        paths: {
          global: '/home/.config/aisync/config.yml',
          local: '/project/agent.config.yml',
          environment: '/project/agent.config.staging.yml',
          override: '/project/agent.config.local.yml'
        }
      };

      mockEnvironmentManager.detectEnvironment.mockReturnValue(mockEnvInfo);

      const result = fileConfigManager.getEnvironmentInfo();

      expect(result).toEqual(mockEnvInfo);
      expect(mockEnvironmentManager.detectEnvironment).toHaveBeenCalled();
    });
  });

  describe('getOverrideStatus', () => {
    test('returns comprehensive override status information', async () => {
      const mockEnvInfo = {
        mode: 'development' as const,
        nodeEnv: 'development',
        isDevelopment: true,
        isProduction: false,
        isStaging: false,
        isTest: false,
        paths: {
          global: '/home/.config/aisync/config.yml',
          local: '/project/agent.config.yml',
          environment: '/project/agent.config.development.yml',
          override: '/project/agent.config.local.yml'
        }
      };

      mockEnvironmentManager.detectEnvironment.mockReturnValue(mockEnvInfo);
      mockEnvironmentManager.getEnvironmentPaths.mockReturnValue(mockEnvInfo.paths);

      // Mock file existence - some exist, some don't
      (mockedFs.pathExists as any).mockImplementation(async (path: string) => {
        return [
          '/home/.config/aisync/config.yml',
          '/project/agent.config.yml'
        ].includes(path);
      });

      // Mock loadMerged for final config
      const mockFinalConfig = {
        version: '1.0.0',
        initialized: true,
        templates: {},
        sync: { autoSync: false },
        features: { debug: true }
      };

      (mockedFs.readFile as any).mockResolvedValue('version: "1.0.0"');
      mockedYaml.load.mockReturnValue(mockFinalConfig);

      const result = await fileConfigManager.getOverrideStatus();

      expect(result.environment).toEqual(mockEnvInfo);
      expect(result.loadedConfigs).toHaveLength(4);
      
      // Check that global and local configs are marked as existing
      const globalConfig = result.loadedConfigs.find(c => c.source === 'global');
      const localConfig = result.loadedConfigs.find(c => c.source === 'local');
      const envConfig = result.loadedConfigs.find(c => c.source === 'environment');
      const overrideConfig = result.loadedConfigs.find(c => c.source === 'override');

      expect(globalConfig?.exists).toBe(true);
      expect(localConfig?.exists).toBe(true);
      expect(envConfig?.exists).toBe(false);
      expect(overrideConfig?.exists).toBe(false);

      // Check merge order only includes existing files
      expect(result.mergeOrder).toHaveLength(2);
      expect(result.mergeOrder).toContain('/home/.config/aisync/config.yml');
      expect(result.mergeOrder).toContain('/project/agent.config.yml');

      expect(result.finalConfig).toBeDefined();
    });

    test('handles errors gracefully when loading final config fails', async () => {
      const mockEnvInfo = {
        mode: 'development' as const,
        nodeEnv: 'development',
        isDevelopment: true,
        isProduction: false,
        isStaging: false,
        isTest: false,
        paths: {
          global: '/home/.config/aisync/config.yml',
          local: '/project/agent.config.yml',
          environment: '/project/agent.config.development.yml',
          override: '/project/agent.config.local.yml'
        }
      };

      mockEnvironmentManager.detectEnvironment.mockReturnValue(mockEnvInfo);
      mockEnvironmentManager.getEnvironmentPaths.mockReturnValue(mockEnvInfo.paths);

      (mockedFs.pathExists as any).mockResolvedValue(false);
      
      // Mock loadMerged to throw an error
      jest.spyOn(fileConfigManager, 'loadMerged').mockRejectedValue(new Error('Test failure'));
      
      // Mock console.warn to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fileConfigManager.getOverrideStatus();

      expect(result.finalConfig).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load merged configuration for status:', 'Test failure'
      );

      consoleSpy.mockRestore();
    });
  });
});