import { noteFor } from '../project/project';
import type { Project } from '../project/project.types';
import { workflowFor } from '../workflow/workflow';

/** A note that names something, with the step it was written on, in the words the user wrote it. */
export interface NoteMention {
  readonly stepId: string;
  readonly stepTitle: string;
  readonly text: string;
}

/** What can continue a word: a letter, a digit or `_`, and the accents that combine with a letter. */
const WORD = '[\\p{L}\\p{N}\\p{M}_]';

/**
 * The notes that name `name`, in workflow order. A note names it when the name stands as a whole word
 * in the text, ignoring case: "Tax" is in "the Tax rules" and "tax." but not in "syntax" or "taxes".
 * The name is read literally, and the spaces inside a several-word name match any run of whitespace,
 * so a line break in a note does not hide it. A name that is blank is in no note.
 */
export function notesMentioning(project: Project, name: string): readonly NoteMention[] {
  const pattern = wholeWord(name);
  if (!pattern) {
    return [];
  }
  return workflowFor(project.mode).steps.flatMap((step) => {
    const text = noteFor(project, step.id);
    return pattern.test(text.normalize('NFC')) ? [{ stepId: step.id, stepTitle: step.title, text }] : [];
  });
}

/**
 * A pattern for the name as a whole word: nothing that continues a word may touch either end, whatever
 * the name's own first and last characters are, so ".NET" is not in "ASP.NET" and "C++" is not in "C++17".
 * Both sides are put in composed form first, so an accent matches however it was typed.
 */
function wholeWord(name: string): RegExp | undefined {
  const trimmed = name.trim().normalize('NFC');
  if (trimmed === '') {
    return undefined;
  }
  const body = trimmed
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
  return new RegExp(`(?<!${WORD})${body}(?!${WORD})`, 'iu');
}
