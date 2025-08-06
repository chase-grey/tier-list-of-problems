import type { Project } from '../types/project-models';

// Second part of complete project interest data (projects 11-29)
export const additionalProjects: Project[] = [
  // Project 11
  {
    id: '7936231',
    title: 'Improve As-Needed SmartLink Search',
    appetite: 'M',
    deliverables: [
      'Get designs out',
      'Create a prototype',
      'Complete Investigation'
    ],
    details: {
      assessorName: 'Jonathan Ray',
      assessmentDate: new Date('2025-07-24T14:49:00'),
      hourEstimate: 80,
      hourEstimateRange: '50-80',
      inScope: 'Determine best way to present this information (create design)\nDetermine realistic use cases (include in design)\nExplore options of best ways to search and categorize data (investigation)\nCreate a prototype without UI (development)',
      outOfScope: 'Completing the project\nFinalized UI designs\nUser research',
      taskBreakdown: [
        {
          name: 'Brainstorm ways to present this',
          bestCaseHours: 1,
          expectedHours: 2,
          worstCaseHours: 3,
          weightedHours: 2
        },
        {
          name: 'Create design with proposed UI and user experience',
          bestCaseHours: 4,
          expectedHours: 8,
          worstCaseHours: 15,
          weightedHours: 12
        },
        {
          name: 'User research',
          bestCaseHours: 10,
          expectedHours: 20,
          worstCaseHours: 40,
          weightedHours: 30
        },
        {
          name: 'Determine way to make this feature discoverable',
          bestCaseHours: 3,
          expectedHours: 5,
          worstCaseHours: 10,
          weightedHours: 9
        },
        {
          name: 'Research ways to efficiently search existing SmartTools',
          bestCaseHours: 10,
          expectedHours: 20,
          worstCaseHours: 40,
          weightedHours: 30
        }
      ],
      notes: 'Main things to determine are one, what is the best way we can find relevant SmartTools based on a users natural language request? And two, what is the most sensible user experience for this?'
    }
  },
  // Project 12
  {
    id: '7945918',
    title: 'Automated testing for model responses for the text assistant could be better',
    appetite: 'M',
    deliverables: [
      'Complete investigation'
    ],
    details: {
      assessorName: 'Ke Li',
      assessmentDate: new Date('2025-07-23T19:24:00'),
      hourEstimate: 56,
      hourEstimateRange: '45-60 hours',
      inScope: 'Short term, we can probably reuse LJ\'s test script and add safeguard prompt with locale specific test.',
      outOfScope: 'The ideal long term to make this easier for anyone to use is to make it available in an internal environment so that it does not require complexed setup.',
      taskBreakdown: [
        {
          name: 'Get familiar with existing test script',
          bestCaseHours: 5,
          expectedHours: 10,
          worstCaseHours: 20,
          weightedHours: 15
        },
        {
          name: 'Provide standard way to extract custom text action prompts',
          bestCaseHours: 3,
          expectedHours: 5,
          worstCaseHours: 10,
          weightedHours: 8
        },
        {
          name: 'Make testing script work in other locale',
          bestCaseHours: 5,
          expectedHours: 10,
          worstCaseHours: 20,
          weightedHours: 15
        },
        {
          name: 'Provide clear instructions for how to test',
          bestCaseHours: 1,
          expectedHours: 2,
          worstCaseHours: 4,
          weightedHours: 3
        },
        {
          name: 'Make the solution extendable to other workflow',
          bestCaseHours: 5,
          expectedHours: 10,
          worstCaseHours: 20,
          weightedHours: 15
        }
      ],
      notes: ''
    }
  },
  // Project 13
  {
    id: '7964399',
    title: 'Mac / Accessibilty APIs can\'t detect text in SmartTextBox',
    appetite: 'L',
    deliverables: [
      'Complete the project'
    ],
    details: {
      assessorName: 'David Krajnik',
      assessmentDate: new Date('2025-07-25T16:21:00'),
      hourEstimate: 70,
      hourEstimateRange: '90-120 hours',
      inScope: 'Make content visible to 3rd party vendors',
      outOfScope: 'N/A',
      taskBreakdown: [
        {
          name: 'Make content visible to 3rd party vendors',
          bestCaseHours: 10,
          expectedHours: 40,
          worstCaseHours: 80,
          weightedHours: 58
        }
      ],
      notes: ''
    }
  },
  // Project 14
  {
    id: '7968293',
    title: 'Use MFT data to autofit/simplify rich text STB toolbar',
    appetite: 'M',
    deliverables: [
      'Complete the project'
    ],
    details: {
      assessorName: 'Josh Lapicola',
      assessmentDate: new Date('2025-07-25T17:27:00'),
      hourEstimate: 45,
      hourEstimateRange: '40-50',
      inScope: 'Plug into ambulatory\'s auto-fit code to automatically remove/add rich-text toolbar items based on a predetermined usage threshold. (The same threshold that ambulatory uses, whatever that is.)\nThis is complicated code, but we should be able to reuse most of the ambulatory auto-fit code.\nI think the biggest challenge will be moving the rich-text toolbar settings over to a TUN record.',
      outOfScope: 'Auto-fit the plain-text toolbar\nAuto-fit the context menu',
      taskBreakdown: [],
      notes: 'My very rough estimate here is 45 hours, but I\'m really can\'t be sure about that without digging deeper to understand the complexities of this code.'
    }
  },
  // Project 15
  {
    id: '7968764',
    title: 'The text assistant is not context aware',
    appetite: 'L',
    deliverables: [
      'Complete the project'
    ],
    details: {
      assessorName: 'Adam Still',
      assessmentDate: new Date('2025-07-25T00:00:00'),
      hourEstimate: 178,
      hourEstimateRange: '90-120 hours',
      inScope: 'I can now {pass an extension to/insert an agent into} the text action infrastructure, which enables me to more quickly create new text actions with a lower lift.',
      outOfScope: '',
      taskBreakdown: [
        {
          name: 'Agent setup and planning',
          bestCaseHours: 30,
          expectedHours: 40,
          worstCaseHours: 75,
          weightedHours: 59
        },
        {
          name: 'Record (E0K Creation)',
          bestCaseHours: 10,
          expectedHours: 15,
          worstCaseHours: 35,
          weightedHours: 26
        },
        {
          name: 'Chronicles APIs (database logic)',
          bestCaseHours: 15,
          expectedHours: 20,
          worstCaseHours: 45,
          weightedHours: 34
        },
        {
          name: 'Output validation',
          bestCaseHours: 30,
          expectedHours: 40,
          worstCaseHours: 75,
          weightedHours: 59
        }
      ],
      notes: 'For best results, this will likely rely on moving the main text action to Sous (7991596) but it somewhat depends.'
    }
  },
  // Project 16
  {
    id: '7983072',
    title: 'smarttextbox - inline header/footer support',
    appetite: 'L',
    deliverables: [
      'Get designs out',
      'Create a prototype',
      'Complete investigation'
    ],
    details: {
      assessorName: 'Brandon Campos Botello',
      assessmentDate: new Date('2025-07-27T16:10:00'),
      hourEstimate: 175,
      hourEstimateRange: '150-200 hours',
      inScope: 'Finish UX research\nCreate UX design\nCreate prototype\nIdentify the scope and MVP',
      outOfScope: 'Feature comparable with Word\nProject complete',
      taskBreakdown: [
        {
          name: 'Initial investigation of current implementations',
          bestCaseHours: 8,
          expectedHours: 16,
          worstCaseHours: 24,
          weightedHours: 20
        },
        {
          name: 'High-level UX and technical designs for prototype',
          bestCaseHours: 16,
          expectedHours: 24,
          worstCaseHours: 40,
          weightedHours: 32
        },
        {
          name: 'SmartApples prototype development',
          bestCaseHours: 40,
          expectedHours: 60,
          worstCaseHours: 80,
          weightedHours: 68
        },
        {
          name: 'SmartApples updates',
          bestCaseHours: 16,
          expectedHours: 20,
          worstCaseHours: 24,
          weightedHours: 22
        },
        {
          name: 'App and editor integration design',
          bestCaseHours: 16,
          expectedHours: 24,
          worstCaseHours: 40,
          weightedHours: 32
        }
      ],
      notes: ''
    }
  },
  // Project 17
  {
    id: '7987877',
    title: 'Text Actions / Model seems unwilling to rewrite text to use the patient\'s name and pronouns',
    appetite: 'M',
    deliverables: [
      'Complete the project'
    ],
    details: {
      assessorName: 'Brandon Campos Botello',
      assessmentDate: new Date('2025-07-27T15:26:00'),
      hourEstimate: 60,
      hourEstimateRange: '50-65',
      inScope: 'Review the existing pronoun guardrail introduced by DLG 2153040. Make the language more assertive.\nValidate against all defined text actions.\nValidate against custom text actions that involve the patient.',
      outOfScope: 'Explore options to expose more configuration for app to control the behvaior as a stretch goal',
      taskBreakdown: [
        {
          name: 'Prompt-engineering',
          bestCaseHours: 4,
          expectedHours: 6,
          worstCaseHours: 8,
          weightedHours: 6.8
        },
        {
          name: 'Update prompt in database',
          bestCaseHours: 4,
          expectedHours: 8,
          worstCaseHours: 16,
          weightedHours: 12
        },
        {
          name: 'Validate in STB for pre-defined',
          bestCaseHours: 4,
          expectedHours: 6,
          worstCaseHours: 8,
          weightedHours: 6.8
        },
        {
          name: 'Validate in STB for custom',
          bestCaseHours: 4,
          expectedHours: 6,
          worstCaseHours: 8,
          weightedHours: 6.8
        }
      ],
      notes: ''
    }
  },
  // Project 18
  {
    id: '7991596',
    title: 'Move AITA to Sous',
    appetite: 'L',
    deliverables: [
      'Get designs out',
      'Create a plan for a future project',
      'Complete investigation'
    ],
    details: {
      assessorName: 'Gauresh Walia',
      assessmentDate: new Date('2025-07-28T10:13:00'),
      hourEstimate: 100,
      hourEstimateRange: '90-120 hours',
      inScope: 'Better define what the agent will look like\n- Get some experience with Nebula/Sous Chef development and other agents\n- Figure out how we would build/migrate the text assistant to a Sous agent\n  - What pieces will stay on the client/HSWeb, what pieces will live on Nebula\n  - Still need to load prompts to client, and send content from client\n- Start process of moving predefined prompts to live in Nebula',
      outOfScope: 'Have a fully functioning agent',
      taskBreakdown: [],
      notes: ''
    }
  },
  // Project 19
  {
    id: '7991598',
    title: 'Refreshability for AI SmartSections',
    appetite: 'M',
    deliverables: [
      'Dev comp\'d',
      'Get designs approved',
      'Get designs out',
      'Create a prototype',
      'Complete investigation'
    ],
    details: {
      assessorName: 'Peter Paulson',
      assessmentDate: new Date('2025-07-25T16:47:00'),
      hourEstimate: 90,
      hourEstimateRange: '45-60 hours',
      inScope: 'Start tracking insertion timestamp for AI SmartSections\nIf timestamp is older than some amount of time, display refresh button\nRefresh SmartLinks inside AI prompt text, then update SmartSection',
      outOfScope: 'Integrate with server refresh\nPassively refresh/reprompt in background so update is immediate\nAnything involving regenerating after the AI SmartSection is accepted',
      taskBreakdown: [
        {
          name: 'SmartTextBox changes (refresh cached off document, update SmartSection)',
          bestCaseHours: 20,
          expectedHours: 50,
          worstCaseHours: 80,
          weightedHours: 60
        },
        {
          name: 'Timestamp to tell last refresh time',
          bestCaseHours: 10,
          expectedHours: 20,
          worstCaseHours: 40,
          weightedHours: 30
        }
      ],
      notes: ''
    }
  },
  // Project 20
  {
    id: '7992275',
    title: 'Improve touch mode support',
    appetite: 'M',
    deliverables: [
      'Dev comp\'d'
    ],
    details: {
      assessorName: 'Josh Lapicola',
      assessmentDate: new Date('2025-07-25T14:45:00'),
      hourEstimate: 60,
      hourEstimateRange: '40-80',
      inScope: 'QAN 7759841 is the most important outstanding QAN. I\'m not sure how difficult this will be to fix; it might require a hyperspace-level fix.\nQAN 7946051 is also important and should be a straightforward fix\nI closed one of the issues on the PRJ as a duplicate of 7759841\nThe remaining QANs are a bit of a toss-up on how difficult they will be',
      outOfScope: 'There are some new issues with the new increased button size. We don\'t have a complete list yet.\nThere are a number of SmartTools activities that have a minimum size that doesn\'t fit on a tablet-sized screen. We don\'t have a complete list.',
      taskBreakdown: [],
      notes: 'I roughly estimate 40-80 for all 8 QANs to be released. I think dev comp is reasonable for the medium appetite'
    }
  },
  // Additional projects to reach the 29 total will be in part 3
];
