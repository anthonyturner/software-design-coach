import type { EntityEdit } from '../domain';

/** What the user did to a list of rows. The list reports it; whoever owns the project applies it. */
export type EntityChange =
  | { readonly type: 'add' }
  | { readonly type: 'edit'; readonly id: string; readonly edit: EntityEdit }
  | { readonly type: 'move'; readonly id: string; readonly offset: number }
  | { readonly type: 'remove'; readonly id: string };
