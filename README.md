# ElasticClaw GitHub Actions

GitHub Actions for publishing workspaces and workflows to an ElasticClaw hub.

## Actions

### [`publish-workspace`](./publish-workspace)

Push or validate a workspace.

```yaml
- uses: elasticclaw/actions/publish-workspace@main
  with:
    hub-endpoint: https://hub.elasticclaw.dev
    token: ${{ secrets.ELASTICCLAW_TOKEN }}
    path: ./.elasticclaw/workspaces/bugbot
```

### [`publish-workflow`](./publish-workflow)

Push or validate a workflow in a workspace.

```yaml
- uses: elasticclaw/actions/publish-workflow@main
  with:
    hub-endpoint: https://hub.elasticclaw.dev
    token: ${{ secrets.ELASTICCLAW_TOKEN }}
    workspace: bugbot
    path: ./.elasticclaw/workflows/triage.yaml
```

## License

Apache 2.0
