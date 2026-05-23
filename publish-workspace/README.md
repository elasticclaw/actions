# Publish Workspace

Push a workspace and its workflows to an ElasticClaw hub.

```yaml
- uses: elasticclaw/actions/publish-workspace@main
  with:
    hub-endpoint: https://hub.elasticclaw.dev
    token: ${{ secrets.ELASTICCLAW_TOKEN }}
    path: ./.elasticclaw/workspaces/bugbot
```

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `hub-endpoint` | yes | - | ElasticClaw hub URL |
| `token` | yes | - | ElasticClaw hub API token |
| `path` | yes | - | Path to workspace directory |
| `dry-run` | no | `false` | Validate without pushing |

## Outputs

| Output | Description |
| --- | --- |
| `name` | Workspace name that was pushed |
| `workflows` | Number of workflows pushed |
| `pushed` | Whether the workspace was actually pushed |

## Layout

The action expects a workspace directory with an `elasticclaw-config.yaml` file and optional workflow definitions in `workflows/*.yaml`.

```text
bugbot/
├── elasticclaw-config.yaml
├── AGENTS.md
├── TOOLS.md
└── workflows/
    ├── triage.yaml
    └── resolution.yaml
```

Use `dry-run: true` to validate the workspace directory without pushing:

```yaml
- uses: elasticclaw/actions/publish-workspace@main
  with:
    hub-endpoint: https://hub.elasticclaw.dev
    token: ${{ secrets.ELASTICCLAW_TOKEN }}
    path: ./.elasticclaw/workspaces/bugbot
    dry-run: true
```
