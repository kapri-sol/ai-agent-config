import { Command } from 'commander';
import { ConfigManager, validateInput } from '../utils/config';
import { ConfigFormat } from '../utils/file-config';

interface InitCommandOptions {
  force?: boolean;
  template: string;
  format: ConfigFormat;
  env?: string;
}

export const initCommand = new Command()
  .name('init')
  .description('Initialize agent configuration in the current directory')
  .option('-f, --force', 'Force initialization even if configuration already exists')
  .option('-t, --template <type>', 'Initialize with a specific template', 'default')
  .option('--format <format>', 'Configuration file format (yaml|json)', 'yaml')
  .option('--env <environment>', 'Initialize for specific environment (development|staging|production|test)')
  .action(async (options: InitCommandOptions) => {
    console.log('🚀 Initializing agent configuration...');
    
    // Validate template input
    if (!validateInput(options.template, 'template')) {
      console.error('❌ Invalid template name. Use only letters, numbers, hyphens, and underscores.');
      process.exit(1);
    }

    // Manually validate format input as .choices() causes build failures
    if (!['yaml', 'json'].includes(options.format)) {
      console.error('❌ Invalid format. Use "yaml" or "json".');
      process.exit(1);
    }

    // Validate environment input
if (options.env && !['development', 'staging', 'production', 'test'].includes(options.env)) {
  console.error('❌ Invalid environment. Use one of: development, staging, production, or test.');
  process.exit(1);
}
    
    console.log(`📋 Template: ${options.template}`);
    console.log(`📄 Format: ${options.format}`);
    
    if (options.env) {
      console.log(`🌍 Environment: ${options.env}`);
      // Set environment variable for initialization
      process.env.AGENT_ENV = options.env;
    }
    
    if (options.force) {
      console.log('🔄 Force mode enabled - overwriting existing configuration');
    }
    
    const configManager = new ConfigManager(process.cwd(), options.format as ConfigFormat);
    
    try {
      // Check if configuration already exists
      const exists = await configManager.exists();
      if (exists && !options.force) {
        console.log('⚠️  Configuration already exists in this directory.');
        console.log('💡 Use --force flag to overwrite existing configuration.');
        console.log('💡 Use --template to specify a different template (default, advanced).');
        return;
      }
      
      // Initialize configuration
      await configManager.initialize(options.template, options.force);
      
      console.log('✅ Agent configuration initialized successfully');
      
      // Get paths to show user what was created
      const paths = configManager.getPaths();
      console.log(`📁 Created configuration files:`);
      console.log(`   - Global: ${paths.global}`);
      console.log(`   - Local: ${paths.local}`);
      console.log(`   - prompts.yaml`);
      
      if (options.template === 'advanced') {
        console.log(`   - workflows.yaml`);
      }
      
      console.log(`
🎯 Next steps:`);
      console.log(`   - Review the generated configuration files`);
      console.log(`   - Run 'agent-config status' to check configuration`);
      console.log(`   - Customize your configuration as needed`);
      console.log(`   - Use '--format json' for JSON format or '--format yaml' for YAML format`);
      
    } catch (error) {
      console.error('❌ Failed to initialize configuration:', error);
      process.exit(1);
    }
  });
