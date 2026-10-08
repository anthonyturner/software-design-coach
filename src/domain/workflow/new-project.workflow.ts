import type { Workflow } from './workflow.types';

export const newProjectWorkflow: Workflow = {
  mode: 'new-project',
  title: 'New Project',
  steps: [
    {
      id: 'problem',
      title: 'Problem',
      think: 'Before any solution: what is going wrong today, and for whom?',
      why:
        'Everything you design later is judged against this sentence. John Ousterhout calls complexity the ' +
        'enemy of software, and the cheapest complexity to create is a solution to a problem nobody ' +
        'described. State the problem before any solution, in words a stranger could follow, and the ' +
        'later steps have something real to push against.',
      questions: [
        {
          id: 'problem',
          prompt: 'What problem are we solving, in plain words, without naming a solution?',
          kind: 'long-text',
          hint: 'Describe the situation that hurts, not the app you imagine.',
        },
        {
          id: 'pain',
          prompt: 'Who feels it today, and how do they cope without this?',
          kind: 'long-text',
          hint: 'The current workaround shows what the system must beat.',
        },
        {
          id: 'success',
          prompt: 'How will you know the problem is solved?',
          kind: 'short-text',
        },
      ],
      example:
        'A dental clinic phones every patient the day before an appointment. The front desk loses about an ' +
        'hour a day to it, and roughly one patient in five still does not show, leaving an empty chair.\n\n' +
        'Workaround today: a printed schedule and a pen. Solved when: no-shows fall below one in ten and ' +
        'nobody at the desk makes reminder calls.',
      challenges: [
        'Does your statement mention a technology, a screen or a feature? If so, you may be describing a solution.',
        'Could two developers read it and build different systems that both solve it? If not, it is probably too vague.',
        'Is this one problem, or several joined by "and"? Each one may deserve its own design.',
      ],
    },
    {
      id: 'users',
      title: 'Users',
      think: 'Who does this touch? Think roles with different needs, not "the user".',
      why:
        'Robert C. Martin puts it this way: a module should have one reason to change, and the reasons come ' +
        'from people. If you do not know who the different users are, you cannot tell which of their needs ' +
        'belong together and which will pull the design apart later. Naming roles, not "the user", is the ' +
        'first act of design. The roles you list here are the actors the use cases refer to later.',
      questions: [
        {
          id: 'users',
          prompt: 'Who uses this system, or is affected by it?',
          kind: 'entity-list',
          entity: 'actor',
          hint: 'One row per role. Include people who never open it, like support or an on-call engineer.',
        },
        {
          id: 'primary',
          prompt: 'If you could satisfy only one of them, who would it be?',
          kind: 'short-text',
          optional: true,
        },
      ],
      example:
        'Roles: front-desk receptionist, patient, dentist, clinic owner.\n\n' +
        'The receptionist wants to stop making calls. The patient wants a reminder that is easy to act on. ' +
        'The dentist wants a full chair. The owner wants fewer wasted slots. Primary: the receptionist, ' +
        'because nothing happens unless they trust it.',
      challenges: [
        'Is any entry just "user" or "admin"? Replace it with a role that wants something specific.',
        'Who is affected without ever touching the system? They tend to surface as late surprises.',
        'Do two of these people want conflicting things? Name the conflict now, while it is cheap.',
      ],
    },
    {
      id: 'goals',
      title: 'Goals',
      think: 'What would have to be true for you to call this a success?',
      why:
        'Goals are the outcomes that make the problem count as solved, and they are how you will choose ' +
        'between two reasonable designs later. Agile design means doing just enough to reduce uncertainty ' +
        'and then learning from a small slice, so goals need to be few, ordered and checkable rather than ' +
        'a wish list of features.',
      questions: [
        {
          id: 'goals',
          prompt: 'What must be true when this succeeds?',
          kind: 'string-list',
          hint: 'One outcome per line. Outcomes, not features.',
        },
        {
          id: 'evidence',
          prompt: 'For each goal, what would you observe that proves it?',
          kind: 'long-text',
          hint: 'If you cannot observe it, you cannot test it.',
        },
        {
          id: 'priority',
          prompt: 'When two goals conflict, which one wins?',
          kind: 'short-text',
          optional: true,
        },
      ],
      example:
        'Goals: patients are reminded without staff effort; a missed reminder is noticed the same day; the ' +
        'desk can see tomorrow at a glance.\n\n' +
        'Evidence: no reminder calls on the desk log; no-shows below one in ten over a month. When goals ' +
        'conflict, reliability of delivery beats cleverness of wording.',
      challenges: [
        'Can each goal be checked? "Fast" cannot; "a reminder goes out within a minute of booking" can.',
        'Is a goal secretly a feature or a technology choice? Rewrite it as the outcome it is meant to produce.',
        'Which goal would you drop first if time ran out? That answer is your real priority order.',
      ],
    },
    {
      id: 'non-goals',
      title: 'Non-goals',
      think: 'What are you choosing not to do, even though someone might expect it?',
      why:
        'Ousterhout observes that complexity is not caused by one big mistake but accumulates from hundreds of ' +
        'small additions, each reasonable on its own. A non-goal is the cheapest brake you have: a written ' +
        'decision that something sensible is out of scope for now. It also draws the first line of the ' +
        'design. If a possible feature sits on the wrong side of it, you can say no without a debate.',
      questions: [
        {
          id: 'non-goals',
          prompt: 'What will this system deliberately not do?',
          kind: 'string-list',
          hint: 'One per line. Things a reasonable person might expect that you are leaving out, not "be bug-free".',
        },
        {
          id: 'tempting',
          prompt: 'Which of these are you most tempted to add anyway, and why does it not belong yet?',
          kind: 'long-text',
          optional: true,
        },
      ],
      example:
        'Non-goals: online booking by patients; billing or insurance; reminders by any channel except text ' +
        'message; support for more than one clinic.\n\n' +
        'Tempting: multi-clinic support, because the owner mentioned a second branch. It does not belong yet ' +
        'because nothing in the goals needs it, and it would touch every module. Not now, and the design ' +
        'should not make it impossible.',
      challenges: [
        'Would anyone be surprised if this were missing? If nobody would, it is noise, not a non-goal.',
        'Does a non-goal contradict a goal or a requirement? Resolve it here, where it costs a sentence.',
        'Is this list empty, or only things nobody wanted? A design with no tempting extras has probably not looked hard at its scope.',
      ],
    },
    {
      id: 'requirements',
      title: 'Requirements',
      think: 'What must the system do, and how well must it do it?',
      why:
        'Requirements turn goals into behaviour you can check. Martin Fowler treats tests as behavioural ' +
        'feedback, so write each requirement in a form you could test: something you could watch happen. ' +
        'Qualities such as speed, privacy and availability shape the design as much as features do, and they ' +
        'are the ones people forget. Plan the important behaviour, not every line. Detail you add now is ' +
        'detail you will have to unlearn.',
      questions: [
        {
          id: 'functional',
          prompt: 'What must the system do?',
          kind: 'string-list',
          hint: 'One behaviour per line, written so you could test it: "The desk sees tomorrow\'s appointments with reminder status".',
        },
        {
          id: 'qualities',
          prompt: 'What qualities must it have, with a number where you can?',
          kind: 'string-list',
          hint: 'Speed, reliability, privacy, accessibility, cost.',
          optional: true,
        },
        {
          id: 'constraints',
          prompt: 'What is already fixed: deadlines, platforms, rules, systems you must work with?',
          kind: 'string-list',
          optional: true,
        },
      ],
      example:
        'Behaviour: the system sends each patient a text message the day before their appointment; a patient ' +
        'can confirm or cancel by replying; the desk sees tomorrow\'s appointments with each reminder\'s status.\n\n' +
        'Qualities: a reminder goes out within a minute of its due time; patient phone numbers are never ' +
        'shown to staff who do not need them. Constraints: it must read the clinic\'s existing schedule ' +
        'export; it must work on the front-desk PC.',
      challenges: [
        'Pick one requirement. How would you test it? If you cannot say, it is a wish.',
        'Does any requirement name a screen, a table or a technology? Describe the behaviour and leave the how for later.',
        'Which requirement serves none of your goals? Either a goal is missing or the requirement is not needed.',
        'No qualities listed? Ask what would make a user stop trusting this even if every feature worked.',
      ],
    },
    {
      id: 'use-cases',
      title: 'Use Cases',
      think: 'What do your actors actually do with the system, one concrete interaction at a time?',
      why:
        'Requirements say what the system does; use cases say who does what with it, and to what end. Each ' +
        'one is a candidate vertical slice, a thin piece you can build end to end and learn from, which is how ' +
        'Agile design keeps risk small. They also test your earlier work: an actor with no use case is not ' +
        'needed, and a use case with no actor means someone is missing. Ousterhout would call a design ' +
        'obvious when it follows the way users really work.',
      questions: [
        {
          id: 'use-cases',
          prompt: 'What are the important things your actors do with the system?',
          kind: 'entity-list',
          entity: 'use-case',
          hint: 'Name each as a verb phrase from the actor\'s side: "Confirm an appointment", not "Appointment service".',
        },
        {
          id: 'first',
          prompt: 'If you could build only one of these end to end first, which would it be and why?',
          kind: 'short-text',
          optional: true,
        },
      ],
      example:
        'Confirm an appointment. Actors: patient. Outcome: the appointment is marked confirmed and the desk ' +
        'sees it.\n\n' +
        'Review tomorrow\'s schedule. Actors: receptionist. Outcome: the desk knows who is confirmed, ' +
        'unconfirmed or cancelled before the day starts.\n\n' +
        'First slice: Confirm an appointment, because it touches the message, the reply and the schedule, ' +
        'so it proves the riskiest connections.',
      challenges: [
        'Does every actor from the Users step appear in at least one use case? One that does not may be unnecessary.',
        'Does any use case have no actor? Something may be happening "by itself": a schedule, or another system. Name it.',
        'Is any use case really a screen or a feature ("Dashboard")? Rewrite it as something an actor accomplishes.',
        'Is there a requirement that no use case exercises? Add the use case or question the requirement.',
      ],
    },
    {
      id: 'domain-concepts',
      title: 'Domain Concepts',
      think: 'What is this problem about? Name the things, in the words your users use.',
      why:
        'The nouns of the problem become the vocabulary of the design. Precise names reduce what a reader has ' +
        'to hold in their head, which Ousterhout counts as part of complexity, and they are where you find ' +
        'out who owns what knowledge. Modules should take their shape from these concepts, not from technical ' +
        'layers. Keep the concepts of the problem apart from the machinery of delivering it, as Martin ' +
        'argues: a Patient is a concept; a Controller is not.',
      questions: [
        {
          id: 'concepts',
          prompt: 'What are the important things in this problem\'s world?',
          kind: 'entity-list',
          entity: 'concept',
          hint: 'The nouns your users talk about, count or keep track of. Relate them to each other as you go.',
        },
        {
          id: 'knowledge',
          prompt: 'Which rule, format or policy about these concepts is most likely to change, and who decides it?',
          kind: 'long-text',
          hint: 'This is the seed of information hiding: knowledge that changes should live in one place.',
          optional: true,
        },
      ],
      example:
        'Patient (a person the clinic treats; relates to Appointment). Appointment (a slot booked for a ' +
        'patient with a dentist; relates to Patient and Reminder). Reminder (a message due before an ' +
        'appointment; relates to Appointment). Consent (a patient\'s permission to be contacted, and by ' +
        'which channel).\n\n' +
        'Most likely to change: when a reminder is due. The owner decides, and may want it per dentist.',
      challenges: [
        'Is any concept a technical thing, like Manager, Database or Service? Those are design artefacts, not concepts of the problem.',
        'Do two names mean one thing, or one name mean two? "Account" for both login and billing is coupling in disguise.',
        'Which concept can you not define in one sentence? You may not understand it yet.',
        'Is there a noun in your use cases that is missing from this list?',
      ],
    },
    {
      id: 'system-boundary',
      title: 'System Boundary',
      think: 'Where does your system end and everything you merely depend on begin?',
      why:
        'The boundary separates what you build and own from what you only use. Everything across it is a ' +
        'dependency you cannot change, so its details should not seep into the core. Martin\'s advice is to ' +
        'treat the database, the web and the vendors as details at the edge, and Ousterhout\'s version is ' +
        'that each place a foreign shape leaks inward is a place complexity will spread. Naming the edges ' +
        'now tells you which modules will need to hide a foreign system.',
      questions: [
        {
          id: 'kind',
          prompt: 'What kind of thing are you building?',
          kind: 'choice',
          options: [
            { value: 'application', label: 'An application that people use directly' },
            { value: 'service', label: 'A service other software calls' },
            { value: 'library', label: 'A library other code embeds' },
            { value: 'tool', label: 'A command-line tool or script' },
            { value: 'other', label: 'Something else' },
          ],
        },
        {
          id: 'inside',
          prompt: 'In a sentence or two, what is yours to build and own?',
          kind: 'long-text',
          hint: 'What sits inside the boundary, and what you will be responsible for when it breaks.',
        },
        {
          id: 'external',
          prompt: 'What do you depend on, or talk to, that you do not build?',
          kind: 'entity-list',
          entity: 'external-system',
          hint: 'Payment or messaging providers, identity services, other teams\' systems, files, the clock.',
          optional: true,
        },
      ],
      example:
        'Kind: an application the front desk uses directly.\n\n' +
        'Inside: the reminder rules, the status of each reminder and the desk\'s view of tomorrow. ' +
        'Outside: the clinic\'s scheduling software, which we read from (appointment exports); a text-message ' +
        'provider, which we send through (messages and delivery receipts); the system clock, which tells us ' +
        'when reminders are due.',
      challenges: [
        'What breaks if each outside system is down, slow, or changes its format? If the answer is "everything", its details have leaked inward.',
        'Are you listing something you own, like your own database, as external, or leaving out something you do not own, like the email provider?',
        'Whose words are you tempted to adopt as your own: field names, statuses, codes from an outside system?',
        'What starts work without a person: a timer, a webhook, an import? Is it on this list?',
        'None at all? Not even the clock or a database? Check again.',
      ],
    },
    {
      id: 'modules',
      title: 'Modules',
      think: 'How would you split this so each part owns one important decision?',
      why:
        'Modules are where complexity is managed. Ousterhout argues for deep modules: a simple interface ' +
        'over a lot of hidden work, split along knowledge (what would change together), not along time ' +
        'order or technical layers. Martin\'s companion test is cohesion: a module should have one reason to ' +
        'change. At this step you only sketch: a name and a purpose for each. What each module is responsible ' +
        'for, what it hides and what it depends on come next.',
      questions: [
        {
          id: 'modules',
          prompt: 'What are the main parts of the system?',
          kind: 'entity-list',
          entity: 'module',
          hint: 'Start with three to seven. Name each for the knowledge or decision it owns: "Pricing", not "PricingManager" or "Utils".',
        },
        {
          id: 'alternative',
          prompt: 'What is a genuinely different way to split it, and what would it make easier or harder?',
          kind: 'long-text',
          hint: 'Design it twice: the first idea is rarely the best one.',
          optional: true,
        },
      ],
      example:
        'Scheduling: owns the clinic\'s appointments and which slots are free.\n' +
        'Reminders: decides when a reminder is due and what it says.\n' +
        'Messaging: sends texts through the provider and hides how delivery works.\n' +
        'Patients: owns contact details and consent.\n\n' +
        'Alternative: one Notifications module covering reminders and messaging. Simpler to start, but the ' +
        'rules for when to remind would then change together with the provider\'s API, two unrelated reasons.',
      challenges: [
        'Say what each module owns in one sentence. If it needs "and", consider splitting. If it needs "handles" or "manages", you may not know yet.',
        'Does any name end in Manager, Helper, Util or Service? That usually marks a module with no clear purpose.',
        'Does each concept and each outside system have exactly one owner? Two owners means duplicated knowledge.',
        'Trace your first use case through the modules. How many does it touch, and could one hide the rest?',
        'Is any module just a thin wrapper that forwards to another? It is shallow; consider merging it.',
      ],
    },
  ],
};
