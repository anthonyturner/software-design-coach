# ADR-0007: Bundle Mermaid from npm, lazy-loaded, instead of the CDN script

- **Status:** Accepted
- **Date:** 2026-10-08
- **Deciders:** Anthony Turner (maintainer), on accepting the MVP plan
- **Related:** [mvp-plan.md](../mvp-plan.md) §4, [product-spec.md](../product-spec.md) §6, §12, issue [#3](https://github.com/anthonyturner/software-design-coach/issues/3), [ADR-0005](0005-layer-the-app-with-two-ports.md)

## Context

Spec §6 makes Mermaid the diagram engine, and §12 allows it from "CDN or
package". Mermaid is large (hundreds of KB minified, more with its diagram
types) and needs a browser. The app has no backend and promises to keep a
design local; a user may open it offline. Diagrams appear in the VISUALIZE
panel, not on the project list, so Mermaid is not needed for the first screen.

## Decision

We will depend on the **`mermaid` npm package**, pinned in the lockfile, and
load it with a dynamic `import()` inside the `DiagramRenderer` adapter the
first time a diagram is rendered. Nothing outside that adapter imports
Mermaid.

## Alternatives considered

- **A `<script>` tag from a CDN** (jsDelivr or unpkg). No install and no bundle
  cost, and the agent workflow's own diagram page already does this. Rejected
  for the app: an unpinned URL can change behaviour under us; a pinned one
  still bypasses the lockfile, dependency updates and the type checker; the app
  breaks offline or behind a firewall; and every user's browser calls a third
  party, which sits badly with "your design stays local".
- **The npm package, imported eagerly.** Simplest code. Rejected: it puts
  Mermaid in the main bundle and delays the first paint of screens that draw
  no diagram.
- **Render diagrams ourselves (SVG from the model) or use another library.**
  Rejected: the spec names Mermaid, and its text format is also what the
  Markdown export embeds, so one format serves both.

## Consequences

- **Easier.** The version is pinned and updated through the normal dependency
  process, with types. Works offline. First paint stays light.
- **Harder, and what it costs.**
  - The bundle grows by Mermaid's size in a lazy chunk, and the first diagram
    waits for that chunk to load; the panel needs a loading state.
  - Mermaid upgrades are ours to test, including breaking changes to its
    syntax or API.
  - Mermaid touches the DOM, so the adapter is tested in a browser-like
    environment, not as a plain function. The diagram text it receives is still
    tested as plain strings in `domain/`.
- **What now has to be true.** Only the Mermaid adapter imports `mermaid`, and
  only dynamically. The domain produces Mermaid text without importing
  Mermaid.

## Compliance

In review: a static `import ... from 'mermaid'`, an import of it outside the
adapter, or a Mermaid `<script>` tag in `index.html` is a finding. The build
output should show Mermaid in a lazy chunk, not in the main bundle.
