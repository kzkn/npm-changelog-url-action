# NPM Package ChangeLog Urls Reporter

A GitHub Action that report changelog urls of updated NPM package.

## Usage:

The action works only with `pull_request` event.

### Inputs

- `githubToken` - The GITHUB_TOKEN secret.
- `npmToken` - A API token of npmjs.org. Required type is `Read-only` (optional)
- `lockPath` _ Lock file path. (default: `yarn.lock`)
- `onlySpecifiedPackages` - Only to packages specified in `package.json`. (default: `false`)

## Example

```yaml
name: NPM ChangeLog

on:
  pull_request:
    paths:
      - "yarn.lock"

jobs:
  npm_changelog:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: kzkn/npm-changelog-url-action@v2
        with:
          githubToken: ${{ secrets.GITHUB_TOKEN }}
          npmToken: ${{ secrets.NPM_TOKEN }}
```
