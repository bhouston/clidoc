# Third dialect: nrranjithnr OpenCLI 1.0.0

Research for [issue #89](https://github.com/bhouston/clidoc/issues/89), extending the
[dual-dialect proposal](dual-opencli-support.md). No runtime implementation.

## Finding

Yes: this is a third independent CLI-description format, pursuing substantially
the same objective as the other two. It is not an adapter for either one. It has
its own JSON Schema, examples, and React/Vite specification website. The README
presents generators, shell completions, and MCP integration largely as future
capabilities; the inspected repository does not supply those implementations.
Its sample `ocs validate/generate/lint` commands describe an illustrative CLI,
not executable tools shipped in the repository. There is a real schema-validation
CI workflow using Ajv, so it is more than a prose-only proposal.

Inspected revision: `0888fca967863777a89b2c82a6a9fce6cdd65da5` (latest commit dated
2025-10-29). Cloned over SSH into a temporary research checkout; no third submodule
or dependency was added. Suggested display name: **nrranjithnr OpenCLI 1.0.0**;
dialect ID: `nrranjithnr`. “OpenCLISpec” is also used by the project, but owner-based
names are more consistently distinguishable across all three.

## Three-way comparison

| Area               | bcdxn 1.0.0-alpha.14                                    | opencli-dev 0.1.0                                          | nrranjithnr 1.0.0                                                                                                   |
| ------------------ | ------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Marker             | `opencliVersion`                                        | `opencli`                                                  | `opencli`                                                                                                           |
| Commands           | Full-invocation map                                     | Recursive arrays                                           | Map: executable root plus slash paths such as `/container/stop`                                                     |
| Parameters         | Separate args/flags                                     | Separate arguments/flags                                   | One list, with `in: argument/flag/option`                                                                           |
| Positionals        | Array order, optional by default                        | Array order, required by default                           | Explicit one-based `position`, optional by default                                                                  |
| Inheritance        | Global and command flag lists                           | Root globals plus command-local scope                      | Parameter `scope: local/inherited`, including on intermediate commands                                              |
| Values             | Four primitive types and typed annotated choices        | Primitives plus file/path and semantic formats             | Restricted schema vocabulary with arrays, objects, constraints, enum, default, example                              |
| Outputs            | Exit-code descriptions                                  | Command output formats/schemas plus exit-code descriptions | Responses indexed by exit code, then media type, each with schema/example                                           |
| Reuse              | `x-*` extensions                                        | Components with references                                 | Schema references; parameter/response component definitions exist but their reference use is rejected by the schema |
| Other strengths    | Install/config sources, bounded repetition, passthrough | Stdin, deprecation, counters, sensitivity, flag groups     | OS/architecture metadata, external docs, inherited parameters, response contracts                                   |
| Validation dialect | JSON Schema 2020-12                                     | JSON Schema 2020-12                                        | JSON Schema Draft-07                                                                                                |
| Tooling found      | Go tooling and clidoc ecosystem                         | Go-Cobra/Rust-Clap generators and semantic validator       | Specification website, examples, schema CI                                                                          |

The nrranjithnr `Schema` object is a restricted, schema-like language, not arbitrary
JSON Schema. It forbids keywords such as `oneOf`, `allOf`, and `additionalProperties`
inside user value schemas. Its own enclosing validation schema uses Draft-07.
`x-*` extensions are allowed on command and parameter objects, not everywhere.
The top-level document even rejects a `$schema` property, so editor hints must
not be injected into the document itself.

The root executable convention is useful but not enforced: the JSON Schema
allows arbitrary command keys and does not require exactly one executable key.
Documentation also shows slash-only examples. A reader must not silently pick the
first key or derive an executable from the human-facing `info.title`.

## Tested findings and specification gaps

I compiled the unmodified `opencli.spec.json` using the workspace's Ajv 8 with
`strict: true`, `allErrors: true`, and ajv-formats, then validated parsed documents.
These were standalone research probes, not new product tests.

| Probe                                                         | Observed result | Implication                                                                       |
| ------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------- |
| `public/opencli.json` and `public/opencli.yaml`               | Both pass       | Baseline examples are structurally compatible with the published schema           |
| `schema: {type: integer, enum: [1, 2]}` on a named parameter  | Rejected        | Enum items use `oneOf` with both integer and number: integers match both branches |
| Fractional numeric enum `[1.5, 2.5]`                          | Accepted        | The integer failure is overlapping schema branches, not a blanket ban on numbers  |
| Parameter `$ref` to an existing `components.parameters` entry | Rejected        | Parameter objects require `name` and do not allow `$ref`                          |
| Response `$ref` to an existing `components.responses` entry   | Rejected        | Response objects do not allow `$ref`                                              |
| Schema `$ref` to a nonexistent component                      | Accepted        | Structural validation does not resolve instance-level references                  |
| Duplicate positional `position: 1`                            | Accepted        | Positional consistency needs a semantic layer                                     |
| Argument without `position`                                   | Accepted        | A renderer needs an explicit policy for incomplete ordering information           |
| Multiple executable-like root keys                            | Accepted        | Root/binary inference can be ambiguous                                            |
| Nonnumeric response key `oops`                                | Accepted        | Exit-code key constraints are not enforced                                        |
| Top-level `$schema` hint                                      | Rejected        | The marker/shape must drive automatic detection                                   |

Do not silently patch the upstream enum rule while claiming exact validation.
Pin the unmodified schema, report the limitation, and propose an upstream fix if
we choose to contribute later. A compatibility override would need a named profile
and explicit diagnostics rather than changing what “nrranjithnr 1.0.0” means.

Other semantics require care:

- The README demonstrates omitted `in` as an inferred option. Use that documented
  convention for ordinary named options; flag/argument contradictions and missing
  positional metadata need diagnostics, not invented runtime behavior.
- `arity` counts accepted values. It does not define the same repeat-occurrence,
  comma-splitting, or counter behavior found in the other formats. The YAML example
  treats omitted `arity.max` as unlimited. Preserve cardinality separately from
  how occurrences are spelled on the command line.
- `scope: inherited` expresses subtree inheritance, which is richer than moving
  everything into top-level globals. Name collision/shadowing precedence is not
  sufficiently specified by the inspected schema/docs to claim exact conversion.
- Environment entries contain name/description but no explicit parameter target
  or precedence rule. The README's illustrative variable-name mapping is not a
  sufficient general binding algorithm; document these as environment metadata.
- Responses relate an exit code to a media type and output schema. Flattening them
  into opencli-dev's command-wide formats would lose the exit-code association.
  Neither format assigns these response media types unambiguously to stdout or
  stderr; do not infer streams from success/error status.
- The website's TypeScript types differ from the schema (for example, platforms
  are typed as a map instead of an array). Its client validity check only tests
  basic fields. Use the pinned schema plus documented semantics as the import
  baseline, not the site's types or its `isValidSpec` boolean.

## Changes to the support plan

The architecture still works, but the earlier two-marker detection rule must be
replaced by a dialect registry:

| Known marker/version and shape      | Candidate dialect |
| ----------------------------------- | ----------------- |
| `opencliVersion: 1.0.0-alpha.14`    | bcdxn             |
| `opencli: 0.1.0`, `commands` array  | opencli-dev       |
| `opencli: 1.0.0`, `commands` object | nrranjithnr       |

These are candidate-selection rules, followed by full matching-dialect validation.
Use version and shape together; never treat opencli-dev's future `1.0.0` as this
project merely because the versions match. For malformed/ambiguous or unknown
inputs, report candidate/unsupported-version diagnostics and allow `--spec` to
select the validator explicitly. Explicit selection must still reject invalid
input. A document with conflicting markers must fail. Do not rely on `$schema`
being permitted, present, or unique.

Implementation sequence:

1. Keep bcdxn behavior and the opencli-dev read/render milestone as proposed.
   Make the registry and intermediate model extensible to this third dialect now.
2. Add a separate Draft-07 validator (the current core uses Ajv2020), pinned schema,
   fresh types, and a documented semantic diagnostic policy. Separate schema
   failures, clidoc interpretation limits, and extra semantic checks. Unknown
   executable identity should not block structural validation.
3. Add read/render support with canonical command paths, explicit parameter kind,
   one-based positions, inherited scope, cardinality, platform metadata, and
   responses keyed by both exit code and media type. Preserve original source.
   Render relative commands when the executable is unknown; allow an override.
4. Require fixtures for both upstream examples, the probes above, inherited
   parameters at intermediate nodes, root ambiguity, and response media types.
   Reuse the common Markdown/site pipeline with readable output for all three.
5. Defer generation/export until the ambiguity and compatibility policies are
   agreed. Converting to bcdxn loses structured parameter/response schemas and
   platform metadata without extensions. Converting to opencli-dev can lose
   subtree inheritance, response-to-exit-code associations, aliases, and arity.
   Conversion into nrranjithnr has no direct native representation for several
   opencli-dev behaviors, including stdin contracts, deprecation, and flag groups.

If implemented, this project has an explicit Apache-2.0 LICENSE, unlike the
missing license file noted in the opencli-dev study. Include its license and
appropriate attribution when distributing copied material; there is no need to
infer permission from its example document's `info.license`.

## Assessment

This is worth recognizing and potentially importing. Its most useful contributions
are response contracts organized by exit status/media type, subtree-scoped
parameters, and platform metadata. For clidoc, read/render support would be useful
without implementing its proposed codegen/MCP ecosystem.

I would prioritize it after opencli-dev for full generation support: it has less
implemented generator/semantic tooling in the inspected repository, and several
concrete ambiguities or schema defects need a stated policy. Its `1.0.0` label and
README's “industry standard” wording do not establish adoption or maturity.

The third project strengthens the case for a neutral clidoc model and pluggable
readers. It does not justify promising universal lossless conversion. None of the
three specifications dominates every feature dimension.

## Pinned evidence

- [Repository overview](https://github.com/nrranjithnr/open-cli-specification/blob/0888fca967863777a89b2c82a6a9fce6cdd65da5/README.md)
- [Validation schema](https://github.com/nrranjithnr/open-cli-specification/blob/0888fca967863777a89b2c82a6a9fce6cdd65da5/opencli.spec.json)
- [YAML example](https://github.com/nrranjithnr/open-cli-specification/blob/0888fca967863777a89b2c82a6a9fce6cdd65da5/public/opencli.yaml)
- [JSON example](https://github.com/nrranjithnr/open-cli-specification/blob/0888fca967863777a89b2c82a6a9fce6cdd65da5/public/opencli.json)
- [Website types](https://github.com/nrranjithnr/open-cli-specification/blob/0888fca967863777a89b2c82a6a9fce6cdd65da5/src/types/index.ts)
- [Website basic validity check](https://github.com/nrranjithnr/open-cli-specification/blob/0888fca967863777a89b2c82a6a9fce6cdd65da5/src/hooks/useYamlSpec.ts)
- [Package/tooling](https://github.com/nrranjithnr/open-cli-specification/blob/0888fca967863777a89b2c82a6a9fce6cdd65da5/package.json)
- [Apache-2.0 license](https://github.com/nrranjithnr/open-cli-specification/blob/0888fca967863777a89b2c82a6a9fce6cdd65da5/LICENSE)
