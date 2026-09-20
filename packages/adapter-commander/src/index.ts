import { Command as CommanderCommand, Option as CommanderOption } from 'commander';
import type { Command, Option, Argument } from 'commander';
import { OPENCLI_VERSION, writeOpenCliDocument } from '@clidoc/core';
import type {
  OpenCliDocument,
  InfoObject,
  CommandItemObject,
  FlagItemObject,
  ArgumentItemObject,
  DocumentFormat,
} from '@clidoc/core';

function argumentToOpenCli(argument: Argument): ArgumentItemObject {
  const result: ArgumentItemObject = { name: argument.name() };
  if (argument.description) result.summary = argument.description;
  if (argument.required) result.required = true;
  if (argument.variadic) result.variadic = true;
  if (argument.argChoices) result.choices = argument.argChoices.map((value) => ({ value }));
  // ArgumentItemObject has no `default` field; fold it into the summary rather than drop it.
  if (
    typeof argument.defaultValue === 'string' ||
    typeof argument.defaultValue === 'number' ||
    typeof argument.defaultValue === 'boolean'
  ) {
    const defaultText = `Default: ${String(argument.defaultValue)}.`;
    result.summary = result.summary ? `${result.summary} ${defaultText}` : defaultText;
  }
  return result;
}

/** The flag name Commander's `--no-foo` negation refers to, i.e. `foo`. */
function optionBaseName(option: Option): string {
  const long = option.long ?? option.short;
  if (!long) throw new Error('Commander option has no flag name');
  const stripped = long.replace(/^-+/, '');
  return option.negate ? stripped.replace(/^no-/, '') : stripped;
}

function pickDefault(...values: unknown[]): string | number | boolean | undefined {
  for (const value of values) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  }
  return undefined;
}

/** Convert a Commander option, merging a `--no-foo` negation with its `--foo` counterpart if both exist. */
function optionToOpenCli(positive: Option | undefined, negative: Option | undefined): FlagItemObject {
  // optionsToOpenCli always passes at least one of the two.
  const option = (positive ?? negative) as Option;
  const name = optionBaseName(option);
  const negatedOnly = !positive && !!negative;
  // A negated option (standalone or merged with its `--foo` counterpart) is always boolean.
  // Otherwise fall back to Commander's own classification, which is false for options with a
  // required or optional value (e.g. `--foo [value]`), so those correctly type as `string`.
  const isBoolean = negatedOnly || !!negative || option.isBoolean();
  const result: FlagItemObject = { name, type: isBoolean ? 'boolean' : 'string' };
  const source = positive ?? option;
  if (source.short && source.short.replace(/^-+/, '') !== name) result.aliases = [source.short.replace(/^-+/, '')];
  if (source.description) result.summary = source.description;
  if (negative && positive) {
    // Negate options are always defined with a `--no-` long flag.
    const note = `Negate with ${negative.long}.`;
    result.summary = result.summary ? `${result.summary} ${note}` : note;
  }
  if (source.mandatory) result.required = true;
  if (source.variadic) result.variadic = true;
  if (source.argChoices) result.choices = source.argChoices.map((value) => ({ value }));
  const defaultValue = negatedOnly
    ? pickDefault(negative?.defaultValue, true)
    : pickDefault(source.defaultValue, negative ? true : undefined);
  if (defaultValue !== undefined) result.default = defaultValue;
  if (source.hidden) result.hidden = true;
  if (source.envVar) result.alternativeSources = [{ type: '$ENV', property: source.envVar }];
  return result;
}

function optionsToOpenCli(options: readonly Option[]): FlagItemObject[] {
  const groups = new Map<string, { positive?: Option; negative?: Option }>();
  const order: string[] = [];
  for (const option of options) {
    const key = optionBaseName(option);
    let group = groups.get(key);
    if (!group) {
      group = {};
      groups.set(key, group);
      order.push(key);
    }
    if (option.negate) group.negative = option;
    else group.positive = option;
  }
  return order.map((key) => {
    const group = groups.get(key);
    return optionToOpenCli(group?.positive, group?.negative);
  });
}

/** Convert a configured Commander command tree without parsing argv or running actions. */
export function fromCommander(root: Command, info: InfoObject): OpenCliDocument {
  const commands: Record<string, CommandItemObject> = {};
  const binary = info.binary;
  function visit(command: Command, path: string): void {
    const item: CommandItemObject = {};
    const summary = command.summary();
    const description = command.description();
    if (summary && description) {
      item.summary = summary;
      item.description = description;
    } else if (description) {
      item.summary = description;
    } else if (summary) {
      item.summary = summary;
    }
    const aliases = command.aliases();
    if (aliases.length) item.aliases = aliases;
    if (command.registeredArguments.length) item.args = command.registeredArguments.map(argumentToOpenCli);
    if (command.options.length) item.flags = optionsToOpenCli(command.options);
    // Upstream rejects group commands that carry args or flags, so a parent with its own
    // options is documented as an action that also has subcommands.
    if (command.commands.length && !item.args && !item.flags) item.kind = 'group';
    // Commander has no public getter for hidden state; `_hidden` has been a stable internal
    // field since Commander 8 (this adapter targets Commander 15).
    const hidden = (command as unknown as { _hidden?: boolean })._hidden;
    if (hidden) item.hidden = true;
    commands[path] = item;
    for (const child of command.commands) visit(child, `${path} ${child.name()}`);
  }
  visit(root, binary);
  return { opencliVersion: OPENCLI_VERSION, info, commands };
}

export interface CreateDocgenCommandOptions {
  /** Command name; defaults to `docgen`. */
  name?: string;
}

/**
 * Build a ready-to-register `docgen` command: `--output <file>` (defaults to stdout) and
 * `--format <json|markdown>` (default `json`), writing `getDocument()`'s result via
 * `@clidoc/core`'s `writeOpenCliDocument`. Register it with `program.addCommand(...)`.
 */
export function createDocgenCommand(
  getDocument: () => OpenCliDocument,
  options: CreateDocgenCommandOptions = {},
): Command {
  return new CommanderCommand(options.name ?? 'docgen')
    .description('Write the OpenCLI document to a file, or stdout if --output is omitted')
    .option('-o, --output <file>', 'Output file; defaults to stdout')
    .addOption(new CommanderOption('--format <format>', 'Output format').choices(['json', 'markdown']).default('json'))
    .action(async (opts: { output?: string; format: DocumentFormat }) => {
      await writeOpenCliDocument(getDocument(), opts.output, opts.format);
    });
}
