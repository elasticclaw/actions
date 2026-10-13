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
  schema_version?: unknown;
  name: string;
  trigger?: unknown;
  stages?: unknown[];
  [key: string]: unknown;
}

// isV2Schema mirrors v2.IsV2 in the elasticclaw CLI: the v2 schema is
// identified by "2" or "v2", case-insensitive. js-yaml parses an unquoted
// `schema_version: 2` as a number, so the value is stringified first.
export function isV2Schema(version: unknown): boolean {
  const v = String(version ?? '').trim().toLowerCase();
  return v === '2' || v === 'v2';
}

// transformWorkflowForJSON builds one entry of the workflows push payload.
//
// V2 workflows use state-machine fields (states, initial_state, effects) that
// do not map onto the hub's v1-typed WorkflowConfig, and js-yaml parses an
// unquoted `schema_version: 2` as a number, which the hub's string-typed
// schemaVersion field also rejects. Mirror readWorkflowFiles in the
// elasticclaw CLI: reduce the typed payload to schemaVersion + name + enabled
// and carry the raw authored YAML in rawConfig for the hub to validate and
// store. V1 workflows keep their historical shape with snake_case keys
// remapped to the hub's camelCase JSON keys.
export function transformWorkflowForJSON(workflow: WorkflowLike): WorkflowLike {
  if (isV2Schema(workflow.schema_version)) {
    const result: WorkflowLike = {
      schemaVersion: '2',
      name: workflow.name,
    };
    if (typeof workflow.enabled === 'boolean') {
      result.enabled = workflow.enabled;
    }
    if (typeof workflow.rawConfig === 'string') {
      result.rawConfig = workflow.rawConfig;
    }
    return result;
  }

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
