# Design principles

Read this before you design or change any code. The goal is less complexity,
not just working code. Based on John Ousterhout's *A Philosophy of Software
Design*, with Robert C. Martin on boundaries and dependency direction
(section 4) and Martin Fowler on test-driven development (section 5) — the
same three sources the product itself teaches
([product-spec.md](product-spec.md) §2).

## 1. Program strategically, never tactically

This rule outranks the rest of this file.

- **Tactical** means the smallest diff that makes it work: a special case, a
  shortcut, a reach into another module's internals, a "clean it up later".
  Each one looks harmless. Hundreds of them make spaghetti, and no single fix
  can undo it. **Do not program this way.**
- **Strategic** means working code is the minimum, not the goal. The goal is a
  design that keeps the next change cheap. Spend a little more time now
  (roughly 10–20%) to get it.

On every change:

1. Aim for the code you would have written if you had built the system from
   scratch, knowing what you know now. Get as close as the change allows.
2. Leave the code you touch better than you found it. A change usually makes
   something a little worse, so you have to improve something just to break
   even.
3. Pick the clean interface over the fewest changed lines. Fear of breaking
   something is a reason to write a test, not to hack around the code.
4. Allow zero small kludges. Each one is how the slide into tactical
   programming starts.
5. Take small steps, not heroics. Design the interface before you code a new
   module, then improve it as you learn.

When the clean fix is bigger than the issue, do the clean part that is in
scope. File the rest as a follow-up issue and name it in the pull request.
Never leave a hack in silently.

## 2. Make modules deep

- A deep module has a simple interface over a lot of hidden work. Its
  interface is everything a caller must know: signatures, side effects,
  ordering and dependencies.
- Avoid shallow modules: pass-through methods and thin wrappers that cost more
  to learn than they hide.
- Avoid *classitis*: many tiny classes or layers that each add a sliver.
  Prefer fewer, meatier ones.
- Measure depth, not length. Never split a function just because it is long.
  Split it when the pieces are each simpler to understand.
- Make the common case trivial for the caller. Rare cases take options.
- A slightly general-purpose interface is often simpler and deeper than one
  shaped around its single caller.

## 3. Define errors out of existence

- Prefer semantics in which the error cannot happen. Deleting something that
  is already gone succeeds. An out-of-range slice returns the overlap.
- Throw only when you truly cannot keep the contract, such as a failed read.
  Throwing more is not "more defensive".
- Handle each error in as few places as possible. Let it travel to where it
  can actually be dealt with, not be caught and re-thrown at every layer.
- Defining an error away is not ignoring it. Never swallow an error that
  matters.

## 4. Own each piece of knowledge once, and point dependencies inward

From Robert C. Martin, applied through the lens above.

- **Every piece of knowledge has exactly one owner.** If two modules both know
  a format, a rule or a sequence, that is duplicated knowledge, and the next
  change has to find both. Move it to one place.
- **Dependencies point toward policy, never toward detail.** In this app the
  domain (`domain/`) depends on nothing; Angular services depend on the
  domain; components depend on services and the domain; adapters implement
  ports the inner layers declare. The domain never imports Angular, the
  browser, `localStorage` or Mermaid.
- **A boundary is a port only when something real varies behind it** — storage,
  a foreign library, an AI provider. Otherwise call the code directly.
- **Responsibilities are cohesive.** A module changes for one kind of reason.
  "UI containing domain logic" and "god service" are both findings.

## 5. Let tests drive behavior: Red → Green → Refactor

From Martin Fowler's description of test-driven development.

1. **Red** — write a test for the next small behavior and watch it fail for
   the right reason.
2. **Green** — write the simplest code that passes.
3. **Refactor** — now improve the design, tests still green. This step is not
   optional; skipping it is tactical programming.

Domain logic (the project model, workflows, diagram and package generation) is
built this way, always. Components get behavioral tests, not snapshots. Test
behavior through the public interface, never private details, so a refactor
does not break the tests.

## 6. Practise what the product teaches

This app teaches deep modules, information hiding, design-it-twice and small
vertical slices. Its own code is the first example a user may read. A change
that would be a smell if the coach saw it in a user's design is a finding here
too. Significant decisions get two real alternatives in the issue or the ADR
before one is chosen.

## Red flags

If you see one of these in your diff, stop and redesign:

- a special-case `if` added to make one scenario work;
- a reach into another module's internals or global state to avoid
  designing an interface;
- a method that only forwards to another method;
- a function split up for length alone;
- a `catch` that discards the error;
- a "TODO: clean up later" with no follow-up issue;
- an import of Angular, the DOM, storage or Mermaid inside `domain/`;
- domain logic (deriving, validating, deciding) inside a component or template;
- coaching content (step text, questions, examples) hard-coded in markup;
- production code with no failing test written before it, in `domain/`.

## How this fits the rules

- Improve only the code your change touches. Leave unrelated files alone
  ([rule 7](rules.md)).
- "Deep" is not "more abstract". Never add a layer or interface that hides
  nothing ([rule 9](rules.md)).
- In review, a tactical shortcut is a finding, with the same weight as a bug.
