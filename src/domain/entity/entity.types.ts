export const ENTITY_KINDS = ['actor', 'use-case', 'concept', 'external-system', 'module', 'architecture-option'] as const;

export type EntityKind = (typeof ENTITY_KINDS)[number];

/** A text field holds a string; a list field holds lines of text; a references field holds the ids of entities of another kind. */
export type FieldValue = string | readonly string[];

export interface Entity {
  readonly id: string;
  readonly name: string;
  readonly fields: Readonly<Record<string, FieldValue>>;
}

export type ProjectEntities = Readonly<Record<EntityKind, readonly Entity[]>>;

export interface EntityEdit {
  readonly name?: string;
  readonly fields?: Readonly<Record<string, FieldValue>>;
}

export type EntityField =
  | { readonly key: string; readonly label: string; readonly kind: 'text' | 'list'; readonly hint?: string }
  | {
      readonly key: string;
      readonly label: string;
      readonly kind: 'references';
      readonly references: EntityKind;
      readonly hint?: string;
    };

export interface EntityDefinition {
  readonly singular: string;
  readonly plural: string;
  readonly nameLabel: string;
  readonly fields: readonly EntityField[];
}
