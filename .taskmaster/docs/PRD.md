---
<context>
# Overview  
AI Tools Configuration Sync System은 Claude Code, Gemini CLI 등의 AI 도구 설정 파일을 GitHub Repository에서 중앙 관리하고 로컬 환경과 동기화하는 시스템입니다. 확장 가능한 플러그인 아키텍처를 통해 향후 Cursor, Windsurf 등 다양한 AI 도구를 지원할 수 있습니다.

**해결하는 문제:**
- 여러 AI 도구의 설정을 각각 관리해야 하는 복잡성
- 새 환경 설정 시 각 도구별로 설정을 일일이 복사해야 하는 번거로움
- AI 도구 설정의 버전 관리 및 팀 공유의 어려움
- 설정 변경 시 모든 환경에 일관되게 적용하기 어려운 문제

**대상 사용자:**
- Claude Code, Gemini CLI 등 여러 AI CLI 도구를 사용하는 개발자
- 팀 내 AI 도구 설정을 표준화하려는 DevOps 엔지니어
- 여러 머신에서 일관된 AI 개발 환경을 구축하려는 개발자

**핵심 가치:**
- AI 도구별 설정의 통합 관리
- 새로운 AI 도구 지원을 위한 확장 가능한 구조
- 사용자가 선택 가능한 동기화 방식 (자동/수동)
- Git 기반 설정 버전 관리 및 팀 협업

# Core Features  

## 1. AI 도구별 설정 동기화
**기능:** Claude Code, Gemini CLI 설정 파일을 GitHub에서 로컬 설정 디렉토리로 자동 동기화
**중요성:** 각 도구의 고유한 설정 구조를 이해하고 정확한 위치에 배치
**작동 방식:** 도구별 프로파일을 통해 설정 파일 경로, 형식, 권한 등을 관리

## 2. 플러그인 기반 확장 시스템
**기능:** 새로운 AI 도구 지원을 위한 플러그인 인터페이스 제공
**중요성:** Cursor, Windsurf 등 새로운 도구가 출시되어도 쉽게 확장 가능
**작동 방식:** 표준화된 플러그인 API를 통해 도구별 설정 로직을 모듈화

## 3. 유연한 동기화 모드
**기능:** Polling 자동 동기화 vs 수동 명령어 실행 중 선택 가능
**중요성:** 사용자의 워크플로우와 보안 요구사항에 맞는 동기화 방식 제공
**작동 방식:** 
- **자동 모드:** 백그라운드에서 주기적으로 GitHub 변경사항 체크 및 적용
- **수동 모드:** `aisync pull` 명령어로 필요시에만 동기화 실행

## 4. 도구별 설정 검증
**기능:** 각 AI 도구의 설정 파일 형식 및 내용 유효성 검사
**중요성:** 잘못된 설정으로 인한 도구 오작동 방지
**작동 방식:** 도구별 스키마 검증 및 설정 적용 전 문법 체크

## 5. 통합 Agent 설정 (향후 비전)
**기능:** 하나의 AGENT.md 파일로 모든 AI agent 설정을 통합 관리
**중요성:** 도구별 설정 파일 형식의 복잡성을 제거하고 일관된 설정 경험 제공
**작동 방식:** AGENT.md 파일에서 agent별 선택적 적용 규칙을 정의하고, 각 도구의 네이티브 형식으로 자동 변환

## 6. 환경별 설정 오버라이드
**기능:** 공통 설정 + 환경별(dev/staging/prod) 차이점 관리
**중요성:** 기본 설정은 공유하되 환경별 특수 설정은 분리 관리
**작동 방식:** 계층적 설정 파일 구조 및 환경 변수 기반 오버라이드

# User Experience  

## User Personas
**Primary User: AI 도구 파워유저**
- Claude Code, Gemini CLI 등 여러 AI 도구를 일상적으로 사용
- 효율적인 프롬프트와 설정을 지속적으로 개선
- 새로운 AI 도구 도입에 적극적

**Secondary User: 개발팀 리더**
- 팀 내 AI 도구 사용 표준화 필요
- 새 팀원 온보딩 시 설정 공유 자동화 원함
- 팀 전체의 AI 활용 효율성 향상 목표

## Key User Flows

**초기 설정 플로우:**
1. `aisync init` - 시스템 초기화 및 설정 파일 생성
2. GitHub Repository 설정 (URL, 브랜치, 인증)
3. 사용하는 AI 도구 선택 (Claude Code, Gemini CLI 등)
4. 동기화 모드 선택 (자동 polling vs 수동 실행)
5. `aisync install claude-code` - 특정 도구 설정 활성화

**일상 사용 플로우 (자동 모드):**
1. GitHub에서 AI 도구 설정 수정 (웹 UI 또는 로컬 편집 후 push)
2. 백그라운드 서비스가 변경사항 자동 감지
3. 관련 AI 도구 설정 파일 자동 업데이트
4. 필요시 도구 재시작 또는 설정 리로드

**일상 사용 플로우 (수동 모드):**
1. GitHub에서 AI 도구 설정 수정
2. `aisync pull` 또는 `aisync pull claude-code` 명령으로 수동 동기화
3. `aisync status` 명령으로 현재 동기화 상태 확인

**새 도구 추가 플로우:**
1. `aisync plugins list` - 사용 가능한 플러그인 확인
2. `aisync plugins install cursor` - 새 도구 플러그인 설치
3. `aisync tools add cursor` - 동기화 대상에 새 도구 추가
4. GitHub Repository에 해당 도구 설정 파일 추가

## UI/UX Considerations
- **CLI 우선:** 개발자 친화적 명령줄 인터페이스
- **도구별 네임스페이스:** `aisync claude-code status`, `aisync gemini config` 등
- **명확한 상태 표시:** 각 도구별 동기화 상태를 색상과 아이콘으로 구분
- **Safe by default:** 기존 설정 백업 후 새 설정 적용
</context>

<PRD>
# Technical Architecture  

## System Components

**Core Sync Engine (Node.js/TypeScript)**
- Plugin manager and registry
- Unified configuration system
- Sync orchestrator (auto/manual modes)
- State management and tracking

**AI Tool Plugins (JavaScript/TypeScript)**
- **Claude Code Plugin:** ~/.config/claude/ 설정 관리
- **Gemini CLI Plugin:** ~/.config/gemini/ 설정 관리
- **Future Plugins:** Cursor, Windsurf, 기타 AI 도구

**GitHub Integration Module**
- Repository management (Octokit.js)
- Change detection (polling/webhook)
- File download and validation
- Branch and tag support

**Configuration Management**
- Tool-specific config validators
- Environment-based overrides
- Backup and restore system
- Migration utilities

## Data Models

**Master Configuration:**
```yaml
# ~/.config/aisync/config.yml
github:
  repository: "username/ai-configs"
  branch: "main"
  auth_method: "token"
  
sync_mode: "manual" | "auto"  # 사용자 선택
auto_sync:
  polling_interval: 300  # seconds
  enabled: true
  
tools:
  claude-code:
    enabled: true
    config_path: "claude/config.json"
    local_path: "~/.config/claude/"
    validation: true
    backup: true
    
  gemini-cli:
    enabled: true
    config_path: "gemini/settings.yaml"
    local_path: "~/.config/gemini/"
    validation: true
    backup: true
    
  # Future tools
  cursor:
    enabled: false
    plugin: "cursor-plugin"
    
environments:
  current: "development"
  overrides:
    development:
      claude-code:
        debug_mode: true
    production:
      claude-code:
        debug_mode: false
```

**GitHub Repository Structure:**
```
ai-configs/
├── AGENT.md                  # 통합 Agent 설정 (Phase 5+)
├── claude/
│   ├── config.json           # Claude Code 기본 설정
│   ├── prompts/
│   │   ├── coding.md
│   │   └── review.md
│   └── environments/
│       ├── dev.json
│       └── prod.json
├── gemini/
│   ├── settings.yaml         # Gemini CLI 설정
│   ├── models.json
│   └── auth/
├── shared/
│   ├── common-prompts.md
│   └── team-guidelines.md
└── plugins/
    ├── cursor/
    └── windsurf/
```

**AGENT.md Unified Configuration (향후 구조):**
```markdown
# AI Agents Configuration

## Global Settings
<!-- 모든 agent에 공통으로 적용되는 설정 -->
```yaml
global:
  temperature: 0.7
  max_tokens: 4000
  context_window: 8000
  response_format: "markdown"
```

## Agent-Specific Configuration

### Claude Code
<!-- targets: claude-code -->
```yaml
claude_code:
  model: "claude-3-sonnet"
  custom_instructions: |
    You are a senior software engineer focused on writing clean, 
    maintainable code with comprehensive documentation.
  
  prompts:
    - name: "code_review"
      content: "Review this code for best practices..."
    - name: "debugging"
      content: "Help me debug this issue..."
      
  shortcuts:
    cr: "code_review"
    db: "debugging"
```

### Gemini CLI  
<!-- targets: gemini-cli -->
```yaml
gemini_cli:
  model: "gemini-pro"
  safety_settings:
    harassment: "block_none"
    hate_speech: "block_none"
  
  custom_instructions: |
    Focus on providing accurate, technical responses
    with code examples when relevant.
```

### Multi-Agent Settings
<!-- targets: claude-code,cursor -->
<!-- excludes: gemini-cli,windsurf -->
```yaml
coding_agents:
  file_extensions: [".js", ".py", ".go", ".md"]
  auto_format: true
  include_tests: true
```

### Environment Overrides
<!-- env: development -->
<!-- targets: all -->
```yaml
development:
  debug_mode: true
  verbose_logging: true
  temperature: 0.3  # More consistent for development
```

<!-- env: production -->
<!-- targets: all -->
```yaml
production:
  debug_mode: false
  temperature: 0.7
  rate_limiting: true
```
```

**Plugin Interface (TypeScript):**
```typescript
interface AIToolPlugin {
  name: string;
  version: string;
  description: string;
  
  // 설정 파일 경로 정보
  getConfigPaths(): string[];
  getLocalPaths(): string[];
  
  // 검증 및 설치
  validate(configData: Buffer | string): Promise<boolean>;
  install(configData: Buffer | string, localPath: string): Promise<void>;
  
  // 백업 및 복원
  backup(localPath: string): Promise<string>; // 백업 파일 경로 반환
  restore(backupPath: string): Promise<void>;
  
  // AGENT.md 통합 지원 (Phase 4+)
  parseAgentConfig?(agentConfig: any): any; // AGENT.md 설정을 도구별 형식으로 변환
  supportsUnifiedConfig?(): boolean;
}

// Plugin 모듈 Export 형식
export default class ClaudeCodePlugin implements AIToolPlugin {
  name = "claude-code";
  version = "1.0.0";
  description = "Claude Code configuration sync plugin";
  
  async validate(configData: string): Promise<boolean> {
    try {
      JSON.parse(configData);
      return true;
    } catch {
      return false;
    }
  }
  
  async install(configData: string, localPath: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs.writeFile(path.join(localPath, 'config.json'), configData);
  }
  
  // ... 기타 메서드 구현
}
```

## APIs and Integrations

**CLI Commands:**
```bash
# 설치 및 초기화
npm install -g aisync                # Global 설치
npx aisync init [--repo URL] [--mode auto|manual]  # 프로젝트별 설치도 지원

# 기본 명령어
aisync status [--tool TOOL] [--verbose]
aisync pull [--tool TOOL] [--force]
aisync push [--tool TOOL]  # 향후 양방향 지원

# 도구 관리
aisync tools list
aisync tools add TOOL
aisync tools remove TOOL
aisync tools status TOOL

# 플러그인 관리 (NPM 기반)
aisync plugins list [--available]
aisync plugins install @aisync/plugin-cursor  # NPM 패키지로 설치
aisync plugins update @aisync/plugin-claude-code
aisync plugins uninstall PLUGIN
aisync plugins search KEYWORD       # NPM 레지스트리 검색

# 자동 동기화 제어
aisync start-daemon [--interval SECONDS]
aisync stop-daemon
aisync daemon-status
aisync daemon-logs [--follow]       # Winston 로그 확인

# 환경 관리
aisync env list
aisync env set ENVIRONMENT
aisync env override TOOL KEY VALUE

# 통합 Agent 설정 (Phase 4+)
aisync agent validate           # AGENT.md 파일 유효성 검사
aisync agent preview TOOL       # 특정 도구에 적용될 설정 미리보기
aisync agent convert            # AGENT.md → 도구별 네이티브 설정 변환
aisync agent targets list       # 현재 설정이 적용될 대상 agent 목록
aisync agent diff TOOL          # 현재 로컬 설정과 AGENT.md 차이점 비교

# 개발자 도구
aisync config show             # 현재 설정 표시
aisync config edit             # 기본 에디터로 설정 편집
aisync debug [--tool TOOL]     # 디버그 정보 출력
aisync doctor                  # 시스템 상태 체크
```

**Package.json Scripts (개발자용):**
```json
{
  "scripts": {
    "dev": "tsx watch src/cli/index.ts",
    "build": "tsc && tsc-alias",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "plugin:create": "aisync-create-plugin",
    "plugin:validate": "aisync-validate-plugin"
  }
}
```

**Tool-Specific Commands:**
```bash
# Claude Code 전용
aisync claude-code config validate
aisync claude-code prompts list
aisync claude-code prompts sync

# Gemini CLI 전용  
aisync gemini config test
aisync gemini models refresh
```

## Infrastructure Requirements

**Development:**
- Go 1.21+ (Plugin system을 위한 최신 버전)
- GitHub API access
- File system monitoring (fsnotify)

**Runtime:**
- 메모리: 100MB (플러그인 로딩 포함)
- 디스크: 200MB (백업 및 플러그인)
- 네트워크: GitHub API (443), optional webhook (8080)

**Supported Platforms:**
- macOS (Intel/Apple Silicon)
- Linux (x86_64/ARM64)
- Windows (x86_64) - 향후 지원

# Development Roadmap  

## Phase 1: MVP with Claude Code Support
**범위:** Claude Code 단일 도구 지원, 수동 동기화
**구현 사항:**
- 기본 CLI 프레임워크 및 설정 시스템
- GitHub API 클라이언트 (REST)
- Claude Code 플러그인 (config.json 처리)
- 수동 동기화 명령어 (pull, status)
- 기본 백업 및 복원 기능
- 설정 파일 검증 로직

**결과물:** `aisync pull claude-code` 명령으로 Claude Code 설정을 GitHub에서 동기화

## Phase 2: Gemini CLI Support + Auto Sync
**범위:** 두 번째 도구 지원, 자동 동기화 옵션
**구현 사항:**
- Gemini CLI 플러그인 개발
- 플러그인 아키텍처 추상화 및 인터페이스 정의
- 백그라운드 데몬 서비스 (polling 모드)
- 다중 도구 동시 관리
- 환경별 설정 오버라이드 시스템
- 향상된 상태 관리 및 로깅

**결과물:** 두 개 도구를 자동/수동 선택하여 동기화하는 완전한 시스템

## Phase 3: Plugin Ecosystem + Advanced Features
**범위:** 플러그인 생태계, 고급 기능, 확장성
**구현 사항:**
- 동적 플러그인 로딩 시스템
- Cursor 플러그인 (IDE 설정 파일)
- Windsurf 플러그인 개발
- Webhook 기반 실시간 동기화
- 설정 충돌 해결 메커니즘
- 팀 설정 템플릿 시스템
- CLI 자동완성 및 help 시스템

**결과물:** 다양한 AI 도구를 지원하는 확장 가능한 플랫폼

## Phase 4: Unified Agent Configuration System
**범위:** AGENT.md 통합 설정, 선택적 적용, 자동 변환
**구현 사항:**
- AGENT.md 파일 파싱 및 검증 시스템
- Agent 선택적 적용 로직 (`targets`, `excludes` 태그)
- 환경별 오버라이드 시스템 (`env` 태그)
- 통합 설정을 도구별 네이티브 형식으로 자동 변환
- 기존 도구별 설정 파일과의 하위 호환성
- 설정 충돌 감지 및 우선순위 관리

**결과물:** 하나의 AGENT.md 파일로 모든 AI agent를 통합 관리하는 시스템

## Phase 5: Enterprise Features
**범위:** 기업 환경 지원, 고급 관리 기능
**구현 사항:**
- 양방향 동기화 (local → GitHub)
- 팀 권한 관리 및 접근 제어
- 설정 변경 승인 워크플로우
- 웹 기반 관리 대시보드
- 사용량 분석 및 리포팅
- Enterprise GitHub 지원

**결과물:** 대규모 조직에서 사용 가능한 엔터프라이즈 솔루션

# Logical Dependency Chain

## Foundation (반드시 먼저)
1. **CLI Framework** - 모든 사용자 인터페이스의 기반
2. **Configuration System** - 도구별 설정 및 전역 설정 관리
3. **GitHub Client** - Repository 접근 및 파일 다운로드
4. **File System Operations** - 로컬 파일 조작 및 백업

## Core Plugin System (확장성 확보)
5. **Plugin Interface** - 새로운 도구 지원을 위한 추상화
6. **Claude Code Plugin** - 첫 번째 구체적 구현체
7. **Plugin Registry** - 플러그인 관리 및 로딩 시스템
8. **Validation Framework** - 도구별 설정 검증

## Basic Sync Operations (기본 동작)
9. **Manual Sync Engine** - 수동 동기화 핵심 로직
10. **State Tracking** - 동기화 상태 및 이력 관리
11. **Backup System** - 안전한 설정 변경을 위한 백업
12. **Error Recovery** - 실패 상황 처리 및 복원

## Multi-Tool Support (실용성)
13. **Gemini CLI Plugin** - 두 번째 도구로 패턴 검증
14. **Multi-Tool Orchestrator** - 여러 도구 동시 관리
15. **Environment Overrides** - 환경별 설정 차이 처리

## Automation Layer (편의성)
16. **Background Daemon** - 자동 동기화 서비스
17. **Change Detection** - GitHub 변경사항 모니터링
18. **Smart Scheduling** - 효율적인 동기화 주기 관리

## Advanced Features (완성도)
19. **Dynamic Plugin Loading** - 런타임 플러그인 설치
20. **Webhook Integration** - 실시간 동기화
21. **Conflict Resolution** - 설정 충돌 처리
22. **Team Features** - 협업 및 공유 기능

**빠른 프로토타입을 위한 접근:**
- Phase 1에서 Claude Code 하나만으로 완전한 워크플로우 구현
- Plugin 인터페이스를 미리 설계하여 Phase 2에서 쉽게 확장
- 수동 모드부터 구현하여 복잡성 최소화

# Risks and Mitigations  

## Technical Challenges

**Risk: AI 도구별 설정 구조의 복잡성과 변화**
- **영향:** 각 도구마다 다른 설정 파일 형식, 경로, 검증 규칙
- **완화방안:**
  - 플러그인 아키텍처로 도구별 로직 분리
  - 설정 스키마 버전 관리 시스템
  - 도구 업데이트 시 호환성 체크 자동화

**Risk: Plugin 시스템의 보안 취약성**
- **영향:** 악의적인 플러그인으로 인한 시스템 침해
- **완화방안:**
  - 플러그인 코드 서명 및 검증 시스템
  - Sandbox 환경에서 플러그인 실행
  - 공식 플러그인 레지스트리 운영

**Risk: 설정 파일 동기화 시 도구 오작동**
- **영향:** 잘못된 설정으로 AI 도구가 실행되지 않음
- **완화방안:**
  - 설정 적용 전 유효성 검사 필수화
  - 자동 백업 및 롤백 메커니즘
  - 도구별 설정 테스트 명령어 제공

## MVP Strategy and Scope

**Risk: 너무 많은 도구를 한번에 지원하려다 복잡해짐**
- **완화방안:**
  - Claude Code 하나만으로 MVP 완성
  - 플러그인 인터페이스만 설계하고 실제 구현은 Phase 2로 연기
  - 수동 동기화 우선, 자동 기능은 나중에 추가

**Risk: 사용자가 수동/자동 모드 선택을 어려워함**
- **완화방안:**
  - 기본값을 수동 모드로 설정 (안전성 우선)
  - 명확한 모드별 장단점 설명 제공
  - 모드 전환이 쉽도록 설계

## Resource and Adoption Challenges

**Risk: 각 AI 도구의 설정 파일 위치 파악 어려움**
- **완화방안:**
  - 커뮤니티 기여를 통한 도구별 정보 수집
  - 자동 설정 위치 탐지 기능 구현
  - 사용자 정의 경로 설정 지원

**Risk: 플러그인 개발자 확보의 어려움**
- **완화방안:**
  - 플러그인 개발 문서화 및 예제 제공
  - 간단한 플러그인 생성 도구 개발
  - 인기 도구 우선 공식 플러그인 개발

**Risk: GitHub API 의존성**
- **완화방안:**
  - GitLab, Bitbucket 등 다른 Git 서비스 지원 확장 가능한 구조
  - 로컬 Git Repository 동기화 옵션
  - 설정 파일 export/import 기능

# Appendix  

## AI Tool Configuration Analysis

**Claude Code:**
- 설정 위치: `~/.config/claude/` 또는 `~/.claude/`
- 주요 파일: `config.json`, `prompts/`, `context/`
- 설정 형식: JSON
- 특이사항: 프롬프트 템플릿 파일 관리 필요

**Gemini CLI:**
- 설정 위치: `~/.config/gemini/` 또는 `~/.gemini/`  
- 주요 파일: `config.yaml`, `auth.json`, `models.json`
- 설정 형식: YAML + JSON 혼재
- 특이사항: API 키 보안 관리 필요

**Future Tools (예상):**
- **Cursor:** IDE 설정이므로 workspace 기반 `.cursor/` 디렉토리
- **Windsurf:** 브라우저 확장 형태일 경우 다른 접근 방식 필요

## Plugin Development Specification

**Plugin Package Structure:**
```
plugins/
├── claude-code/
│   ├── package.json
│   ├── src/
│   │   ├── index.ts           # Main plugin class
│   │   ├── validator.ts       # Config validation logic
│   │   └── installer.ts       # Installation logic
│   ├── schemas/
│   │   └── config.schema.json # JSON Schema for validation
│   ├── tests/
│   │   └── plugin.test.ts
│   └── README.md
└── gemini-cli/
    ├── package.json
    └── src/index.ts
```

**package.json Example:**
```json
{
  "name": "@aisync/plugin-claude-code",
  "version": "1.0.0",
  "description": "Claude Code configuration sync plugin",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  
  "aisync": {
    "pluginVersion": "1.0",
    "supportedOS": ["darwin", "linux", "win32"],
    "configFiles": [
      {
        "name": "config.json",
        "path": "~/.config/claude/config.json",
        "format": "json",
        "required": true,
        "schema": "./schemas/config.schema.json"
      }
    ],
    "dependencies": ["node-18+"]
  },
  
  "peerDependencies": {
    "@aisync/core": "^1.0.0"
  }
}
```

**TypeScript Plugin Template:**
```typescript
import { AIToolPlugin, PluginContext, ConfigValidationResult } from '@aisync/core';
import * as path from 'path';
import * as fs from 'fs/promises';
import Joi from 'joi';

export default class ClaudeCodePlugin implements AIToolPlugin {
  readonly name = 'claude-code';
  readonly version = '1.0.0';
  readonly description = 'Claude Code configuration sync plugin';

  private configSchema = Joi.object({
    model: Joi.string().required(),
    temperature: Joi.number().min(0).max(2),
    custom_instructions: Joi.string(),
    prompts: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        content: Joi.string().required()
      })
    )
  });

  getConfigPaths(): string[] {
    return ['claude/config.json', 'claude/prompts/'];
  }

  getLocalPaths(): string[] {
    return [
      path.expanduser('~/.config/claude/config.json'),
      path.expanduser('~/.config/claude/prompts/')
    ];
  }

  async validate(configData: string): Promise<ConfigValidationResult> {
    try {
      const config = JSON.parse(configData);
      const { error } = this.configSchema.validate(config);
      
      return {
        valid: !error,
        errors: error ? [error.message] : [],
        warnings: []
      };
    } catch (parseError) {
      return {
        valid: false,
        errors: ['Invalid JSON format'],
        warnings: []
      };
    }
  }

  async install(configData: string, localPath: string, context: PluginContext): Promise<void> {
    // 백업 생성
    await this.backup(localPath);
    
    // 설정 파일 쓰기
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, configData, 'utf-8');
    
    context.logger.info(`Claude Code configuration installed to ${localPath}`);
  }

  // AGENT.md 통합 지원 (Phase 4)
  parseAgentConfig(agentConfig: any): any {
    return {
      model: agentConfig.claude_code?.model || 'claude-3-sonnet',
      temperature: agentConfig.global?.temperature || 0.7,
      custom_instructions: agentConfig.claude_code?.custom_instructions,
      prompts: agentConfig.claude_code?.prompts || []
    };
  }

  supportsUnifiedConfig(): boolean {
    return true;
  }
}
```

## AGENT.md Configuration Examples

**Basic Multi-Agent Setup:**
```markdown
# AGENT.md

## Global Settings
```yaml
global:
  temperature: 0.7
  max_tokens: 4000
  safety_mode: "balanced"
```

## Coding Agents Only
<!-- targets: claude-code,cursor -->
<!-- excludes: gemini-cli -->
```yaml
coding:
  include_context: true
  auto_complete: true
  format_on_save: true
  
  custom_instructions: |
    Always include error handling and follow clean code principles.
    Add comments for complex logic.
```

## Research Agents Only  
<!-- targets: gemini-cli -->
```yaml
research:
  cite_sources: true
  fact_check: true
  search_depth: "comprehensive"
```

## Environment-Specific Settings
<!-- env: development -->
<!-- targets: all -->
```yaml
dev_settings:
  debug_mode: true
  verbose_output: true
  rate_limit: false
```

<!-- env: production -->  
<!-- targets: claude-code,cursor -->
```yaml
prod_settings:
  debug_mode: false
  optimization: "performance"
  rate_limit: true
  monitoring: enabled
```
```

**Advanced Conditional Logic:**
```markdown
## Team-Specific Settings
<!-- targets: claude-code -->
<!-- condition: team=frontend -->
```yaml
frontend_team:
  frameworks: ["react", "vue", "svelte"]
  linting: "strict"
  testing: "jest"
```

<!-- targets: claude-code -->
<!-- condition: team=backend -->
```yaml
backend_team:
  frameworks: ["node", "python", "go"]
  database: "postgresql"
  testing: "unit+integration"
```
```

## Performance Requirements

**Sync Performance:**
- 단일 설정 파일 동기화: < 3초
- 전체 도구 동기화: < 10초
- AGENT.md 파싱 및 변환: < 5초
- 백그라운드 메모리 사용: < 150MB (Node.js V8 엔진)
- CLI 시작 시간: < 3초 (TypeScript 컴파일 포함)

**AGENT.md Processing:**
- 파일 크기 제한: 50MB
- 지원 agent 수: 무제한
- 조건부 적용 처리: < 2초
- 네이티브 설정 변환: < 3초

**Node.js Specific Requirements:**
- Heap 메모리 제한: 1GB (--max-old-space-size)
- 플러그인 동적 로딩: < 2초
- NPM 패키지 설치 크기: < 100MB
- ES Module 지원 필수

**Reliability Targets:**
- 동기화 성공률: 99.5%
- 설정 파일 무결성: 100%
- 백업 복원 성공률: 100%
- 네트워크 오류 복구: 3회 재시도 후 성공

**Scalability:**
- 지원 도구 수: 50개+
- 동시 사용자: 1000명 (GitHub API 한도 내)
- 설정 파일 크기: 도구당 10MB
- 플러그인 로딩 시간: < 2초
</PRD>