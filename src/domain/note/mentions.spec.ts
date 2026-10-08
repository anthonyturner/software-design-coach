import { createProject, setNote } from '../project/project';
import type { Project } from '../project/project.types';
import { notesMentioning } from './mentions';

const now = '2026-10-08T09:00:00.000Z';

function projectWithNotes(notes: Readonly<Record<string, string>>): Project {
  let project = createProject({ id: 'p1', name: 'Reminders', mode: 'new-project', now });
  for (const [stepId, text] of Object.entries(notes)) {
    project = setNote(project, stepId, text, now);
  }
  return project;
}

function mentioning(name: string, notes: Readonly<Record<string, string>>): string[] {
  return notesMentioning(projectWithNotes(notes), name).map((mention) => mention.stepId);
}

describe('notesMentioning', () => {
  it('finds a note that names the module, with the step it is on and its text', () => {
    const project = projectWithNotes({ modules: 'Pricing may be too thin' });

    expect(notesMentioning(project, 'Pricing')).toEqual([
      { stepId: 'modules', stepTitle: 'Modules', text: 'Pricing may be too thin' },
    ]);
  });

  it('ignores the case of both the name and the note', () => {
    expect(mentioning('Pricing', { modules: 'we should ask about PRICING first' })).toEqual(['modules']);
    expect(mentioning('pricing', { modules: 'Pricing, then tax' })).toEqual(['modules']);
  });

  it('lists the notes in the order of the workflow, not the order they were written', () => {
    expect(mentioning('Pricing', { 'design-review': 'Pricing again', problem: 'Pricing first', modules: 'Pricing too' })).toEqual([
      'problem',
      'modules',
      'design-review',
    ]);
  });

  it('skips notes that do not name it, and steps with no note', () => {
    expect(mentioning('Pricing', { modules: 'Tax is simple', goals: 'nothing here' })).toEqual([]);
    expect(mentioning('Pricing', {})).toEqual([]);
  });

  describe('a name that is part of a longer word', () => {
    it('does count the name standing alone in a sentence that also holds longer words', () => {
      expect(mentioning('Tax', { modules: 'Syntax is not tax, and taxonomy is not either' })).toEqual(['modules']);
      expect(mentioning('Tax', { modules: 'Syntax is not taxonomy' })).toEqual([]);
    });

    it('does not match a name inside a word, whatever surrounds it', () => {
      expect(mentioning('Tax', { modules: 'Syntax' })).toEqual([]);
      expect(mentioning('Tax', { modules: 'taxonomy' })).toEqual([]);
      expect(mentioning('Tax', { modules: 'taxes' })).toEqual([]);
      expect(mentioning('Tax', { modules: 'untaxed_amount' })).toEqual([]);
      expect(mentioning('Tax', { modules: 'tax2' })).toEqual([]);
    });

    it('does match a name next to punctuation, quotes, brackets and a possessive', () => {
      for (const text of ['(Tax)', '"Tax"', 'Tax.', 'Tax,', 'Tax\'s rules', 'Pricing/Tax split', 'Tax-free', 'ask: Tax?']) {
        expect(mentioning('Tax', { modules: text })).toEqual(['modules']);
      }
    });

    it('does not count a letter with an accent as a gap between words', () => {
      expect(mentioning('Cafe', { modules: 'Café' })).toEqual([]);
      expect(mentioning('Café', { modules: 'the CAFÉ module' })).toEqual(['modules']);
      expect(mentioning('Café', { modules: 'Cafés' })).toEqual([]);
    });
  });

  describe('a name with punctuation or several words', () => {
    it('reads a name literally, so characters that mean something in a pattern do not', () => {
      expect(mentioning('C++', { modules: 'Rewrite the C++ core' })).toEqual(['modules']);
      expect(mentioning('C++', { modules: 'Rewrite the C core' })).toEqual([]);
      expect(mentioning('Auth (v2)', { modules: 'Auth (v2) owns sessions' })).toEqual(['modules']);
      expect(mentioning('a.b', { modules: 'axb' })).toEqual([]);
      expect(mentioning('[x]', { modules: 'see [x] here' })).toEqual(['modules']);
    });

    it('matches a name of several words across spaces, tabs and line breaks', () => {
      expect(mentioning('Order Service', { modules: 'the order  service is big' })).toEqual(['modules']);
      expect(mentioning('Order Service', { modules: 'order\nservice' })).toEqual(['modules']);
      expect(mentioning('Order Service', { modules: 'order services' })).toEqual([]);
      expect(mentioning('Order Service', { modules: 'order, service' })).toEqual([]);
    });

    it('ignores spaces around the name it is given', () => {
      expect(mentioning('  Pricing  ', { modules: 'Pricing' })).toEqual(['modules']);
    });
  });

  describe('a name that starts or ends with punctuation', () => {
    it('is not found inside a longer name or a version', () => {
      expect(mentioning('.NET', { modules: 'We use ASP.NET Core' })).toEqual([]);
      expect(mentioning('.NET', { modules: 'We use .NET Core' })).toEqual(['modules']);
      expect(mentioning('C#', { modules: 'Moving to C#4' })).toEqual([]);
      expect(mentioning('C#', { modules: 'Moving to C# soon' })).toEqual(['modules']);
      expect(mentioning('C++', { modules: 'Moving to C++17' })).toEqual([]);
      expect(mentioning('C++', { modules: 'Moving to C++, then Rust' })).toEqual(['modules']);
    });
  });

  describe('letters with accents', () => {
    const decomposed = 'Café';

    it('does not take a decomposed accent for a gap after the base letter', () => {
      expect(mentioning('Cafe', { modules: `the ${decomposed} module` })).toEqual([]);
      expect(mentioning(decomposed, { modules: 'the Cafe module' })).toEqual([]);
    });

    it('finds a name whichever way its accent is written', () => {
      expect(mentioning(decomposed, { modules: `the ${decomposed} module` })).toEqual(['modules']);
      expect(mentioning('Café', { modules: `the ${decomposed} module` })).toEqual(['modules']);
      expect(mentioning(decomposed, { modules: 'the CAFÉ module' })).toEqual(['modules']);
    });
  });

  it('finds nothing for a name that is empty, rather than everything', () => {
    expect(mentioning('', { modules: 'Pricing' })).toEqual([]);
    expect(mentioning('   ', { modules: 'Pricing' })).toEqual([]);
  });

  it('asks only about the name it is given, so a renamed module finds the notes under its new name', () => {
    const notes = { problem: 'Pricing is unclear', modules: 'Billing owns the tax rules' };

    expect(mentioning('Pricing', notes)).toEqual(['problem']);
    expect(mentioning('Billing', notes)).toEqual(['modules']);
  });
});
