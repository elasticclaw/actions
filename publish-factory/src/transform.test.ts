import { describe, it, expect } from 'vitest';
import { transformFactoryForJSON, remapKeys, FACTORY_KEY_MAP } from './transform';

describe('remapKeys', () => {
  it('remaps known keys and leaves unknown keys unchanged', () => {
    const result = remapKeys({ schema_version: 'v1', name: 'f' }, FACTORY_KEY_MAP);
    expect(result).toEqual({ schemaVersion: 'v1', name: 'f' });
  });
});

describe('transformFactoryForJSON', () => {
  it('converts schema_version to schemaVersion and preserves other fields', () => {
    const factory = {
      schema_version: 'v1',
      name: 'test-factory',
      integration: 'linear',
      workspace: 'engineering',
      trigger_status: 'In Progress',
      done_status: 'Done',
      template: 'default',
      labels: ['bug'],
      assigned_to: '@user',
      enabled: true,
      webhook_secret_ref: 'my_secret',
      pipeline_yaml: 'stages: []',
    };
    const result = transformFactoryForJSON(factory);
    expect(result.schema_version).toBeUndefined();
    expect(result.schemaVersion).toBe('v1');
    expect(result.name).toBe('test-factory');
    expect(result.integration).toBe('linear');
    expect(result.workspace).toBe('engineering');
    expect(result.trigger_status).toBe('In Progress');
    expect(result.done_status).toBe('Done');
    expect(result.template).toBe('default');
    expect(result.labels).toEqual(['bug']);
    expect(result.assigned_to).toBe('@user');
    expect(result.enabled).toBe(true);
    expect(result.webhook_secret_ref).toBe('my_secret');
    expect(result.pipeline_yaml).toBe('stages: []');
  });
});
