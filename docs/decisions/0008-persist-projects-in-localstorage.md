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
project holding its JSON, plus one index key listing the projects. Every
stored project's JSON carries a **`schemaVersion`** field. The adapter behind
the `ProjectRepository` port owns the key names and serialisation.
`ProjectStore` runs migrations from older schema versions when a project is
loaded, and autosaves after changes.

The **`ProjectRepository` port is promise-based** (`list`, `load`, `save` and
`remove` each return a `Promise`), even though `localStorage` is synchronous.
The `localStorage` adapter resolves immediately. This keeps the port honest for
the asynchronous storage that would replace it.

## Alternatives considered

- **IndexedDB.** Much larger quota, asynchronous, can store blobs. Rejected for
  the MVP: a transactional API adds complexity for data far below
  `localStorage`'s limit. It stays the obvious next adapter if projects grow
  (attachments, history timeline), and the promise-based port lets it slot in
  without changing callers.
- **File-based: the user saves and opens a JSON file.** The user owns the file
  and can version it in git. Rejected as the primary store: it adds a save
  ritual and loses work on a forgotten save, while autosave is what makes the
  wizard feel safe.
- **A backend or hosted sync.** Cross-device, durable. Rejected: spec §12 and
  [rule 21](../rules.md) exclude it from the MVP; it would need its own ADR.

## Consequences

- **Easier.** No server, no account, nothing to deploy. The adapter is a few
  dozen lines. Swapping to IndexedDB later is one new adapter, with no change
  to the port or its callers.
- **Harder, and what it costs.**
  - The port is asynchronous although today's storage is not, so loading and
    saving are `async` in the store and its tests from the start.
  - Data lives in one browser profile, on one machine, for one origin (scheme,
    host and port). Clearing site data, a private window, another browser — or
    `ng serve` starting on a different port because 4200 is busy — loses or
    hides every project, and the app cannot prevent that.
  - **The MVP has no restorable backup.** Its export is Markdown only, with no
    import; JSON export and import are post-MVP. Users must be told their work
    lives in this browser.
  - About 5 MB per origin. A save can fail with a quota error, which the store
    must surface rather than swallow.
  - A project and the index are two separate writes, so a failure between them
    can leave them out of step. The adapter must write the project first and
    tolerate an index entry with no project, or a project missing from the
    index, when listing.
  - Every model change needs a migration function and a test that loads data
    in the previous shape. Forgetting one silently corrupts or drops old
    projects.
  - Two tabs editing the same project overwrite each other (last write wins).
- **What now has to be true.** Only the storage adapter touches
  `localStorage`. Every saved project carries a `schemaVersion`. A change to
  the persisted shape bumps the version and ships with a migration and its
  test.

## Compliance

In review: `localStorage` referenced outside the storage adapter, a
synchronous method on `ProjectRepository`, or a change to the persisted model
without a version bump, migration and test, is a finding. The repository has a
round-trip test through the real adapter.
