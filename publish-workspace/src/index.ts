import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface WorkspaceConfig {
  schema_version?: string;
  name: string;
  repositories?: string[];
  secrets?: string[];
  webhook_secrets?: string[];
  files?: Record<string, string>;
  [key: string]: unknown;
}

interface WorkspacePushRequest {
  workspaces: WorkspaceConfig[];
}

function isTextFile(filePath: string): boolean {
  const buffer = fs.readFileSync(filePath);
  const sample = buffer.slice(0, 8192);
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) {
      return false;
    }
  }
  return true;
}

function walkDirectory(dirPath: string, basePath: string, files: Record<string, string>): void {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(basePath, fullPath);

    if (entry.isDirectory()) {
      if (relativePath === 'workflows' || relativePath.startsWith(`workflows${path.sep}`)) {
        continue;
      }
      walkDirectory(fullPath, basePath, files);
    } else if (entry.isFile()) {
      if (!isTextFile(fullPath)) {
        throw new Error(`Binary file detected in workspace directory: ${relativePath}. Workspace directories must contain only text files.`);
      }
      files[relativePath] = fs.readFileSync(fullPath, 'utf8');
    }
  }
}

function parseYamlObject<T>(content: string, label: string): T {
  const parsed = yaml.load(content);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} must contain a YAML object`);
  }
  return parsed as T;
}

async function run(): Promise<void> {
  try {
    const hubEndpoint = core.getInput('hub-endpoint', { required: true }).replace(/\/$/, '');
    const token = core.getInput('token', { required: true });
    core.setSecret(token);
    const workspacePath = core.getInput('path', { required: true });
    const dryRun = core.getBooleanInput('dry-run');

    if (!fs.existsSync(workspacePath)) {
      throw new Error(`Workspace directory not found: ${workspacePath}`);
    }

    const stats = fs.statSync(workspacePath);
    if (!stats.isDirectory()) {
      throw new Error(`Workspace path is not a directory: ${workspacePath}`);
    }

    const files: Record<string, string> = {};
    walkDirectory(workspacePath, workspacePath, files);

    if (Object.keys(files).length === 0) {
      throw new Error(`Workspace directory is empty: ${workspacePath}`);
    }

    const workspaceConfigPath = Object.keys(files).find(f => f === 'elasticclaw-config.yaml' || f === 'elasticclaw-config.yml' || f === 'workspace.yaml' || f === 'workspace.yml');
    if (!workspaceConfigPath) {
      throw new Error(`Workspace directory must contain an elasticclaw-config.yaml file: ${workspacePath}`);
    }

    let workspaceConfig: WorkspaceConfig;
    try {
      workspaceConfig = parseYamlObject<WorkspaceConfig>(files[workspaceConfigPath], workspaceConfigPath);
    } catch (err) {
      throw new Error(`Failed to parse ${workspaceConfigPath}: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!workspaceConfig.name) {
      throw new Error('Workspace config missing required field: name');
    }

    delete workspaceConfig.workflows;
    workspaceConfig.files = files;
    const pushRequest: WorkspacePushRequest = { workspaces: [workspaceConfig] };

    if (dryRun) {
      core.info(`[dry-run] Would push workspace "${workspaceConfig.name}" to ${hubEndpoint}/api/workspaces`);
      core.info(`[dry-run] Files found (${Object.keys(files).length}):`);
      for (const filePath of Object.keys(files).sort()) {
        core.info(`  - ${filePath}`);
      }
      core.setOutput('name', workspaceConfig.name);
      core.setOutput('pushed', 'false');
      return;
    }

    const response = await fetch(`${hubEndpoint}/api/workspaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(pushRequest),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Hub returned ${response.status}: ${body}`);
    }

    core.info(`Successfully pushed workspace "${workspaceConfig.name}"`);
    core.setOutput('name', workspaceConfig.name);
    core.setOutput('pushed', 'true');
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
