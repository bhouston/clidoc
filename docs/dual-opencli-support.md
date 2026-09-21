# Proposal: support both OpenCLI dialects

Status: research proposal for discussion; no runtime support implemented.
Tracking: https://github.com/bhouston/clidoc/issues/89

Follow-up: [analysis of a third dialect, nrranjithnr OpenCLI 1.0.0](third-opencli-analysis.md).
That study extends the model requirements and supersedes the original two-marker
detection rule with version-and-shape candidate detection.

## Recommendation

Support both as independent, versioned dialects. Automatically detect input,
validate with the matching rules, and normalize into a clidoc documentation
model. Keep the original document alongside that model. Render both through the
same Markdown, Docusaurus, and VitePress pipeline. Keep existing output defaults;
make export to another dialect explicit and report every unsupported mapping.

Do not make either upstream wire format the universal internal representation:
neither is a superset of the other. Reading/rendering both is the first milestone;
framework generation and cross-dialect conversion follow separately.

## Exact baselines and names

| Display name                 | Stable dialect ID | Document marker                  | Pinned revision                            |
| ---------------------------- | ----------------- | -------------------------------- | ------------------------------------------ |
| bcdxn OpenCLI 1.0.0-alpha.14 | `bcdxn`           | `opencliVersion: 1.0.0-alpha.14` | `683d0ca92fc37ccc2626e64db0a8c32f3c4063c0` |
| opencli-dev OpenCLI 0.1.0    | `opencli-dev`     | `opencli: 0.1.0`                 | `c932fedb238e522124aaeb7fa907777ecbdb906b` |

Use GitHub owner/organization names, not personal names, “old/new,” or “v1/v2.”
These versions are unrelated; 1.0 does not rank above 0.1 across projects.
Store dialect and specification version separately from the described CLI's
`info.version`. Both use JSON/YAML; serialization format is a separate choice.
Keep `upstream/opencli` at its existing path to preserve tests and links, and add
`upstream/opencli-dev`. A later path cleanup is optional.

This comparison describes those commits, not a promise about future upstreams.
The new checkout was made over SSH. Its tracked URL is also SSH, so recursive
checkout requires GitHub SSH access; installed clidoc packages should continue
working without either submodule. Public HTTPS would be a useful future URL
choice if anonymous recursive cloning is important.

## Where they diverge

| Area               | bcdxn baseline                                                             | opencli-dev baseline                                                                           | Consequence                                                                                  |
| ------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Root contract      | Requires version marker and `info`; `commands` optional                    | Requires version marker and nonempty `commands`; `info` optional                               | Valid input need not contain a binary/title/version in the second dialect                    |
| Commands           | Map keyed by full invocation/display string; explicit `kind: action/group` | Recursive arrays with single-token names, aliases, optional `operationId`                      | Preserve hierarchy and canonical paths separately from display usage                         |
| Identity           | `info.binary`, `summary`, `description`                                    | `binaryName` (defaults to title), `description`, `longDescription`                             | Map short/long prose carefully; do not invent missing executable metadata                    |
| Names/prose        | Looser names and summaries                                                 | Command/flag name patterns, uppercase argument names, several 120-character description limits | Conversion can fail even for otherwise simple CLI definitions                                |
| Required arguments | Omitted `required` defaults to false                                       | Omitted `required` defaults to true                                                            | Normalize defaults before rendering/conversion                                               |
| Value types        | string, number, integer, boolean                                           | Those plus file/path and semantic `format`                                                     | Keep semantic types; degrading to string loses information                                   |
| Flag aliases       | Multiple aliases                                                           | One single-character `short`                                                                   | Multiple/long aliases cannot map directly                                                    |
| Repeated values    | `variadic`, min/max item bounds                                            | `repeatable`, `splitOnComma`, `count`, `trackChanged`                                          | Repetition overlaps, but comma splitting, counters, bounds, and explicit-set tracking do not |
| Choices/defaults   | Choices have typed values and descriptions; scalar flag defaults           | String choices; nullable scalar defaults; positional defaults                                  | Neither choice/default model subsumes the other                                              |
| Flag scope         | Global flags under `global.flags`; per-command flag lists                  | Root flags inherited with local override; parent-local flags belong before child selection     | Do not flatten all ancestor flags into unrestricted child flags                              |
| Environment/config | Multiple `$ENV`/`$FILE` alternative sources; JSON/TOML/YAML config paths   | One flag `envVar`; separate command `envVars`                                                  | File source behavior and general environment documentation differ                            |
| Exit codes         | Requires numeric code, fixed status enum, and summary                      | Integer 0–255, optional free-form label/description                                            | Never invent a standard error category from an arbitrary label                               |
| Examples           | Title/content                                                              | Command/description/expected output; reusable examples                                         | Preserve expected output separately                                                          |
| Rich behavior      | Passthrough arguments, install methods                                     | Deprecation, usage, tags, sensitivity, flag groups, stdin and output formats/schemas           | Shared model needs fields beyond either format                                               |
| Reuse/extensions   | `x-*` extension slots throughout                                           | Components and local `$ref`; no general `x-*` slots on OpenCLI objects                         | Cannot smuggle extra fields into opencli-dev with vendor extensions                          |
| Discovery          | Go adapters expose `__opencli`; clidoc follows this                        | No `__opencli` discovery contract found in the inspected source                                | Preserve existing discovery response; any new negotiation is a clidoc feature                |
| Tooling            | Go adapters, CLI/doc generators, web editor; clidoc adds JS adapters/sites | Go-Cobra and Rust-Clap generation using a shared IR and structured schemas                     | Different strengths; supporting documents does not require adopting code generators          |

Specific traps:

- The opencli-dev schema accepts a semver-shaped `opencli` string, but its semantic
  linter accepts only `0.1.0`. Schema-only validation would overstate support.
- Its linter requires `operationId` for leaf commands despite the schema making
  it optional. Commands with children can also have handlers; hierarchy alone
  does not determine whether a command is runnable.
- bcdxn keys can include usage decorations such as `<arguments> [flags]`.
  Existing clidoc accepts those. Do not split arbitrary key text on spaces and
  pretend the result is a known command tree. Exact export may need a path override.
- A bcdxn root action is not automatically equivalent to a top-level named
  opencli-dev subcommand. Require an explicit mapping when root execution cannot
  be represented faithfully.
- Missing opencli-dev `info` is valid: documentation can use a neutral heading
  and relative command paths, with optional caller metadata. Conversion to bcdxn
  needs actual required metadata, not fabricated version/binary values.
- Embedded JSON Schemas are real Draft 2020-12 schemas. Distinguish OpenCLI
  component references from JSON Schema references; allow recursive data schemas
  without infinitely expanding them. Detect cyclic command-component expansion.
- Upstream's linter skips walking referenced command bodies after checking their
  existence; its IR resolver recursively expands commands without a visible cycle
  guard. Reference parity needs explicit tests, not a claim that schema validation
  or a literal linter port covers all semantics.

## Proposed architecture and public behavior

Use this pipeline:

```text
JSON/YAML -> marker detection -> dialect schema + semantic validation
          -> original typed document + normalized documentation model
          -> Markdown/pages -> Docusaurus/VitePress

framework metadata -> normalized model -> explicit dialect serializer
original document  -> conversion analysis -> explicit dialect serializer
```

Suggested new types/API names (design sketches, not implemented APIs):

- `BcdxnOpenCliDocument` and `OpenCliDevDocument`, with a tagged wrapper carrying
  dialect, spec version, original document, and diagnostics.
- `parseDocument` / `validateDocument` for automatic detection. Keep the existing
  `OpenCliDocument` type, `parse`, `validate`, adapters, and `mergeDocument` as
  backward-compatible bcdxn APIs initially. Changing `parse` to return a union
  would break callers accessing `info.binary` and `commands[path]`.
- A `CliDocumentationModel` carrying canonical path segments where known,
  authored display usage, hierarchy, runnable/group status, local/global flag
  scope, effective defaults, and dialect-specific documentation features.
  Preserve source pointers for actionable diagnostics and the untouched source
  for same-dialect serialization. Normalization is not a round-trip format.
- `renderMarkdown` and `generatePages` can accept both typed documents through
  overloads and normalize internally. Maintain existing bcdxn routes, order,
  hidden handling, and generated content unless a deliberate change is approved.
- Separate serializers and a conversion result with diagnostics such as source
  pointer, feature, reason, and severity. Exact conversion is the default;
  lossy conversion requires an explicit option. Even lossy mode must not emit
  schema-invalid output or silently invent semantics. Allow caller overrides
  for missing metadata, command paths, operation IDs, and naming conflicts.

Detection uses a dialect registry keyed by marker, supported version, and document
shape, never filename or `info.version`. The third dialect also uses `opencli`, so
that field alone cannot distinguish it from opencli-dev. See the
[three-way detection rules](third-opencli-analysis.md#changes-to-the-support-plan).
Reject conflicting markers; explain missing/unknown markers and unsupported
versions. Optional explicit `--spec` can assert the expected dialect; it must not
silently reinterpret a contradictory document. No network schema fetching is
needed at runtime.

Proposed CLI examples:

```sh
# Same commands for either input dialect; report the detected dialect/version.
clidoc validate cli.yaml
clidoc markdown cli.yaml

# Dialect selection is distinct from JSON/YAML/Markdown serialization.
clidoc generate ./definition.mjs --adapter commander --spec opencli-dev --output cli.json
mycli docgen --spec opencli-dev --format yaml --output cli.yaml

# Later milestone: explicit conversion, strict about information loss by default.
clidoc convert cli.yaml --to opencli-dev --format yaml --output converted.yaml
```

`--spec bcdxn` remains the default for existing generation and `docgen` calls.
Initially each dialect has one supported version; reserve a separate
`--spec-version` option for when multiple versions are implemented. Keep diagnostics
on stderr and machine documents on stdout. Keep bare `__opencli` returning the
existing bcdxn JSON contract. If requested later, add explicit dialect negotiation
as a clidoc extension, with tests covering early interception and no handler execution.

Keep existing `mergeDocument` semantics intact. A new neutral metadata overlay
should match canonical command paths and named flags/arguments, with operationId
available as an explicit stable identifier. Do not reuse the current map-based
merge directly for nested arrays or unresolved references. Retaining framework
metadata before bcdxn serialization is necessary to avoid losing counters,
deprecation, relationships, and other information before opencli-dev export.

## Implementation phases and acceptance criteria

1. **Pin and document (this change).** Add the second submodule and this proposal.
   Agree on the names, compatibility policy, and read-first scope.
2. **Dialect validation.** Add separate types, offline schema registration,
   supported-version checks, source-aware diagnostics, and semantic validation.
   Validate both upstream example sets and negative fixtures. Cover omitted
   defaults, missing info, references of the wrong kind, dangling references,
   command cycles, duplicates, operation IDs, flag groups, and output selectors.
   Clearly distinguish spec errors from unsupported rendering/codegen features.
3. **Shared documentation model and ingestion.** Preserve old bcdxn output with
   regression fixtures, then route CLI Markdown and both site integrations through
   the new reader/model. Render stdin/output schemas, expected example output,
   deprecation, environment variables, and flag relationships. Preserve source
   ordering where meaningful. Test scoped flags and runnable parents. Both
   upstream examples must generate useful pages without author conversion.
4. **Framework generation to either dialect.** Refactor adapter extraction behind
   existing wrappers so richer metadata reaches the shared model. Add explicit
   dialect selection to generate/docgen; require stable operationId overrides or
   deterministic, collision-checked IDs with documented rename behavior. Validate
   every output with its target schema and semantic rules. Keep bcdxn defaults.
5. **Explicit conversion and rollout.** Add a capability matrix and conversion
   diagnostics; test exact conversion on the common subset, explicit losses in
   each direction, and same-dialect source preservation. Update demo docs and
   package/API documentation. Run all contribution checks, including docs builds
   for the integration changes. Publish additive APIs before considering a major
   release that changes legacy names or return types.

Phase 2 needs a distribution decision: no repository-level LICENSE or COPYING
file was present in the inspected opencli-dev checkout. The `info.license` inside
its sample describes the sample CLI, not this specification repository. Clarify
permission before copying its schema/source into published npm packages; the
research submodule does not require making that bundling decision now. This is a
release dependency, not a reason to stop designing compatibility.

## Is one better?

For expressing a rich CLI contract, opencli-dev is the stronger foundation in my
assessment: explicit hierarchy, stable operation identifiers, reusable components,
input/output schemas, and richer behavioral metadata fit future documentation and
agent consumers well. That does not make it a lossless replacement for bcdxn.

For clidoc's existing extraction-to-docs workflow, bcdxn is a simpler fit and
already supported end to end. Its installation/configuration metadata, flexible
aliases, annotated typed choices, bounded repetition, passthrough, extensions,
and discovery convention remain useful. Both projects have code-generation
capabilities; they are not simply “docs versus codegen.”

Do not choose based on the version numbers or declare a maturity/adoption winner
from repository appearance. Keep both dialects first-class and let clidoc's model
represent their union, while serializers admit exactly what each can express.

## Evidence and review notes

The comparison was made from the pinned source, including schema, validators,
IR resolver, examples, discovery code, and current clidoc consumer signatures:

- [bcdxn schema](https://github.com/bcdxn/opencli/blob/683d0ca92fc37ccc2626e64db0a8c32f3c4063c0/spec.schema.json)
- [bcdxn tooling overview](https://github.com/bcdxn/opencli/blob/683d0ca92fc37ccc2626e64db0a8c32f3c4063c0/README.md)
- [opencli-dev schema](https://github.com/opencli-dev/opencli/blob/c932fedb238e522124aaeb7fa907777ecbdb906b/schema/opencli.schema.json)
- [opencli-dev semantic checks](https://github.com/opencli-dev/opencli/blob/c932fedb238e522124aaeb7fa907777ecbdb906b/tools/opencli/lint/lint.go)
- [opencli-dev IR resolver](https://github.com/opencli-dev/opencli/blob/c932fedb238e522124aaeb7fa907777ecbdb906b/tools/opencli/ir/build.go)
- [opencli-dev overview](https://github.com/opencli-dev/opencli/blob/c932fedb238e522124aaeb7fa907777ecbdb906b/README.md)
- Local implementation: `packages/core/src/{types,index,logical,merge,docgen,discovery}.ts`,
  `packages/cli/src/commands`, and `packages/{docusaurus,vitepress}/src/index.ts`.

No dual-dialect APIs, converters, or new upstream generators were executed or
implemented for this study. The implementation phases above require their own
behavioral fixtures and checks; passing the existing suite does not establish
compatibility with opencli-dev.
