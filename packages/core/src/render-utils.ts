export const heading = (level: number, text: string) => `${'#'.repeat(level)} ${text}\n\n`;
const escapeCell = (value: unknown) => String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
export function code(value: string): string {
  const longest = Math.max(0, ...Array.from(value.matchAll(/`+/g), (match) => match[0].length));
  const delim = '`'.repeat(longest + 1);
  const padded = value.startsWith('`') || value.endsWith('`') ? ` ${value} ` : value;
  return `${delim}${padded}${delim}`;
}
export function table(headers: string[], rows: unknown[][]): string {
  if (!rows.length) return '';
  return `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.map((row) => `| ${row.map(escapeCell).join(' | ')} |`).join('\n')}\n\n`;
}
export function fenced(content: string, language = 'sh'): string {
  const longest = Math.max(0, ...Array.from(content.matchAll(/`+/g), (match) => match[0].length));
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return `${fence}${language}\n${content}\n${fence}\n\n`;
}
