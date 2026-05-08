# ElasticClaw GitHub Actions

GitHub Actions for publishing factories and templates to an ElasticClaw hub.

## Actions

### [`publish-factory`](./publish-factory)

Push a single factory definition to an ElasticClaw hub.

```yaml
- uses: elasticclaw/actions/publish-factory@main
  with:
    hub-endpoint: https://hub.elasticclaw.dev
    token: ${{ secrets.ELASTICCLAW_TOKEN }}
    path: factories/my-factory.yaml
```

### [`publish-template`](./publish-template)

Push a single template directory to an ElasticClaw hub.

```yaml
- uses: elasticclaw/actions/publish-template@main
  with:
    hub-endpoint: https://hub.elasticclaw.dev
    token: ${{ secrets.ELASTICCLAW_TOKEN }}
    path: ./templates/my-template
```

## License

Apache 2.0
