import { Command } from 'commander';
import { SyncManager } from '../utils/sync';
import { validateInput } from '../utils/config';

export const syncCommand = new Command()
  .name('sync')
  .description('Synchronize agent configuration with remote sources')
  .option('-r, --remote <url>', 'Remote configuration source URL')
  .option('-d, --dry-run', 'Show what would be synced without making changes')
  .option('--pull', 'Pull configuration from remote')
  .option('--push', 'Push local configuration to remote')
  .action(async (options) => {
    console.log('🔄 Synchronizing agent configuration...');
    
    // Validate remote URL if provided
    if (options.remote && !validateInput(options.remote, 'url')) {
      console.error('❌ Invalid remote URL provided.');
      process.exit(1);
    }
    
    if (options.dryRun) {
      console.log('📋 Dry run mode - no changes will be made\n');
    }
    
    if (options.remote) {
      console.log(`🌐 Remote source: ${options.remote}`);
    }
    
    const syncManager = new SyncManager();
    
    try {
      const syncOptions = {
        remote: options.remote,
        dryRun: options.dryRun || false,
        pull: options.pull || false,
        push: options.push || false
      };
      
      if (options.pull) {
        console.log('⬇️  Pulling configuration from remote...');
      } else if (options.push) {
        console.log('⬆️  Pushing configuration to remote...');
      } else {
        console.log('🔄 Performing full synchronization (pull + push)...');
      }
      
      const result = await syncManager.sync(syncOptions);
      
      console.log('\n📋 Synchronization Results:');
      console.log('===========================');
      
      if (result.changes.length > 0) {
        console.log('\n✅ Changes:');
        result.changes.forEach(change => {
          console.log(`  • ${change}`);
        });
      } else {
        console.log('\n💡 No changes required - configuration is up to date');
      }
      
      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        result.warnings.forEach(warning => {
          console.log(`  • ${warning}`);
        });
      }
      
      if (!options.dryRun) {
        console.log('\n✅ Synchronization completed successfully');
        console.log('💡 Run "agent-config status" to verify configuration');
      } else {
        console.log('\n📋 Dry run completed - no actual changes made');
        console.log('💡 Remove --dry-run flag to apply changes');
      }
      
    } catch (error) {
      console.error('❌ Failed to synchronize configuration:', error);
      console.log('\n💡 Troubleshooting tips:');
      console.log('  • Ensure you have initialized configuration with "agent-config init"');
      console.log('  • Check that the remote URL is accessible');
      console.log('  • Verify your network connection');
      process.exit(1);
    }
  });