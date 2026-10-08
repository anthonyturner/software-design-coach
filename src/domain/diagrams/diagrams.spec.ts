import { addEntity, answer, createProject, removeEntity, updateEntity } from '../project/project';
import type { Project } from '../project/project.types';
import type { EntityEdit, EntityKind } from '../entity/entity.types';
import { findQuestion, workflowFor } from '../workflow/workflow';
import { DIAGRAM_KINDS } from './diagram.types';
import { diagramDefinitions } from './diagram-definitions';
import { diagramFor, moduleNodes } from './diagrams';

const now = '2026-10-08T09:00:00.000Z';

function newProject(name = 'Reminders'): Project {
  return createProject({ id: 'p1', name, mode: 'new-project', now });
}

/** Adds one named row, with whatever fields it needs, the way the store would. */
function withRow(project: Project, kind: EntityKind, id: string, name: string, fields: EntityEdit['fields'] = {}): Project {
  return updateEntity(addEntity(project, kind, id, now), kind, id, { name, fields }, now);
}

/** Sets fields on a row that already exists, as a later step does once the rows it points at are listed. */
function withFields(project: Project, kind: EntityKind, id: string, fields: EntityEdit['fields']): Project {
  return updateEntity(project, kind, id, { fields }, now);
}

function lines(source: string | undefined): readonly string[] {
  return (source ?? '').split('\n').map((line) => line.trim());
}

describe('diagramFor', () => {
  it('draws nothing for a project with nothing named yet, whichever diagram is asked for', () => {
    for (const kind of DIAGRAM_KINDS) {
      expect(diagramFor(newProject(), kind), kind).toBeUndefined();
    }
  });

  it('draws nothing for rows that have no name yet', () => {
    const project = addEntity(addEntity(newProject(), 'actor', 'a1', now), 'module', 'm1', now);

    expect(diagramFor(project, 'system-context')).toBeUndefined();
    expect(diagramFor(project, 'dependency')).toBeUndefined();
  });

  it('starts every diagram with a Mermaid flowchart declaration', () => {
    const project = withRow(withRow(newProject(), 'actor', 'a1', 'Receptionist'), 'module', 'm1', 'Scheduling');

    expect(diagramFor(project, 'system-context')?.split('\n')[0]).toMatch(/^flowchart (LR|TB)$/);
    expect(diagramFor(project, 'module')?.split('\n')[0]).toMatch(/^flowchart (LR|TB)$/);
  });

  describe('system context', () => {
    const project = withRow(
      withRow(withRow(newProject(), 'actor', 'a1', 'Receptionist'), 'external-system', 'e1', 'Twilio', {
        purpose: 'Sends the texts',
      }),
      'external-system',
      'e2',
      'Calendar',
    );

    it('puts the system in the middle, with its actors and the outside systems around it', () => {
      const text = lines(diagramFor(project, 'system-context'));

      expect(text).toContain('system("Reminders")');
      expect(text).toContain('n_a1["Receptionist"]');
      expect(text).toContain('n_a1 --> system');
      expect(text).toContain('n_e1[["Twilio"]]');
    });

    it('labels the exchange with an outside system with what is exchanged, when it was said', () => {
      const text = lines(diagramFor(project, 'system-context'));

      expect(text).toContain('system <-->|"Sends the texts"| n_e1');
      expect(text).toContain('system <--> n_e2');
    });

    it('draws with only actors or only outside systems', () => {
      const actorsOnly = withRow(newProject(), 'actor', 'a1', 'Receptionist');
      const externalOnly = withRow(newProject(), 'external-system', 'e1', 'Twilio');

      expect(lines(diagramFor(actorsOnly, 'system-context'))).toContain('n_a1 --> system');
      expect(lines(diagramFor(externalOnly, 'system-context'))).toContain('system <--> n_e1');
    });
  });

  describe('use case', () => {
    const project = withRow(
      withRow(
        withRow(withRow(newProject(), 'actor', 'a1', 'Receptionist'), 'actor', 'a2', 'Patient'),
        'use-case',
        'u1',
        'Confirm an appointment',
        { actors: ['a1', 'a2'] },
      ),
      'use-case',
      'u2',
      'Cancel an appointment',
    );

    it('draws the use cases inside the system and the actors outside it', () => {
      const text = lines(diagramFor(project, 'use-case'));

      expect(text).toContain('subgraph system["Reminders"]');
      expect(text).toContain('n_u1(["Confirm an appointment"])');
      expect(text).toContain('n_a1["Receptionist"]');
    });

    it('joins each actor to the use cases they perform', () => {
      const text = lines(diagramFor(project, 'use-case'));

      expect(text).toContain('n_a1 --> n_u1');
      expect(text).toContain('n_a2 --> n_u1');
      expect(text).not.toContain('n_a1 --> n_u2');
    });

    it('still draws a use case nobody performs yet', () => {
      expect(lines(diagramFor(project, 'use-case'))).toContain('n_u2(["Cancel an appointment"])');
    });

    it('draws the actors alone, with no empty system box, before any use case is named', () => {
      const text = diagramFor(withRow(newProject(), 'actor', 'a1', 'Receptionist'), 'use-case');

      expect(text).toContain('n_a1["Receptionist"]');
      expect(text).not.toContain('subgraph');
    });

    it('forgets an actor once the actor is removed', () => {
      const text = diagramFor(removeEntity(project, 'actor', 'a1', now), 'use-case');

      expect(text).not.toContain('n_a1');
      expect(text).toContain('n_a2 --> n_u1');
    });
  });

  describe('domain model', () => {
    const concepts = withRow(
      withRow(withRow(newProject(), 'concept', 'c1', 'Appointment'), 'concept', 'c2', 'Patient'),
      'concept',
      'c3',
      'Reminder',
    );
    const project = withFields(
      withFields(withFields(concepts, 'concept', 'c1', { related: ['c2'] }), 'concept', 'c2', { related: ['c1'] }),
      'concept',
      'c3',
      { related: ['c1'] },
    );

    it('draws each concept and a line between concepts that relate', () => {
      const text = lines(diagramFor(project, 'domain-model'));

      expect(text).toContain('n_c1["Appointment"]');
      expect(text).toContain('n_c2["Patient"]');
      expect(text).toContain('n_c3["Reminder"]');
      expect(text).toContain('n_c3 --- n_c1');
    });

    it('draws a relationship once, however many of the two concepts name each other', () => {
      const joins = lines(diagramFor(project, 'domain-model')).filter((line) => line.includes('---'));

      expect(joins).toHaveLength(2);
    });
  });

  describe('module', () => {
    const project = withFields(
      withRow(withRow(newProject(), 'module', 'm1', 'Scheduling', { purpose: 'Owns the calendar' }), 'module', 'm2', 'Patients'),
      'module',
      'm1',
      { dependsOn: ['m2'] },
    );

    it('draws each module in the system with its name and what it owns', () => {
      const text = lines(diagramFor(project, 'module'));

      expect(text).toContain('subgraph system["Reminders"]');
      expect(text).toContain('n_m1["Scheduling<br/>Owns the calendar"]');
      expect(text).toContain('n_m2["Patients"]');
    });

    it('leaves the arrows to the dependency diagram', () => {
      expect(diagramFor(project, 'module')).not.toContain('-->');
    });
  });

  describe('dependency', () => {
    const project = withFields(
      withRow(withRow(withRow(newProject(), 'module', 'm1', 'Reminders'), 'module', 'm2', 'Scheduling'), 'module', 'm3', 'Messaging'),
      'module',
      'm1',
      { dependsOn: ['m2', 'm3'] },
    );

    it('draws an arrow from a module to each module it needs', () => {
      const text = lines(diagramFor(project, 'dependency'));

      expect(text).toContain('n_m1 --> n_m2');
      expect(text).toContain('n_m1 --> n_m3');
      expect(text).not.toContain('n_m2 --> n_m1');
    });

    it('draws a module that depends on nothing as a box of its own', () => {
      expect(lines(diagramFor(project, 'dependency'))).toContain('n_m2["Scheduling"]');
    });

    it('does not draw an arrow to a module that has no name yet', () => {
      const withUnnamedTarget = withFields(addEntity(project, 'module', 'm4', now), 'module', 'm1', { dependsOn: ['m2', 'm4'] });

      expect(diagramFor(withUnnamedTarget, 'dependency')).not.toContain('m4');
    });
  });

  describe('first vertical slice', () => {
    const base = withRow(
      withRow(withRow(newProject(), 'actor', 'a1', 'Receptionist'), 'use-case', 'u1', 'Confirm an appointment', {
        actors: ['a1'],
      }),
      'use-case',
      'u2',
      'Cancel an appointment',
    );
    const chosen = answer(base, 'first-vertical-slice', 'use-case', 'u1', now);
    const traced = answer(
      chosen,
      'first-vertical-slice',
      'path',
      "1. Scheduling lists tomorrow's appointments\n\n- Messaging sends the text\nReminders records the reply",
      now,
    );

    it('draws nothing until a use case is chosen for the first slice', () => {
      expect(diagramFor(base, 'first-vertical-slice')).toBeUndefined();
    });

    it('draws the chosen use case and its actors, and leaves out the others', () => {
      const text = lines(diagramFor(chosen, 'first-vertical-slice'));

      expect(text).toContain('n_u1(["Confirm an appointment"])');
      expect(text).toContain('n_a1 --> n_u1');
      expect(diagramFor(chosen, 'first-vertical-slice')).not.toContain('n_u2');
    });

    it('chains the use case through each hop of the traced path, one per line', () => {
      const text = lines(diagramFor(traced, 'first-vertical-slice'));

      expect(text).toContain('hop1["Scheduling lists tomorrow\'s appointments"]');
      expect(text).toContain('hop2["Messaging sends the text"]');
      expect(text).toContain('hop3["Reminders records the reply"]');
      expect(text).toContain('n_u1 --> hop1');
      expect(text).toContain('hop1 --> hop2');
      expect(text).toContain('hop2 --> hop3');
    });

    it('draws nothing once the chosen use case is removed', () => {
      expect(diagramFor(removeEntity(traced, 'use-case', 'u1', now), 'first-vertical-slice')).toBeUndefined();
    });

    it('reads questions the workflow really asks, so renaming one cannot silently blank the diagram', () => {
      const workflow = workflowFor('new-project');

      expect(findQuestion(workflow, 'first-vertical-slice', 'use-case')?.kind).toBe('entity-choice');
      expect(findQuestion(workflow, 'first-vertical-slice', 'path')?.kind).toBe('long-text');
    });
  });

  describe('safety of what the user typed', () => {
    function actorNamed(name: string): readonly string[] {
      return lines(diagramFor(withRow(newProject(), 'actor', 'a1', name), 'system-context'));
    }

    it('escapes double quotes, which would end the label early', () => {
      expect(actorNamed('The "boss"')).toContain('n_a1["The #34;boss#34;"]');
    });

    it('escapes brackets and braces, which Mermaid reads as node shapes', () => {
      expect(actorNamed('Cart [v2] {beta}')).toContain('n_a1["Cart #91;v2#93; #123;beta#125;"]');
    });

    it('turns line breaks and runs of spaces into single spaces', () => {
      expect(actorNamed('  First\nsecond \r\n\n  third  ')).toContain('n_a1["First second third"]');
    });

    it('escapes the hash, which starts a Mermaid character code, and does not escape the codes it writes itself', () => {
      expect(actorNamed('C# and #12;')).toContain('n_a1["C#35; and #35;12;"]');
    });

    it('escapes markup, so a label can never inject HTML', () => {
      expect(actorNamed('<img src=x onerror=alert(1)>')).toContain('n_a1["#60;img src=x onerror=alert(1)#62;"]');
    });

    it('escapes the characters that open a Markdown label, a comment or an edge label', () => {
      expect(actorNamed('`a` 100% | b & c')).toContain('n_a1["#96;a#96; 100#37; #124; b #38; c"]');
    });

    it('escapes the project name the same way', () => {
      const project = withRow(newProject('My "app"'), 'actor', 'a1', 'Ann');

      expect(lines(diagramFor(project, 'system-context'))).toContain('system("My #34;app#34;")');
    });

    it('escapes the text of an edge label', () => {
      const project = withRow(newProject(), 'external-system', 'e1', 'Twilio', { purpose: 'Texts | calls' });

      expect(lines(diagramFor(project, 'system-context'))).toContain('system <-->|"Texts #124; calls"| n_e1');
    });

    it('turns characters a node id cannot hold into underscores, and prefixes the id so it is never a keyword', () => {
      const project = withRow(newProject(), 'actor', 'end of "a" line', 'Receptionist');

      expect(lines(diagramFor(project, 'system-context'))).toContain('n_end_of__a__line["Receptionist"]');
    });
  });
});

describe('moduleNodes', () => {
  const project = withRow(
    withRow(withRow(newProject(), 'module', 'm 1', ' Scheduling '), 'module', 'm2', 'Notifier'),
    'actor',
    'a1',
    'Receptionist',
  );

  it('names the node of every module the module and dependency diagrams draw, with the row it stands for', () => {
    for (const kind of ['module', 'dependency'] as const) {
      const nodes = moduleNodes(project, kind);

      expect(nodes, kind).toEqual([
        { nodeId: 'n_m_1', moduleId: 'm 1', name: 'Scheduling' },
        { nodeId: 'n_m2', moduleId: 'm2', name: 'Notifier' },
      ]);
      for (const { nodeId } of nodes) {
        expect(lines(diagramFor(project, kind)).some((line) => line.startsWith(`${nodeId}[`)), kind).toBe(true);
      }
    }
  });

  it('leaves out a module with no name, which neither diagram draws', () => {
    const unnamed = addEntity(project, 'module', 'm3', now);

    expect(moduleNodes(unnamed, 'module').map((node) => node.moduleId)).toEqual(['m 1', 'm2']);
  });

  it('is empty for a diagram that does not draw modules', () => {
    for (const kind of DIAGRAM_KINDS.filter((candidate) => candidate !== 'module' && candidate !== 'dependency')) {
      expect(moduleNodes(project, kind), kind).toEqual([]);
    }
  });

  it('is empty while there are no modules', () => {
    expect(moduleNodes(newProject(), 'module')).toEqual([]);
  });
});

describe('diagramDefinitions', () => {
  it('titles every diagram and says what to name to make it appear', () => {
    for (const kind of DIAGRAM_KINDS) {
      expect(diagramDefinitions[kind].title.trim(), kind).not.toBe('');
      expect(diagramDefinitions[kind].emptyText.trim(), kind).not.toBe('');
    }
  });
});
