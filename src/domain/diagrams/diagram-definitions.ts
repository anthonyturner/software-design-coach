import type { DiagramDefinition, DiagramKind } from './diagram.types';

/** How each diagram is introduced to the user, and what it asks of them while it has nothing to draw. */
export const diagramDefinitions: Readonly<Record<DiagramKind, DiagramDefinition>> = {
  'system-context': {
    title: 'System context',
    emptyText: 'Name an actor or an outside system, and this shows who and what your system talks to.',
  },
  'use-case': {
    title: 'Use cases',
    emptyText: 'Name an actor or a use case, and this shows who does what with your system.',
  },
  'domain-model': {
    title: 'Domain model',
    emptyText: 'Name a domain concept, and this shows the concepts and how they relate.',
  },
  module: {
    title: 'Modules',
    emptyText: 'Name a module, and this shows the parts your system is made of.',
  },
  dependency: {
    title: 'Dependencies',
    emptyText: 'Name a module, and this shows which modules need which.',
  },
  'first-vertical-slice': {
    title: 'First vertical slice',
    emptyText: 'Choose the use case to build first, and this shows the path through it.',
  },
};
