import { describe, it, expect } from 'vitest';
import { transformWorkflowForJSON, remapKeys, isV2Schema, WORKFLOW_KEY_MAP, STAGE_KEY_MAP } from './transform';

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

describe('remapKeys', () => {
  it('remaps known keys and leaves unknown keys unchanged', () => {
    const result = remapKeys({ schema_version: 'v1', name: 'wf' }, WORKFLOW_KEY_MAP);
    expect(result).toEqual({ schemaVersion: 'v1', name: 'wf' });
  });
});

describe('transformWorkflowForJSON', () => {
  it('converts workflow-level snake_case keys to camelCase JSON keys', () => {
    const workflow = {
      schema_version: 'v1',
      name: 'example',
      pipeline_yaml: 'stages: []',
      trigger: { cron: { schedule: '0 * * * *' } },
    };
    const result = transformWorkflowForJSON(workflow);
    expect(result.schema_version).toBeUndefined();
    expect(result.schemaVersion).toBe('v1');
    expect(result.pipeline_yaml).toBeUndefined();
    expect(result.pipelineYAML).toBe('stages: []');
    expect(result.name).toBe('example');
  });

  it('converts stage-level snake_case keys to camelCase JSON keys', () => {
    const workflow = {
      name: 'example',
      stages: [
        {
          id: 'start',
          on_enter: { inject: 'hello' },
          skip_if: { always: true },
          skip_unless: { never: true },
        },
      ],
    };
    const result = transformWorkflowForJSON(workflow);
    const stage = result.stages?.[0] as Record<string, unknown>;
    expect(stage.on_enter).toBeUndefined();
    expect(stage.onEnter).toEqual({ inject: 'hello' });
    expect(stage.skip_if).toBeUndefined();
    expect(stage.skipIf).toEqual({ always: true });
    expect(stage.skip_unless).toBeUndefined();
    expect(stage.skipUnless).toEqual({ never: true });
    expect(stage.id).toBe('start');
  });

  it('leaves non-stage arrays untouched', () => {
    const workflow = {
      name: 'example',
      tags: ['cron', 'dependencies'],
    };
    const result = transformWorkflowForJSON(workflow);
    expect(result.tags).toEqual(['cron', 'dependencies']);
  });

  it('reduces v2 workflows to schemaVersion + name + enabled + rawConfig', () => {
    // js-yaml parses an unquoted `schema_version: 2` as numeric 2; the hub's
    // string-typed schemaVersion field rejects numbers, and v2 state-machine
    // fields (states, initial_state) have no v1-typed counterpart.
    const workflow = {
      schema_version: 2,
      name: 'example',
      enabled: true,
      manual_trigger: true,
      initial_state: 'prepare',
      states: { prepare: { agent: { prompt: 'hi' } } },
      rawConfig: 'schema_version: 2\nname: example\n',
    };
    const result = transformWorkflowForJSON(workflow);
    expect(result).toEqual({
      schemaVersion: '2',
      name: 'example',
      enabled: true,
      rawConfig: 'schema_version: 2\nname: example\n',
    });
    expect(result.states).toBeUndefined();
    expect(result.initial_state).toBeUndefined();
    expect(result.schema_version).toBeUndefined();
  });

  it('omits enabled from v2 payloads when not a boolean', () => {
    const workflow = {
      schema_version: 'v2',
      name: 'example',
      rawConfig: 'schema_version: v2\nname: example\n',
    };
    const result = transformWorkflowForJSON(workflow);
    expect(result.enabled).toBeUndefined();
    expect(result.schemaVersion).toBe('2');
  });

  it('keeps the v1 payload shape for string schema versions', () => {
    const workflow = {
      schema_version: 'v1',
      name: 'example',
      rawConfig: 'schema_version: v1\nname: example\n',
    };
    const result = transformWorkflowForJSON(workflow);
    expect(result.schemaVersion).toBe('v1');
    expect(result.rawConfig).toBe('schema_version: v1\nname: example\n');
  });
});
