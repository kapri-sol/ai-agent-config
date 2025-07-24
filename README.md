# Agent Config

A TypeScript CLI tool for managing AI agent configurations with template support, remote synchronization, and comprehensive validation.

## Features

- 🚀 **Easy Initialization** - Set up agent configurations with built-in templates
- 🔄 **Remote Sync** - Pull and push configurations from remote sources
- 📋 **Status Monitoring** - Check configuration health and sync status
- 🎯 **Template System** - Default, Claude, and Enterprise templates
- 📁 **Multi-Format Support** - JSON and YAML configuration formats
- 💾 **Backup & Restore** - Automatic backup with restore capabilities
- ✅ **Validation** - Comprehensive configuration validation
- 🔧 **Extensible** - Plugin-based validation system

## Installation

```bash
npm install -g agent-config
```

Or install locally in your project:

```bash
npm install agent-config
```

## Quick Start

1. **Initialize configuration**:
   ```bash
   agent-config init
   ```

2. **Check status**:
   ```bash
   agent-config status
   ```

3. **Sync with remote**:
   ```bash
   agent-config sync --remote https://your-config-server.com
   ```

## Commands

### `init`
Initialize agent configuration with templates.

```bash
agent-config init [options]

Options:
  -f, --force              Force initialization (overwrite existing)
  -t, --template <type>    Template type (default: "default")
  -h, --help              Display help
```

**Available Templates:**
- `default` - Basic agent configuration for general use
- `claude` - Optimized for Claude Code integration
- `enterprise` - Enterprise-grade with security features

### `sync`
Synchronize configuration with remote sources.

```bash
agent-config sync [options]

Options:
  -r, --remote <url>      Remote configuration source URL
  -d, --dry-run          Show changes without applying them
  --pull                 Pull configuration from remote only
  --push                 Push local configuration to remote only
  -h, --help             Display help
```

### `status`
Display current configuration status and health.

```bash
agent-config status [options]

Options:
  -v, --verbose          Show detailed status information
  -h, --help            Display help
```

## Configuration Structure

### Global Configuration
Located at `~/.config/aisync/config.yml`:

```yaml
version: "1.0.0"
initialized: true
templates:
  default:
    name: "Default Configuration"
    description: "Basic agent configuration"
    version: "1.0.0"
sync:
  autoSync: false
  conflictResolution: "prompt"
  backupBeforeSync: true
features:
  validation: true
  backup: true
  autoComplete: true
```

### Local Configuration
Located at `./agent.config.yml` in your project:

```yaml
version: "1.0.0"
environment:
  name: "local"
  type: "development"
  variables: {}
  paths:
    config: "."
    templates: "./templates"
    cache: "./.cache"
    logs: "./logs"
  security:
    encryptionEnabled: false
    trustedSources: []
```

## Templates

### Default Template
Basic configuration suitable for most use cases:
- Standard validation rules
- Basic sync settings
- General-purpose structure

### Claude Template
Optimized for Claude Code integration:
- Claude-specific prompts and settings
- API key management
- Enhanced development workflows

### Enterprise Template
Production-ready configuration:
- Advanced security features
- Audit logging
- Compliance settings
- Organization management

## File Formats

Agent Config supports both JSON and YAML formats:

- **YAML** (recommended): `agent.config.yml`, `config.yml`
- **JSON**: `agent.config.json`, `config.json`

Format is auto-detected based on file extension.

## Validation

The tool includes comprehensive validation:

- **Structure Validation** - Ensures required fields are present
- **Type Checking** - Validates data types and formats
- **Security Checks** - Identifies potential security issues
- **Format Validation** - YAML/JSON syntax validation
- **Custom Rules** - Extensible validation system

## Backup System

Automatic backup features:
- Creates timestamped backups before modifications
- Maintains up to 10 recent backups
- Restore from any backup
- Backup validation before restore

## Remote Synchronization

Sync configurations across environments:

```bash
# Set up remote
agent-config sync --remote https://config.example.com

# Pull latest changes
agent-config sync --pull

# Push local changes
agent-config sync --push

# Full sync (pull + push)
agent-config sync
```

## Development

### Prerequisites
- Node.js >= 20
- TypeScript 5.8+

### Setup
```bash
git clone https://github.com/kapri-sol/ai-agent-config.git
cd ai-agent-config
npm install
```

### Scripts
```bash
npm run build      # Compile TypeScript
npm run dev        # Run in development mode
npm run test       # Run test suite
npm run clean      # Clean build artifacts
```

### Project Structure
```
src/
├── commands/          # CLI command implementations
│   ├── init.ts       # Initialize command
│   ├── sync.ts       # Sync command
│   └── status.ts     # Status command
├── types/            # TypeScript type definitions
│   ├── index.ts      # Main types export
│   └── validation.ts # Validation types
├── utils/            # Utility modules
│   ├── config.ts     # Configuration management
│   ├── file-config.ts # File operations
│   └── sync.ts       # Synchronization logic
└── index.ts          # CLI entry point
```

## Testing

Run the test suite:

```bash
npm test
```

Tests include:
- Unit tests for all core functionality
- Configuration validation tests
- File operation tests
- Mock remote sync tests

Coverage thresholds:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## API Reference

### ConfigManager

Core configuration management class:

```typescript
import { ConfigManager } from 'agent-config';

const manager = new ConfigManager('./config');

// Check if config exists
await manager.exists();

// Load configuration
const config = await manager.load();

// Save configuration
await manager.save(config);

// Initialize with template
await manager.initialize('claude', false);

// Get status
const status = await manager.getStatus();
```

### FileConfigManager

Enhanced file operations with backup support:

```typescript
import { FileConfigManager } from 'agent-config';

const fileManager = new FileConfigManager({
  format: 'yaml',
  createDirs: true,
  backup: true
});

// Load merged configuration
const config = await fileManager.loadMerged();

// Create backup
const backupPath = await fileManager.createBackup();

// List backups
const backups = await fileManager.listBackups();
```

## Configuration Options

### Sync Settings
- `autoSync`: Enable automatic synchronization
- `conflictResolution`: How to handle conflicts (`prompt`, `local`, `remote`)
- `backupBeforeSync`: Create backup before sync operations

### Feature Flags
- `validation`: Enable configuration validation
- `backup`: Enable backup system
- `autoComplete`: Enable shell auto-completion

### Security Settings
- `encryptionEnabled`: Enable configuration encryption
- `trustedSources`: List of trusted remote sources

## Troubleshooting

### Common Issues

**Configuration not found**:
```bash
agent-config init
```

**Permission errors**:
Check file permissions and directory access.

**Invalid remote URL**:
Ensure the remote URL is accessible and properly formatted.

**Validation errors**:
Use `agent-config status -v` to see detailed validation results.

### Debug Mode

Enable verbose logging:
```bash
DEBUG=agent-config:* agent-config sync
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes and add tests
4. Run tests: `npm test`
5. Commit changes: `git commit -am 'Add new feature'`
6. Push to branch: `git push origin feature/new-feature`
7. Submit a Pull Request

## License

ISC License - see [LICENSE](LICENSE) file for details.

## Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/kapri-sol/ai-agent-config/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/kapri-sol/ai-agent-config/discussions)
- 📧 **Email**: your-email@example.com

---

Built with ❤️ for AI agent developers