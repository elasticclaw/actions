# ElasticClaw GitHub Actions

GitHub Actions for publishing workspaces and workflows to an ElasticClaw hub.

## Actions

### [`publish-workspace`](./publish-workspace)

Push a workspace and its workflows to an ElasticClaw hub.

```yaml
- uses: elasticclaw/actions/publish-workspace@main
  with:
    hub-endpoint: https://hub.elasticclaw.dev
    token: ${{ secrets.ELASTICCLAW_TOKEN }}
    path: ./.elasticclaw/workspaces/bugbot
```

## License

Apache 2.0
