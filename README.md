# NPM Package ChangeLog Urls Reporter

A GitHub Action that report changelog urls of updated NPM package.

## Usage:

The action works only with `pull_request` event.

### Inputs

- `githubToken` - The GITHUB_TOKEN secret.
- `npmToken` - A API token of npmjs.org. Required type is `Read-only`

## Example

```yaml
name: NPM ChangeLog

on:
  pull_request:
    paths:
      - "yarn.lock"

jobs:
  changelog:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Check out Git repository
        uses: actions/checkout@v2

      - uses: kzkn/npm-changelog-url-action@v1
        with:
          githubToken: ${{ secrets.GITHUB_TOKEN }}
          npmToken: ${{ secrets.NPM_TOKEN }}
```
