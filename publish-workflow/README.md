# Publish Workflow

Push a workflow to an ElasticClaw workspace.

```yaml
- uses: elasticclaw/actions/publish-workflow@main
  with:
    hub-endpoint: https://hub.elasticclaw.dev
    token: ${{ secrets.ELASTICCLAW_TOKEN }}
    workspace: bugbot
    path: ./.elasticclaw/workflows/triage.yaml
```

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `hub-endpoint` | yes | - | ElasticClaw hub URL |
| `token` | yes | - | ElasticClaw hub API token |
| `workspace` | yes | - | Workspace name |
| `path` | yes | - | Path to workflow YAML file |
| `dry-run` | no | `false` | Validate without pushing |

## Outputs

| Output | Description |
| --- | --- |
| `name` | Workflow name that was pushed |
| `workspace` | Workspace the workflow was pushed into |
| `pushed` | Whether the workflow was actually pushed |

Use `dry-run: true` to validate the workflow file without pushing.
