import { promises as fs } from 'fs';
import { join } from 'path';
import { ConfigManager, validateInput } from '../config';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
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
      mockedFs.access.mockResolvedValue(undefined);
      
      const exists = await configManager.exists();
      
      expect(exists).toBe(true);
      expect(mockedFs.access).toHaveBeenCalledWith(join(testDir, 'agent.config.json'));
    });

    test('returns false when config file does not exist', async () => {
      mockedFs.access.mockRejectedValue(new Error('File not found'));
      
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
      
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
      
      const config = await configManager.load();
      
      expect(config).toEqual(mockConfig);
      expect(mockedFs.readFile).toHaveBeenCalledWith(join(testDir, 'agent.config.json'), 'utf-8');
    });

    test('throws error when file cannot be read', async () => {
      mockedFs.readFile.mockRejectedValue(new Error('Permission denied'));
      
      await expect(configManager.load()).rejects.toThrow('Permission denied');
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
      
      mockedFs.writeFile.mockResolvedValue(undefined);
      
      await configManager.save(mockConfig);
      
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        join(testDir, 'agent.config.json'),
        JSON.stringify(mockConfig, null, 2)
      );
    });

    test('throws error when file cannot be written', async () => {
      const mockConfig = {
        version: '1.0.0',
        initialized: true,
        templates: {},
        sync: { autoSync: false },
        features: {}
      };
      
      mockedFs.writeFile.mockRejectedValue(new Error('Permission denied'));
      
      await expect(configManager.save(mockConfig)).rejects.toThrow('Permission denied');
    });
  });

  describe('initialize', () => {
    test('initializes configuration with default template', async () => {
      mockedFs.access.mockRejectedValue(new Error('File not found'));
      mockedFs.writeFile.mockResolvedValue(undefined);
      
      await configManager.initialize();
      
      expect(mockedFs.writeFile).toHaveBeenCalledTimes(2); // config.json and prompts.yaml
    });

    test('throws error when config exists and force is false', async () => {
      mockedFs.access.mockResolvedValue(undefined);
      
      await expect(configManager.initialize('default', false)).rejects.toThrow(
        'Configuration already exists. Use --force to overwrite.'
      );
    });

    test('overwrites existing config when force is true', async () => {
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);
      
      await configManager.initialize('default', true);
      
      expect(mockedFs.writeFile).toHaveBeenCalledTimes(2);
    });

    test('throws error for invalid template', async () => {
      mockedFs.access.mockRejectedValue(new Error('File not found'));
      
      await expect(configManager.initialize('invalid-template')).rejects.toThrow(
        "Template 'invalid-template' not found"
      );
    });
  });

  describe('getStatus', () => {
    test('returns not initialized status when config does not exist', async () => {
      mockedFs.access.mockRejectedValue(new Error('File not found'));
      
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
      
      mockedFs.access.mockImplementation((path) => {
        const pathStr = String(path);
        if (pathStr.includes('agent.config.json')) {
          return Promise.resolve(undefined);
        }
        if (pathStr.includes('prompts.yaml')) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('File not found'));
      });
      
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
      
      const status = await configManager.getStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.configFiles).toEqual(['agent.config.json', 'prompts.yaml']);
      expect(status.version).toBe('1.0.0');
      expect(status.lastSync).toBe('2023-01-01T00:00:00.000Z');
      expect(status.template).toBe('default');
      expect(status.features).toEqual(['validation']);
    });
  });
});