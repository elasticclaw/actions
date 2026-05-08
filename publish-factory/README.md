# ElasticClaw Publish Factory Action

Push a single factory definition to an ElasticClaw hub.

## Usage

```yaml
- uses: elasticclaw/actions/publish-factory@main
  with:
    hub-endpoint: https://hub.elasticclaw.dev
    token: ${{ secrets.ELASTICCLAW_TOKEN }}
    path: ./factories/my-factory
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `hub-endpoint` | yes | — | ElasticClaw hub URL |
| `token` | yes | — | ElasticClaw hub API token |
| `path` | yes | — | Path to factory directory |
| `dry-run` | no | `false` | Validate only, do not push |

## Outputs

| Output | Description |
|--------|-------------|
| `name` | Factory name that was pushed |
| `pushed` | `true` or `false` (dry-run) |

## Factory Directory

The action walks the directory recursively and reads all text files. It expects a `factory.yaml` (or `factory.yml`) as the main configuration file. If `pipeline.yaml` (or `pipeline.yml`) exists, it is automatically injected into the factory config as `pipeline_yaml`.

```
my-factory/
├── factory.yaml
└── pipeline.yaml
```

Binary files will cause the action to fail.

## Dry Run

Use `dry-run: true` to validate the factory directory without pushing:

```yaml
- uses: elasticclaw/actions/publish-factory@main
  with:
    hub-endpoint: https://hub.elasticclaw.dev
    token: ${{ secrets.ELASTICCLAW_TOKEN }}
    path: ./factories/my-factory
    dry-run: true
```
