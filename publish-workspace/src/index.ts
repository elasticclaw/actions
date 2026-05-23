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
  workflows?: WorkflowConfig[];
  [key: string]: unknown;
}

interface WorkflowConfig {
  schema_version?: string;
  name: string;
  integration?: string;
  workspace?: string;
  team?: string;
  trigger_status?: string;
  working_status?: string;
  finished_status?: string;
  terminate_on_leave?: boolean;
  template: string;
  provider?: string;
  name_pattern?: string;
  tags?: string[];
  color?: string;
  labels?: string[];
  assigned_to?: string;
  allowed_labelers?: string[];
  secret_refs?: Record<string, string>;
  inputs?: unknown[];
  concurrency_group?: string;
  enable_manual_trigger?: boolean;
  repos?: string[];
  trigger_repos?: string[];
  trigger?: unknown;
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
    const hubEndpoint = core.getInput('hub-endpoint', { required: true });
    const token = core.getInput('token', { required: true });
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

    const workspaceYamlPath = Object.keys(files).find(f => f === 'workspace.yaml' || f === 'workspace.yml');
    if (!workspaceYamlPath) {
      throw new Error(`Workspace directory must contain a workspace.yaml or workspace.yml file: ${workspacePath}`);
    }

    let workspaceConfig: WorkspaceConfig;
    try {
      workspaceConfig = parseYamlObject<WorkspaceConfig>(files[workspaceYamlPath], 'workspace.yaml');
    } catch (err) {
      throw new Error(`Failed to parse workspace.yaml: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!workspaceConfig.name) {
      throw new Error('Workspace config missing required field: name');
    }

    const workflowPaths = Object.keys(files)
      .filter(f => /^workflows\/[^/]+\.ya?ml$/.test(f))
      .sort();

    const workflows: WorkflowConfig[] = [];
    for (const workflowPath of workflowPaths) {
      try {
        const workflow = parseYamlObject<WorkflowConfig>(files[workflowPath], workflowPath);
        if (!workflow.name) {
          throw new Error('missing required field: name');
        }
        if (!workflow.template) {
          throw new Error('missing required field: template');
        }
        workflows.push(workflow);
      } catch (err) {
        throw new Error(`Failed to parse ${workflowPath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    workspaceConfig.workflows = workflows;
    const pushRequest: WorkspacePushRequest = { workspaces: [workspaceConfig] };

    if (dryRun) {
      core.info(`[dry-run] Would push workspace "${workspaceConfig.name}" with ${workflows.length} workflow(s) to ${hubEndpoint}/api/workspaces`);
      core.info(`[dry-run] Files found (${Object.keys(files).length}):`);
      for (const filePath of Object.keys(files).sort()) {
        core.info(`  - ${filePath}`);
      }
      core.setOutput('name', workspaceConfig.name);
      core.setOutput('workflows', String(workflows.length));
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

    core.info(`Successfully pushed workspace "${workspaceConfig.name}" with ${workflows.length} workflow(s)`);
    core.setOutput('name', workspaceConfig.name);
    core.setOutput('workflows', String(workflows.length));
    core.setOutput('pushed', 'true');
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
