import { noteFor } from '../project/project';
import type { Project } from '../project/project.types';
import { workflowFor } from '../workflow/workflow';

/** A note that names something, with the step it was written on, in the words the user wrote it. */
export interface NoteMention {
  readonly stepId: string;
  readonly stepTitle: string;
  readonly text: string;
}

const WORD_CHARACTER = /[\p{L}\p{N}_]/u;

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
    return pattern.test(text) ? [{ stepId: step.id, stepTitle: step.title, text }] : [];
  });
}

/** A pattern for the name as a whole word. A side of the name that is not a letter, digit or `_` needs no boundary: "C++" ends at the plus signs. */
function wholeWord(name: string): RegExp | undefined {
  const trimmed = name.trim();
  if (trimmed === '') {
    return undefined;
  }
  const characters = Array.from(trimmed);
  const body = trimmed
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
  const before = WORD_CHARACTER.test(characters[0]) ? '(?<![\\p{L}\\p{N}_])' : '';
  const after = WORD_CHARACTER.test(characters[characters.length - 1]) ? '(?![\\p{L}\\p{N}_])' : '';
  return new RegExp(`${before}${body}${after}`, 'iu');
}
