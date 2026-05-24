import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface WorkflowConfig {
  schema_version?: string;
  name: string;
  trigger?: unknown;
  stages?: unknown[];
  [key: string]: unknown;
}

interface WorkflowPushRequest {
  workflows: WorkflowConfig[];
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
    core.setSecret(token);
    const workspace = core.getInput('workspace', { required: true });
    const workflowPath = core.getInput('path', { required: true });
    const dryRun = core.getBooleanInput('dry-run');

    if (!fs.existsSync(workflowPath)) {
      throw new Error(`Workflow file not found: ${workflowPath}`);
    }

    const stats = fs.statSync(workflowPath);
    if (!stats.isFile()) {
      throw new Error(`Workflow path is not a file: ${workflowPath}`);
    }

    let workflow: WorkflowConfig;
    try {
      workflow = parseYamlObject<WorkflowConfig>(fs.readFileSync(workflowPath, 'utf8'), path.basename(workflowPath));
    } catch (err) {
      throw new Error(`Failed to parse ${workflowPath}: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!workflow.name) {
      throw new Error('Workflow config missing required field: name');
    }

    const pushRequest: WorkflowPushRequest = { workflows: [workflow] };

    if (dryRun) {
      core.info(`[dry-run] Would push workflow "${workflow.name}" to workspace "${workspace}"`);
      core.setOutput('name', workflow.name);
      core.setOutput('workspace', workspace);
      core.setOutput('pushed', 'false');
      return;
    }

    const response = await fetch(`${hubEndpoint.replace(/\/$/, '')}/api/workspaces/${encodeURIComponent(workspace)}/workflows`, {
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

    core.info(`Successfully pushed workflow "${workflow.name}" to workspace "${workspace}"`);
    core.setOutput('name', workflow.name);
    core.setOutput('workspace', workspace);
    core.setOutput('pushed', 'true');
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
