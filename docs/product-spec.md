# Product specification — Software Design Coach

The Markdown copy of [the build specification](../design/Software_Design_Coach_Build_Spec.docx),
so agents and reviewers can read it without opening Word. The `.docx` is the
source; if the two disagree, update this copy to match it.

**Purpose:** an interactive design coach that guides a developer through
planning software projects and features before implementation, while teaching
the reasoning behind each design decision.

## 1. Product vision

A serious developer tool that acts as an interactive software-design mentor. It
helps the user think before coding, visualize architecture, challenge design
decisions, and produce an implementation-ready design package. It supports
iterative Agile development, not waterfall planning.

## 2. Core design philosophy

- **John Ousterhout:** complexity management, information hiding, deep modules,
  abstraction, dependencies, strategic programming, continuous design
  improvement.
- **Robert C. Martin:** responsibilities, dependency direction, SOLID,
  boundaries, maintainable architecture.
- **Martin Fowler:** tests as behavioral feedback and the Red → Green →
  Refactor loop.
- **Agile:** design enough to reduce uncertainty, implement a small slice,
  learn, refactor, continue.

Central principle: **don't plan every line. Plan the important decisions.**

## 3. Main workflows

**New project:** Problem → Users → Goals → Non-goals → Requirements → Use Cases
→ Domain Concepts → System Boundary → Modules → Responsibilities → Information
Hiding → Interfaces → Dependencies → Architecture Options → Decision → First
Vertical Slice → Tests → Implementation Plan → Design Review

**Feature / change:** Change → Why → Existing Behavior → Desired Behavior →
Affected Concepts → Current Ownership → Architecture Impact → Leakage/Coupling
Check → Alternatives → Recommended Design → Tests → Smallest Safe
Implementation → Refactoring → Review

## 4. Wizard experience

Each step explains why it matters, asks a small number of focused questions,
visualizes the result, challenges weak assumptions, then continues.

- A progress/navigation rail showing the design journey.
- One major question at a time; progressive disclosure instead of giant forms.
- Every step provides: **THINK, DECIDE, VISUALIZE, CHALLENGE, CONTINUE**.
- "Why am I being asked this?" and "Show me an example" are always available.
- Never automatically agree with the user's design.

## 5. Design questions the coach teaches

- What problem are we solving?
- What behavior must the system provide?
- What are the important domain concepts?
- What knowledge exists and who owns it?
- What complexity should each module hide?
- Is the module deep or shallow?
- Is information leaking across boundaries?
- Are responsibilities cohesive?
- Are dependencies intentional and in the correct direction?
- Are abstractions justified by real design needs?
- What are two reasonable alternative designs?
- What is the smallest vertical slice that can validate the design?
- How will important behavior be tested?
- What did implementation teach us?
- What should be refactored before the next feature?

## 6. Diagrams

Mermaid.js initially, generated dynamically as the design evolves: system
context, use case, domain model, module, dependency, sequence, data model,
architecture, first vertical slice.

Interactive where practical: clicking a module reveals its responsibilities,
owned knowledge, dependencies and related decisions.

## 7. Design alternatives — design it twice

For significant decisions, require at least two reasonable alternatives.
Compare complexity, information hiding, coupling, extensibility, initial
effort and expected future change. The user chooses or overrides the
recommendation.

## 8. Design critique

Heuristic design signals, **clearly labelled as guidance, not objective
scores**: complexity, information hiding, module depth, coupling, cohesion,
dependency direction, testability, change resilience.

Potential smells: duplicated knowledge, information leakage, shallow
abstraction, excessive indirection, unnecessary abstraction, high coupling, low
cohesion, UI containing domain logic, DTO leakage, god modules/services,
circular dependencies, premature generalization, unclear ownership, temporal
coupling.

## 9. ADRs and project memory

Automatically create Architecture Decision Records for important decisions.
Persist the project so the user can leave and return. When a decision changes,
identify downstream decisions that may be affected. Maintain a design-history
timeline.

## 10. Output — the Software Design Package

`problem.md`, `requirements.md`, `use-cases.md`, `domain-model.md`,
`system-context.md`, `module-design.md`, `architecture.md`, `dependencies.md`,
`api-design.md`, `data-model.md`, `test-strategy.md`, `vertical-slice.md`,
`architecture-decisions/`, `design-review.md`, `implementation-plan.md`.

Export as Markdown, JSON and Mermaid; copy to clipboard; print-friendly output.

## 11. AI role

The AI layer sits behind a provider abstraction so it can later support
OpenAI, Anthropic, local LLMs/Ollama, the Vercel AI SDK or other compatible
providers. The first version may use mock/local analysis when no AI key
exists. The AI challenges decisions, explains principles, suggests and
compares alternatives, identifies smells, generates diagrams and ADRs, reviews
implementation plans, and eventually compares a real codebase against the
planned architecture.

**The first version makes AI a design advisor, not an autonomous coder.**

## 12. MVP technology direction

Angular + strict TypeScript, SCSS, Bootstrap or a clean component system,
Mermaid.js (CDN or package), local persistence, no unnecessary backend or
infrastructure. The application itself is well designed and modular, so it can
serve as an example of the principles it teaches.

## 13. Visual direction

Professional developer-tool aesthetic: dark modern UI, subtle
grid/architecture feel, restrained accents, excellent typography and spacing,
readable diagrams, progressive disclosure, minimal clutter. Avoid a generic
SaaS-dashboard look, excessive gradients, meaningless metrics and childish
gamification.

## 14. MVP scope

New Project mode, Feature/Change mode, wizard navigation, step explanations,
persistent project state, design notes, Mermaid diagrams, design summary,
Markdown export, local persistence.

## 15. Future expansion

AI design review, codebase import, GitHub integration, automatic UML/code
architecture generation, code-to-design comparison, architecture drift
detection, ADR management, design lessons, interactive examples, code smells,
refactoring guidance, team collaboration, version history, AI-powered
architecture review.

## 16. Development rule

Build iteratively. Do not implement the entire vision at once. Build the MVP,
validate the workflow, then expand. The product follows the same
strategic-design principles it teaches.

## 17. Reference material

- John Ousterhout, *A Philosophy of Software Design* / Stanford lectures:
  <https://web.stanford.edu/~ouster/cs190-winter24/lectures/aposd/>
- John Ousterhout, CS190: <https://web.stanford.edu/~ouster/cs190-winter24/>
- Martin Fowler, Test-Driven Development:
  <https://martinfowler.com/bliki/TestDrivenDevelopment.html>
