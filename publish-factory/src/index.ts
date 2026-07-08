import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { transformFactoryForJSON } from './transform';

interface FactoryConfig {
  name: string;
  integration: string;
  workspace: string;
  trigger_status: string;
  done_status?: string;
  template: string;
  labels?: string[];
  assigned_to?: string;
  enabled?: boolean;
  webhook_secret?: string;
  webhook_secret_ref?: string;
  pipeline_yaml?: string;
  schema_version?: string;
  [key: string]: unknown;
}

interface FactoryPushRequest {
  factories: FactoryConfig[];
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
        throw new Error(`Binary file detected in factory directory: ${relativePath}. Factory directories must contain only text files.`);
      }
      const content = fs.readFileSync(fullPath, 'utf8');
      files[relativePath] = content;
    }
  }
}

async function run(): Promise<void> {
  try {
    const hubEndpoint = core.getInput('hub-endpoint', { required: true });
    const token = core.getInput('token', { required: true });
    core.setSecret(token);
    const factoryPath = core.getInput('path', { required: true });
    const dryRun = core.getBooleanInput('dry-run');

    // Validate directory exists
    if (!fs.existsSync(factoryPath)) {
      throw new Error(`Factory directory not found: ${factoryPath}`);
    }

    const stats = fs.statSync(factoryPath);
    if (!stats.isDirectory()) {
      throw new Error(`Factory path is not a directory: ${factoryPath}`);
    }

    // Walk directory and collect files
    const files: Record<string, string> = {};
    walkDirectory(factoryPath, factoryPath, files);

    if (Object.keys(files).length === 0) {
      throw new Error(`Factory directory is empty: ${factoryPath}`);
    }

    // Parse factory.yaml as the main config
    const factoryYamlPath = Object.keys(files).find(f => f === 'factory.yaml' || f === 'factory.yml');
    if (!factoryYamlPath) {
      throw new Error(`Factory directory must contain a factory.yaml or factory.yml file: ${factoryPath}`);
    }

    let factoryConfig: FactoryConfig;
    try {
      const parsed = yaml.load(files[factoryYamlPath]);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('factory.yaml must contain a YAML object');
      }
      factoryConfig = parsed as FactoryConfig;
    } catch (err) {
      throw new Error(`Failed to parse factory.yaml: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!factoryConfig.name) {
      throw new Error('Factory config missing required field: name');
    }

    // If pipeline.yaml exists, inject it as pipeline_yaml
    const pipelineYamlPath = Object.keys(files).find(f => f === 'pipeline.yaml' || f === 'pipeline.yml');
    if (pipelineYamlPath && !factoryConfig.pipeline_yaml) {
      factoryConfig.pipeline_yaml = files[pipelineYamlPath];
    }

    const pushRequest: FactoryPushRequest = { factories: [transformFactoryForJSON(factoryConfig)] };

    if (dryRun) {
      core.info(`[dry-run] Would push factory "${factoryConfig.name}" to ${hubEndpoint}/api/factories`);
      core.info(`[dry-run] Files found (${Object.keys(files).length}):`);
      for (const filePath of Object.keys(files).sort()) {
        core.info(`  - ${filePath}`);
      }
      core.setOutput('name', factoryConfig.name);
      core.setOutput('pushed', 'false');
      return;
    }

    // Push to hub
    const response = await fetch(`${hubEndpoint.replace(/\/$/, '')}/api/factories`, {
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

    const result = await response.json() as { pushed: number; factories: Array<{ name: string }> };
    core.info(`Successfully pushed factory "${factoryConfig.name}"`);

    core.setOutput('name', factoryConfig.name);
    core.setOutput('pushed', 'true');
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
