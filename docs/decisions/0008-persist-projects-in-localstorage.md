# ADR-0008: Persist projects in localStorage, with a schema version

- **Status:** Accepted
- **Date:** 2026-10-08
- **Deciders:** Anthony Turner (maintainer), on accepting the MVP plan
- **Related:** [mvp-plan.md](../mvp-plan.md) §4, [product-spec.md](../product-spec.md) §12, [rule 21](../rules.md), issue [#3](https://github.com/anthonyturner/software-design-coach/issues/3), [ADR-0004](0004-derive-every-view-from-one-design-model.md), [ADR-0005](0005-layer-the-app-with-two-ports.md)

## Context

The MVP must keep a user's projects between visits (spec §14) with no backend
(§12, [rule 21](../rules.md)). A design project is text: answers, entity
lists and notes, typically tens of KB and unlikely to pass a few hundred. The
model's shape ([ADR-0004](0004-derive-every-view-from-one-design-model.md))
will change as slices add steps and entity kinds, so data saved by an older
build must still open in a newer one.

## Decision

We will store projects in the browser's **`localStorage`**: one key per
project holding its JSON, plus an index key listing the projects, each carrying
a **schema version**. The adapter behind the `ProjectRepository` port owns the
key names and serialisation. `ProjectStore` runs migrations from older schema
versions when a project is loaded, and autosaves after changes.

## Alternatives considered

- **IndexedDB.** Much larger quota, asynchronous, can store blobs. Rejected for
  the MVP: an asynchronous, transactional API adds complexity for data far
  below `localStorage`'s limit. It stays the obvious next adapter if projects
  grow (attachments, history timeline).
- **File-based: the user saves and opens a JSON file.** The user owns the file
  and can version it in git. Rejected as the primary store: it adds a save
  ritual and loses work on a forgotten save, while autosave is what makes the
  wizard feel safe. JSON export (post-MVP) covers the portability need.
- **A backend or hosted sync.** Cross-device, durable. Rejected: spec §12 and
  [rule 21](../rules.md) exclude it from the MVP; it would need its own ADR.

## Consequences

- **Easier.** Synchronous reads keep loading and autosave simple. No server, no
  account, nothing to deploy. Swapping to IndexedDB later is one adapter behind
  the existing port.
- **Harder, and what it costs.**
  - Data lives in one browser profile on one machine. Clearing site data,
    a private window, or another browser loses or hides it, and the app cannot
    prevent that. Users must be told, and export is their only backup.
  - About 5 MB per origin. A save can fail with a quota error, which the store
    must surface rather than swallow.
  - Every model change needs a migration function and a test that loads data
    in the previous shape. Forgetting one silently corrupts or drops old
    projects.
  - Writes block the main thread; fine at this size, a problem if projects
    grow large.
  - Two tabs editing the same project overwrite each other (last write wins).
- **What now has to be true.** Only the storage adapter touches
  `localStorage`. Every saved project carries a schema version. A change to the
  persisted shape bumps the version and ships with a migration and its test.

## Compliance

In review: `localStorage` referenced outside the storage adapter, or a change
to the persisted model without a version bump, migration and test, is a
finding. The repository has a round-trip test through the real adapter.
