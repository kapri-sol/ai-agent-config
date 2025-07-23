import { Command } from 'commander';
import { ConfigManager, validateInput } from '../utils/config';

export const initCommand = new Command()
  .name('init')
  .description('Initialize agent configuration in the current directory')
  .option('-f, --force', 'Force initialization even if configuration already exists')
  .option('-t, --template <type>', 'Initialize with a specific template', 'default')
  .action(async (options) => {
    console.log('🚀 Initializing agent configuration...');
    
    // Validate template input
    if (!validateInput(options.template, 'template')) {
      console.error('❌ Invalid template name. Use only letters, numbers, hyphens, and underscores.');
      process.exit(1);
    }
    
    console.log(`📋 Template: ${options.template}`);
    
    if (options.force) {
      console.log('🔄 Force mode enabled - overwriting existing configuration');
    }
    
    const configManager = new ConfigManager();
    
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
      console.log(`📁 Created configuration files:`);
      console.log(`   - agent.config.json`);
      console.log(`   - prompts.yaml`);
      
      if (options.template === 'advanced') {
        console.log(`   - workflows.yaml`);
      }
      
      console.log(`\n🎯 Next steps:`);
      console.log(`   - Review the generated configuration files`);
      console.log(`   - Run 'agent-config status' to check configuration`);
      console.log(`   - Customize prompts.yaml for your use case`);
      
    } catch (error) {
      console.error('❌ Failed to initialize configuration:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });