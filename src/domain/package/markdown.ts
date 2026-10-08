/**
 * Text a user typed, made safe to put into a Markdown file. It is escaped so that no line of it can
 * open a heading, list, quote, fence, rule or table, or add a link, tag or character reference of
 * its own, whatever it says. Emphasis marks are left alone in paragraphs, where they only style and
 * the file is read as plain text as often as it is rendered. A name or label is escaped for them
 * too, since the package wraps it in bold or italic and a stray mark would unbalance that.
 */

const BLOCK_STARTS = /^([#>+*=~|:_-])/;
const LIST_NUMBER = /^(\d+)([.)])(?=\s|$)/;
const CHARACTER_REFERENCE = /&(?=#?\w+;)/g;
const SYNTAX = /[\\`<[\]]/g;
const CLOSING_HASHES = /#+$/;
const EMPHASIS_SYNTAX = /[\\`<[\]*_]/g;

function escapeLine(line: string, emphasis: boolean): string {
  return line
    .trim()
    .replace(emphasis ? EMPHASIS_SYNTAX : SYNTAX, '\\$&')
    .replace(CHARACTER_REFERENCE, '\\&')
    .replace(CLOSING_HASHES, (hashes) => hashes.replace(/#/g, '\\#'))
    .replace(BLOCK_STARTS, '\\$1')
    .replace(LIST_NUMBER, '$1\\$2');
}

/** Typed text as a single line, for a heading or a label. */
export function oneLine(text: string): string {
  return escapeLine(text.replace(/\s+/g, ' '), true);
}

/**
 * Typed text as the lines of a paragraph block. A line that carries on into the next ends in two
 * spaces, Markdown's hard break, so a list of steps typed one to a line stays one to a line when
 * rendered. Blank lines separate paragraphs, and no more than one is kept.
 */
export function proseLines(text: string): string[] {
  const lines = text
    .split(/\r\n|\r|\n/)
    .map((line) => escapeLine(line, false))
    .filter((line, index, all) => line !== '' || (index > 0 && all[index - 1] !== ''));
  const trimmed = lines.at(-1) === '' ? lines.slice(0, -1) : lines;
  return trimmed.map((line, index) => (line !== '' && trimmed[index + 1] ? `${line}  ` : line));
}

/** The lines of a block placed under a list item, indented to stay part of it. */
export function indented(lines: readonly string[], by: string): string[] {
  return lines.map((line) => (line === '' ? line : by + line));
}
