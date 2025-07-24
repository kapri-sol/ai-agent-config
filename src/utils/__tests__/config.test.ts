import { promises as fs } from 'fs';
import { join } from 'path';
import { ConfigManager, validateInput } from '../config';

// Mock fs and fs-extra modules
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
  }
}));

jest.mock('fs-extra', () => ({
  promises: jest.fn(),
  pathExists: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  ensureDir: jest.fn(),
  copy: jest.fn(),
  remove: jest.fn(),
  stat: jest.fn(),
  readdir: jest.fn(),
}));

// Create mock instances for FileConfigManager
const mockFileConfigManager = {
  exists: jest.fn(),
  load: jest.fn(),
  save: jest.fn(),
  loadMerged: jest.fn(),
  initialize: jest.fn(),
  validate: jest.fn(),
  createBackup: jest.fn(),
  listBackups: jest.fn(),
  restoreFromBackup: jest.fn(),
  getPaths: jest.fn(() => ({
    global: '/mock/global/config.yml',
    local: '/mock/local/agent.config.yml',
    backup: '/mock/backup'
  }))
};

// Mock the FileConfigManager
jest.mock('../file-config', () => ({
  FileConfigManager: jest.fn().mockImplementation(() => mockFileConfigManager),
  ConfigFormat: {
    yaml: 'yaml',
    json: 'json'
  }
}));

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('Config Utilities', () => {
  describe('validateInput', () => {
    test('validates URLs correctly', () => {
      expect(validateInput('https://example.com', 'url')).toBe(true);
      expect(validateInput('http://localhost:3000', 'url')).toBe(true);
      expect(validateInput('not-a-url', 'url')).toBe(false);
      expect(validateInput('', 'url')).toBe(false);
    });

    test('validates template names correctly', () => {
      expect(validateInput('default', 'template')).toBe(true);
      expect(validateInput('my-template', 'template')).toBe(true);
      expect(validateInput('template_123', 'template')).toBe(true);
      expect(validateInput('invalid template', 'template')).toBe(false);
      expect(validateInput('invalid@template', 'template')).toBe(false);
    });

    test('validates paths correctly', () => {
      expect(validateInput('/valid/path', 'path')).toBe(true);
      expect(validateInput('relative/path', 'path')).toBe(true);
      expect(validateInput('../dangerous/path', 'path')).toBe(false);
      expect(validateInput('', 'path')).toBe(false);
    });
  });
});

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  const testDir = '/test/dir';

  beforeEach(() => {
    configManager = new ConfigManager(testDir);
    jest.clearAllMocks();
  });

  describe('exists', () => {
    test('returns true when config file exists', async () => {
      mockFileConfigManager.exists.mockResolvedValue(true);
      
      const exists = await configManager.exists();
      
      expect(exists).toBe(true);
    });

    test('returns false when config file does not exist', async () => {
      mockFileConfigManager.exists.mockResolvedValue(false);
      
      const exists = await configManager.exists();
      
      expect(exists).toBe(false);
    });
  });

  describe('load', () => {
    test('loads configuration successfully', async () => {
      const mockConfig = {
        version: '1.0.0',
        initialized: true,
        templates: {},
        sync: { autoSync: false },
        features: {}
      };
      
      mockFileConfigManager.loadMerged.mockResolvedValue(mockConfig);
      
      const config = await configManager.load();
      
      expect(config).toEqual(mockConfig);
    });

    test('throws error when file cannot be read', async () => {
      mockFileConfigManager.loadMerged.mockRejectedValue(new Error('Failed to load configuration'));
      mockedFs.readFile.mockRejectedValue(new Error('Permission denied'));
      
      await expect(configManager.load()).rejects.toThrow('Failed to load configuration');
    });
  });

  describe('save', () => {
    test('saves configuration successfully', async () => {
      const mockConfig = {
        version: '1.0.0',
        initialized: true,
        templates: {},
        sync: { autoSync: false },
        features: {}
      };
      
      mockFileConfigManager.save.mockResolvedValue(undefined);
      
      await configManager.save(mockConfig);
      
      expect(mockFileConfigManager.save).toHaveBeenCalledWith(mockConfig, undefined, { backup: true });
    });

    test('throws error when file cannot be written', async () => {
      const mockConfig = {
        version: '1.0.0',
        initialized: true,
        templates: {},
        sync: { autoSync: false },
        features: {}
      };
      
      mockFileConfigManager.save.mockRejectedValue(new Error('Failed to save configuration'));
      
      await expect(configManager.save(mockConfig)).rejects.toThrow('Failed to save configuration');
    });
  });

  describe('initialize', () => {
    test('initializes configuration with default template', async () => {
      mockFileConfigManager.initialize.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);
      
      await configManager.initialize();
      
      expect(mockFileConfigManager.initialize).toHaveBeenCalledWith('default', false);
      expect(mockedFs.writeFile).toHaveBeenCalledTimes(1); // prompts.yaml
    });

    test('throws error when config exists and force is false', async () => {
      mockFileConfigManager.initialize.mockRejectedValue(new Error('Configuration already exists. Use force=true to overwrite.'));
      
      await expect(configManager.initialize('default', false)).rejects.toThrow(
        'Failed to initialize configuration'
      );
    });

    test('overwrites existing config when force is true', async () => {
      mockFileConfigManager.initialize.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);
      
      await configManager.initialize('default', true);
      
      expect(mockFileConfigManager.initialize).toHaveBeenCalledWith('default', true);
      expect(mockedFs.writeFile).toHaveBeenCalledTimes(1);
    });

    test('throws error for invalid template', async () => {
      mockFileConfigManager.initialize.mockRejectedValue(new Error("Template 'invalid-template' not found"));
      
      await expect(configManager.initialize('invalid-template')).rejects.toThrow(
        'Failed to initialize configuration'
      );
    });
  });

  describe('getStatus', () => {
    test('returns not initialized status when config does not exist', async () => {
      mockFileConfigManager.exists.mockResolvedValue(false);
      
      const status = await configManager.getStatus();
      
      expect(status.initialized).toBe(false);
      expect(status.configFiles).toEqual([]);
    });

    test('returns initialized status when config exists', async () => {
      const mockConfig = {
        version: '1.0.0',
        initialized: true,
        templates: { default: { name: 'Default Template' } },
        sync: { lastSync: '2023-01-01T00:00:00.000Z', autoSync: false },
        features: { validation: true, backup: false }
      };
      
      mockFileConfigManager.exists.mockResolvedValue(true);
      mockFileConfigManager.loadMerged.mockResolvedValue(mockConfig);
      mockedFs.access.mockResolvedValue(undefined);
      mockFileConfigManager.exists.mockImplementation(async (path?: string) => {
        if (path === undefined || path === '/mock/global/config.yml' || path === '/mock/local/agent.config.yml' || path === '/test/dir/prompts.yaml') {
          return true;
        }
        return false;
      });
      
      const status = await configManager.getStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.version).toBe('1.0.0');
      expect(status.lastSync).toBe('2023-01-01T00:00:00.000Z');
      expect(status.template).toBe('default');
      expect(status.features).toEqual(['validation']);
      expect(status.configFiles).toEqual(['global config', 'local config', 'prompts.yaml']);
    });
  });
});