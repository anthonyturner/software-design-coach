# ADR-0006: Build our own small component system instead of Bootstrap

- **Status:** Accepted
- **Date:** 2026-10-08
- **Deciders:** Anthony Turner (maintainer), answering open question 1 of the MVP plan
- **Related:** [mvp-plan.md](../mvp-plan.md) §4, [product-spec.md](../product-spec.md) §12–13, [stack/ui-components.md](../stack/ui-components.md), issue [#3](https://github.com/anthonyturner/software-design-coach/issues/3)

## Context

Spec §12 leaves the choice open: "Bootstrap or a clean component system".
Spec §13 then sets the look: a professional developer-tool aesthetic, dark,
with a subtle grid feel, restrained accents and strong typography, and it
explicitly rules out a generic SaaS-dashboard look.

The MVP's UI needs are small and known: a journey rail, three panels (step,
visualize, notes), form controls including an editable entity table, tabs, a
disclosure ("why am I asked?"), a details drawer and buttons. There is no data
grid, date picker or complex overlay.

## Decision

We will build **our own small component system**: SCSS with design tokens
(colour, spacing, type scale, radius, elevation) as CSS custom properties, BEM
class names, and a handful of standalone Angular components for the controls
above. The dark theme is the default. No Bootstrap, and no other UI kit.

## Alternatives considered

- **Bootstrap with a custom dark theme.** Fastest route to accessible forms,
  a grid and utilities, and widely known. Rejected: its defaults are the
  generic look spec §13 rules out, and overriding them enough to escape it
  means fighting the framework's variables and specificity in every component.
  We would ship roughly 30 KB of CSS for a few controls.
- **Angular Material or the Angular CDK's styled components.** Strong
  accessibility and real Angular integration. Rejected for the look: Material
  Design is as recognisable as Bootstrap, and theming it towards a
  developer-tool feel is heavy. (The unstyled CDK behaviours remain an option
  for a hard widget later, as a separate dependency decision under
  [rule 6](../rules.md).)
- **A utility-first framework such as Tailwind.** Flexible enough for any
  look. Rejected: it moves design decisions into every template's class list
  rather than one set of tokens, adds a build step and a new dependency, and
  BEM plus tokens is already the stack's convention.

## Consequences

- **Easier.** The look is ours by construction; changing it means changing
  tokens, not overriding a framework. No UI-kit dependency to upgrade. The
  stylesheet stays small.
- **Harder, and what it costs.**
  - We own accessibility for every control: focus order, keyboard handling,
    ARIA on the drawer, tabs and disclosure. A UI kit would have given much of
    that for free, so each component needs its own keyboard and screen-reader
    check.
  - Building the controls costs time in slices 0–2 that Bootstrap would have
    saved.
  - No ready layout grid or utilities; we write the few layout rules we need.
  - Contributors cannot lean on Bootstrap knowledge.
- **What now has to be true.** Colours, spacing and type come from tokens, not
  literals in component styles. A control is built once as a shared component
  and reused ([stack/ui-components.md](../stack/ui-components.md)).

## Compliance

In review: a hard-coded colour or spacing value in a component style, a second
implementation of an existing control, or a new UI library in `package.json`
is a finding. A new control is accepted only with a keyboard check reported in
its pull request.
