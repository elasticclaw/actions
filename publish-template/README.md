# ElasticClaw Publish Template Action

Push a single template directory to an ElasticClaw hub.

## Usage

```yaml
- uses: elasticclaw/actions/publish-template@main
  with:
    hub-endpoint: https://hub.elasticclaw.dev
    token: ${{ secrets.ELASTICCLAW_TOKEN }}
    path: ./templates/my-template
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `hub-endpoint` | yes | — | ElasticClaw hub URL |
| `token` | yes | — | ElasticClaw hub API token |
| `path` | yes | — | Path to template directory |
| `name` | no | — | Template name override (default: directory basename) |
| `dry-run` | no | `false` | Validate only, do not push |

## Outputs

| Output | Description |
|--------|-------------|
| `name` | Template name that was pushed |
| `files` | Number of files in the template |
| `pushed` | `true` or `false` (dry-run) |

## Template Directory

The action walks the directory recursively and uploads all text files. Binary files will cause the action to fail.

```
my-template/
├── SOUL.md
├── TOOLS.md
└── instructions.md
```

The template name defaults to the directory basename (`my-template` in the example above). Use the `name` input to override.

## Dry Run

Use `dry-run: true` to validate the template directory without pushing:

```yaml
- uses: elasticclaw/actions/publish-template@main
  with:
    hub-endpoint: https://hub.elasticclaw.dev
    token: ${{ secrets.ELASTICCLAW_TOKEN }}
    path: ./templates/my-template
    dry-run: true
```
