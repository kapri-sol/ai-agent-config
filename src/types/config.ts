export interface AgentConfig {
  version: string;
  initialized: boolean;
  templates: {
    [key: string]: TemplateConfig;
  };
  sync: {
    remote?: string;
    lastSync?: string;
    autoSync: boolean;
  };
  features: {
    [key: string]: boolean;
  };
}

export interface TemplateConfig {
  name: string;
  description: string;
  files: string[];
  variables?: { [key: string]: string };
}

export interface ConfigStatus {
  initialized: boolean;
  configFiles: string[];
  lastSync?: string;
  version: string;
  template?: string;
  features: string[];
}