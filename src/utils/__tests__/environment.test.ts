import { EnvironmentManager, detectEnvironment, getEnvironmentPaths, getConfigurationPriority } from '../environment';

describe('EnvironmentManager', () => {
  let environmentManager: EnvironmentManager;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Reset environment variables
    delete process.env.AGENT_ENV;
    delete process.env.NODE_ENV;
    delete process.env.CI;
    
    environmentManager = new EnvironmentManager({ 
      baseDir: '/test/dir',
      format: 'yaml'
    });
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('detectEnvironment', () => {
    test('defaults to development when no environment variables are set', () => {
      const env = environmentManager.detectEnvironment();
      
      expect(env.mode).toBe('development');
      expect(env.isDevelopment).toBe(true);
      expect(env.isProduction).toBe(false);
      expect(env.isStaging).toBe(false);
      expect(env.isTest).toBe(false);
    });

    test('uses AGENT_ENV when set', () => {
      process.env.AGENT_ENV = 'production';
      
      const env = environmentManager.detectEnvironment();
      
      expect(env.mode).toBe('production');
      expect(env.isProduction).toBe(true);
      expect(env.isDevelopment).toBe(false);
    });

    test('falls back to NODE_ENV when AGENT_ENV is not set', () => {
      process.env.NODE_ENV = 'staging';
      
      const env = environmentManager.detectEnvironment();
      
      expect(env.mode).toBe('staging');
      expect(env.isStaging).toBe(true);
    });

    test('normalizes environment names correctly', () => {
      const testCases = [
        ['dev', 'development'],
        ['develop', 'development'],
        ['prod', 'production'],
        ['stage', 'staging'],
        ['testing', 'test']
      ];

      testCases.forEach(([input, expected]) => {
        process.env.AGENT_ENV = input;
        const env = environmentManager.detectEnvironment();
        expect(env.mode).toBe(expected);
      });
    });

    test('detects CI environment and defaults to staging', () => {
      process.env.CI = 'true';
      
      const env = environmentManager.detectEnvironment();
      
      expect(env.mode).toBe('staging');
      expect(env.isStaging).toBe(true);
    });

    test('various CI environment variables are detected', () => {
      const ciVars = [
        'CONTINUOUS_INTEGRATION',
        'BUILD_NUMBER', 
        'GITHUB_ACTIONS',
        'GITLAB_CI',
        'CIRCLECI',
        'TRAVIS',
        'JENKINS_URL'
      ];

      ciVars.forEach(varName => {
        // Reset environment
        Object.keys(process.env).forEach(key => {
          if (key.startsWith('CI') || ciVars.includes(key)) {
            delete process.env[key];
          }
        });
        
        process.env[varName] = 'true';
        
        const env = environmentManager.detectEnvironment();
        expect(env.mode).toBe('staging');
      });
    });
  });

  describe('getEnvironmentPaths', () => {
    test('returns correct paths for development environment', () => {
      const paths = environmentManager.getEnvironmentPaths('development');
      
      expect(paths.global).toContain('.config/aisync/config.yml');
      expect(paths.local).toBe('/test/dir/agent.config.yml');
      expect(paths.environment).toBe('/test/dir/agent.config.development.yml');
      expect(paths.override).toBe('/test/dir/agent.config.local.yml');
    });

    test('uses correct file extensions based on format', () => {
      const jsonManager = new EnvironmentManager({ 
        baseDir: '/test/dir',
        format: 'json'
      });
      
      const paths = jsonManager.getEnvironmentPaths('production');
      
      expect(paths.global).toContain('.json');
      expect(paths.local).toContain('.json');
      expect(paths.environment).toContain('.json');
      expect(paths.override).toContain('.json');
    });

    test('includes environment name in environment-specific config path', () => {
      const environments = ['development', 'staging', 'production', 'test'];
      
      environments.forEach(env => {
        const paths = environmentManager.getEnvironmentPaths(env as any);
        expect(paths.environment).toContain(`agent.config.${env}.yml`);
      });
    });
  });

  describe('getConfigurationPriority', () => {
    test('returns paths in correct priority order', () => {
      const priority = environmentManager.getConfigurationPriority('development');
      
      // Should be in order: override > environment > local > global
      expect(priority[0]).toContain('agent.config.local.yml'); // Highest priority
      expect(priority[1]).toContain('agent.config.development.yml');
      expect(priority[2]).toContain('agent.config.yml');
      expect(priority[3]).toContain('.config/aisync/config.yml'); // Lowest priority
    });

    test('adapts to current environment when no mode specified', () => {
      process.env.AGENT_ENV = 'production';
      
      const priority = environmentManager.getConfigurationPriority();
      
      expect(priority[1]).toContain('agent.config.production.yml');
    });
  });

  describe('getEnvironmentVariables', () => {
    test('filters environment variables by prefix', () => {
      process.env.AGENT_CONFIG_URL = 'https://example.com';
      process.env.AGENT_DEBUG = 'true';
      process.env.OTHER_VAR = 'ignore';
      
      const envVars = environmentManager.getEnvironmentVariables('AGENT_');
      
      expect(envVars).toHaveProperty('AGENT_CONFIG_URL', 'https://example.com');
      expect(envVars).toHaveProperty('AGENT_DEBUG', 'true');
      expect(envVars).not.toHaveProperty('OTHER_VAR');
    });

    test('returns empty object when no matching variables found', () => {
      const envVars = environmentManager.getEnvironmentVariables('NONEXISTENT_');
      
      expect(envVars).toEqual({});
    });
  });

  describe('setEnvironment', () => {
    test('sets both AGENT_ENV and NODE_ENV', () => {
      environmentManager.setEnvironment('production');
      
      expect(process.env.AGENT_ENV).toBe('production');
      expect(process.env.NODE_ENV).toBe('production');
    });

    test('sets NODE_ENV to development for development mode', () => {
      environmentManager.setEnvironment('development');
      
      expect(process.env.AGENT_ENV).toBe('development');
      expect(process.env.NODE_ENV).toBe('development');
    });
  });

  describe('createEnvironmentTemplate', () => {
    test('creates development-specific configuration', () => {
      const config = environmentManager.createEnvironmentTemplate('development');
      
      expect(config.environment.type).toBe('development');
      expect(config.features.debug).toBe(true);
      expect(config.features.hotReload).toBe(true);
      expect(config.sync.autoSync).toBe(false);
    });

    test('creates production-specific configuration', () => {
      const config = environmentManager.createEnvironmentTemplate('production');
      
      expect(config.environment.type).toBe('production');
      expect(config.features.debug).toBe(false);
      expect(config.features.encryption).toBe(true);
      expect(config.sync.autoSync).toBe(true);
      expect(config.environment.security.encryptionEnabled).toBe(true);
    });

    test('creates staging-specific configuration', () => {
      const config = environmentManager.createEnvironmentTemplate('staging');
      
      expect(config.environment.type).toBe('staging');
      expect(config.features.monitoring).toBe(true);
      expect(config.sync.conflictResolution).toBe('remote');
    });

    test('creates test-specific configuration', () => {
      const config = environmentManager.createEnvironmentTemplate('test');
      
      expect(config.environment.type).toBe('test');
      expect(config.features.testMode).toBe(true);
      expect(config.features.backup).toBe(false);
      expect(config.sync.autoSync).toBe(false);
    });

    test('includes environment variables in template', () => {
      process.env.AGENT_TEST_VAR = 'test_value';
      
      const config = environmentManager.createEnvironmentTemplate('development');
      
      expect(config.environment.variables).toHaveProperty('AGENT_TEST_VAR', 'test_value');
    });
  });
});

describe('Utility Functions', () => {
  beforeEach(() => {
    // Reset environment
    delete process.env.AGENT_ENV;
    delete process.env.NODE_ENV;
  });

  test('detectEnvironment utility function works', () => {
    process.env.AGENT_ENV = 'staging';
    
    const env = detectEnvironment();
    
    expect(env.mode).toBe('staging');
  });

  test('getEnvironmentPaths utility function works', () => {
    const paths = getEnvironmentPaths('production');
    
    expect(paths.environment).toContain('agent.config.production.yml');
  });

  test('getConfigurationPriority utility function works', () => {
    process.env.AGENT_ENV = 'test';
    
    const priority = getConfigurationPriority();
    
    expect(priority[1]).toContain('agent.config.test.yml');
  });
});