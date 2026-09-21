import { code, fenced, heading, table } from './render-utils.js';
import { resolveDevDocument, type ResolvedDevCommand } from './opencli-dev.js';
import type {
  OpenCliDevDocument,
  OpenCliDevFlag,
  OpenCliDevArgument,
  OpenCliDevExitCode,
} from './opencli-dev-types.js';
const prose = (value: { description?: string; longDescription?: string }) =>
  [value.description, value.longDescription]
    .filter(Boolean)
    .map((text) => `${text}\n\n`)
    .join('');
function values(items: (OpenCliDevFlag | OpenCliDevArgument)[], flag: boolean): string {
  return table(
    [flag ? 'Flag' : 'Argument', 'Type', 'Required', 'Description'],
    items
      .filter((item) => !('hidden' in item && item.hidden))
      .map((item) => {
        const option = item as OpenCliDevFlag;
        const notes = [item.description, option.longDescription];
        if (option.short) notes.push(`Short: ${code('-' + option.short)}`);
        if (item.default !== undefined) notes.push(`Default: ${code(JSON.stringify(item.default))}`);
        if (item.choices?.length) notes.push(`Choices: ${item.choices.map(code).join(', ')}`);
        if (item.format) notes.push(`Format: ${code(item.format)}`);
        if (item.placeholder) notes.push(`Placeholder: ${code(item.placeholder)}`);
        if (option.envVar) notes.push(`Env: ${code(option.envVar)}`);
        for (const [enabled, label] of [
          [option.repeatable, 'Repeatable'],
          [option.splitOnComma, 'Comma-separated values'],
          [option.count, 'Counter'],
          [option.trackChanged, 'Tracks explicitly set values'],
          [item.sensitive, 'Sensitive value'],
          [(item as OpenCliDevArgument).variadic, 'Variadic'],
          [option.deprecated, 'Deprecated'],
        ] as const)
          if (enabled) notes.push(label);
        if (option.deprecationMessage) notes.push(option.deprecationMessage);
        const required = flag ? (item.required ? 'Yes (or default)' : 'No') : item.required === false ? 'No' : 'Yes';
        return [
          code((flag ? '--' : '') + item.name),
          option.count ? 'integer' : (item.type ?? 'string'),
          required,
          notes.filter(Boolean).join('; '),
        ];
      }),
  );
}
const exits = (items: OpenCliDevExitCode[]) =>
  table(
    ['Exit code', 'Label', 'Description'],
    items.map((item) => [item.code, item.label ?? '', item.description ?? '']),
  );
/** Internal documentation view; source documents remain in their native dialect. */
export function renderDevDocument(source: OpenCliDevDocument): {
  title: string;
  binary: string;
  header: string;
  commands: { name: string; content: string }[];
} {
  const document = resolveDevDocument(source);
  const title = document.info?.title ?? 'CLI reference';
  const binary = document.info?.binaryName ?? document.info?.title ?? '';
  let header = heading(1, title);
  if (document.info) {
    const info = document.info;
    header += prose(info) + `Binary: ${code(binary)} · Version: ${code(info.version)}\n\n`;
    if (info.homepage) header += `Homepage: ${info.homepage}\n\n`;
    if (info.documentationUrl) header += `Documentation: ${info.documentationUrl}\n\n`;
    if (info.license) header += `License: ${info.license.name}${info.license.url ? ` (${info.license.url})` : ''}\n\n`;
    if (info.contact) header += `Contact: ${Object.values(info.contact).join(' · ')}\n\n`;
  }
  if (document.flags.length) header += heading(2, 'Global flags') + values(document.flags, true);
  if (document.exitCodes?.length) header += heading(2, 'Global exit codes') + exits(document.exitCodes);
  if (document.components?.schemas && Object.keys(document.components.schemas).length)
    header +=
      heading(2, 'Output schema components') + fenced(JSON.stringify(document.components.schemas, null, 2), 'json');
  const commands: { name: string; content: string }[] = [];
  function walk(items: ResolvedDevCommand[], path: string[], ancestors: { name: string; flags: OpenCliDevFlag[] }[]) {
    for (const command of items) {
      if (command.hidden) continue;
      const next = [...path, command.name];
      const name = next.join(' ');
      let content = heading(2, name) + prose(command);
      if (command.operationId) content += `Operation: ${code(command.operationId)}\n\n`;
      else content += 'Command group\n\n';
      if (command.aliases?.length) content += `Aliases: ${command.aliases.map(code).join(', ')}\n\n`;
      if (command.usage) content += heading(3, 'Usage') + fenced(command.usage);
      if (command.deprecated)
        content += `Deprecated${command.deprecationMessage ? ': ' + command.deprecationMessage : ''}\n\n`;
      if (command.tags?.length) content += `Tags: ${command.tags.map(code).join(', ')}\n\n`;
      content += values(command.arguments, false);
      if (command.flags.length)
        content +=
          heading(3, 'Local flags') +
          'These flags belong to this command segment, before a selected child command.\n\n' +
          values(command.flags, true);
      const globals = document.flags.filter((flag) => !command.flags.some((local) => local.name === flag.name));
      if (globals.length) content += heading(3, 'Global flags') + values(globals, true);
      for (const ancestor of ancestors)
        if (ancestor.flags.length)
          content +=
            heading(3, `Parent flags: ${ancestor.name}`) +
            'Specify these in the parent command segment, before its child command.\n\n' +
            values(ancestor.flags, true);
      const codes = new Map(
        [...(document.exitCodes ?? []), ...(command.exitCodes ?? [])].map((item) => [item.code, item]),
      );
      if (codes.size) content += heading(3, 'Exit codes') + exits([...codes.values()]);
      if (command.envVars?.length)
        content +=
          heading(3, 'Environment') +
          table(
            ['Variable', 'Default', 'Description'],
            command.envVars.map((item) => [code(item.name), item.default ?? '', item.description ?? '']),
          );
      if (command.flagGroups?.length)
        content +=
          heading(3, 'Flag relationships') +
          table(
            ['Relationship', 'Flags', 'Description'],
            command.flagGroups.map((group) => [
              group.type,
              group.flags.map((flag) => code('--' + flag)).join(', '),
              group.description ?? '',
            ]),
          );
      if (command.stdin)
        content +=
          heading(3, 'Standard input') +
          prose(command.stdin) +
          `Required: ${command.stdin.required ? 'Yes' : 'No'}${command.stdin.format ? ' · Format: ' + code(command.stdin.format) : ''}\n\n`;
      if (command.output) {
        content += heading(3, 'Output');
        if (command.output.formatFlag) content += `Select with ${code('--' + command.output.formatFlag)}.\n\n`;
        for (const format of command.output.formats) {
          content += heading(4, format.format) + prose(format);
          content += `Value: ${code(format.value ?? format.format)}${format.default ? ' (default)' : ''}\n\n`;
          if (format.schema !== undefined) content += fenced(JSON.stringify(format.schema, null, 2), 'json');
        }
      }
      if (command.examples.length) {
        content += heading(3, 'Examples');
        for (const example of command.examples) {
          content += prose(example) + fenced(example.command);
          if (example.output !== undefined) content += fenced(example.output, 'text');
        }
      }
      commands.push({ name, content });
      walk(command.commands, next, [...ancestors, { name, flags: command.flags }]);
    }
  }
  walk(document.commands, binary ? [binary] : [], []);
  return { title, binary, header, commands };
}
