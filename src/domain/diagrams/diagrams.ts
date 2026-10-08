import { isNamed } from '../entity/entities';
import type { Entity, EntityKind } from '../entity/entity.types';
import { stepAnswers } from '../project/project';
import type { Project } from '../project/project.types';
import type { DiagramKind } from './diagram.types';

/**
 * Where the first-slice diagram reads its answers. `diagrams.spec.ts` checks that the workflow still
 * asks these questions, so renaming one fails a test instead of quietly blanking the diagram.
 */
const SLICE = { stepId: 'first-vertical-slice', useCase: 'use-case', path: 'path' } as const;

type Shape = 'box' | 'rounded' | 'stadium' | 'subroutine';

const SHAPES: Readonly<Record<Shape, readonly [open: string, close: string]>> = {
  box: ['[', ']'],
  rounded: ['(', ')'],
  stadium: ['([', '])'],
  subroutine: ['[[', ']]'],
};

/** The id of the node that stands for the whole system being designed. */
const SYSTEM = 'system';

interface Drawing {
  readonly direction: 'LR' | 'TB';
  /** The lines under the `flowchart` line; none means the model has nothing to draw yet. */
  readonly draw: (project: Project) => readonly string[];
}

const drawings: Readonly<Record<DiagramKind, Drawing>> = {
  'system-context': { direction: 'LR', draw: drawSystemContext },
  'use-case': { direction: 'LR', draw: drawUseCases },
  'domain-model': { direction: 'LR', draw: drawDomainModel },
  module: { direction: 'TB', draw: drawModules },
  dependency: { direction: 'TB', draw: drawDependencies },
  'first-vertical-slice': { direction: 'TB', draw: drawFirstSlice },
};

/**
 * The Mermaid source of one diagram, derived from the model alone (ADR-0004), or `undefined` while
 * the model has nothing to draw. Unnamed rows are not drawn. A row's id becomes its node id, so
 * whatever draws the diagram can map a node back to the row it stands for.
 */
export function diagramFor(project: Project, kind: DiagramKind): string | undefined {
  const { direction, draw } = drawings[kind];
  const body = draw(project);
  return body.length === 0 ? undefined : [`flowchart ${direction}`, ...body.map((line) => `  ${line}`)].join('\n');
}

function drawSystemContext(project: Project): readonly string[] {
  const actors = named(project, 'actor');
  const externals = named(project, 'external-system');
  if (actors.length === 0 && externals.length === 0) {
    return [];
  }
  return [
    node(SYSTEM, 'rounded', label(project.name)),
    ...actors.map((actor) => node(nodeId(actor.id), 'box', label(actor.name))),
    ...externals.map((external) => node(nodeId(external.id), 'subroutine', label(external.name))),
    ...actors.map((actor) => link(nodeId(actor.id), '-->', SYSTEM)),
    ...externals.map((external) => link(SYSTEM, '<-->', nodeId(external.id), label(text(external, 'purpose')))),
  ];
}

function drawUseCases(project: Project): readonly string[] {
  const actors = named(project, 'actor');
  const useCases = named(project, 'use-case');
  const actorIds = new Set(actors.map((actor) => actor.id));
  return [
    ...actors.map((actor) => node(nodeId(actor.id), 'box', label(actor.name))),
    ...(useCases.length === 0
      ? []
      : [
          `subgraph ${SYSTEM}["${label(project.name)}"]`,
          ...useCases.map((useCase) => `  ${node(nodeId(useCase.id), 'stadium', label(useCase.name))}`),
          'end',
        ]),
    ...useCases.flatMap((useCase) =>
      list(useCase, 'actors')
        .filter((id) => actorIds.has(id))
        .map((id) => link(nodeId(id), '-->', nodeId(useCase.id))),
    ),
  ];
}

function drawDomainModel(project: Project): readonly string[] {
  const concepts = named(project, 'concept');
  const known = new Set(concepts.map((concept) => concept.id));
  const joined = new Set<string>();
  const joins: string[] = [];
  for (const concept of concepts) {
    for (const other of list(concept, 'related').filter((id) => known.has(id))) {
      const pair = [concept.id, other].sort().join('\n');
      if (!joined.has(pair)) {
        joined.add(pair);
        joins.push(link(nodeId(concept.id), '---', nodeId(other)));
      }
    }
  }
  return [...concepts.map((concept) => node(nodeId(concept.id), 'box', label(concept.name))), ...joins];
}

function drawModules(project: Project): readonly string[] {
  const modules = named(project, 'module');
  if (modules.length === 0) {
    return [];
  }
  return [
    `subgraph ${SYSTEM}["${label(project.name)}"]`,
    ...modules.map((module) => `  ${node(nodeId(module.id), 'box', label(module.name, text(module, 'purpose')))}`),
    'end',
  ];
}

function drawDependencies(project: Project): readonly string[] {
  const modules = named(project, 'module');
  const known = new Set(modules.map((module) => module.id));
  return [
    ...modules.map((module) => node(nodeId(module.id), 'box', label(module.name))),
    ...modules.flatMap((module) =>
      list(module, 'dependsOn')
        .filter((id) => known.has(id))
        .map((id) => link(nodeId(module.id), '-->', nodeId(id))),
    ),
  ];
}

function drawFirstSlice(project: Project): readonly string[] {
  const answers = stepAnswers(project, SLICE.stepId);
  const chosen = answers[SLICE.useCase];
  const useCase = named(project, 'use-case').find((candidate) => candidate.id === chosen);
  if (!useCase) {
    return [];
  }
  const performers = list(useCase, 'actors');
  const actors = named(project, 'actor').filter((actor) => performers.includes(actor.id));
  const hops = hopsOf(answers[SLICE.path]);
  const chain = [nodeId(useCase.id), ...hops.map((_, index) => `hop${index + 1}`)];
  return [
    ...actors.map((actor) => node(nodeId(actor.id), 'box', label(actor.name))),
    node(nodeId(useCase.id), 'stadium', label(useCase.name)),
    ...hops.map((hop, index) => node(`hop${index + 1}`, 'box', hop)),
    ...actors.map((actor) => link(nodeId(actor.id), '-->', nodeId(useCase.id))),
    ...chain.slice(1).map((hop, index) => link(chain[index], '-->', hop)),
  ];
}

/** The labels of the lines of a traced path, with the bullet or number a person writes in front of each dropped. */
function hopsOf(answer: unknown): readonly string[] {
  if (typeof answer !== 'string') {
    return [];
  }
  return answer
    .split(/\r?\n/)
    .map((line) => label(line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '')))
    .filter((hop) => hop !== '');
}

function named(project: Project, kind: EntityKind): readonly Entity[] {
  return project.entities[kind].filter(isNamed);
}

function text(entity: Entity, key: string): string {
  const value = entity.fields[key];
  return typeof value === 'string' ? value : '';
}

function list(entity: Entity, key: string): readonly string[] {
  const value = entity.fields[key];
  return typeof value === 'string' || value === undefined ? [] : value;
}

/**
 * The model id as a Mermaid node id. The prefix keeps it clear of Mermaid's keywords and of the
 * fixed ids above, and anything Mermaid cannot read in an id becomes `_`.
 */
function nodeId(entityId: string): string {
  return `n_${entityId.replace(/[^A-Za-z0-9_-]/g, '_')}`;
}

/**
 * User text made safe to put in a quoted Mermaid label: whitespace and line breaks collapse to
 * single spaces, and everything Mermaid or HTML could act on becomes a `#<code>;` character code.
 * Several parts are joined with a line break.
 */
function label(...parts: readonly string[]): string {
  return parts
    .map((part) => part.replace(/\s+/g, ' ').trim().replace(/[#"&<>`%|[\]{}]/g, (char) => `#${char.charCodeAt(0)};`))
    .filter((part) => part !== '')
    .join('<br/>');
}

function node(id: string, shape: Shape, escapedLabel: string): string {
  const [open, close] = SHAPES[shape];
  return `${id}${open}"${escapedLabel}"${close}`;
}

function link(from: string, arrow: '-->' | '<-->' | '---', to: string, escapedLabel = ''): string {
  return escapedLabel === '' ? `${from} ${arrow} ${to}` : `${from} ${arrow}|"${escapedLabel}"| ${to}`;
}
