import type { EntityDefinition, EntityKind } from './entity.types';

/** What each kind of entity is made of. The editor, the stored shape and reference cleanup all read this. */
export const entityDefinitions: Readonly<Record<EntityKind, EntityDefinition>> = {
  actor: {
    singular: 'actor',
    plural: 'actors',
    nameLabel: 'Role',
    fields: [
      {
        key: 'needs',
        label: 'What are they trying to get done?',
        kind: 'text',
        hint: 'In their words, not yours.',
      },
    ],
  },
  'use-case': {
    singular: 'use case',
    plural: 'use cases',
    nameLabel: 'Use case',
    fields: [
      {
        key: 'actors',
        label: 'Who performs it?',
        kind: 'references',
        references: 'actor',
      },
      {
        key: 'outcome',
        label: 'What is true when it succeeds?',
        kind: 'text',
      },
    ],
  },
  concept: {
    singular: 'concept',
    plural: 'concepts',
    nameLabel: 'Concept',
    fields: [
      {
        key: 'description',
        label: 'What is it, in one sentence?',
        kind: 'text',
      },
      {
        key: 'related',
        label: 'Which other concepts does it relate to?',
        kind: 'references',
        references: 'concept',
      },
    ],
  },
  'external-system': {
    singular: 'external system',
    plural: 'external systems',
    nameLabel: 'System',
    fields: [
      {
        key: 'purpose',
        label: 'What do you exchange with it?',
        kind: 'text',
      },
    ],
  },
  module: {
    singular: 'module',
    plural: 'modules',
    nameLabel: 'Module',
    fields: [
      {
        key: 'purpose',
        label: 'What does it own, in one sentence?',
        kind: 'text',
        hint: 'Responsibilities, hidden knowledge, the interface and dependencies come in the steps that follow.',
      },
      {
        key: 'responsibilities',
        label: 'What is it responsible for?',
        kind: 'list',
        hint: 'One responsibility per line, each a job this module does so nobody else has to.',
      },
      {
        key: 'hides',
        label: 'What does it know that nobody else should have to?',
        kind: 'text',
        hint: 'A format, a rule, an algorithm, a vendor\'s quirks: the decisions it keeps to itself.',
      },
      {
        key: 'interface',
        label: 'What does a caller need to know to use it?',
        kind: 'text',
        hint: 'A few operations in plain words or signatures. Say what goes in and what comes out, not how.',
      },
      {
        key: 'dependsOn',
        label: 'Which modules does it need in order to work?',
        kind: 'references',
        references: 'module',
        hint: 'The arrow points from the module that needs to the module it needs.',
      },
    ],
  },
  'architecture-option': {
    singular: 'architecture option',
    plural: 'architecture options',
    nameLabel: 'Option',
    fields: [
      {
        key: 'approach',
        label: 'How does it work, in a few sentences?',
        kind: 'text',
        hint: 'Which modules there are, who owns what, and how they talk to each other.',
      },
      {
        key: 'strengths',
        label: 'What does it make easy?',
        kind: 'text',
      },
      {
        key: 'costs',
        label: 'What does it make hard, or cost?',
        kind: 'text',
        hint: 'Complexity, leaked knowledge, coupling, effort now, effort when it changes.',
      },
    ],
  },
};
