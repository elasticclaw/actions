// Key mappings from YAML snake_case keys to the camelCase JSON keys the hub
// server uses for WorkflowConfig. Fields that already match are omitted.
export const WORKFLOW_KEY_MAP: Record<string, string> = {
  schema_version: 'schemaVersion',
  pipeline_yaml: 'pipelineYAML',
};

export const STAGE_KEY_MAP: Record<string, string> = {
  on_enter: 'onEnter',
  skip_if: 'skipIf',
  skip_unless: 'skipUnless',
};

export function remapKeys(obj: Record<string, unknown>, keyMap: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[keyMap[key] ?? key] = value;
  }
  return result;
}

export interface WorkflowLike {
  schema_version?: string;
  name: string;
  trigger?: unknown;
  stages?: unknown[];
  [key: string]: unknown;
}

export function transformWorkflowForJSON(workflow: WorkflowLike): WorkflowLike {
  const transformed = remapKeys(workflow, WORKFLOW_KEY_MAP) as WorkflowLike;

  if (Array.isArray(transformed.stages)) {
    transformed.stages = transformed.stages.map(stage => {
      if (stage && typeof stage === 'object' && !Array.isArray(stage)) {
        return remapKeys(stage as Record<string, unknown>, STAGE_KEY_MAP);
      }
      return stage;
    });
  }

  return transformed;
}
