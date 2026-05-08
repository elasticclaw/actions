# ElasticClaw Publish Factory Action

Push a single factory definition to an ElasticClaw hub.

## Usage

```yaml
- uses: elasticclaw/publish-factory@v1
  with:
    hub-endpoint: https://hub.elasticclaw.dev
    token: ${{ secrets.ELASTICCLAW_TOKEN }}
    path: factories/my-factory.yaml
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `hub-endpoint` | yes | — | ElasticClaw hub URL |
| `token` | yes | — | ElasticClaw hub API token |
| `path` | yes | — | Path to factory YAML/JSON file |
| `dry-run` | no | `false` | Validate only, do not push |

## Outputs

| Output | Description |
|--------|-------------|
| `name` | Factory name that was pushed |
| `pushed` | `true` or `false` (dry-run) |

## Factory File Format

The factory file can contain a single factory object or an array of factory objects:

```yaml
name: my-factory
integration: github
workspace: my-workspace
trigger_status: todo
done_status: done
template: default
```

## Dry Run

Use `dry-run: true` to validate the factory file without pushing:

```yaml
- uses: elasticclaw/publish-factory@v1
  with:
    hub-endpoint: https://hub.elasticclaw.dev
    token: ${{ secrets.ELASTICCLAW_TOKEN }}
    path: factories/my-factory.yaml
    dry-run: true
```
