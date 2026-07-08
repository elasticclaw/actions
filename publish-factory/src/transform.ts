// The hub's Go types use YAML snake_case tags for reading files but JSON
// camelCase tags for the push API. The only mismatched factory key is
// schema_version, which the server expects as schemaVersion.
export const FACTORY_KEY_MAP: Record<string, string> = {
  schema_version: 'schemaVersion',
};

export function remapKeys(obj: Record<string, unknown>, keyMap: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[keyMap[key] ?? key] = value;
  }
  return result;
}

export interface FactoryLike {
  name: string;
  integration: string;
  workspace: string;
  trigger_status: string;
  done_status?: string;
  template: string;
  [key: string]: unknown;
}

export function transformFactoryForJSON(factory: FactoryLike): FactoryLike {
  return remapKeys(factory, FACTORY_KEY_MAP) as FactoryLike;
}
