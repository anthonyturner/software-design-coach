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
        hint: 'Responsibilities, hidden knowledge and dependencies come in a later step.',
      },
    ],
  },
};
