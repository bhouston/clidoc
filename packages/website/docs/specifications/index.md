---
title: OpenCLI specifications
sidebar_position: 5
---

# OpenCLI specifications

OpenCLI is not one shared standard. At least three independent projects use the name for formats that describe command-line interfaces. Their version numbers are unrelated: a `1.0.0` from one project is not a newer release of another project's `0.1.0`.

**clidoc has not created a new specification.** It provides tooling and interoperability for existing specifications, mindful of the proliferation of standards illustrated in [XKCD 927: Standards](https://xkcd.com/927/).

clidoc uses the GitHub owner and specification version whenever the distinction matters. **bcdxn OpenCLI 1.0.0-alpha.14 is clidoc's preferred format and the default for all generated output.**

| Specification                                  | Distinctive strengths                                                                                                           | Tradeoffs                                                                                                        | clidoc status                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| [bcdxn OpenCLI 1.0.0-alpha.14](./bcdxn)        | Installation and configuration metadata, typed annotated choices, flexible aliases, passthrough arguments, discovery convention | Flat command map; fewer structured input/output contracts                                                        | Preferred; read, validate, render, and generate |
| [opencli-dev OpenCLI 0.1.0](./opencli-dev)     | Explicit command hierarchy, reusable components, input/output schemas, deprecation and flag relationships                       | Different defaults and scoping; no discovery convention found; some upstream semantic rules go beyond its schema | Read, validate, and render                      |
| [nrranjithnr OpenCLISpec 1.0.0](./nrranjithnr) | Inherited parameters, platform metadata, responses by exit code and media type                                                  | Schema defects and underspecified semantics make dependable interoperability premature                           | Recognized, but unsupported                     |

The formats overlap, but none is a superset of the others. clidoc therefore preserves the input dialect unless conversion is explicitly requested. `clidoc convert` and the core `convertDocument` API translate between bcdxn and opencli-dev, defaulting to bcdxn. Strict conversion rejects information loss; `--allow-lossy` accepts only losses described by diagnostics. Semantic ambiguities that cannot produce a dependable target remain errors.

For supported input, `clidoc validate`, `clidoc markdown`, and `clidoc convert` detect the dialect from its version marker. Framework adapters, `clidoc generate`, `docgen`, and `__opencli` continue to emit bcdxn documents by default. nrranjithnr input cannot be converted.
