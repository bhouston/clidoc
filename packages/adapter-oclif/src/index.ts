import { OPENCLI_VERSION } from '@opencli/core';
import type { OpenCliDocument, InfoObject, CommandItemObject, FlagItemObject, ArgumentItemObject } from '@opencli/core';

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
}
export interface OclifManifestArg {
  description?: string;
  required?: boolean;
  options?: readonly (string | number | boolean)[];
}
export interface OclifManifestCommand {
  description?: string;
  summary?: string;
  aliases?: readonly string[];
  hidden?: boolean;
  flags?: Record<string, OclifManifestFlag>;
  args?: Record<string, OclifManifestArg>;
}
export interface OclifManifest {
  commands: Record<string, OclifManifestCommand>;
}
function flagToOpenCli(name: string, source: OclifManifestFlag): FlagItemObject {
  const flag: FlagItemObject = {
    name,
    type:
      source.type === 'boolean'
        ? 'boolean'
        : source.type === 'integer'
          ? 'integer'
          : source.type === 'number'
            ? 'number'
            : 'string',
  };
  if (source.char) flag.aliases = [source.char];
  if (source.summary ?? source.description) flag.summary = source.summary ?? source.description;
  if (source.required) flag.required = true;
  if (source.multiple) flag.variadic = true;
  if (source.options?.length) flag.choices = source.options.map((value) => ({ value }));
  if (source.default !== undefined) flag.default = source.default;
  if (source.hidden) flag.hidden = true;
  return flag;
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
      item.args = Object.entries(source.args).map(
        ([name, arg]): ArgumentItemObject => ({
          name,
          ...(arg.description ? { summary: arg.description } : {}),
          ...(arg.required ? { required: true } : {}),
          ...(arg.options?.length ? { choices: arg.options.map((value) => ({ value })) } : {}),
        }),
      );
    commands[`${info.binary} ${id.replaceAll(':', ' ')}`] = item;
  }
  return { opencliVersion: OPENCLI_VERSION, info, commands };
}
