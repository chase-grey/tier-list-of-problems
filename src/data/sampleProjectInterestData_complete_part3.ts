import type { Project } from '../types/project-models';

// Third part of complete project interest data (projects 21-29)
export const finalProjects: Project[] = [
  // Project 21
  {
    id: '7992375',
    title: 'Organizations cannot disable individual text actions',
    appetite: 'S',
    deliverables: [
      'Dev comp\'d',
      'Get designs approved',
      'Create a prototype'
    ],
    details: {
      assessorName: 'Gauresh Walia',
      assessmentDate: new Date('2025-07-28T10:29:00'),
      hourEstimate: 40,
      hourEstimateRange: '<30 hours',
      inScope: 'Pick up with DLG 2117627\n- Connect the pieces\n  - Read new HDF item and don\'t load prompts listed',
      outOfScope: '',
      taskBreakdown: [],
      notes: ''
    }
  },
  // Project 22
  {
    id: '7992394',
    title: 'Agents don\'t have an easy way to write text to a textbox',
    appetite: 'S',
    deliverables: [
      'Complete the project'
    ],
    details: {
      assessorName: 'Daoxing Zhang',
      assessmentDate: new Date('2025-07-25T09:51:00'),
      hourEstimate: 32,
      hourEstimateRange: '<30 hours',
      inScope: 'We only need to consider the first four things mentioned below',
      outOfScope: 'Tools that AI agent can interact with (instead of a one way tool calling)\n- E.g. call a tool, run the tool, and then immediately send the result back to OpenAI to figure out more things.',
      taskBreakdown: [
        {
          name: 'Find the API functions',
          bestCaseHours: 2,
          expectedHours: 4,
          worstCaseHours: 8,
          weightedHours: 6
        },
        {
          name: 'Standardize its description',
          bestCaseHours: 2,
          expectedHours: 4,
          worstCaseHours: 8,
          weightedHours: 6
        },
        {
          name: 'Build the tools',
          bestCaseHours: 3,
          expectedHours: 8,
          worstCaseHours: 13,
          weightedHours: 10
        },
        {
          name: 'Pass the tools and call the tools when needed',
          bestCaseHours: 3,
          expectedHours: 8,
          worstCaseHours: 13,
          weightedHours: 10
        }
      ],
      notes: ''
    }
  },
  // Project 23
  {
    id: '7992395',
    title: 'Personalization Station - Allow multiple versions of SmartPhrases on download',
    appetite: 'M',
    deliverables: [
      'Complete the project'
    ],
    details: {
      assessorName: 'Jonathan Ray',
      assessmentDate: new Date('2025-07-24T15:13:00'),
      hourEstimate: 55,
      hourEstimateRange: '50-60',
      inScope: 'Create new item to save previously saved version (or versions?) of RTF for a SmartPhrase\nAdd UI to allow users to revert back to that\n(Optional): Add option for users to NOT overwrite edited SmartPhrases on download.',
      outOfScope: 'Side by side comparison\nFull contacts',
      taskBreakdown: [
        {
          name: 'Add new item to HH1',
          bestCaseHours: 1,
          expectedHours: 2,
          worstCaseHours: 4,
          weightedHours: 3
        },
        {
          name: 'Update UI in editor and download window',
          bestCaseHours: 2,
          expectedHours: 4,
          worstCaseHours: 8,
          weightedHours: 6
        },
        {
          name: 'Add revert to previous version functionality',
          bestCaseHours: 2,
          expectedHours: 5,
          worstCaseHours: 12,
          weightedHours: 8
        },
        {
          name: 'Add "Do not overwrite" for downloads functionality',
          bestCaseHours: 4,
          expectedHours: 8,
          worstCaseHours: 15,
          weightedHours: 9
        }
      ],
      notes: 'This proposal/idea is a stripped down version of the previous idea since based on recent feedback, I feel that a lighter weight version that prevents users from ruining their work in the worst case is important, but most users don\'t need a fine level of polish on this feature.'
    }
  },
  // Project 24
  {
    id: '7992604',
    title: 'Spell Check - Compile Wintertree from Source for Windows Version of Hyperdrive Plugin',
    appetite: 'M',
    deliverables: [
      'Complete the project'
    ],
    details: {
      assessorName: 'David Krajnik',
      assessmentDate: new Date('2025-07-25T12:51:00'),
      hourEstimate: 30,
      hourEstimateRange: '25-35',
      inScope: 'Create/update a makefile, CMake list, or vcxproj file to build ssce.dll for Windows\nSubmit an HDR to have the new ssce.dll added to the third party binaries and have the old pre-compiled DLL removed.',
      outOfScope: 'N/A',
      taskBreakdown: [
        {
          name: 'Create/update a makefile, CMake list, or vcxproj file to build ssce.dll for Windows',
          bestCaseHours: 10,
          expectedHours: 20,
          worstCaseHours: 40,
          weightedHours: 30
        }
      ],
      notes: ''
    }
  },
  // Project 25
  {
    id: '7993912',
    title: 'Improve comparison with original text',
    appetite: 'M',
    deliverables: [
      'Complete the project',
      'Create a plan for a future project'
    ],
    details: {
      assessorName: 'Dan Demp',
      assessmentDate: new Date('2025-07-29T11:00:00'),
      hourEstimate: 60,
      hourEstimateRange: '45-60 hours',
      inScope: 'Show special underline beneath key medical terms in output that don\'t appear in the original text\n- Similar for names, dates, times, or other numbers that could represent patient-relevant data\n- For Fix Spelling/Grammar, we\'ll underline any mismatch, using a more muted underline style for less relevant changes\n- Hovering or putting the text cursor within the underlined text will open the original text bubble and highlight the corresponding word/phrase\nWhen original text bubble open, support hovering/activating text in either the output or original text such the corresponding text is highlighted',
      outOfScope: 'Highlighting all additions/deletions/modifications\nEvaluating a comparison score to determine the quality of the output\nTracking comparison metrics for auditing purposes\nImproving comparison UI for pink-highlighted generated text in reports',
      taskBreakdown: [],
      notes: ''
    }
  },
  // Project 26
  {
    id: '6191585',
    title: 'Support spell check in standalone',
    appetite: 'L',
    deliverables: [
      'Complete the project'
    ],
    details: {
      assessorName: 'David Krajnik',
      assessmentDate: new Date('2025-07-25T12:38:00'),
      hourEstimate: 218,
      hourEstimateRange: '90-120 hours',
      inScope: 'Get the full Spell Check functionality we already have working in standalone\n- ELX w/ overrides\n- SPL records\n- Autocorrects\n- Ability to add to your personal SPL',
      outOfScope: 'Adding any net new Spell Check features',
      taskBreakdown: [
        {
          name: 'Transpile SSCE to WASM',
          bestCaseHours: 10,
          expectedHours: 20,
          worstCaseHours: 40,
          weightedHours: 30
        },
        {
          name: 'Transpile Lexi to WASM',
          bestCaseHours: 10,
          expectedHours: 20,
          worstCaseHours: 40,
          weightedHours: 30
        },
        {
          name: 'Create Wrapper Code to manage Lexi and WBS interaction & transpile to WASM',
          bestCaseHours: 40,
          expectedHours: 60,
          worstCaseHours: 80,
          weightedHours: 68
        },
        {
          name: 'Host Epic-installed files on HSWeb server',
          bestCaseHours: 10,
          expectedHours: 20,
          worstCaseHours: 40,
          weightedHours: 30
        },
        {
          name: 'Update SpellChecker.ts to decide whether to use standalone solution',
          bestCaseHours: 20,
          expectedHours: 40,
          worstCaseHours: 80,
          weightedHours: 60
        }
      ],
      notes: ''
    }
  },
  // Project 27
  {
    id: '6855847',
    title: 'Create an easier way to have "vanishing tips"',
    appetite: 'L',
    deliverables: [
      'In QA1',
      'Dev comp\'d'
    ],
    details: {
      assessorName: 'David Coll',
      assessmentDate: new Date('2025-07-25T00:32:00'),
      hourEstimate: 120,
      hourEstimateRange: '90-120 hours',
      inScope: 'New SmartSection SmartLink with user-entered parameters as the configuration vehicle for customers to configure the help text to display\nProviding a new, unique style to these SmartSections\nPreserve some features that exist with the optional SmartList build- principally that the help text is removed on sign and pulls in other SmartTool build',
      outOfScope: 'Utility for swapping existing disappearing help text (SmartLists) with the new build',
      taskBreakdown: [
        {
          name: 'Support on Mobile',
          bestCaseHours: 5,
          expectedHours: 15,
          worstCaseHours: 30,
          weightedHours: 22
        },
        {
          name: 'Ignore help text in signal',
          bestCaseHours: 5,
          expectedHours: 10,
          worstCaseHours: 20,
          weightedHours: 13
        },
        {
          name: 'Ignore help text in chart search',
          bestCaseHours: 1,
          expectedHours: 5,
          worstCaseHours: 15,
          weightedHours: 10
        },
        {
          name: 'Complete work on UI and database DLG',
          bestCaseHours: 40,
          expectedHours: 60,
          worstCaseHours: 100,
          weightedHours: 80
        }
      ],
      notes: 'Progress on this has already been started'
    }
  },
  // Project 28 (Extra project 1)
  {
    id: 'extra1',
    title: 'Dynamic Card Height Implementation for Project Interests',
    appetite: 'M',
    deliverables: [
      'Complete the project'
    ],
    details: {
      assessorName: 'Team Member',
      assessmentDate: new Date('2025-08-02T14:00:00'),
      hourEstimate: 25,
      hourEstimateRange: '20-30',
      inScope: 'Modify card components to adjust height based on content\nImplement responsive design techniques\nTest with various content lengths\nEnsure consistent appearance across all cards',
      outOfScope: 'Changing the overall card UI design\nModifying the data structure or content',
      taskBreakdown: [
        {
          name: 'Analyze current card implementation',
          bestCaseHours: 2,
          expectedHours: 3,
          worstCaseHours: 4,
          weightedHours: 3.3
        },
        {
          name: 'Implement dynamic height CSS',
          bestCaseHours: 4,
          expectedHours: 6,
          worstCaseHours: 10,
          weightedHours: 7.3
        },
        {
          name: 'Test with various content lengths',
          bestCaseHours: 3,
          expectedHours: 4,
          worstCaseHours: 8,
          weightedHours: 5.5
        },
        {
          name: 'Fix edge cases and UI inconsistencies',
          bestCaseHours: 4,
          expectedHours: 6,
          worstCaseHours: 12,
          weightedHours: 8.0
        }
      ],
      notes: 'This is a newly added task to improve the user experience by making cards resize based on content.'
    }
  },
  // Project 29 (Extra project 2)
  {
    id: 'extra2',
    title: 'Stage 1 vs Stage 2 Help Text Enhancement',
    appetite: 'S',
    deliverables: [
      'Complete the project'
    ],
    details: {
      assessorName: 'Team Member',
      assessmentDate: new Date('2025-08-02T14:00:00'),
      hourEstimate: 15,
      hourEstimateRange: '<30 hours',
      inScope: 'Update help text to clearly explain the differences between Stage 1 and Stage 2\nImplement consistent terminology across the application\nEnsure help text is accessible and visible to users',
      outOfScope: 'Changing the stage workflow or functionality',
      taskBreakdown: [
        {
          name: 'Draft improved help text content',
          bestCaseHours: 1,
          expectedHours: 2,
          worstCaseHours: 3,
          weightedHours: 2.2
        },
        {
          name: 'Review text with stakeholders',
          bestCaseHours: 1,
          expectedHours: 2,
          worstCaseHours: 4,
          weightedHours: 2.8
        },
        {
          name: 'Implement updated text in application',
          bestCaseHours: 2,
          expectedHours: 3,
          worstCaseHours: 6,
          weightedHours: 4
        },
        {
          name: 'Test visibility and clarity',
          bestCaseHours: 1,
          expectedHours: 2,
          worstCaseHours: 4,
          weightedHours: 2.8
        }
      ],
      notes: 'This is a newly added task to improve the user experience by providing clearer guidance on the stage progression.'
    }
  }
];
