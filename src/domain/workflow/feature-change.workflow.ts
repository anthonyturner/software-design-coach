import type { Workflow } from './workflow.types';

export const featureChangeWorkflow: Workflow = {
  mode: 'feature-change',
  title: 'Feature / Change',
  summary:
    'Design a change to a system that already exists: start from what it does and who owns it today, ' +
    'and shape the code before you bolt anything on.',
  steps: [
    {
      id: 'change',
      title: 'Change',
      think: 'State the change as something someone could check, not as code you are about to write.',
      why:
        'A change described as code ("add a column", "call the new endpoint") hides the intent, and with it ' +
        'every chance to find a simpler way to get the same result. John Ousterhout warns that complexity ' +
        'arrives as a thousand small changes, each reasonable alone, so the habit that matters is to describe ' +
        'what will be different for the people and systems that use the software before choosing how. Name the ' +
        'kind of change too, because it decides how careful you must be: a restructuring promises that ' +
        'behaviour stays the same, a new feature promises that something new exists, and mixing the two in ' +
        'one change is how regressions get in.',
      questions: [
        {
          id: 'change',
          prompt: 'What is changing, in a sentence or two, described by what a user or another system will see?',
          kind: 'long-text',
          hint: 'The outcome, not the implementation. No table, class or screen names yet.',
        },
        {
          id: 'kind',
          prompt: 'What kind of change is it?',
          kind: 'choice',
          options: [
            { value: 'new', label: 'New: something the system cannot do today' },
            { value: 'altered', label: 'Altered: something it does, done differently' },
            { value: 'removal', label: 'Removal: something it does that it should stop doing' },
            { value: 'fix', label: 'Fix: it should already behave this way and does not' },
            { value: 'restructure', label: 'Restructure: behaviour stays, the design changes' },
          ],
        },
        {
          id: 'trigger',
          prompt: 'What prompted it: a request, an incident, a pain you keep hitting in the code?',
          kind: 'short-text',
          optional: true,
        },
      ],
      example:
        'Change: a patient can cancel an appointment by replying CANCEL to the reminder text, and the front ' +
        'desk sees the slot come free.\n\n' +
        'Kind: new. The system cannot cancel anything from a text today.\n\n' +
        'Prompted by: the desk spends part of every morning ringing patients who already told them, by phone, ' +
        'that they cannot come.',
      challenges: [
        'Does your sentence name a table, a class or a screen? That is the how. Rewrite it as what someone will see change.',
        'Could it be said as two changes joined by "and"? Two changes want two designs, and the smaller may ship first.',
        'Is it called a fix, but the system was never built to do this? Then it is a new feature and needs a design, not a patch.',
        'Who asked for it, and who will notice if you do not do it? If you cannot name anyone, say so out loud.',
        'You chose a kind. Does the change stay inside it? A restructuring that also adds behaviour is two changes in one.',
      ],
    },
    {
      id: 'why',
      title: 'Why',
      think: 'What is the change worth, and what happens if you leave things as they are?',
      why:
        'Every change adds something to the code, and Ousterhout counts what it adds against you: each new ' +
        'dependency and each piece of knowledge a reader must hold is complexity that stays after the feature ' +
        'ships. So a change has to buy more than it costs, and the only way to know is to say what it buys, ' +
        'for whom, and what it costs to do nothing. Agile design asks for the smallest change that delivers ' +
        'the value, so look for the part of the value that arrives first and ask whether that part could ' +
        'ship alone. A change you cannot justify in plain words is one you cannot safely cut down either.',
      questions: [
        {
          id: 'value',
          prompt: 'Who benefits, and what can they do or avoid because of it?',
          kind: 'long-text',
          hint: 'Name a person or a system, and say what gets better for them.',
        },
        {
          id: 'nothing',
          prompt: 'What happens if you do not make this change, and how soon would anyone notice?',
          kind: 'long-text',
        },
        {
          id: 'smaller',
          prompt: 'Is there a smaller change that delivers most of the value? What would you leave out?',
          kind: 'long-text',
          optional: true,
        },
      ],
      example:
        'Value: the desk stops ringing patients who have already cancelled, and freed slots reach the waiting ' +
        'list the same day. About an hour of desk time a day, and fewer empty chairs.\n\n' +
        'If we do nothing: the calls carry on. Nobody is hurt, but the desk keeps spending the hour, so this is ' +
        'worth doing and not urgent.\n\n' +
        'Smaller: record the CANCEL reply and show it to the desk, without freeing the slot automatically. ' +
        'Most of the value for much less risk, so it is the first thing to ship.',
      challenges: [
        'If the honest answer to "what if we do nothing?" is "not much", should this be done now? Say why it beats the rest of the list.',
        'Is the value for a real person you can name, or for the code ("it will be cleaner")? A cleanup is a fine reason, but then it is a restructuring and should say so.',
        'Which part of the value arrives first? Could you ship only that part, and would anyone mind waiting for the rest?',
        'You will own this after it ships. What does it cost to keep: tests, documentation, the next person to learn it?',
        'Is the smaller change really too small, or are you attached to the bigger design? Try to argue for the smaller one.',
      ],
    },
    {
      id: 'existing-behavior',
      title: 'Existing Behavior',
      diagram: 'use-case',
      think: 'Before you change it, write down what the system really does today, including what people rely on.',
      why:
        'You cannot change safely what you have only half described. The code is the truth about existing ' +
        'behaviour, not the documentation and not your memory of it, and the behaviour includes the accidents ' +
        'that somebody has come to depend on. Robert C. Martin\'s advice is to treat the running system as the ' +
        'specification until a test says otherwise, and Martin Fowler\'s is to pin existing behaviour with ' +
        'tests before you reshape anything, because a refactoring is a promise that behaviour does not change ' +
        'and you cannot keep a promise you have not measured. Describe the behaviour first; where it lives ' +
        'comes in a later step.',
      questions: [
        {
          id: 'today',
          prompt: 'What does the system do today in the area this change touches? Walk through it as a user or caller would see it.',
          kind: 'long-text',
          hint: 'What happens, in order, from the trigger to the visible result. Read the code or run it; do not trust memory.',
        },
        {
          id: 'actors',
          prompt: 'Who or what relies on this behaviour today?',
          kind: 'entity-list',
          entity: 'actor',
          fields: ['needs'],
          hint: 'People, and also the jobs, exports and other systems that call it.',
        },
        {
          id: 'keep',
          prompt: 'What must keep working exactly as it does now?',
          kind: 'string-list',
          hint: 'One per line, each something you could check, including the odd behaviours people have come to rely on.',
        },
        {
          id: 'surprises',
          prompt: 'What is surprising, undocumented or fragile about it today?',
          kind: 'long-text',
          optional: true,
        },
      ],
      example:
        'Today: 24 hours before an appointment the system texts the patient a reminder. A reply of "yes" marks ' +
        'the appointment confirmed. Any other reply is dropped, and the desk never sees it.\n\n' +
        'Relied on by: the patient, who wants to know their slot is safe; the receptionist, who reads tomorrow\'s ' +
        'confirmed and unconfirmed list each morning.\n\n' +
        'Keep: no reminder is sent without consent. A "yes" still confirms. A failed send is retried once.\n\n' +
        'Surprising: "Yes." with a full stop is not recognised, and the desk may have learned to phone those patients.',
      challenges: [
        'Did you read the code or run it, or are you describing it from memory? Memory is where regressions come from.',
        'Which behaviour looks like a bug but might be relied on? Find out who depends on it before you "fix" it.',
        'Would a test fail if you broke each line of your keep list? Any line without one is not protected yet.',
        'Who else calls this beyond the people you listed: a nightly job, an export, another team? Look at the callers, not the docs.',
        'Are you describing what the modules are (the design) instead of what happens (the behaviour)? Ownership comes in a later step.',
      ],
    },
    {
      id: 'desired-behavior',
      title: 'Desired Behavior',
      diagram: 'use-case',
      think: 'Say what is different afterwards, one behaviour you could watch happen at a time.',
      why:
        'A desired behaviour you can watch happen can be designed, tested and built as a slice; a wish like ' +
        '"better reminders" cannot. Each behaviour listed here is a candidate vertical slice, a thin piece you ' +
        'can build end to end and learn from, and later it becomes a test. Say what must happen when things go ' +
        'wrong as well, since the missing failure case is the most common hole in a change. Say also what is ' +
        'deliberately not changing: Ousterhout\'s point that complexity is anything that makes a system ' +
        'harder to change applies to scope too, and a clear edge around the change is the cheapest simplification there is.',
      questions: [
        {
          id: 'behaviours',
          prompt: 'What should someone be able to do, or see, once the change is in?',
          kind: 'entity-list',
          entity: 'use-case',
          hint: 'Name each as something an actor accomplishes, and include the cases where it should refuse or fail.',
        },
        {
          id: 'unchanged',
          prompt: 'What is deliberately not changing, even though it sits nearby?',
          kind: 'long-text',
          optional: true,
        },
      ],
      example:
        'Patient cancels by text. Actors: patient. Outcome: the appointment is cancelled, its slot is free to ' +
        'book, and the desk can see who cancelled and when.\n\n' +
        'Cancellation is refused after the start time. Actors: patient. Outcome: the patient is told it is too ' +
        'late, and the appointment is unchanged.\n\n' +
        'Not changing: how the desk cancels by phone, and the wording of reminders.',
      challenges: [
        'Could someone watch each behaviour happen and say yes or no? "Faster" and "better" are not behaviours until they have a number.',
        'What should happen when it goes wrong: bad input, an outside system down, two people acting at once? Add those rows.',
        'Does any behaviour here contradict one you said must keep working? Settle it now, or one of them loses without anyone choosing.',
        'Which behaviour would you drop first if time ran out? It is probably not part of the smallest safe change.',
        'Is this one change or several? Mark any behaviour that could ship alone.',
      ],
    },
    {
      id: 'affected-concepts',
      title: 'Affected Concepts',
      diagram: 'domain-model',
      think: 'Which things in the problem\'s world does the change touch, stretch or introduce?',
      why:
        'A change arrives as a feature but lives as concepts. It reads some, adds rules to some, and often ' +
        'reveals a concept the system never named, or stretches an old one until it means two things. Ousterhout ' +
        'counts obscurity as a cause of complexity, and a name that quietly changed meaning is obscurity ' +
        'you create on purpose. Martin\'s rule is to keep the concepts of the problem apart from the machinery ' +
        'that delivers them. Listing the concepts, and which of them change meaning, is how you find where ' +
        'the knowledge will have to live before you decide who owns it.',
      questions: [
        {
          id: 'concepts',
          prompt: 'Which concepts does the change touch, add, or change the meaning of?',
          kind: 'entity-list',
          entity: 'concept',
          hint: 'Existing and new ones. Say in one sentence what each is now, and relate it to the others it touches.',
        },
        {
          id: 'meaning',
          prompt: 'Which of these change meaning rather than just being used, and who relies on the old meaning?',
          kind: 'long-text',
          hint: 'A new state, a new rule, a field that now holds something different.',
        },
      ],
      example:
        'Appointment (a slot booked for a patient with a dentist; relates to Patient and Cancellation). ' +
        'Cancellation (new: who cancelled an appointment, when, and by which channel; relates to Appointment). ' +
        'Reply (the text a patient sends back; relates to Reminder). Reminder (a message due before an ' +
        'appointment; relates to Appointment and Reply).\n\n' +
        'Changes meaning: Appointment. It used to be booked or confirmed, and now it can be cancelled, so ' +
        'everything that counts appointments must decide whether to count cancelled ones.',
      challenges: [
        'Is any concept here a technical thing, like a flag, a queue or a table? Name the concept it stands for.',
        'Does a concept now mean two things, one old and one new? That is a sign it needs splitting, as "Appointment" would if it meant both a booked slot and a visit that happened.',
        'Which concept did you leave out because the change "only reads" it? Reading creates a dependency on its shape.',
        'Is there a noun in your desired behaviours that is missing from this list?',
        'Which concept is new? A new concept needs an owner of its own, so do not add it as a field on whatever is closest.',
      ],
    },
    {
      id: 'current-ownership',
      title: 'Current Ownership',
      diagram: 'module',
      think: 'Who owns each of these concepts and rules today, and what does each module keep to itself?',
      why:
        'Ousterhout\'s central technique is information hiding: each module should capture a few design ' +
        'decisions inside itself, so that when one changes, one module changes. Before changing a system, find ' +
        'out where its knowledge lives today, not where it ought to live, because the change will either ' +
        'respect those homes or add to the mess. Martin adds the test of one reason to change per module. ' +
        'Ownership is found by reading where a rule is actually decided, not by trusting a module\'s name. ' +
        'The closest fit for the new behaviour is usually the module that already hides the nearest knowledge.',
      questions: [
        {
          id: 'modules',
          prompt: 'Which modules own the concepts and rules this change touches or sits next to?',
          kind: 'entity-list',
          entity: 'module',
          fields: ['purpose', 'hides'],
          hint: 'Only the parts the change reaches. For each, say what it owns and what it keeps to itself (a format, a rule, a vendor\'s quirks).',
        },
        {
          id: 'unowned',
          prompt: 'Is any concept or rule here known by more than one module, or by none? Which?',
          kind: 'long-text',
          hint: 'Duplicated knowledge and orphaned knowledge are both findings. Say "none" only after you have looked.',
        },
      ],
      example:
        'Scheduling: owns appointments and which slots are free. Hides the format of the clinic\'s schedule export.\n' +
        'Reminders: decides when a reminder is due and what it says. Hides the timing rules and the wording.\n' +
        'Messaging: sends texts through the provider. Hides the provider, the shape of its messages, and retries.\n' +
        'Patients: owns contact details and consent.\n\n' +
        'Known by two: what a "yes" reply means. Messaging recognises the word and Reminders acts on it, so the ' +
        'rule is split across a vendor adapter and the rules module.',
      challenges: [
        'Did you find each owner by reading where the rule is decided, or by the module\'s name? Names lie.',
        'Is what a module "hides" really hidden, or do callers pass it in or get it back? That is already a leak.',
        'Which module is the best fit for the new behaviour: the one that owns the nearest knowledge, or the one that is easiest to edit?',
        'Does any module here only forward to another? A change through a pass-through touches every layer and gains nothing.',
        'Is part of this in a "Utils", "Helper" or "Manager"? Whatever lives there has no owner. Say so in the question below.',
      ],
    },
    {
      id: 'architecture-impact',
      title: 'Architecture Impact',
      diagram: 'dependency',
      think: 'Follow the change through the design: which modules change, and which arrows move?',
      why:
        'Ousterhout names dependencies as one of the two main sources of complexity: each arrow is a place ' +
        'where one change forces another. Before editing, list the modules the change touches, whether each ' +
        'changes only inside or also at its interface, and which arrows it adds or removes. A change confined ' +
        'to the inside of one module is cheap; one that alters an interface drags in every caller; and the ' +
        'number of modules touched for a single behaviour is the clearest sign of where knowledge is spread. ' +
        'Martin adds the direction: arrows should point toward policy and away from detail, and a new one that ' +
        'closes a cycle means neither module can change alone. Tick the arrows as you expect them to be once ' +
        'the change is in.',
      questions: [
        {
          id: 'dependencies',
          prompt: 'Which modules does each module need in order to work, as you expect them to be once the change is in?',
          kind: 'entity-fields',
          entity: 'module',
          field: 'dependsOn',
          hint: 'Tick the arrows that will exist afterwards, including any the change adds. The arrow runs from the module that needs to the one it needs.',
          noneLabel: 'No module depends on another',
        },
        {
          id: 'changes',
          prompt: 'Which modules have to change, and for each: only inside, or at its interface too?',
          kind: 'long-text',
        },
        {
          id: 'direction',
          prompt: 'Does any new arrow point from the rules toward a detail, or close a cycle?',
          kind: 'long-text',
          optional: true,
        },
      ],
      example:
        'After the change: Reminders needs Scheduling, Patients and Messaging, as before. No new arrow, because ' +
        'Reminders already needs Scheduling.\n\n' +
        'Changes: Reminders, inside, to interpret a reply, and at its interface, one new operation. Scheduling, ' +
        'at its interface, one new operation to cancel. Messaging, inside, to hand replies on without reading them.\n\n' +
        'Direction: Messaging must not call Scheduling to cancel. That would make the vendor adapter depend on the ' +
        'rules, the wrong way round.',
      challenges: [
        'Count the modules that must change for one behaviour. More than two means the knowledge is spread, and it will cost this much every time it changes again.',
        'Does the change alter an interface that other modules call? Every caller is now in scope, including the ones you did not list.',
        'Follow each new arrow. Does any come back to where it started? A cycle means neither module can change alone.',
        'Does a module that holds business rules now need to know about a vendor, a file or a screen? Flip the arrow.',
        'Is any arrow there only because some knowledge sits in the wrong module? Moving the knowledge may remove the arrow.',
        'No arrows at all? That is fine for a single module. With several, ask what they cooperate through: shared data, a file, an event.',
      ],
    },
    {
      id: 'leakage-coupling-check',
      title: 'Leakage/Coupling Check',
      diagram: 'dependency',
      think: 'Would the same decision end up known in more than one place? Look for the leak before you build it.',
      why:
        'A change feels bolted on when the new knowledge was put wherever it was easiest and several modules ' +
        'had to learn it. Ousterhout calls that information leakage, and it travels three ways: through an ' +
        'interface (a parameter, a return value, an error), through a shared format, and through order, when ' +
        'callers must do things in a fixed sequence. The test is simple to state and humbling to answer: if ' +
        'this rule or format changed next month, how many modules would you edit? Martin\'s companion is cohesion. ' +
        'The module you are about to edit already has a reason to change, and a second, unrelated reason is how ' +
        'a good module slides into a bad one one convenient edit at a time.',
      questions: [
        {
          id: 'leaks',
          prompt: 'If the knowledge this change adds (a rule, a format, a code) changed next month, which modules would you have to edit?',
          kind: 'long-text',
          hint: 'Follow the knowledge through parameters, return values, errors, shared files and call order.',
        },
        {
          id: 'coupling',
          prompt: 'Built the obvious way, where would that knowledge live?',
          kind: 'choice',
          options: [
            { value: 'contained', label: 'In one module, and the others only ask it' },
            { value: 'spread', label: 'In two or more modules, each needing to know it' },
            { value: 'unsure', label: 'I cannot tell yet' },
          ],
        },
        {
          id: 'owner',
          prompt: 'Which one module should own it, and why that one?',
          kind: 'long-text',
          optional: true,
        },
      ],
      example:
        'Edit if it changed: Messaging, which recognises "yes" today and would learn "cancel" too. Reminders, ' +
        'which acts on the word. Scheduling, if Messaging calls it to cancel. Three modules for one rule.\n\n' +
        'Where it would live: spread, built the obvious way. Messaging would hold a business rule, and the ' +
        'carrier reserves some keywords (STOP, for one), so it would hold their quirks as well.\n\n' +
        'Owner: Reminders. It already decides what a reply means for a reminder. Messaging should deliver the ' +
        'text, untouched.',
      challenges: [
        'You said it is contained. List every parameter, return value and error that crosses the module\'s boundary. Does any of them carry the knowledge out?',
        'You said it spreads. Which module could own it so the others only ask? If none fits, is a module missing?',
        'Must callers call two modules in a fixed order for the change to work? That is knowledge about sequence leaking to callers.',
        'Does any module now know the shape of another\'s data: a field, a status code, a file layout? Show it the answer, not the shape.',
        'Is the module you plan to edit about to change for a second, unrelated reason? Cohesion is lost one convenient edit at a time.',
        'Are you copying a rule "just this once" because sharing it is harder? Duplicated knowledge is where the next bug will be found.',
      ],
    },
    {
      id: 'alternatives',
      title: 'Alternatives',
      diagram: 'dependency',
      think: 'Your first idea is rarely the best. What is a genuinely different way to make this change?',
      why:
        'Ousterhout\'s advice is to design it twice: sketch two quite different designs before choosing, even ' +
        'when you are sure of the first, because the second teaches you what the first assumes. For a change, ' +
        'the options differ in where the new knowledge goes and how much existing code moves: bolt it on where ' +
        'it fits, give it to the module that owns the nearest knowledge, or reshape the existing code first so ' +
        'the change becomes easy. Compare them on complexity, information hiding, coupling, extensibility, ' +
        'effort now and the change you expect next. The cheapest option now is a legitimate choice, but write ' +
        'down what it costs later.',
      questions: [
        {
          id: 'options',
          prompt: 'What are at least two genuinely different ways to make this change?',
          kind: 'entity-list',
          entity: 'architecture-option',
          minimum: 2,
          hint: 'Each one puts the new knowledge in a different place. Give every option its best argument.',
        },
        {
          id: 'comparison',
          prompt: 'How do they compare on complexity, information hiding, coupling, and effort now versus when requirements change?',
          kind: 'long-text',
        },
      ],
      example:
        'Option A, interpret in Reminders: Messaging hands every reply on as plain text; Reminders decides ' +
        'whether it confirms or cancels, and asks Scheduling to cancel. Strengths: one owner for what a reply ' +
        'means, and Messaging stays ignorant of the rules. Costs: the existing "yes" handling has to move out of ' +
        'Messaging first, and Reminders gains a rule set.\n\n' +
        'Option B, extend Messaging: add "cancel" beside "yes", and have Messaging call Scheduling. Strengths: ' +
        'the smallest edit today, and nothing moves. Costs: a vendor adapter now knows business rules and ' +
        'depends on Scheduling.\n\n' +
        'Comparison: A hides more and couples less; B is cheaper this week. Reply rules are the part we expect ' +
        'to grow, which favours A.',
      challenges: [
        'Are the options really different, or one design under two names? Different options put the knowledge in different places.',
        'Is one of them the quick patch, written to be rejected? Give it its best argument. If it still loses, you will know why.',
        'Did either option reshape the existing code first, so that the change becomes one more easy step? Try writing that one.',
        'Is there an option that does less, by leaving a module alone entirely?',
        'What change do you expect next year? Which option makes that cheap, and which makes it expensive?',
      ],
    },
    {
      id: 'recommended-design',
      title: 'Recommended Design',
      diagram: 'dependency',
      think: 'Choose one on purpose, show what each interface looks like afterwards, and say what you are giving up.',
      why:
        'A decision with its reasons written down can be revisited when the facts change; one that just drifted ' +
        'cannot. Say why this option beats the other on the things that matter here, and say what you accept by ' +
        'not choosing it. The choice is yours: the coach will challenge your reasons but will not make the ' +
        'decision for you. Then pin the interfaces. Ousterhout\'s deep modules offer a simple interface over ' +
        'a lot of hidden work, so a good change adds as little as it can to an interface, because every new ' +
        'operation is something every caller has to learn. Make the common case trivial, and where you can, ' +
        'define the error out of existence.',
      questions: [
        {
          id: 'chosen',
          prompt: 'Which option are you recommending?',
          kind: 'entity-choice',
          entity: 'architecture-option',
        },
        {
          id: 'reasons',
          prompt: 'Why this one, and not the other?',
          kind: 'long-text',
          hint: 'Name what the other option lacks on the things that matter for this change.',
        },
        {
          id: 'interface',
          prompt: 'What does the interface of each module that changes look like once the change is in?',
          kind: 'entity-fields',
          entity: 'module',
          field: 'interface',
          hint: 'Fill in only the modules whose interface changes. Say what goes in and what comes out, never how it works.',
          optional: true,
        },
        {
          id: 'giving-up',
          prompt: 'What are you knowingly giving up or accepting?',
          kind: 'long-text',
          optional: true,
        },
        {
          id: 'revisit',
          prompt: 'What would you have to see to decide you chose wrongly?',
          kind: 'long-text',
          optional: true,
        },
      ],
      example:
        'Recommended: A, interpret in Reminders.\n\n' +
        'Why: what a reply means is a rule, and Reminders is the module that owns the rules. Messaging hides the ' +
        'provider and should not learn anything about appointments.\n\n' +
        'Interfaces: Reminders gains handleReply(patient, text). Scheduling gains cancel(appointment, reason). ' +
        'Messaging offers replies as plain text and nothing else.\n\n' +
        'Giving up: the first step is moving the "yes" handling, which is more work than adding a keyword.\n\n' +
        'Revisit if: Reminders\' interface keeps growing with every new kind of reply.',
      challenges: [
        'Do your reasons mention the option you did not choose? A reason that would support either is not a reason.',
        'Is the real reason "it is the easiest to build today"? That can be right, if you write down what it will cost the next change.',
        'How many operations does the change add to interfaces? Could the common case be one call with few arguments?',
        'What is hard to undo here: a stored format, a public interface, a message other systems rely on? Spend your care there and keep the rest cheap to change.',
        'What would you have to see to decide this was wrong? Write the trigger now, while you are calm.',
      ],
    },
    {
      id: 'tests',
      title: 'Tests',
      diagram: 'use-case',
      think: 'Pin down what must not break, then write the test that proves the change.',
      why:
        'Martin Fowler describes test-driven development as a loop: write a failing test for the next small ' +
        'behaviour, write the simplest code that passes, then refactor with the tests as your safety net. A ' +
        'change to a live system needs two sets of tests. The first pins what already works, written before ' +
        'you touch anything, so you can reshape the code and know at once if behaviour moved. The second is ' +
        'the new behaviour, written first and watched failing, because a test that has never failed proves ' +
        'nothing. Test through the public interface you sketched, never the insides. A test that has to reach ' +
        'inside a module is telling you the module is shallow or leaking.',
      questions: [
        {
          id: 'keep',
          prompt: 'How will you pin down the behaviour that must keep working, before you change anything?',
          kind: 'long-text',
          hint: 'Which tests exist already, and which do you need to add so every line of your keep list is covered?',
        },
        {
          id: 'first-test',
          prompt: 'What is the first test of the new behaviour, and how do you expect it to fail?',
          kind: 'long-text',
          hint: 'Name the message the failure should give, so you can tell it fails for the right reason.',
        },
        {
          id: 'fakes',
          prompt: 'What will you fake or fix in tests (time, network, outside systems), and where?',
          kind: 'long-text',
          optional: true,
        },
      ],
      example:
        'Keep: add a test that a reply of "yes" confirms the appointment, and one that no reminder is sent ' +
        'without consent, before moving any code. Both pass today and must still pass after every step.\n\n' +
        'First new test: given a confirmed appointment tomorrow, when the patient replies "CANCEL", handleReply ' +
        'marks it cancelled and Scheduling shows the slot free. Expected failure: handleReply does not exist.\n\n' +
        'Fakes: the provider, behind Messaging, and the clock, passed in.',
      challenges: [
        'Will the first new test fail before the change exists? A test that has never failed has proven nothing.',
        'Does every line of your keep list have a test now? Name the ones that do not.',
        'Do the tests go through a module\'s public interface, or reach inside? Reaching inside means the interface is too thin or is leaking.',
        'What is hard to test here: time, the network, randomness? Is it behind a boundary you can fake?',
        'Which test would fail first if two modules disagreed about the change? That is the most valuable one to write.',
      ],
    },
    {
      id: 'smallest-safe-implementation',
      title: 'Smallest Safe Implementation',
      diagram: 'first-vertical-slice',
      slice: { useCase: 'use-case', path: 'path' },
      think: 'What is the thinnest piece that delivers one behaviour end to end and can be backed out?',
      why:
        'A vertical slice cuts through every module a behaviour needs instead of finishing one layer at a ' +
        'time, so you learn whether the pieces fit while changing them is still cheap. For a change to a ' +
        'system people use, safe matters as much as small: each step should leave the system working with the ' +
        'tests passing, be shippable by itself, and be reversible, with a switch, a branch kept apart from the ' +
        'old path, or a plain revert. Choose the slice for risk, not comfort: the right first slice is the one ' +
        'where your design is most likely to be wrong. It is real code at small scope, not a throwaway, so it ' +
        'goes through the interfaces you sketched.',
      questions: [
        {
          id: 'use-case',
          prompt: 'Which desired behaviour will you deliver first?',
          kind: 'entity-choice',
          entity: 'use-case',
        },
        {
          id: 'path',
          prompt: 'Trace it through the modules in order. What does each one do?',
          kind: 'long-text',
          hint: 'One line per hop, naming the module and the call it makes or answers.',
        },
        {
          id: 'safety',
          prompt: 'How will you keep it safe: what lets you ship it partly, switch it off, or back it out?',
          kind: 'long-text',
        },
        {
          id: 'left-out',
          prompt: 'What are you deliberately leaving out of the slice, or faking?',
          kind: 'long-text',
          optional: true,
        },
      ],
      example:
        'Behaviour: Patient cancels by text.\n\n' +
        'Path: Messaging receives the reply and hands the text to Reminders; Reminders recognises CANCEL and asks ' +
        'Scheduling to cancel the patient\'s next appointment; Scheduling frees the slot; the desk\'s list shows it.\n\n' +
        'Safe: the new path runs behind a setting that is off by default, so replies behave as they do today until ' +
        'it is switched on. To back out, switch it off.\n\n' +
        'Left out: refusing after the start time, and offering the freed slot to the waiting list.',
      challenges: [
        'Could it ship on its own and leave the system working? If it only works once the next step lands, it is a layer, not a slice.',
        'How would you back this out in production? If the answer is "fix forward", find a safer first step.',
        'Did you choose the easy behaviour or the risky one? Pick the one where your design is most likely to be wrong.',
        'Could you finish it in a few days? If not, find a thinner one: fewer cases, the happy path first, a fake outside system.',
        'What are you faking, and can you remove the fake later without touching the modules that use it?',
      ],
    },
    {
      id: 'refactoring',
      title: 'Refactoring',
      diagram: 'dependency',
      think: 'Leave the design better than you found it: what to reshape before the change, and what to clean up after?',
      why:
        'Ousterhout\'s strategic programming says working code is the minimum and that each change should ' +
        'leave the design a little better, because a change that only works is another small step toward a ' +
        'mess. Refactoring, in Fowler\'s sense, is reshaping code in small steps with behaviour unchanged and ' +
        'the tests as the net. It happens at two moments. Before the change, reshape so the change is easy ' +
        'and then make the easy change. After it, remove what is now unused, merge what duplicated, and rename ' +
        'what stopped being true. "Before the next feature" means planned and recorded; a cleanup with no issue ' +
        'filed is a decision not to do it.',
      questions: [
        {
          id: 'before',
          prompt: 'What, if anything, would you reshape first so the change becomes easy, leaving behaviour as it is?',
          kind: 'long-text',
          hint: 'If nothing, say why: the design already has a place for this change.',
        },
        {
          id: 'after',
          prompt: 'What will the change leave behind that you should clean up: duplication, names, dead code, a module that grew?',
          kind: 'long-text',
        },
        {
          id: 'follow-up',
          prompt: 'What are you not doing now, and where will it be recorded so it is not forgotten?',
          kind: 'long-text',
          optional: true,
        },
      ],
      example:
        'Before: move the existing "yes" handling out of Messaging into Reminders, with no change in behaviour and ' +
        'the keep tests green after each step. Then "cancel" is one more rule in the place that owns the rules.\n\n' +
        'After: delete the keyword list from Messaging. Rename "confirmation" to "reply outcome" where it now ' +
        'covers more than confirming.\n\n' +
        'Not now: a cancellation cut-off per dentist. Filed as its own issue.',
      challenges: [
        'Is the refactoring planned as steps that each leave the tests green? A "big cleanup" cannot be reviewed or reverted.',
        'Where is "later" written down? A cleanup with no issue filed is a decision not to do it.',
        'Did the change add a special case? Each one is where the next tactical shortcut will gather. Can the design absorb it instead?',
        'Which module grew most? Does it still have one reason to change?',
        'Is the refactoring really the change in disguise? Keep them in separate commits so behaviour changes and structure changes can be reviewed apart.',
      ],
    },
    {
      id: 'review',
      title: 'Review',
      diagram: 'dependency',
      think: 'Look at the whole change with a sceptic\'s eye, and write down what building it teaches you.',
      why:
        'The loop this coach teaches is: design enough to reduce uncertainty, build a small slice, learn, ' +
        'refactor, continue. Review closes the loop twice. Before you build, ask the questions the coach has ' +
        'been asking: is each module you touch deeper or shallower for the change, does knowledge leak across ' +
        'a boundary, are the responsibilities cohesive, do the dependencies point the right way on purpose, ' +
        'does every new abstraction earn its place, and can the behaviour be tested? After the first slice, ' +
        'come back and record what it taught you, since what implementation teaches is the cheapest feedback ' +
        'you will get. What you conclude is your own judgement: guidance, not a score.',
      questions: [
        {
          id: 'weakest',
          prompt: 'Which part of this change are you least sure about, and why?',
          kind: 'long-text',
        },
        {
          id: 'verdict',
          prompt: 'Is this change ready to start building?',
          kind: 'choice',
          options: [
            { value: 'ready', label: 'Yes: build the smallest safe slice' },
            { value: 'ready-with-risks', label: 'Yes, with the risks above written down' },
            { value: 'not-yet', label: 'Not yet: something needs another pass' },
          ],
        },
        {
          id: 'taught',
          prompt: 'After the first slice: what did building it teach you that the design did not predict?',
          kind: 'long-text',
          optional: true,
        },
        {
          id: 'next',
          prompt: 'What should be refactored before the next feature?',
          kind: 'long-text',
          optional: true,
        },
      ],
      example:
        'Weakest: Reminders. It now both holds the rules and interprets replies, so its interface may grow with ' +
        'every new kind of reply. The first slice will show how fast.\n\n' +
        'Verdict: ready, with the risk written down.\n\n' +
        'Taught (after the slice): the provider sends "Cancel " with a trailing space and in lower case, so ' +
        'matching had to be forgiving, and that rule belongs in Reminders, not Messaging.\n\n' +
        'Next: pull reply rules out of Reminders into their own module if a third kind of reply arrives.',
      challenges: [
        'Name the shallowest module you touched. Does this change make it deeper or shallower?',
        'Pick one piece of knowledge the change added and list every module that knows it. More than one owner?',
        'Is there an abstraction, parameter or option the change added "in case"? Remove it unless a real need justifies it today.',
        'Be suspicious of "ready". Which of your own answers did you accept because challenging it was harder?',
        'Could you explain the change, and why it lives where it does, to a colleague in two minutes? If not, it may be more complicated than it needs to be.',
        'What did this teach you that should change how the next change is designed, and where is that written?',
      ],
    },
  ],
};
