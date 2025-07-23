import { Command } from 'commander';
import { ConfigManager } from '../utils/config';

export const statusCommand = new Command()
  .name('status')
  .description('Show current agent configuration status')
  .option('-v, --verbose', 'Show detailed status information')
  .option('--json', 'Output status in JSON format')
  .action(async (options) => {
    const configManager = new ConfigManager();
    
    try {
      const status = await configManager.getStatus();
      
      if (options.json) {
        console.log(JSON.stringify(status, null, 2));
        return;
      }
      
      console.log('📊 Agent Configuration Status');
      console.log('============================\n');
      
      if (!status.initialized) {
        console.log('❌ Not initialized');
        console.log('💡 Run "agent-config init" to initialize configuration');
        return;
      }
      
      console.log(`✅ Initialized: ${status.initialized}`);
      console.log(`📁 Config files: ${status.configFiles.length} found`);
      console.log(`📦 Version: ${status.version}`);
      
      if (status.template) {
        console.log(`📋 Template: ${status.template}`);
      }
      
      if (status.features.length > 0) {
        console.log(`⚡ Active features: ${status.features.join(', ')}`);
      }
      
      if (options.verbose) {
        console.log('\n📋 Detailed Information:');
        console.log('Configuration files:');
        status.configFiles.forEach(file => {
          console.log(`  ✓ ${file}`);
        });
        
        if (status.lastSync) {
          console.log(`\n🕒 Last sync: ${new Date(status.lastSync).toLocaleString()}`);
        } else {
          console.log('\n🕒 Last sync: Never');
        }
        
        console.log(`\n🎯 Status: Ready for use`);
        console.log(`💡 Next steps:`);
        console.log(`   - Customize prompts.yaml for your specific use case`);
        console.log(`   - Use "agent-config sync" to synchronize with remote sources`);
      }
      
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }, null, 2));
      } else {
        console.error('❌ Failed to get status:', error);
      }
      process.exit(1);
    }
  });