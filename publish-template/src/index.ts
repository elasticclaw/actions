import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';

interface TemplatePushRequest {
  name: string;
  files: Record<string, string>;
}

function isTextFile(filePath: string): boolean {
  // Read first 8KB and check for null bytes
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
        throw new Error(`Binary file detected in template: ${relativePath}. Templates must contain only text files.`);
      }
      const content = fs.readFileSync(fullPath, 'utf8');
      files[relativePath] = content;
    }
  }
}

async function run(): Promise<void> {
  try {
    const hubEndpoint = core.getInput('hub-endpoint', { required: true }).replace(/\/$/, '');
    const token = core.getInput('token', { required: true });
    const templatePath = core.getInput('path', { required: true });
    const nameOverride = core.getInput('name');
    const dryRun = core.getBooleanInput('dry-run');

    // Validate directory exists
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template directory not found: ${templatePath}`);
    }

    const stats = fs.statSync(templatePath);
    if (!stats.isDirectory()) {
      throw new Error(`Template path is not a directory: ${templatePath}`);
    }

    // Build template name
    let templateName = nameOverride || path.basename(templatePath);

    // Validate name (same rules as hub)
    if (templateName.includes('/') || templateName.includes('\\') || templateName.includes('..')) {
      throw new Error(`Invalid template name: ${templateName}`);
    }

    // Walk directory and collect files
    const files: Record<string, string> = {};
    walkDirectory(templatePath, templatePath, files);

    if (Object.keys(files).length === 0) {
      throw new Error(`Template directory is empty: ${templatePath}`);
    }

    const pushRequest: TemplatePushRequest = {
      name: templateName,
      files,
    };

    if (dryRun) {
      core.info(`[dry-run] Would push template "${templateName}" to ${hubEndpoint}/api/templates`);
      core.info(`[dry-run] Files (${Object.keys(files).length}):`);
      for (const filePath of Object.keys(files).sort()) {
        core.info(`  - ${filePath}`);
      }
      core.setOutput('name', templateName);
      core.setOutput('files', String(Object.keys(files).length));
      core.setOutput('pushed', 'false');
      return;
    }

    // Push to hub
    const response = await fetch(`${hubEndpoint}/api/templates`, {
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

    const result = await response.json() as { name: string };
    core.info(`Successfully pushed template "${result.name}" (${Object.keys(files).length} files)`);

    core.setOutput('name', result.name);
    core.setOutput('files', String(Object.keys(files).length));
    core.setOutput('pushed', 'true');
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
