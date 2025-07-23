#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { syncCommand } from './commands/sync';
import { statusCommand } from './commands/status';

const program = new Command();

program
  .name('agent-config')
  .description('AI Agent Configuration Management CLI')
  .version('1.0.0');

// Register commands
program.addCommand(initCommand);
program.addCommand(syncCommand);
program.addCommand(statusCommand);

// Parse command line arguments
program.parse(process.argv);