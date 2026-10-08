import type { Workflow } from './workflow.types';

export const newProjectWorkflow: Workflow = {
  mode: 'new-project',
  title: 'New Project',
  steps: [
    {
      id: 'problem',
      title: 'Problem',
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
      why:
        'Robert C. Martin puts it this way: a module should have one reason to change, and the reasons come ' +
        'from people. If you do not know who the different users are, you cannot tell which of their needs ' +
        'belong together and which will pull the design apart later. Naming roles, not "the user", is the ' +
        'first act of design.',
      questions: [
        {
          id: 'users',
          prompt: 'Who uses this system, or is affected by it?',
          kind: 'string-list',
          hint: 'One role per line. Include people who never open it, like support or an on-call engineer.',
        },
        {
          id: 'needs',
          prompt: 'What is each of them trying to get done?',
          kind: 'long-text',
          hint: 'A sentence per role, in their words rather than yours.',
        },
        {
          id: 'primary',
          prompt: 'If you could satisfy only one of them, who would it be?',
          kind: 'short-text',
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
  ],
};
