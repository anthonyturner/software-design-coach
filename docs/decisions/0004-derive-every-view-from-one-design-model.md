# ADR-0004: Derive every view from one structured design model

- **Status:** Accepted
- **Date:** 2026-10-08
- **Deciders:** Anthony Turner (maintainer), on accepting the MVP plan
- **Related:** [mvp-plan.md](../mvp-plan.md) §2, [rule 18](../rules.md), issue [#3](https://github.com/anthonyturner/software-design-coach/issues/3), [ADR-0005](0005-layer-the-app-with-two-ports.md), [ADR-0008](0008-persist-projects-in-localstorage.md)

## Context

The coach walks a developer through up to 19 steps and then shows the result
back in several forms: the MVP's six Mermaid diagrams (system context, use
case, domain model, module, dependency, first slice — of the nine kinds in
[product-spec.md](../product-spec.md) §6), a design summary, and a Markdown
design package (up to fifteen files, §10). Later it also has to critique the design — find dependency cycles,
shallow modules, knowledge with no owner (§8).

None of that is possible from free text. A module diagram needs to know what
the modules are and what each depends on. A cycle check needs edges. If the
wizard stored only prose answers, each view would have to parse prose, or keep
its own structured copy that the user edits separately — and two copies of one
design drift apart the first time an earlier answer changes.

## Decision

We will store a design project as **one structured model**: typed answers per
step (short text, long text, string list, choice) plus **entity lists** —
actors, use cases, domain concepts, external systems, and modules with their
responsibilities, hidden knowledge and dependencies.

Every other view — each diagram, the summary, every file in the Markdown
package, and later the critique and any AI prompt — is a **pure function** of
that model. Views hold no state of their own and are never edited directly.

## Alternatives considered

- **Free-text answers, with views parsing the text.** The simplest wizard to
  build. Rejected: parsing "Pricing depends on Catalog and Tax" back into edges
  is unreliable, every view would reimplement it, and the coach could never
  point at a specific module in a critique.
- **Free text in the wizard, plus a separate diagram editor that owns the
  structure.** Lets users draw what they mean. Rejected: it creates two sources
  of truth for one design. The module named in step 9 and the box drawn in the
  editor are different records, and keeping them in step is exactly the
  duplicated-knowledge smell the product teaches against.
- **Store the generated output (Mermaid text, Markdown) and let users edit
  it.** Rejected: edited output can no longer be regenerated when an earlier
  answer changes, so downstream-impact tracking (spec §9) becomes impossible.

## Consequences

- **Easier.** A new view is one new pure function with plain-string tests and
  no state to sync. Diagrams can never disagree with the answers. Critique and
  AI prompts later read the same model, so they need no new storage.
- **Harder, and what it costs.**
  - The step format is heavier: every question declares an answer kind, and
    entity lists need a real editing UI (add, rename and remove rows, pick
    dependencies) rather than a text box. Slices 2a and 2b carry most of that cost.
  - Some answers resist structure. Whatever the model does not capture
    (nuance, caveats) can only appear in the views as quoted prose.
  - Users cannot hand-tune a generated diagram. If Mermaid's layout is poor,
    the only levers are the model and the generator.
  - The model's shape is persisted, so changing it later needs a schema
    migration ([ADR-0008](0008-persist-projects-in-localstorage.md)).
- **What now has to be true.** The model has exactly one writer, the
  `ProjectStore`. A view function takes the model and returns a value; it
  never mutates it and keeps no copy of it or of its own output between
  calls; any caching is Angular's `computed()` at the call site. References between
  entities (a module's dependencies) point at ids, not names, so a rename does
  not break them.

## Compliance

In review: diagram, summary or export code that reads from anywhere other than
the project model, keeps state of its own, or lets the user edit its output is
a finding. Diagram and package generators have unit tests that assert on the
text they produce from a model built in the test.
