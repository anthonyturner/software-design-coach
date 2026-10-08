# Changelog

All notable changes to software-design-coach are recorded in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
How to add an entry: [docs/changelog.md](docs/changelog.md).

## [Unreleased]

### Added

- Choose Feature / Change when you create a project, to design a change to a system that already exists. Its fourteen steps, Change to Review, start from what the system does and who owns it today, then check for leaked knowledge and coupling, ask for two alternatives before recommending one, and plan the smallest safe slice and the refactoring that goes with it. Each step has guidance, an example and challenges, and shows the diagram that fits it. New Project is still the default, and projects saved before this change still open. The app also loads faster, since the project list and wizard now load on demand ([#24](https://github.com/anthonyturner/software-design-coach/pull/24)).
- Click a module in the Modules or Dependencies diagram, or Tab to it and press Enter or Space, to open a read-only drawer with its purpose, responsibilities, what it hides, its interface sketch, and the modules it depends on and is needed by. Escape or Close puts you back on the module you came from ([#23](https://github.com/anthonyturner/software-design-coach/pull/23)).
- See your design drawn as you answer: a Visualize panel beside the step shows a system context, use case, domain model, module, dependency or first-slice diagram, redrawn from your answers as you type, in the dark theme, with its source available as text. A step with nothing to draw yet says what to name to make the diagram appear ([#21](https://github.com/anthonyturner/software-design-coach/pull/21)).
- Finish the nineteen-step New Project workflow: Responsibilities, Information Hiding, Interfaces, Dependencies, Architecture Options, Decision, First Vertical Slice, Tests, Implementation Plan and Design Review, each with guidance, an example and challenges. Every module now records its responsibilities, what it hides, an interface sketch and the modules it depends on, edited one detail at a time across all your modules. Write down at least two architecture options, then choose one. Projects saved before this change still open ([#20](https://github.com/anthonyturner/software-design-coach/pull/20)).
- Work through nine design steps, Problem to Modules, with a journey rail to see your progress and jump to any step. List your actors, use cases, domain concepts, external systems and modules as rows you can add, rename, reorder and remove, with use cases linked to the actors who perform them. Every step explains why it is asked and shows an example on request. Projects saved before this change still open, with the roles and the needs text you wrote under Users carried over to actors ([#19](https://github.com/anthonyturner/software-design-coach/pull/19)).
- Create a New Project, work through its Problem, Users and Goals steps with guidance and an example for each, and pick up where you left off after reloading the page. Projects are saved in your browser ([#17](https://github.com/anthonyturner/software-design-coach/pull/17)).
- A dark Design Coach app shell you can run locally with `npm start`, built on Angular with a shared set of design tokens ([#15](https://github.com/anthonyturner/software-design-coach/pull/15)).
