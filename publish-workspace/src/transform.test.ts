import { describe, it, expect } from 'vitest';
import { transformWorkspaceForJSON, isV2Schema } from './transform';

const FILES = {
  'elasticclaw-config.yaml': 'schema_version: 2\nname: example\n',
  'AGENTS.md': '# Agent\n',
};

describe('isV2Schema', () => {
  it('accepts "2", numeric 2, and "v2" case-insensitively', () => {
    expect(isV2Schema('2')).toBe(true);
    expect(isV2Schema(2)).toBe(true);
    expect(isV2Schema('v2')).toBe(true);
    expect(isV2Schema('V2')).toBe(true);
    expect(isV2Schema(' 2 ')).toBe(true);
  });

  it('rejects v1, empty, and missing values', () => {
    expect(isV2Schema('v1')).toBe(false);
    expect(isV2Schema('1')).toBe(false);
    expect(isV2Schema('')).toBe(false);
    expect(isV2Schema(undefined)).toBe(false);
    expect(isV2Schema(null)).toBe(false);
  });
});

describe('transformWorkspaceForJSON', () => {
  it('reduces v2 configs to schemaVersion + name + files', () => {
    const workspace = {
      schema_version: 2,
      name: 'example',
      repositories: {
        'my-repo': { provider: 'github', repository: 'acme/my-repo' },
      },
      execution: { provider: 'replicated' },
      source_control: { connections: {} },
    };
    const result = transformWorkspaceForJSON(workspace, FILES, FILES['elasticclaw-config.yaml']);
    expect(result).toEqual({
      schemaVersion: '2',
      name: 'example',
      files: FILES,
    });
    expect(result.repositories).toBeUndefined();
    expect(result.execution).toBeUndefined();
  });

  it('carries the raw authored YAML under the canonical config filename', () => {
    // Authored config may live at workspace.yml; the hub store path expects
    // the raw bytes under elasticclaw-config.yaml.
    const rawConfig = 'schema_version: v2\nname: example\n';
    const files = { 'workspace.yml': rawConfig, 'AGENTS.md': '# Agent\n' };
    const workspace = { schema_version: 'v2', name: 'example' };
    const result = transformWorkspaceForJSON(workspace, files, rawConfig);
    const resultFiles = result.files as Record<string, string>;
    expect(resultFiles['elasticclaw-config.yaml']).toBe(rawConfig);
    expect(resultFiles['workspace.yml']).toBe(rawConfig);
  });

  it('passes v1 configs through verbatim with files attached', () => {
    const workspace = {
      schema_version: 'v1',
      name: 'example',
      repositories: [{ repo: 'acme/my-repo', permissions: 'write' }],
      provider: 'replicated',
    };
    const result = transformWorkspaceForJSON(workspace, FILES, FILES['elasticclaw-config.yaml']);
    expect(result).toEqual({ ...workspace, files: FILES });
  });

  it('drops the workflows key from the payload', () => {
    const workspace = {
      schema_version: 'v1',
      name: 'example',
      workflows: { unexpected: true },
    };
    const result = transformWorkspaceForJSON(workspace, FILES, FILES['elasticclaw-config.yaml']);
    expect(result.workflows).toBeUndefined();

    const v2Result = transformWorkspaceForJSON(
      { schema_version: 2, name: 'example', workflows: { unexpected: true } },
      FILES,
      FILES['elasticclaw-config.yaml'],
    );
    expect(v2Result.workflows).toBeUndefined();
  });
});
