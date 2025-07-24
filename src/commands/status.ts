import { Command } from 'commander';
import { ConfigManager } from '../utils/config';

export const statusCommand = new Command()
  .name('status')
  .description('Show current agent configuration status')
  .option('-v, --verbose', 'Show detailed status information')
  .option('-e, --environment', 'Show environment override information')
  .option('--json', 'Output status in JSON format')
  .action(async (options) => {
    const configManager = new ConfigManager();
    
    try {
      const status = await configManager.getStatus();
      
      if (options.environment) {
        const overrideStatus = await configManager.getOverrideStatus();
        
        if (options.json) {
          console.log(JSON.stringify(overrideStatus, null, 2));
          return;
        }
        
        console.log('🌍 Environment Configuration Override Status');
        console.log('===========================================\n');
        
        // Environment information
        const env = overrideStatus.environment;
        console.log(`🏷️  Current Environment: ${env.mode} (${env.nodeEnv})`);
        console.log(`🏗️  Production Mode: ${env.isProduction ? '✅ Yes' : '❌ No'}`);
        console.log(`🧪 Development Mode: ${env.isDevelopment ? '✅ Yes' : '❌ No'}`);
        console.log(`🚀 Staging Mode: ${env.isStaging ? '✅ Yes' : '❌ No'}`);
        console.log(`🧨 Test Mode: ${env.isTest ? '✅ Yes' : '❌ No'}\n`);
        
        // Configuration files
        console.log('📁 Configuration Files (Priority Order):');
        console.log('----------------------------------------');
        
        overrideStatus.loadedConfigs
          .sort((a, b) => b.priority - a.priority) // Sort by priority (highest first)
          .forEach((config, index) => {
            const status = config.exists ? '✅' : '❌';
            const priority = `Priority ${config.priority}`;
            console.log(`${status} ${priority}: ${config.description}`);
            console.log(`   📄 ${config.path}`);
            
            if (config.exists && index < overrideStatus.loadedConfigs.length - 1) {
              console.log(`   ⬇️  Overrides lower priority configurations`);
            }
            console.log('');
          });
        
        // Merge order
        if (overrideStatus.mergeOrder.length > 0) {
          console.log('🔄 Configuration Merge Order:');
          overrideStatus.mergeOrder.forEach((path, index) => {
            console.log(`  ${index + 1}. ${path}`);
          });
          console.log('');
        }
        
        // Environment variables
        const envVars = env.mode ? Object.keys(process.env).filter(key => 
          key.startsWith('AGENT_') || key.startsWith('NODE_')
        ) : [];
        
        if (envVars.length > 0) {
          console.log('🔧 Relevant Environment Variables:');
          envVars.forEach(key => {
            console.log(`  ${key}=${process.env[key]}`);
          });
          console.log('');
        }
        
        return;
      }

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