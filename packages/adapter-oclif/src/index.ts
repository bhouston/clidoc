import { OPENCLI_VERSION } from '@clidoc/core';
import type {
  OpenCliDocument,
  InfoObject,
  CommandItemObject,
  CommandExampleObject,
  FlagItemObject,
  ArgumentItemObject,
} from '@clidoc/core';

export interface OclifManifestFlag {
  description?: string;
  summary?: string;
  char?: string;
  type?: string;
  required?: boolean;
  multiple?: boolean;
  options?: readonly (string | number | boolean)[];
  default?: string | number | boolean;
  hidden?: boolean;
  /** Environment variable oclif reads the flag value from. */
  env?: string;
  /** Value label shown in help; an array is oclif's multi-line form. */
  helpValue?: string | readonly string[];
  /** Additional long-form aliases (`--foo-bar`). */
  aliases?: readonly string[];
  /** Additional single-character aliases, alongside `char`. */
  charAliases?: readonly string[];
  /** Not mapped; see README "Supported metadata". */
  deprecated?: boolean | { message?: string; version?: string };
  /** Not mapped; see README "Supported metadata". */
  deprecateAliases?: boolean;
}
export interface OclifManifestArg {
  description?: string;
  required?: boolean;
  options?: readonly (string | number | boolean)[];
  /** Variadic positional argument; only one arg per command can set this. */
  multiple?: boolean;
  /** ArgumentItemObject has no `default` field; folded into the summary instead. */
  default?: string | number | boolean;
}
/** A runnable example: a plain command line, or oclif's `{ command, description }` form. */
export type OclifManifestExample = string | { command: string; description?: string };
export interface OclifManifestCommand {
  description?: string;
  summary?: string;
  aliases?: readonly string[];
  hidden?: boolean;
  flags?: Record<string, OclifManifestFlag>;
  args?: Record<string, OclifManifestArg>;
  examples?: readonly OclifManifestExample[];
}
export interface OclifManifestTopic {
  description?: string;
  hidden?: boolean;
}
export interface OclifManifest {
  commands: Record<string, OclifManifestCommand>;
  /** Topic metadata, keyed by topic id (colon-separated, e.g. `user:admin`). */
  topics?: Record<string, OclifManifestTopic>;
}
function flagToOpenCli(name: string, source: OclifManifestFlag): FlagItemObject {
  const flag: FlagItemObject = {
    name,
    type: source.type === 'boolean' ? 'boolean' : 'string',
  };
  const aliases = [...(source.char ? [source.char] : []), ...(source.aliases ?? []), ...(source.charAliases ?? [])];
  if (aliases.length) flag.aliases = aliases;
  if (source.summary ?? source.description) flag.summary = source.summary ?? source.description;
  if (source.multiple) {
    flag.variadic = true;
    if (source.required) flag.minItems = 1;
  } else if (source.required) flag.required = true;
  if (source.options?.length) flag.choices = source.options.map((value) => ({ value }));
  if (source.default !== undefined) flag.default = source.default;
  if (source.hidden) flag.hidden = true;
  const hint = Array.isArray(source.helpValue) ? source.helpValue[0] : source.helpValue;
  if (hint) flag.hint = hint;
  if (source.env) flag.alternativeSources = [{ type: '$ENV', property: source.env }];
  return flag;
}
function argToOpenCli(name: string, arg: OclifManifestArg): ArgumentItemObject {
  const result: ArgumentItemObject = { name };
  if (arg.description) result.summary = arg.description;
  if (arg.required) result.required = true;
  if (arg.multiple) result.variadic = true;
  if (arg.options?.length) result.choices = arg.options.map((value) => ({ value }));
  // ArgumentItemObject has no `default` field; fold it into the summary rather than drop it.
  if (arg.default !== undefined) {
    const defaultText = `Default: ${String(arg.default)}.`;
    result.summary = result.summary ? `${result.summary} ${defaultText}` : defaultText;
  }
  return result;
}
function examplesToOpenCli(examples: readonly OclifManifestExample[]): CommandExampleObject[] {
  return examples.map((example) =>
    typeof example === 'string'
      ? { content: example }
      : { content: example.command, ...(example.description ? { title: example.description } : {}) },
  );
}
/** Convert oclif's generated manifest.json command metadata. */
export function fromOclif(manifest: OclifManifest, info: InfoObject): OpenCliDocument {
  const commands: Record<string, CommandItemObject> = {};
  for (const [id, source] of Object.entries(manifest.commands)) {
    const item: CommandItemObject = {};
    if (source.summary ?? source.description) item.summary = source.summary ?? source.description;
    if (source.aliases?.length) item.aliases = [...source.aliases];
    if (source.hidden) item.hidden = true;
    if (source.flags && Object.keys(source.flags).length)
      item.flags = Object.entries(source.flags).map(([name, flag]) => flagToOpenCli(name, flag));
    if (source.args && Object.keys(source.args).length)
      item.args = Object.entries(source.args).map(([name, arg]) => argToOpenCli(name, arg));
    if (source.examples?.length) item.examples = examplesToOpenCli(source.examples);
    commands[`${info.binary} ${id.replaceAll(':', ' ')}`] = item;
  }
  if (manifest.topics) {
    for (const [id, topic] of Object.entries(manifest.topics)) {
      const key = `${info.binary} ${id.replaceAll(':', ' ')}`;
      if (commands[key]) continue;
      const group: CommandItemObject = { kind: 'group' };
      if (topic.description) group.summary = topic.description;
      if (topic.hidden) group.hidden = true;
      commands[key] = group;
    }
  }
  return { opencliVersion: OPENCLI_VERSION, info, commands };
}
