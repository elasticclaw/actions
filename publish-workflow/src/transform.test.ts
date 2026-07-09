import { describe, it, expect } from 'vitest';
import { transformWorkflowForJSON, remapKeys, WORKFLOW_KEY_MAP, STAGE_KEY_MAP } from './transform';

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
});
