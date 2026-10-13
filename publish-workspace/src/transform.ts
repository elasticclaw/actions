// Transform workspace configs into the JSON push payload the hub expects.
// Mirrors readWorkspaceDir in the elasticclaw CLI (cmd/workspace.go).

export interface WorkspaceLike {
  schema_version?: unknown;
  name: string;
  [key: string]: unknown;
}

// isV2Schema mirrors v2.IsV2 in the elasticclaw CLI: the v2 schema is
// identified by "2" or "v2", case-insensitive. js-yaml parses an unquoted
// `schema_version: 2` as a number, so the value is stringified first.
export function isV2Schema(version: unknown): boolean {
  const v = String(version ?? '').trim().toLowerCase();
  return v === '2' || v === 'v2';
}

// transformWorkspaceForJSON builds the POST /api/workspaces payload for one
// workspace.
//
// V2 configs use map-shaped repositories/connections that cannot unmarshal
// into the hub's v1-typed WorkspaceConfig (whose repositories field is a
// list), so the typed payload is reduced to schemaVersion + name and the raw
// authored YAML rides in files["elasticclaw-config.yaml"] for the hub to
// validate and store. V1 configs keep their historical shape: the parsed
// config is sent verbatim (minus the workflows key) with files attached.
export function transformWorkspaceForJSON(
  workspace: WorkspaceLike,
  files: Record<string, string>,
  rawConfig: string,
): Record<string, unknown> {
  const { workflows: _workflows, ...rest } = workspace;
  if (isV2Schema(workspace.schema_version)) {
    return {
      schemaVersion: '2',
      name: workspace.name,
      files: { ...files, 'elasticclaw-config.yaml': rawConfig },
    };
  }
  return { ...rest, files };
}
