import type { Command, Option, Argument } from 'commander';
import { OPENCLI_VERSION } from '@opencli/core';
import type { OpenCliDocument, InfoObject, CommandItemObject, FlagItemObject, ArgumentItemObject } from '@opencli/core';

function argumentToOpenCli(argument: Argument): ArgumentItemObject {
  const result: ArgumentItemObject = { name: argument.name() };
  if (argument.description) result.summary = argument.description;
  if (argument.required) result.required = true;
  if (argument.variadic) result.variadic = true;
  if (argument.argChoices) result.choices = argument.argChoices.map((value) => ({ value }));
  return result;
}

function optionToOpenCli(option: Option): FlagItemObject {
  const long = option.long ?? option.short;
  if (!long) throw new Error('Commander option has no flag name');
  const result: FlagItemObject = { name: long.replace(/^-+/, ''), type: option.isBoolean() ? 'boolean' : 'string' };
  if (option.short && option.short !== long) result.aliases = [option.short.replace(/^-+/, '')];
  if (option.description) result.summary = option.description;
  if (option.mandatory) result.required = true;
  if (option.variadic) result.variadic = true;
  if (option.argChoices) result.choices = option.argChoices.map((value) => ({ value }));
  if (
    typeof option.defaultValue === 'string' ||
    typeof option.defaultValue === 'number' ||
    typeof option.defaultValue === 'boolean'
  )
    result.default = option.defaultValue;
  if (option.hidden) result.hidden = true;
  return result;
}

/** Convert a configured Commander command tree without parsing argv or running actions. */
export function fromCommander(root: Command, info: InfoObject): OpenCliDocument {
  const commands: Record<string, CommandItemObject> = {};
  const binary = info.binary;
  function visit(command: Command, path: string): void {
    const item: CommandItemObject = {};
    const description = command.description();
    if (description) item.summary = description;
    const aliases = command.aliases();
    if (aliases.length) item.aliases = aliases;
    if (command.registeredArguments.length) item.args = command.registeredArguments.map(argumentToOpenCli);
    if (command.options.length) item.flags = command.options.map(optionToOpenCli);
    if (command.commands.length && !command.registeredArguments.length && !command.options.length) item.kind = 'group';
    commands[path] = item;
    for (const child of command.commands) visit(child, `${path} ${child.name()}`);
  }
  visit(root, binary);
  return { opencliVersion: OPENCLI_VERSION, info, commands };
}
