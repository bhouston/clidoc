---
title: GitHub Action
sidebar_position: 8
---

# Validate OpenCLI specifications in CI

Use [clidoc-action](https://github.com/bhouston/clidoc-action) to validate checked-in
or generated CLI specifications on every pull request. An invalid document fails
the step with a GitHub error annotation. The action uses `@clidoc/core`, the same
schema and logical validation engine as `clidoc validate`.

## Complete workflow

Save this as `.github/workflows/opencli.yml`:

```yaml
name: Validate OpenCLI
on: [push, pull_request]
permissions:
  contents: read
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6
        with:
          persist-credentials: false
      - uses: bhouston/clidoc-action@61df600ccfb0fd9dbbe7093b7e392b06662fac85 # v1
        with:
          files: opencli.json
          specification: bcdxn
          format: json
```

Generate the specification in an earlier step if it is not checked into Git.
For example, run your trusted CLI's `__opencli` command and redirect its output
to `opencli.json`. Run generation separately from validation so that the action
only reads documents and never imports your CLI implementation.

## Dialect, encoding, and multiple files

`specification` selects `auto` (default), `bcdxn`, or `opencli-dev`.
`format` separately selects `auto` (default), `json`, or `yaml`.
Explicit dialects reject otherwise-valid documents in the wrong specification.
The default validator supports bcdxn OpenCLI `1.0.0-alpha.14` and opencli-dev
OpenCLI `0.1.0`; unknown or unsupported versions fail. It does not support
nrranjithnr OpenCLISpec.

```yaml
- uses: bhouston/clidoc-action@61df600ccfb0fd9dbbe7093b7e392b06662fac85 # v1
  with:
    working-directory: specifications
    files: |
      primary.json
      secondary.yaml
```

Paths are newline separated and relative to `working-directory`, which defaults
to the checkout root. Spaces inside paths are supported; surrounding whitespace
and blank lines are ignored. Wildcards are not expanded. Missing files fail.
All files are checked and failures are reported together. Use a workflow matrix
if each file needs its own status check or dialect setting.

## Pin action and validator versions independently

Pin the action to a reviewed full commit SHA, as above. The convenience `v1`
tag follows compatible releases. Updating the action SHA receives action fixes
and may update its default validator revision; review release notes first.

The default `validator-ref` is
`04bde9553899737ac46e363da889f2fa729a4445`, the dual-dialect implementation in
[clidoc PR #92](https://github.com/bhouston/clidoc/pull/92). Source mode fetches
that immutable commit and builds core with its frozen pnpm lockfile. You can
select another trusted full clidoc commit SHA through `validator-ref`.
The revision must retain the compatible build and core validation APIs.

At introduction, clidoc packages were not published on npm. Once a compatible
`@clidoc/core` version is available, set `validator-version` to its exact published
version. This overrides `validator-ref` and skips the source build. Ranges,
`latest`, URLs and local paths are rejected. The package must expose
`parseDocument` and `detectDialect`. An exact npm version does not freeze its
transitive dependency ranges; source mode uses the upstream frozen lockfile.

## Outputs and runner behavior

On success, `validated-count` is the number of documents checked and `validator`
identifies the exact `git:<commit>` or `npm:<version>` used. Failure produces no
success outputs and a nonzero exit status.

The action is tested on Linux, macOS and Windows hosted runners. It sets up Node
`26.1.0`, and source mode also sets up pnpm `11.1.3`; later steps can use these
tools. Self-hosted runners need Git, Bash, support for Node 24 based setup actions,
and network access to GitHub and npm. The action installs into a temporary
directory, disables install lifecycle scripts, then removes the directory.
Source builds run the selected commit's build script, so choose trusted revisions.
No secrets or write permissions are required. Document validation is offline and
does not execute document content.

## Development and releases

The action has its own [repository](https://github.com/bhouston/clidoc-action),
CI matrix, release tags and contribution guide. A separate action repository
allows independent releases and a short `uses` reference; GitHub also supports
actions inside a monorepo. A Marketplace listing is optional.

For development within the clidoc checkout:

```sh
git submodule update --init submodules/clidoc-action
cd submodules/clidoc-action
npm test
```

Follow the action's contribution guide, publish its changes, then update the
monorepo's submodule pointer and CI action SHA together. Normal action consumers
do not need a submodule. This monorepo dogfoods the hosted action against its
generated specification after the documentation build.
