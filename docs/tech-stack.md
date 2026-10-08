# Tech stack

What software-design-coach is built on. Keep it to a short list: the language, the
framework, the main libraries, where data lives, and how it is built and
deployed. Agents read this to avoid proposing a tool the project does not use,
so a missing line costs more than a long one.

- Node.js and strict TypeScript — rules in [stack/typescript.md](stack/typescript.md)
- Angular — conventions in [stack/angular.md](stack/angular.md) and
  [stack/ui-components.md](stack/ui-components.md)
- Angular, standalone components with signals and zoneless change detection
  (planned — [mvp-plan.md](mvp-plan.md) §4). Styling: SCSS with design tokens
  as CSS custom properties, BEM class names, our own small component set; no
  Bootstrap unless the plan review decides otherwise.
- Diagrams: the `mermaid` npm package, lazy-loaded behind an adapter.
- Data: browser `localStorage` only, behind a `ProjectRepository` port. No
  backend, no external services, no AI provider calls in the MVP.
- Build: Angular CLI. Tests: Vitest. Lint: angular-eslint. Not deployed in the
  MVP; it runs locally with `ng serve`.
- CI: GitHub Actions running install, lint, test and build on every pull
  request (planned in the scaffold slice; none exists yet).

Status: the repository has no application code yet. Until the scaffold slice
merges, the commands in [AGENTS.md](../AGENTS.md) do not run.
