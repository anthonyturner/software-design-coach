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
      diagram: 'system-context',
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
      diagram: 'use-case',
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
      diagram: 'domain-model',
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
      diagram: 'system-context',
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
      diagram: 'module',
      think: 'How would you split this so each part owns one important decision?',
      why:
        'Modules are where complexity is managed. Ousterhout argues for deep modules: a simple interface ' +
        'over a lot of hidden work, split along knowledge (what would change together), not along time ' +
        'order or technical layers. Martin\'s companion test is cohesion: a module should have one reason to ' +
        'change. At this step you only sketch: a name and a purpose for each. What each module is responsible ' +
        'for, what it hides, what it shows and what it depends on come next.',
      questions: [
        {
          id: 'modules',
          prompt: 'What are the main parts of the system?',
          kind: 'entity-list',
          entity: 'module',
          fields: ['purpose'],
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
    {
      id: 'responsibilities',
      title: 'Responsibilities',
      diagram: 'module',
      think: 'For each module, which jobs does it do so that nobody else has to?',
      why:
        'Robert C. Martin\'s test for a module is that it has one reason to change, and a list of ' +
        'responsibilities is where you find out whether that is true. Ousterhout adds the cost of getting it ' +
        'wrong: a module that gathers unrelated jobs ends up with a wide, shallow interface, and a job claimed ' +
        'by two modules is the same knowledge written twice. Write each responsibility as a decision the module ' +
        'makes or a guarantee it gives, not as a verb with no object. "Handles reminders" says nothing; "decides ' +
        'when a reminder is due" can be checked.',
      questions: [
        {
          id: 'responsibilities',
          prompt: 'What is each module responsible for?',
          kind: 'entity-fields',
          entity: 'module',
          field: 'responsibilities',
          hint: 'One responsibility per line, as something the module decides or guarantees. If a line starts with "handles" or "manages", sharpen it.',
        },
        {
          id: 'overlap',
          prompt: 'Is any job claimed by two modules, or by none? Who should own it?',
          kind: 'long-text',
          optional: true,
        },
      ],
      example:
        'Reminders: decides when a reminder is due for an appointment; chooses the wording for each patient; ' +
        'records whether it was sent, delivered or answered.\n' +
        'Messaging: sends a text through the provider; reports whether it was delivered; retries a failed send once.\n' +
        'Patients: holds contact details; records consent and refuses to give out a number without it.\n\n' +
        'Overlap: both Reminders and Patients wanted to know the patient\'s preferred channel. Patients owns it, ' +
        'and Reminders asks.',
      challenges: [
        'Read one module\'s list aloud. Would all of it change for the same reason? If one line changes when the owner changes a policy and another when the provider changes its API, they belong in different modules.',
        'Is any line a vague verb ("handles", "manages", "processes")? Name the decision or guarantee behind it.',
        'Does the same job appear under two modules? That is duplicated knowledge. Choose one owner and let the other ask it.',
        'Trace your first use case. Does every step have a module responsible for it, and only one?',
        'Has a module collected more than five or six jobs? It may be turning into a god module.',
      ],
    },
    {
      id: 'information-hiding',
      title: 'Information Hiding',
      diagram: 'module',
      think: 'What does each module know that nothing else should have to know?',
      why:
        'Ousterhout calls information hiding the most important technique for making modules deep. Each module ' +
        'should capture a few design decisions inside its implementation, so that when one changes, one module ' +
        'changes. The opposite is leakage: the same decision, such as a file format or a vendor\'s message shape, ' +
        'known by several modules, so a single change touches them all. Splitting work by time order, read then ' +
        'process then write, is the classic way to cause it, because every stage ends up knowing the format. ' +
        'Martin makes the same point about boundaries: keep details at the edge, and let the core stay ignorant of them.',
      questions: [
        {
          id: 'hides',
          prompt: 'What does each module know that nobody else should have to?',
          kind: 'entity-fields',
          entity: 'module',
          field: 'hides',
          hint: 'A format, a rule, an algorithm, a vendor\'s quirks: decisions that could change and that callers should never see.',
        },
        {
          id: 'leaks',
          prompt: 'Where could that knowledge leak out: a parameter, a return type, an error, a shared file?',
          kind: 'long-text',
          optional: true,
        },
      ],
      example:
        'Messaging hides which provider is used, the shape of its messages, how retries back off, and how a ' +
        'delivery receipt is matched to a reminder.\n' +
        'Reminders hides the timing rules and the wording templates.\n' +
        'Patients hides how contact details and consent are stored.\n' +
        'Scheduling hides the format of the clinic\'s schedule export.\n\n' +
        'Leak: Messaging\'s send operation takes the provider\'s template code, so callers know the vendor. ' +
        'Fix: callers pass a patient and a message, and Messaging picks the template.',
      challenges: [
        'If this knowledge changed tomorrow, how many modules would you edit? More than one means it has already leaked.',
        'Is what you wrote a decision that could change (a format, an algorithm, a vendor, a policy), or just the name of a field? Pick decisions, not trivia.',
        'Must callers pass in, or be handed back, something that only makes sense given what the module hides? That is leakage through the interface.',
        'Does any module hide nothing? Then it is a pass-through, and it probably belongs inside the module it forwards to.',
        'Did you split the system by order of events ("first read, then process, then write")? Stages that share a format all know it. Split by knowledge instead.',
      ],
    },
    {
      id: 'interfaces',
      title: 'Interfaces',
      diagram: 'module',
      think: 'How small can you make what each module shows to the rest of the system?',
      why:
        'A deep module, in Ousterhout\'s sense, offers a simple interface over a lot of hidden work, and the ' +
        'interface is more than the signatures. It is everything a caller has to know: the order to call things ' +
        'in, the side effects, the errors, the assumptions. Design it before you build the module, make the ' +
        'common case trivial, and where you can, define errors out of existence so nobody has to handle them. ' +
        'Callers depend on this sketch, not on the code behind it, which is why Martin treats the interface as ' +
        'the stable part of a design.',
      questions: [
        {
          id: 'interface',
          prompt: 'What does a caller need to know to use each module?',
          kind: 'entity-fields',
          entity: 'module',
          field: 'interface',
          hint: 'A few operations, in plain words or signatures. Say what goes in and what comes out, never how it works.',
        },
        {
          id: 'common-case',
          prompt: 'What is the most common thing a caller does, and how many calls and arguments does it take?',
          kind: 'long-text',
          optional: true,
        },
      ],
      example:
        'Reminders: dueReminders(now) gives the reminders to send; recordOutcome(reminder, outcome) says what happened.\n' +
        'Messaging: send(patient, message) returns delivered or failed with a reason. An unreachable provider ' +
        'is retried inside, not thrown at the caller.\n' +
        'Scheduling: appointmentsOn(date).\n' +
        'Patients: contactFor(patient) gives a channel and address, or nothing when there is no consent.\n\n' +
        'Common case: the desk\'s morning view is one call to Reminders and one to Scheduling.',
      challenges: [
        'Count the operations. Could a caller get the same result with fewer? Every operation is something a caller has to learn.',
        'Does the sketch say how the module works inside (a table, a queue, the vendor)? An interface should say what, never how.',
        'Must callers call things in a set order, or clean up afterwards? That is a rule they have to remember. Can the module do it itself?',
        'Which errors can a caller receive? Could the module absorb one, or make it impossible?',
        'Does the interface take as long to explain as the work it hides? Then the module is shallow: reconsider the split or the sketch.',
      ],
    },
    {
      id: 'dependencies',
      title: 'Dependencies',
      diagram: 'dependency',
      think: 'Which modules need which, and do the arrows point toward what is stable?',
      why:
        'Ousterhout names dependencies as one of the two main causes of complexity: a dependency is a place ' +
        'where one change forces another. So have few, simple and obvious ones. Martin adds the rule about ' +
        'direction: dependencies point toward policy and away from detail, so the rules at the centre do not ' +
        'know about the vendor, the file or the screen at the edge. A cycle is the clearest warning sign, because ' +
        'two modules in a cycle cannot be understood, tested or changed one at a time. The arrow runs from the ' +
        'module that needs to the module it needs.',
      questions: [
        {
          id: 'dependencies',
          prompt: 'Which modules does each module need in order to work?',
          kind: 'entity-fields',
          entity: 'module',
          field: 'dependsOn',
          hint: 'Tick only what it really calls or relies on. A module that needs nothing else is fine.',
          noneLabel: 'No module depends on another',
        },
        {
          id: 'direction',
          prompt: 'Which dependency would hurt most if the module it points to changed, and is it pointing the right way?',
          kind: 'long-text',
          optional: true,
        },
      ],
      example:
        'Reminders needs Scheduling, Patients and Messaging. Messaging, Scheduling and Patients need no other ' +
        'module; each talks only to its outside system.\n\n' +
        'Direction: Reminders sits at the centre because it holds the rules. The vendor and the schedule format ' +
        'live at the edges, inside Messaging and Scheduling. If Messaging called Reminders back to ask what to ' +
        'say, that would be a cycle, and the fix would be for Reminders to hand it the finished text.',
      challenges: [
        'Follow every arrow. Is there a path that comes back to where it started? A cycle means neither module can change alone.',
        'Does the module with the business rules depend on one that wraps a vendor, a file or a screen? Flip it: the rules should not know the details.',
        'Which module has the most arrows pointing at it? Everything is coupled to it, so is its interface stable enough to carry that?',
        'Does a module need more than three or four others? It may be doing too much, or be a coordinator that deserves to be named as one.',
        'Is a dependency there only because some knowledge sits in the wrong module? Moving the knowledge may remove the arrow.',
        'No dependencies at all? That is a fine answer for a single module. With several, ask what else they cooperate through, such as shared data or an outside system.',
      ],
    },
    {
      id: 'architecture-options',
      title: 'Architecture Options',
      diagram: 'dependency',
      think: 'Your first design is rarely your best. What is a genuinely different way to build this?',
      why:
        'Ousterhout\'s advice is to design it twice: sketch two quite different designs before choosing, even ' +
        'when you are sure of the first, because the second teaches you what the first assumes. "Different" ' +
        'means the knowledge is split in another place, not that a module has a new name or a new technology. ' +
        'Compare the options on what the product is built to teach: complexity, how much each hides, how tightly ' +
        'it couples, how easily it extends, how much effort it takes now, and how it copes with the change you ' +
        'expect. Martin\'s reminder is that architecture is the art of keeping choices open, so name what each ' +
        'option commits you to.',
      questions: [
        {
          id: 'options',
          prompt: 'What are at least two genuinely different ways to build this?',
          kind: 'entity-list',
          entity: 'architecture-option',
          minimum: 2,
          hint: 'Each one a different split of the knowledge, not a variation in naming. Give every option its best case.',
        },
        {
          id: 'comparison',
          prompt: 'How do they compare on complexity, information hiding, coupling, and effort now versus when requirements change?',
          kind: 'long-text',
        },
      ],
      example:
        'Option A, four modules: Scheduling, Reminders, Messaging and Patients, as sketched. Strengths: each ' +
        'hides one decision, and the rules and the provider change independently. Costs: more interfaces to ' +
        'write before the first reminder goes out.\n\n' +
        'Option B, one Notifications module that reads the schedule, decides and sends. Strengths: fewest parts, ' +
        'quickest to a first reminder. Costs: the rules and the provider\'s API change together, and testing a ' +
        'rule means faking the provider.\n\n' +
        'Comparison: A hides more and couples less; B is cheaper today. The provider is the part we expect to ' +
        'change, which favours A.',
      challenges: [
        'Are the options really different, or one design under two names? Different options put the knowledge in different places.',
        'Does one option look like a strawman, written to lose? Rewrite it with its best argument.',
        'What change do you expect in the next year? Which option makes it cheap, and which makes it expensive?',
        'Which option is least effort now? Cheapest first is a legitimate choice, but write down what it costs later.',
        'Could a third option take the best of the first two? Try writing it before you choose.',
      ],
    },
    {
      id: 'decision',
      title: 'Decision',
      diagram: 'dependency',
      think: 'Choose one on purpose, and write down what you are giving up.',
      why:
        'A decision with its reasons written down can be revisited when the facts change; a decision that just ' +
        'drifted cannot. Agile design does not mean deciding everything now, it means deciding enough to start ' +
        'and keeping the rest cheap to change. Say why this option beats the other on the things that matter ' +
        'here, and say what you are accepting by not choosing it. That record is the seed of an architecture ' +
        'decision record. The choice is yours: the coach will challenge your reasons but will not make the ' +
        'decision for you.',
      questions: [
        {
          id: 'chosen',
          prompt: 'Which option are you choosing?',
          kind: 'entity-choice',
          entity: 'architecture-option',
        },
        {
          id: 'reasons',
          prompt: 'Why this one, and not the other?',
          kind: 'long-text',
          hint: 'Name what the other option lacks on the things that matter for this problem.',
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
        'Chosen: four modules.\n\n' +
        'Why: the reminder rules and the provider have different owners and change for different reasons, and ' +
        'hiding the provider is the biggest risk reduction available.\n\n' +
        'Giving up: more interfaces to write up front. We start with Messaging as a thin fake that writes ' +
        'messages to a file.\n\n' +
        'Revisit if: after the first slice, Reminders and Messaging turn out to change together every time.',
      challenges: [
        'Do your reasons mention the other option? A reason that would support either is not a reason.',
        'Is the real reason "it is what I know" or "it is what everyone does"? That can be fine, but say it out loud.',
        'What would have to be true for you to pick the other one? That is your trigger to revisit.',
        'Which part of this is hard to reverse? Spend your care there and keep the rest cheap to change.',
        'Are you deciding things the first slice does not need yet? Defer them, and write down that you did.',
      ],
    },
    {
      id: 'first-vertical-slice',
      title: 'First Vertical Slice',
      diagram: 'first-vertical-slice',
      think: 'What is the thinnest piece you can build end to end that proves the design?',
      why:
        'A vertical slice cuts through every module a behaviour needs, instead of finishing one layer at a time, ' +
        'so you learn whether the modules fit together while changing them is still cheap. This is the Agile ' +
        'loop the product teaches: design enough to reduce uncertainty, build a small slice, learn, refactor, ' +
        'continue. Choose it for risk, not comfort: the right first slice is the one where your design is most ' +
        'likely to be wrong. It is real code at small scope, not a throwaway prototype, so it should go through ' +
        'the interfaces you sketched.',
      questions: [
        {
          id: 'use-case',
          prompt: 'Which use case will you build end to end first?',
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
          id: 'learn',
          prompt: 'What will you know after building it that you do not know now?',
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
        'Use case: Confirm an appointment.\n\n' +
        'Path: Scheduling lists tomorrow\'s appointments; Reminders finds the one that is due and asks Patients ' +
        'for a contact; Messaging sends the text through a fake provider; the patient\'s reply reaches Messaging; ' +
        'Reminders records it as confirmed; Scheduling shows it.\n\n' +
        'Learn: whether the provider\'s reply format can really be hidden inside Messaging, and whether ' +
        'Reminders can poll Scheduling or needs to be told of changes.\n\n' +
        'Left out: cancellation, retries, per-dentist wording.',
      challenges: [
        'Does the slice touch every module it needs, and no more? A slice that bypasses a module proves nothing about it.',
        'Could you finish it in a few days? If not, find a thinner one: fewer cases, a fake outside system, the happy path only.',
        'Did you choose it because it is easy, or because it is risky? Pick the one where you are most likely to be wrong.',
        'Would a real user notice it working? A slice that ends at "the database is set up" is a layer, not a slice.',
        'What are you faking, and can you replace it later without touching the modules that use it?',
      ],
    },
    {
      id: 'tests',
      title: 'Tests',
      diagram: 'first-vertical-slice',
      think: 'How will you know the slice works, and keep knowing as the design changes?',
      why:
        'Martin Fowler describes test-driven development as a loop: write a failing test for the next small ' +
        'behaviour, write the simplest code that passes, then refactor with the tests as your safety net. ' +
        'Tests are feedback on behaviour, and they are what makes refactoring safe, which in turn is what keeps ' +
        'a design from decaying. Test through the public interface you sketched, never the internals, so the ' +
        'insides can change. A test that has to reach into a module is telling you the module is shallow or ' +
        'leaking. Decide now what you will fake, and keep fakes at the boundary.',
      questions: [
        {
          id: 'behaviours',
          prompt: 'What behaviours must the first slice show?',
          kind: 'string-list',
          hint: 'One per line, each something you could watch happen: "No reminder is sent without consent".',
        },
        {
          id: 'first-test',
          prompt: 'What is the first test you will write, and what is the simplest code that would make it pass?',
          kind: 'long-text',
        },
        {
          id: 'fakes',
          prompt: 'What will you fake or fix in tests (time, network, outside systems), and where?',
          kind: 'long-text',
          optional: true,
        },
      ],
      example:
        'Behaviours: a reminder becomes due 24 hours before an appointment; no reminder is sent without ' +
        'consent; a reply of "yes" marks the appointment confirmed; a failed send is retried once, then flagged.\n\n' +
        'First test: given an appointment tomorrow at 10 and a patient who consented, when the time is 10 the ' +
        'day before, dueReminders returns one reminder for that patient. Simplest code: return a reminder when ' +
        'now is at or past the start minus 24 hours.\n\n' +
        'Fakes: the provider, behind Messaging, and the clock, passed in.',
      challenges: [
        'Would each behaviour fail if the behaviour were wrong, and pass if the code were rearranged? Test what happens, not how it is built.',
        'Does any test need to look inside a module to check anything? The interface may be too thin to observe, or the module is leaking.',
        'Which test would fail first if two modules disagreed about an interface? That is your most valuable test.',
        'What is hard to test (time, the network, randomness)? Is it behind a boundary you can fake?',
        'Could the first test pass in minutes? If it needs a lot of code first, the step is too large.',
      ],
    },
    {
      id: 'implementation-plan',
      title: 'Implementation Plan',
      diagram: 'first-vertical-slice',
      think: 'In what order will you build it, in steps small enough to stay safe?',
      why:
        'Agile design means designing enough to start, then building a small slice and learning from it, so a ' +
        'plan is a short sequence of small steps, each a Red, Green, Refactor loop that leaves the system ' +
        'working. Order the steps by risk and by dependency: build what others need, or fake it, and do the ' +
        'scary part early. Ousterhout is blunt that working code is not the goal; a little time spent improving ' +
        'the design on every change is what stops complexity creeping in, so a plan with no refactoring in it ' +
        'is a plan for tactical programming. Plan the next few steps, not every line.',
      questions: [
        {
          id: 'steps',
          prompt: 'What are the steps, in order?',
          kind: 'string-list',
          hint: 'One per line, each small enough to finish with the tests passing.',
        },
        {
          id: 'refactor',
          prompt: 'Where will you stop and refactor, and what will you look for?',
          kind: 'long-text',
          optional: true,
        },
        {
          id: 'checkpoint',
          prompt: 'After the slice, what will you check to decide whether the design holds or needs rework?',
          kind: 'long-text',
          optional: true,
        },
      ],
      example:
        '1. Reminders: dueReminders against a fake schedule, test first.\n' +
        '2. Patients: contactFor, with consent.\n' +
        '3. Messaging: send, with a fake provider that records messages.\n' +
        '4. Connect the three for Confirm an appointment and walk it through by hand.\n' +
        '5. Replace the fake provider with the real one, behind Messaging only.\n' +
        '6. Refactor: look at interface sizes and remove anything unused.\n\n' +
        'Checkpoint: do Reminders and Messaging ever have to change together?',
      challenges: [
        'Does every step leave the system working and tested? A step that breaks things until the next one lands is too big.',
        'What is first because it is easy, and what is last because it is scary? Move the risky step earlier.',
        'Where is the refactoring step? If you have not planned time to improve the design, you will not find it.',
        'What would make you stop and change the design rather than carry on? Write the trigger now, while you are calm.',
        'Which step could you drop without changing what the slice proves?',
      ],
    },
    {
      id: 'design-review',
      title: 'Design Review',
      diagram: 'dependency',
      think: 'Before you build, look at the whole design with a sceptic\'s eye.',
      why:
        'This is the last chance to find the weakest place in the design while it costs a conversation instead ' +
        'of a rewrite. Ask the questions this coach has been teaching: is each module deep or shallow, does ' +
        'information leak across a boundary, are the responsibilities cohesive, do the dependencies point the ' +
        'right way and on purpose, is every abstraction earning its place, and can the important behaviour be ' +
        'tested? Ousterhout reminds us that complexity builds up from many small shortcuts, so the review is a ' +
        'strategic investment, not a formality. What you conclude is your own judgement, guidance rather than a score.',
      questions: [
        {
          id: 'weakest',
          prompt: 'Which module or dependency are you least sure about, and why?',
          kind: 'long-text',
        },
        {
          id: 'risks',
          prompt: 'What are the biggest risks, and how will the first slice expose them?',
          kind: 'long-text',
        },
        {
          id: 'verdict',
          prompt: 'Is this design ready to start building?',
          kind: 'choice',
          options: [
            { value: 'ready', label: 'Yes: build the first slice' },
            { value: 'ready-with-risks', label: 'Yes, with the risks above written down' },
            { value: 'not-yet', label: 'Not yet: something needs another pass' },
          ],
        },
        {
          id: 'rework',
          prompt: 'Which earlier answer would you change now?',
          kind: 'long-text',
          optional: true,
        },
      ],
      example:
        'Weakest: Reminders. It needs Scheduling, Patients and Messaging, so it may be a coordinator doing too ' +
        'much; the first slice will show whether its interface stays small.\n\n' +
        'Risks: the provider\'s reply format is unknown, and the first slice exercises it; consent rules may ' +
        'differ by region, which is deferred and written down as a non-goal.\n\n' +
        'Verdict: ready, with risks written down.\n\n' +
        'Rework: Domain Concepts. Consent belongs to Patients, not Reminders, and I listed it under the wrong one.',
      challenges: [
        'Name the shallowest module. Does it hide more than it costs to learn, or does it only forward to someone else?',
        'Pick one piece of knowledge and list every module that knows it. More than one owner?',
        'Is there an abstraction, interface or layer that exists "in case"? Remove it unless a real need justifies it today.',
        'Check the arrows once more. Is there a cycle, or a core module that depends on a detail?',
        'Could you explain the modules and the first slice to someone in two minutes? If not, the design may be more complicated than it needs to be.',
        'Be suspicious of "ready". Which of your own answers did you accept because challenging it was harder?',
      ],
    },
  ],
};
