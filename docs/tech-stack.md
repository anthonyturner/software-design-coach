# Tech stack

What software-design-coach is built on. Keep it to a short list: the language, the
framework, the main libraries, where data lives, and how it is built and
deployed. Agents read this to avoid proposing a tool the project does not use,
so a missing line costs more than a long one.

- Node.js 24 (the Angular CLI needs 22.22.3+, 24.15+ or 26+) and strict
  TypeScript 6 — rules in [stack/typescript.md](stack/typescript.md)
- Angular 22, standalone components with signals and zoneless change detection
  ([mvp-plan.md](mvp-plan.md) §4); selector prefix `sdc`; conventions in
  [stack/angular.md](stack/angular.md) and
  [stack/ui-components.md](stack/ui-components.md), whose styling section this
  project adopts. Styling: SCSS with design tokens
  as CSS custom properties, BEM class names, our own small component set; no
  Bootstrap or other UI kit ([ADR-0006](decisions/0006-build-our-own-component-system.md)).
- Diagrams: the `mermaid` npm package, lazy-loaded behind an adapter
  ([ADR-0007](decisions/0007-bundle-mermaid-from-npm.md)).
- Data: browser `localStorage` only, behind a `ProjectRepository` port
  ([ADR-0008](decisions/0008-persist-projects-in-localstorage.md)). No
  backend, no external services, no AI provider calls in the MVP.
- Build: Angular CLI (`npm run build`), with an initial-bundle budget in
  `angular.json` that fails the build if Mermaid lands in the main bundle
  (ADR-0007). Both routes and the storage adapter load on demand, so the
  workflow content, which is most of the domain, stays out of the initial
  bundle. Tests: Vitest through `ng test` on jsdom (`npm test`). Lint:
  angular-eslint on ESLint (`npm run lint`), with import and global
  restrictions on `src/domain/` (ADR-0005). Not deployed in the MVP; it runs
  locally with `npm start`.
- Layers (ADR-0005): `src/domain` (plain TypeScript), `src/app` (Angular
  services and wiring), `src/infrastructure` (adapters) and `src/ui`
  (components). Design tokens live in `src/styles/_tokens.scss`.
- Commits: husky runs commitlint on every commit message
  (`.commitlintrc.json`); `.gitattributes` keeps the hook LF on Windows.
- CI: GitHub Actions (`.github/workflows/ci.yml`) runs `npm ci`, lint, test
  and build on every pull request and on pushes to `main`.
- Logging: no logger in the MVP. Errors surface in the UI, and
  console calls are banned by lint. Add a logger through an ADR when a slice
  needs one.
