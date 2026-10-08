# ADR-0005: Layer the app inward, with exactly two ports

- **Status:** Accepted
- **Date:** 2026-10-08
- **Deciders:** Anthony Turner (maintainer), on accepting the MVP plan
- **Related:** [mvp-plan.md](../mvp-plan.md) §3, [design-principles.md](../design-principles.md) §4, [rule 16](../rules.md), issue [#3](https://github.com/anthonyturner/software-design-coach/issues/3), [ADR-0004](0004-derive-every-view-from-one-design-model.md)

## Context

The product teaches deep modules, information hiding and dependency direction,
and spec §12 asks that the app itself be an example of them. Its own code is
the first design a user may read.

Two of its dependencies are known to be volatile or foreign: storage (local
now, possibly IndexedDB or sync later — spec §15) and Mermaid (a large,
browser-only library). The core logic — the model, the workflows, generating
diagram text and Markdown — needs neither, and it is where test-first
development ([rule 17](../rules.md)) pays off most, provided it runs without a
browser.

The opposite risk is real too: an Angular app can grow an interface and an
injection token for every service "in case", adding layers that hide nothing
([rule 9](../rules.md)).

## Decision

We will organise the code in four layers, with dependencies pointing inward
only:

- `domain/` — plain TypeScript: the project model, workflow definitions,
  model → Mermaid text, model → Markdown. No Angular, DOM, `localStorage`,
  Mermaid or network imports.
- `app/` — Angular services. `ProjectStore` (signals, autosave, schema
  migration on load) is the only writer of project state.
- `infrastructure/` — adapters for the outside world.
- `ui/` — components.

There are **exactly two ports** (interfaces an inner layer declares and an
adapter implements):

- `ProjectRepository` — `list`, `load`, `save`, `remove`, implemented by the
  `localStorage` adapter.
- `DiagramRenderer` — `render(source, host)`, implemented by the Mermaid
  adapter.

Both interfaces are declared in `app/`, the layer that uses them, never in
`infrastructure/`; `ProjectRepository`'s signatures use only domain types.
`DiagramRenderer` takes a DOM host, so it cannot live in `domain/`. Note that
`domain/` does own Mermaid **syntax** — it produces Mermaid text as plain
strings. What it must not import is the Mermaid **library**, which is what
[rule 16](../rules.md) forbids.

Everything else is called directly. A new port needs something real that
varies behind it. The AI advisor port arrives with the post-MVP slice that
first needs it, not before.

## Alternatives considered

- **Conventional Angular feature folders** (`features/wizard`,
  `features/export`, each with its own services and components). Familiar, and
  less ceremony. Rejected: domain rules drift into components and services that
  need Angular's test bed to test, and nothing stops a component reaching into
  storage. The product could no longer point at its own code as an example.
- **Full hexagonal or clean architecture** — a port for every external call,
  a use-case class per action, mapping objects at each boundary. Rejected as
  classitis for an app this size: most of those interfaces would have one
  implementation and one caller, and cost more to read than they hide.
- **No ports: call `localStorage` and Mermaid directly from services.**
  Simplest today. Rejected because these are the two parts most likely to
  change, and a direct Mermaid dependency would pull a DOM into every diagram
  test.

## Consequences

- **Easier.** Domain logic is tested as plain functions in milliseconds, with
  no browser. Swapping storage is one new adapter. The layer rule is simple
  enough to check mechanically.
- **Harder, and what it costs.**
  - Four top-level folders and an import rule for a small app. A newcomer has
    to learn where things go before adding anything.
  - Some code has a plausible home in two layers (is "which step comes next" a
    domain rule or store state?). Each such call has to be made and defended.
  - A port is a contract: changing `ProjectRepository` means changing every
    adapter and test double with it.
  - Refusing ports "in case" means the next volatile dependency (an AI
    provider) arrives as a refactor in its own slice, not as a drop-in.
- **What now has to be true.** `domain/` imports nothing from the other three
  layers, Angular, the browser, storage or Mermaid. Only `ProjectStore` writes
  project state. Components reach storage and Mermaid only through a port.

## Compliance

Review checks the imports in `domain/`; a framework or platform import there is
a blocking finding ([rule 16](../rules.md)). An ESLint import restriction on
`domain/` should make that fail lint rather than rely on review. A new
interface with one implementation and no second reason to vary is a finding.
