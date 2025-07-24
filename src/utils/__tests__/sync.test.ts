import { SyncManager } from '../sync';
import { ConfigManager } from '../config';

// Mock ConfigManager and validateInput
jest.mock('../config', () => {
  const actualConfig = jest.requireActual('../config');
  return {
    ConfigManager: jest.fn().mockImplementation(() => {
      return {
        exists: jest.fn(),
        load: jest.fn(),
        save: jest.fn(),
        getStatus: jest.fn(),
        updateSyncInfo: jest.fn(),
      };
    }),
    validateInput: jest.fn((input: string, type: string) => {
      if (type === 'url') {
        return input.startsWith('http://') || input.startsWith('https://');
      }
      return actualConfig.validateInput(input, type);
    }),
  };
});

const MockedConfigManager = ConfigManager as jest.MockedClass<typeof ConfigManager>;

describe('SyncManager', () => {
  let syncManager: SyncManager;
  let mockConfigManager: jest.Mocked<ConfigManager>;

  beforeEach(() => {
    mockConfigManager = new MockedConfigManager() as jest.Mocked<ConfigManager>;
    (ConfigManager as jest.Mock).mockImplementation(() => mockConfigManager);
    syncManager = new SyncManager();
    jest.clearAllMocks();
  });

  describe('sync', () => {
    const mockConfig = {
      version: '1.0.0',
      initialized: true,
      templates: {},
      sync: { autoSync: false },
      features: {}
    };

    test('throws error when configuration does not exist', async () => {
      mockConfigManager.exists.mockResolvedValue(false);

      await expect(syncManager.sync({
        dryRun: false,
        pull: false,
        push: false
      })).rejects.toThrow('No configuration found. Run "agent-config init" first.');
    });

    test('throws error for invalid remote URL', async () => {
      mockConfigManager.exists.mockResolvedValue(true);

      await expect(syncManager.sync({
        remote: 'invalid-url',
        dryRun: false,
        pull: false,
        push: false
      })).rejects.toThrow('Invalid remote URL provided.');
    });

    test('performs pull operation successfully', async () => {
      mockConfigManager.exists.mockResolvedValue(true);
      mockConfigManager.load.mockResolvedValue(mockConfig);
      mockConfigManager.save.mockResolvedValue(undefined);
      mockConfigManager.updateSyncInfo.mockResolvedValue(undefined);

      const result = await syncManager.sync({
        remote: 'https://example.com/config',
        dryRun: false,
        pull: true,
        push: false
      });

      expect(result.changes).toHaveLength(3);
      expect(result.changes[0]).toContain('Pulled configuration from');
      expect(mockConfigManager.updateSyncInfo).toHaveBeenCalledWith('https://example.com/config');
    });

    test('performs push operation successfully', async () => {
      mockConfigManager.exists.mockResolvedValue(true);
      mockConfigManager.load.mockResolvedValue(mockConfig);
      mockConfigManager.getStatus.mockResolvedValue({
        initialized: true,
        configFiles: ['agent.config.json', 'prompts.yaml'],
        version: '1.0.0',
        features: [],
        health: {
          score: 85,
          issues: [],
          recommendations: []
        }
      });
      mockConfigManager.updateSyncInfo.mockResolvedValue(undefined);

      const result = await syncManager.sync({
        remote: 'https://example.com/config',
        dryRun: false,
        pull: false,
        push: true
      });

      expect(result.changes).toHaveLength(3);
      expect(result.changes[0]).toContain('Pushed configuration to');
      expect(mockConfigManager.updateSyncInfo).toHaveBeenCalledWith('https://example.com/config');
    });

    test('performs dry run without making changes', async () => {
      mockConfigManager.exists.mockResolvedValue(true);
      mockConfigManager.load.mockResolvedValue({
        ...mockConfig,
        sync: { remote: 'https://example.com/config', autoSync: false }
      });

      const result = await syncManager.sync({
        dryRun: true,
        pull: true,
        push: false
      });

      expect(result.changes).toHaveLength(3);
      expect(result.changes[0]).toContain('[DRY RUN]');
      expect(mockConfigManager.updateSyncInfo).not.toHaveBeenCalled();
    });

    test('performs full sync when no specific operation specified', async () => {
      mockConfigManager.exists.mockResolvedValue(true);
      mockConfigManager.load.mockResolvedValue(mockConfig);
      mockConfigManager.save.mockResolvedValue(undefined);
      mockConfigManager.getStatus.mockResolvedValue({
        initialized: true,
        configFiles: ['agent.config.json'],
        version: '1.0.0',
        features: [],
        health: {
          score: 75,
          issues: ['No prompts file found'],
          recommendations: ['Add prompts.yaml file']
        }
      });
      mockConfigManager.updateSyncInfo.mockResolvedValue(undefined);

      const result = await syncManager.sync({
        remote: 'https://example.com/config',
        dryRun: false,
        pull: false,
        push: false
      });

      expect(result.changes.length).toBeGreaterThan(3); // Should have both pull and push changes
      expect(mockConfigManager.updateSyncInfo).toHaveBeenCalledWith('https://example.com/config');
    });

    test('handles missing remote configuration gracefully', async () => {
      mockConfigManager.exists.mockResolvedValue(true);
      mockConfigManager.load.mockResolvedValue({
        ...mockConfig,
        sync: { autoSync: false } // No remote configured
      });

      const result = await syncManager.sync({
        dryRun: false,
        pull: true,
        push: false
      });

      expect(result.changes).toContain('No remote configured for pull operation');
    });
  });
});