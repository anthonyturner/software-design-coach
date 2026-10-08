import { diagramFor } from '../diagrams/diagrams';
import type { EntityEdit, EntityKind } from '../entity/entity.types';
import { addEntity, answer, createProject, setNote, updateEntity } from '../project/project';
import type { Project } from '../project/project.types';
import { workflowFor } from '../workflow/workflow';
import type { ProjectMode } from '../workflow/workflow.types';
import { buildPackage, combinePackage, packageFileName } from './package';
import type { PackageFile } from './package.types';

const now = '2026-10-08T09:00:00.000Z';

function newProject(mode: ProjectMode = 'new-project', name = 'Reminders'): Project {
  return createProject({ id: 'p1', name, mode, now });
}

function withRow(project: Project, kind: EntityKind, id: string, edit: EntityEdit): Project {
  return updateEntity(addEntity(project, kind, id, now), kind, id, edit, now);
}

function fileOf(project: Project, path: string): PackageFile {
  const found = buildPackage(project).find((candidate) => candidate.path === path);
  if (!found) {
    throw new Error(`The package should have a file "${path}"`);
  }
  return found;
}

const linesOf = (file: PackageFile): string[] => file.markdown.split('\n');

/** The lines of a file that are not inside a fenced block. */
function outsideFences(file: PackageFile): string[] {
  let inside = false;
  return linesOf(file).filter((line) => {
    if (line.startsWith('```')) {
      inside = !inside;
      return false;
    }
    return !inside;
  });
}

/** A project with the receptionist and patient, two wired modules and the first slice chosen and traced. */
function reminders(): Project {
  let project = newProject();
  project = answer(project, 'problem', 'problem', 'No-shows cost us chairs', now);
  project = answer(project, 'problem', 'pain', 'A printed schedule and a pen', now);
  project = answer(project, 'goals', 'goals', ['fewer no-shows', '  ', 'no reminder calls'], now);
  project = withRow(project, 'actor', 'a1', { name: 'Receptionist', fields: { needs: 'Stop phoning' } });
  project = withRow(project, 'actor', 'a2', { name: 'Patient' });
  project = withRow(project, 'use-case', 'u1', { name: 'Confirm a visit', fields: { actors: ['a2', 'a1'] } });
  project = withRow(project, 'module', 'm1', { name: 'Reminders', fields: { purpose: 'Decides when one is due' } });
  project = withRow(project, 'module', 'm2', { name: 'Messaging' });
  project = updateEntity(project, 'module', 'm1', { fields: { dependsOn: ['m2'] } }, now);
  project = answer(project, 'first-vertical-slice', 'use-case', 'u1', now);
  return answer(project, 'first-vertical-slice', 'path', 'Messaging sends the text\nReminders records the reply', now);
}

describe('buildPackage', () => {
  describe('the files', () => {
    it('gives New Project the twelve files of the spec the model can fill, in the order the design is worked out', () => {
      expect(buildPackage(newProject()).map((file) => file.path)).toEqual([
        'problem.md',
        'requirements.md',
        'use-cases.md',
        'domain-model.md',
        'system-context.md',
        'module-design.md',
        'dependencies.md',
        'architecture.md',
        'vertical-slice.md',
        'test-strategy.md',
        'implementation-plan.md',
        'design-review.md',
      ]);
    });

    it('gives Feature / Change the files that fit a change to an existing system', () => {
      expect(buildPackage(newProject('feature-change')).map((file) => file.path)).toEqual([
        'problem.md',
        'use-cases.md',
        'domain-model.md',
        'module-design.md',
        'dependencies.md',
        'architecture.md',
        'test-strategy.md',
        'implementation-plan.md',
        'design-review.md',
      ]);
    });

    it.each(['new-project', 'feature-change'] as const)(
      'puts every step of the %s workflow in the package, as one section of one file',
      (mode) => {
        const headings = buildPackage(newProject(mode)).flatMap((file) =>
          linesOf(file).filter((line) => line.startsWith('## ')),
        );

        expect(headings).toEqual(workflowFor(mode).steps.map((step, index) => `## ${index + 1}. ${step.title}`));
      },
    );

    it('heads each file with its title, then names the project, the workflow and how far the design has got', () => {
      const lines = linesOf(fileOf(reminders(), 'problem.md'));

      expect(lines.slice(0, 3)).toEqual(['# Problem', '', 'Reminders · New Project · 1 of 4 steps answered']);
    });

    it('counts the sections answered in each file', () => {
      let project = reminders();
      project = answer(project, 'problem', 'success', 'Fewer than one in ten', now);

      expect(linesOf(fileOf(project, 'problem.md'))[2]).toBe('Reminders · New Project · 2 of 4 steps answered');
      expect(linesOf(fileOf(project, 'requirements.md'))[2]).toBe('Reminders · New Project · 0 of 1 step answered');
    });
  });

  describe('what is not answered yet', () => {
    it.each(['new-project', 'feature-change'] as const)(
      'keeps every section of a %s project with nothing answered, marked open',
      (mode) => {
        const markdown = buildPackage(newProject(mode))
          .map((file) => file.markdown)
          .join('\n');
        const steps = workflowFor(mode).steps;

        expect(markdown.match(/^> \*\*Open\.\*\* Still to answer:$/gm)).toHaveLength(steps.length);
      },
    );

    it('lists the questions still to answer under the open marker', () => {
      const lines = linesOf(fileOf(newProject(), 'problem.md'));
      const start = lines.indexOf('## 1. Problem');

      expect(lines.slice(start, start + 8)).toEqual([
        '## 1. Problem',
        '',
        '> **Open.** Still to answer:',
        '> - What problem are we solving, in plain words, without naming a solution?',
        '> - Who feels it today, and how do they cope without this?',
        '> - How will you know the problem is solved?',
        '',
        '## 2. Users',
      ]);
    });

    it('marks a half-answered section open, listing only what is missing, above what is written', () => {
      const lines = linesOf(fileOf(reminders(), 'problem.md'));
      const start = lines.indexOf('## 1. Problem');

      expect(lines.slice(start, start + 12)).toEqual([
        '## 1. Problem',
        '',
        '> **Open.** Still to answer:',
        '> - How will you know the problem is solved?',
        '',
        '**What problem are we solving, in plain words, without naming a solution?**',
        '',
        'No-shows cost us chairs',
        '',
        '**Who feels it today, and how do they cope without this?**',
        '',
        'A printed schedule and a pen',
      ]);
    });

    it('does not mark a finished section open', () => {
      const project = answer(reminders(), 'problem', 'success', 'Fewer than one in ten', now);
      const lines = linesOf(fileOf(project, 'problem.md'));

      expect(lines.slice(lines.indexOf('## 1. Problem'), lines.indexOf('## 2. Users'))).not.toContain(
        '> **Open.** Still to answer:',
      );
    });

    it('embeds no diagram while the model has nothing to draw', () => {
      for (const file of buildPackage(newProject())) {
        expect(file.markdown, file.path).not.toContain('```');
      }
    });
  });

  describe('what is answered', () => {
    it('writes a list answer as bullets, leaving out blank lines', () => {
      expect(fileOf(reminders(), 'problem.md').markdown).toContain(
        '- fewer no-shows\n- no reminder calls\n',
      );
    });

    it('writes an entity list as named rows, each field that has something in it under its question', () => {
      const lines = linesOf(fileOf(reminders(), 'problem.md'));
      const start = lines.indexOf('## 2. Users');

      expect(lines.slice(start + 4, start + 9)).toEqual([
        '- **Receptionist**',
        '  - *What are they trying to get done?*',
        '    Stop phoning',
        '- **Patient**',
        '',
      ]);
    });

    it('writes a reference field as the names of the rows it points at, and keeps the order they were ticked in', () => {
      const lines = linesOf(fileOf(reminders(), 'use-cases.md'));
      const start = lines.indexOf('- **Confirm a visit**');

      expect(lines.slice(start, start + 4)).toEqual([
        '- **Confirm a visit**',
        '  - *Who performs it?*',
        '    - Patient',
        '    - Receptionist',
      ]);
    });

    it('writes one value for each row of an entity-fields answer', () => {
      let project = withRow(newProject(), 'module', 'm1', { name: 'Reminders' });
      project = withRow(project, 'module', 'm2', { name: 'Messaging' });
      project = updateEntity(project, 'module', 'm1', { fields: { responsibilities: ['Decide when due', 'Skip cancelled'] } }, now);
      project = updateEntity(project, 'module', 'm2', { fields: { hides: 'The SMS vendor' } }, now);
      const markdown = fileOf(project, 'module-design.md').markdown;

      expect(markdown).toContain('- **Reminders**\n  - Decide when due\n  - Skip cancelled\n');
      expect(markdown).toContain('- **Messaging**\n  The SMS vendor\n');
    });

    it('writes a choice as the label of the option picked', () => {
      const project = answer(newProject(), 'design-review', 'verdict', 'ready-with-risks', now);

      expect(fileOf(project, 'design-review.md').markdown).toContain('\nYes, with the risks above written down\n');
    });

    it('writes the option chosen as the name of the row', () => {
      let project = withRow(newProject(), 'architecture-option', 'o1', { name: 'Modular monolith' });
      project = answer(project, 'decision', 'chosen', 'o1', now);

      expect(fileOf(project, 'architecture.md').markdown).toContain('\nModular monolith\n');
    });

    it('keeps the user\'s note on a step, under the answers', () => {
      const project = setNote(reminders(), 'goals', 'Ask finance\nabout the budget\n\nSecond thought', now);
      const lines = linesOf(fileOf(project, 'problem.md'));
      const start = lines.indexOf('**Notes**');

      expect(lines.slice(start - 2, start + 8)).toEqual([
        '- no reminder calls',
        '',
        '**Notes**',
        '',
        'Ask finance  ',
        'about the budget',
        '',
        'Second thought',
        '',
        '## 4. Non-goals',
      ]);
    });

    it('keeps a note on a step with nothing else answered', () => {
      const project = setNote(newProject(), 'requirements', 'Check with legal', now);

      expect(fileOf(project, 'requirements.md').markdown).toContain('**Notes**\n\nCheck with legal\n');
    });
  });

  describe('diagrams', () => {
    it('embeds a diagram as a Mermaid block, exactly as the diagram generator draws it', () => {
      const project = reminders();
      const source = diagramFor(project, 'system-context');

      expect(source).toBeDefined();
      expect(fileOf(project, 'problem.md').markdown).toContain(`**Diagram: System context**\n\n\`\`\`mermaid\n${source}\n\`\`\`\n`);
    });

    it('embeds a diagram once in a file, though several of its steps draw it', () => {
      const markdown = fileOf(reminders(), 'module-design.md').markdown;

      expect(markdown.match(/^```mermaid$/gm)).toHaveLength(1);
      expect(markdown).toContain(`\`\`\`mermaid\n${diagramFor(reminders(), 'module')}\n\`\`\``);
    });

    it('embeds each different diagram a file draws', () => {
      let project = withRow(newProject('feature-change'), 'actor', 'a1', { name: 'Patient' });
      project = withRow(project, 'use-case', 'u1', { name: 'Cancel by text', fields: { actors: ['a1'] } });
      project = withRow(project, 'module', 'm1', { name: 'Reminders' });
      project = withRow(project, 'module', 'm2', { name: 'Messaging' });
      project = updateEntity(project, 'module', 'm1', { fields: { dependsOn: ['m2'] } }, now);
      project = answer(project, 'smallest-safe-implementation', 'use-case', 'u1', now);
      const markdown = fileOf(project, 'implementation-plan.md').markdown;

      expect(markdown.match(/^```mermaid$/gm)).toHaveLength(2);
      expect(markdown).toContain(`\n${diagramFor(project, 'first-vertical-slice')}\n`);
      expect(markdown).toContain(`\n${diagramFor(project, 'dependency')}\n`);
    });

    it('leaves a diagram out of a file whose steps draw none', () => {
      expect(fileOf(reminders(), 'requirements.md').markdown).not.toContain('```');
    });
  });

  describe('text a user typed', () => {
    function noteIn(text: string): string[] {
      const lines = linesOf(fileOf(setNote(newProject(), 'requirements', text, now), 'requirements.md'));
      const note = lines.slice(lines.indexOf('**Notes**') + 2);
      return note.slice(0, note.indexOf(''));
    }

    it.each([
      ['a heading', '# Heading', '\\# Heading'],
      ['a deeper heading', '###### Heading', '\\###### Heading'],
      ['a heading ending in hashes', 'Heading ##', 'Heading \\#\\#'],
      ['a fence of backticks', '```', '\\`\\`\\`'],
      ['a fence of tildes', '~~~', '\\~~~'],
      ['inline code', 'call `run()` now', 'call \\`run()\\` now'],
      ['a block quote', '> quote', '\\> quote'],
      ['a bullet', '- item', '\\- item'],
      ['a star bullet', '* item', '\\* item'],
      ['a plus bullet', '+ item', '\\+ item'],
      ['a numbered item', '1. first', '1\\. first'],
      ['a numbered item with a bracket', '2) second', '2\\) second'],
      ['a thematic break', '---', '\\---'],
      ['an underscore break', '___', '\\___'],
      ['a setext underline', '===', '\\==='],
      ['a table row', '| a | b |', '\\| a | b |'],
      ['a table divider', '|---|---|', '\\|---|---|'],
      ['an aligned table divider', ':--|--:', '\\:--|--:'],
      ['an indented line that would be code', '        indented', 'indented'],
      ['an HTML tag', '<script>alert(1)</script>', '\\<script>alert(1)\\</script>'],
      ['a link', 'see [docs](http://x.test)', 'see \\[docs\\](http://x.test)'],
      ['a link definition', '[x]: http://x.test', '\\[x\\]: http://x.test'],
      ['a character reference', 'fish &amp; chips', 'fish \\&amp; chips'],
      ['a backslash', 'C:\\temp\\', 'C:\\\\temp\\\\'],
    ])('keeps %s from becoming Markdown syntax', (_name, typed, written) => {
      expect(noteIn(typed)).toEqual([written]);
    });

    it('keeps a pasted code block, fences and all, as plain lines', () => {
      expect(noteIn('Try this:\n```ts\nconst a = 1;\n```\n# done')).toEqual([
        'Try this:  ',
        '\\`\\`\\`ts  ',
        'const a = 1;  ',
        '\\`\\`\\`  ',
        '\\# done',
      ]);
    });

    it('adds no heading, fence, rule or table that the user did not get from the package', () => {
      let project = newProject('new-project', '# Pwned\n```');
      project = answer(project, 'problem', 'problem', '```\nrm -rf\n```\n# Heading\n---\n| a | b |\n|---|---|', now);
      project = answer(project, 'goals', 'goals', ['- nested', '# loud', '```'], now);
      project = withRow(project, 'actor', 'a1', { name: '## Actor', fields: { needs: '> quoted\n# header' } });
      project = withRow(project, 'module', 'm1', { name: '```', fields: { purpose: '---' } });
      project = setNote(project, 'goals', '```\n# note', now);

      const clean = buildPackage(newProject());
      for (const [index, file] of buildPackage(project).entries()) {
        const outside = outsideFences(file);

        expect(outside.filter((line) => line.startsWith('#')), file.path).toEqual(
          outsideFences(clean[index]).filter((line) => line.startsWith('#')),
        );
        expect(outside.filter((line) => /^\s*(?:---|\|)/.test(line)), file.path).toEqual([]);
        expect(file.markdown.match(/^```/gm) ?? [], file.path).toHaveLength(
          2 * (file.markdown.match(/^```mermaid$/gm) ?? []).length,
        );
      }
    });

    it('keeps emphasis marks in a name from unbalancing the bold the package puts round it', () => {
      const project = withRow(newProject(), 'actor', 'a1', { name: 'a* and snake_case', fields: { needs: 'x' } });

      expect(fileOf(project, 'problem.md').markdown).toContain('- **a\\* and snake\\_case**\n');
    });

    it('keeps a project name that is not one line, or starts like a heading, on the one line under the title', () => {
      const project = newProject('new-project', '# Big\nname  with\tspaces #');

      expect(linesOf(fileOf(project, 'problem.md'))[2]).toBe('\\# Big name with spaces \\# · New Project · 0 of 4 steps answered');
    });
  });
});

describe('combinePackage', () => {
  const files = buildPackage(reminders());

  it('opens with the project\'s title and a numbered contents list that links to each file\'s section', () => {
    const lines = combinePackage(files, 'Reminders').split('\n');

    expect(lines.slice(0, 7)).toEqual([
      '# Reminders: design package',
      '',
      '## Contents',
      '',
      '1. [Problem](#problem)',
      '2. [Requirements](#requirements)',
      '3. [Use cases](#use-cases)',
    ]);
    expect(lines.filter((line) => /^\d+\. \[/.test(line))).toHaveLength(files.length);
  });

  it('lists the files in the order the package has them', () => {
    const contents = combinePackage(files, 'x')
      .split('\n')
      .filter((line) => /^\d+\. \[/.test(line));

    expect(contents.map((line) => line.replace(/^\d+\. \[(.*)\]\(.*$/, '$1'))).toEqual(
      workflowFor('new-project').designPackage.map((definition) => definition.title),
    );
  });

  it('puts every file in after the contents, each under a heading one level down so the document has one title', () => {
    const lines = combinePackage(files, 'x').split('\n');
    const headings = lines.filter((line) => /^#{1,3} /.test(line) && !line.startsWith('## Contents'));

    expect(headings.filter((line) => line.startsWith('# '))).toEqual(['# x: design package']);
    expect(headings.filter((line) => /^## (?!\d)/.test(line))).toEqual(
      workflowFor('new-project').designPackage.map((definition) => `## ${definition.title}`),
    );
    expect(lines).toContain('### 1. Problem');
    expect(lines).not.toContain('## 1. Problem');
  });

  it('keeps each file as it is, besides moving its headings down', () => {
    const combined = combinePackage(files, 'x');

    for (const file of files) {
      expect(combined, file.path).toContain(file.markdown.trimEnd().replace(/^(#{1,5}) /gm, '#$1 '));
    }
  });

  it('leaves the lines inside a Mermaid block alone, even one that looks like a heading', () => {
    const tricky: PackageFile = {
      path: 'a.md',
      title: 'A',
      markdown: '# A\n\n```mermaid\n# not a heading\n```\n\n## 1. Step\n',
    };
    const combined = combinePackage([tricky], 'x');

    expect(combined).toContain('```mermaid\n# not a heading\n```');
    expect(combined).toContain('\n## A\n');
    expect(combined).toContain('\n### 1. Step\n');
  });

  it('gives a package of no files just the title and an empty contents', () => {
    expect(combinePackage([], 'x')).toBe('# x: design package\n\n## Contents\n');
  });

  it('writes a project name that is not one line, or that starts like a heading, on one escaped line', () => {
    expect(combinePackage([], '# a\nb').split('\n')[0]).toBe('# \\# a b: design package');
  });

  it('ends with a single newline', () => {
    const combined = combinePackage(files, 'x');

    expect(combined.endsWith('\n')).toBe(true);
    expect(combined.endsWith('\n\n')).toBe(false);
  });
});

describe('packageFileName', () => {
  it('turns a project name into a lower-case file name for the combined document', () => {
    expect(packageFileName('Order Service')).toBe('order-service-design-package.md');
  });

  it.each([
    ['slashes and dots', '../../etc/passwd', 'etc-passwd-design-package.md'],
    ['a Windows drive and backslashes', 'C:\\Temp\\x', 'c-temp-x-design-package.md'],
    ['reserved characters', 'a<b>:"c|d?*e', 'a-b-c-d-e-design-package.md'],
    ['control characters', 'a\u0000\n\tb', 'a-b-design-package.md'],
    ['leading and trailing punctuation', '  --Hello!--  ', 'hello-design-package.md'],
    ['letters from other alphabets', 'Café Ordres', 'café-ordres-design-package.md'],
    ['nothing a file name can use', '???', 'design-package.md'],
    ['an empty name', '', 'design-package.md'],
    ['a Windows device name', 'CON', 'con-design-package.md'],
  ])('is safe for %s', (_name, projectName, expected) => {
    expect(packageFileName(projectName)).toBe(expected);
  });

  it('cuts a long name between characters, never through a character made of two UTF-16 units', () => {
    const name = packageFileName('a' + '𠀀'.repeat(80));

    expect(name).toBe('a' + '𠀀'.repeat(59) + '-design-package.md');
    expect(name).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
  });

  it('keeps a very long name to a length every file system takes', () => {
    expect(packageFileName('x'.repeat(500)).length).toBeLessThanOrEqual(80);
  });
});
