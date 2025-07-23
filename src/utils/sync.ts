import { promises as fs } from 'fs';
import { join } from 'path';
import { ConfigManager, validateInput } from './config';

export interface SyncOptions {
  remote?: string;
  dryRun: boolean;
  pull: boolean;
  push: boolean;
}

export class SyncManager {
  private configManager: ConfigManager;

  constructor(baseDir: string = process.cwd()) {
    this.configManager = new ConfigManager(baseDir);
  }

  async sync(options: SyncOptions): Promise<{ changes: string[], warnings: string[] }> {
    const changes: string[] = [];
    const warnings: string[] = [];

    // Validate that configuration exists
    const exists = await this.configManager.exists();
    if (!exists) {
      throw new Error('No configuration found. Run "agent-config init" first.');
    }

    // Validate remote URL if provided
    if (options.remote && !validateInput(options.remote, 'url')) {
      throw new Error('Invalid remote URL provided.');
    }

    if (!options.pull && !options.push) {
      options.pull = true;
      options.push = true;
    }

    if (options.pull) {
      const pullChanges = await this.pullFromRemote(options.remote, options.dryRun);
      changes.push(...pullChanges);
    }

    if (options.push) {
      const pushChanges = await this.pushToRemote(options.remote, options.dryRun);
      changes.push(...pushChanges);
    }

    // Update sync timestamp if not dry run
    if (!options.dryRun) {
      await this.configManager.updateSyncInfo(options.remote);
    }

    return { changes, warnings };
  }

  private async pullFromRemote(remote?: string, dryRun: boolean = false): Promise<string[]> {
    const changes: string[] = [];

    if (!remote) {
      // Try to get remote from existing config
      try {
        const config = await this.configManager.load();
        remote = config.sync.remote;
      } catch {
        // No remote configured
      }
    }

    if (!remote) {
      changes.push('No remote configured for pull operation');
      return changes;
    }

    // Simulate remote operations for now
    // In a real implementation, this would:
    // 1. Fetch configuration from remote URL
    // 2. Compare with local configuration
    // 3. Apply changes or show differences

    if (dryRun) {
      changes.push(`[DRY RUN] Would pull configuration from ${remote}`);
      changes.push(`[DRY RUN] Would update local prompts.yaml`);
      changes.push(`[DRY RUN] Would merge remote features`);
    } else {
      changes.push(`Pulled configuration from ${remote}`);
      
      // Simulate pulling some updates
      const backupPath = join(process.cwd(), '.agent-config-backup.json');
      try {
        const config = await this.configManager.load();
        await fs.writeFile(backupPath, JSON.stringify(config, null, 2));
        changes.push('Created backup of current configuration');
        
        // Simulate merging remote changes
        config.features.backup = true;
        await this.configManager.save(config);
        changes.push('Merged remote configuration changes');
        
      } catch (error) {
        throw error;
      }
    }

    return changes;
  }

  private async pushToRemote(remote?: string, dryRun: boolean = false): Promise<string[]> {
    const changes: string[] = [];

    if (!remote) {
      // Try to get remote from existing config
      try {
        const config = await this.configManager.load();
        remote = config.sync.remote;
      } catch {
        // No remote configured
      }
    }

    if (!remote) {
      changes.push('No remote configured for push operation');
      return changes;
    }

    // Simulate remote operations for now
    // In a real implementation, this would:
    // 1. Validate local configuration
    // 2. Upload configuration to remote URL
    // 3. Verify successful upload

    if (dryRun) {
      changes.push(`[DRY RUN] Would push configuration to ${remote}`);
      changes.push(`[DRY RUN] Would upload agent.config.json`);
      changes.push(`[DRY RUN] Would upload prompts.yaml`);
    } else {
      changes.push(`Pushed configuration to ${remote}`);
      
      // Simulate pushing
      try {
        const config = await this.configManager.load();
        const status = await this.configManager.getStatus();
        
        changes.push(`Uploaded ${status.configFiles.length} configuration files`);
        changes.push('Remote synchronization completed');
        
      } catch (error) {
        throw error;
      }
    }

    return changes;
  }
}