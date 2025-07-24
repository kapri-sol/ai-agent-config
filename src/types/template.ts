/**
 * Template system type definitions
 */

export interface TemplateMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  homepage?: string;
  license?: string;
  keywords: string[];
  category: 'cli' | 'web' | 'api' | 'library' | 'utility' | 'custom';
  created: string;
  updated: string;
}

export interface TemplateRegistry {
  templates: { [id: string]: TemplateMetadata };
  lastUpdated: string;
  source: 'local' | 'remote' | 'hybrid';
  remoteUrl?: string;
}

export interface TemplateInstallOptions {
  force?: boolean;
  skipValidation?: boolean;
  customVariables?: { [key: string]: any };
  targetPath?: string;
  dryRun?: boolean;
}

export interface TemplateInstallResult {
  success: boolean;
  installedFiles: string[];
  skippedFiles: string[];
  errors: string[];
  warnings: string[];
  duration: number;
}

export interface TemplateContext {
  projectName: string;
  variables: { [key: string]: any };
  environment: string;
  timestamp: string;
  userId?: string;
}

export interface TemplateProcessor {
  name: string;
  version: string;
  process(content: string, context: TemplateContext): Promise<string>;
  supports(fileExtension: string): boolean;
}