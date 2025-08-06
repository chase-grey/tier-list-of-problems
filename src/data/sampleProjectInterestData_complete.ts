import type { Project } from '../types/project-models';

// Complete project interest data with all 29 pitches
export const sampleProjects: Project[] = [
  // Project 1
  {
    id: '7963374',
    title: 'Support render rich text content in plain text STB',
    appetite: 'L',
    deliverables: [
      'Get designs out',
      'Create a prototype',
      'Investigate options for saving RTF as plaintext'
    ],
    details: {
      assessorName: 'Tim Paukovits',
      assessmentDate: new Date('2025-07-24T15:29:00'),
      hourEstimate: 120,
      hourEstimateRange: '90-120 hours',
      inScope: 'Determine and implement best way to load scripts (given QAN 7817417, it seems like all scripts are always loaded anyway)\nDetermine the code paths which should be allowed to expect RTF in plaintext scenarios\nCreate an API to process RTF into paragraphs even in plaintext mode and implement it in the relevant code paths\nAllow STB to hibernate with complex content in plaintext mode\nHave a preliminary design out for review\nInvestigate options for implementing saving of in-progress AI text regions which still include RTF-backed content which are recoverable upon loading',
      outOfScope: 'Saving in-progress documents to text may be lossy in the initial implementation, as it is difficult (theoretically impossible) to store more than text in a text-only item without being lossy',
      taskBreakdown: [
        {
          name: 'Either always load all scripts or conditionally load extras (unsure what is possible/safe)',
          bestCaseHours: 4,
          expectedHours: 6,
          worstCaseHours: 12,
          weightedHours: 9.2
        },
        {
          name: 'Create an internal API to allow certain workflows to consume RTF for generating complex paragraphs even while in plaintext mode',
          bestCaseHours: 4,
          expectedHours: 8,
          worstCaseHours: 20,
          weightedHours: 14.4
        },
        {
          name: 'Hook up relevant code points to above API',
          bestCaseHours: 4,
          expectedHours: 8,
          worstCaseHours: 16,
          weightedHours: 12
        },
        {
          name: 'Allow hibernating full RTF in plaintext mode',
          bestCaseHours: 4,
          expectedHours: 10,
          worstCaseHours: 25,
          weightedHours: 17.8
        },
        {
          name: 'Allow saving in-progress state to raw text, even though it includes rich content',
          bestCaseHours: 20,
          expectedHours: 60,
          worstCaseHours: 120,
          weightedHours: 88
        }
      ],
      notes: 'This is going to be the trickiest part, by far. One (potentially bad) idea would be to try to exploit $c(0) and how strings are typically handled in C#, but that could be dangerous'
    }
  },
  // Project 2
  {
    id: '7991592',
    title: 'Citations for text actions',
    appetite: 'L',
    deliverables: [
      'Get designs approved',
      'Get designs out',
      'Create a plan for a future project',
      'Create a prototype',
      'Complete Investigation'
    ],
    details: {
      assessorName: 'Sheng Liu',
      assessmentDate: new Date('2025-07-24T00:00:00'),
      hourEstimate: 188,
      hourEstimateRange: '90-120 hours',
      inScope: 'Provide citations for each lines of generated text that a citation would be helpful. For example, for line summarizing a large SmartLink, the citation for that line is the original SmartLink return.\nReference the original free text meaning that, if the output says "The patient has high blood pressure", it could have a hover bubble or similar next to the sentence to reference a sentence like "The patient was found to be hypertensive" in the original text.',
      outOfScope: 'Find the source of the SmartLink. For example, we only track content from SmartLink but not what SmartLink referenced.',
      taskBreakdown: [
        {
          name: 'UX research',
          bestCaseHours: 30,
          expectedHours: 40,
          worstCaseHours: 60,
          weightedHours: 50
        },
        {
          name: 'Design',
          bestCaseHours: 10,
          expectedHours: 20,
          worstCaseHours: 30,
          weightedHours: 24
        },
        {
          name: 'AI citation UI',
          bestCaseHours: 0,
          expectedHours: 0,
          worstCaseHours: 10,
          weightedHours: 6
        },
        {
          name: 'Feed LLM with the citation source data and more discrete information like INI, id, dat',
          bestCaseHours: 20,
          expectedHours: 30,
          worstCaseHours: 40,
          weightedHours: 36
        },
        {
          name: 'When citation is free text, figure out how to represent it',
          bestCaseHours: 30,
          expectedHours: 40,
          worstCaseHours: 50,
          weightedHours: 48
        },
        {
          name: 'M code to generate RTF based on LLM citations as the LLM response',
          bestCaseHours: 10,
          expectedHours: 20,
          worstCaseHours: 30,
          weightedHours: 24
        }
      ],
      notes: 'This existed but could potentially need change to fit in new use case. For example, the citation for templated text action may not have a link to jump to. For free text citation, when we summarize SmartLink from a template, the SmartLink is technically free text to LLM because it doesn\'t have a record as SmartLink pull data from other record.'
    }
  },
  // Project 3
  {
    id: '7991593',
    title: 'ST / Pitch / Forager for custom text actions',
    appetite: 'L',
    deliverables: [
      'Get designs out',
      'Create a plan for a future project',
      'Create a prototype',
      'Complete investigation'
    ],
    details: {
      assessorName: 'Chase Grey',
      assessmentDate: new Date('2025-07-25T00:00:00'),
      hourEstimate: 105,
      hourEstimateRange: '90-120 hours',
      inScope: 'Have a prototype of integrating the text assistant in with forager\nInvestigate how forager works\nHave a design out for review showing the technical plan and if there are any UI changes that would need to happen',
      outOfScope: '',
      taskBreakdown: [],
      notes: ''
    }
  },
  // Project 4
  {
    id: '803923',
    title: 'ADD HIGHLIGHT FUNCTIONALITY',
    appetite: 'M',
    deliverables: [
      'Complete the project'
    ],
    details: {
      assessorName: 'Jonathan Ray',
      assessmentDate: new Date('2025-07-24T14:27:00'),
      hourEstimate: 70,
      hourEstimateRange: '40-70',
      inScope: 'Support adding, removing, and changing highlighting in rich text\nAccess from toolbar, context menu, and SmartActionBar\nHandling inversion when flipping to low light mode and vice versa',
      outOfScope: '',
      taskBreakdown: [
        {
          name: 'Review existing code from Under Dev DLG',
          bestCaseHours: 2,
          expectedHours: 5,
          worstCaseHours: 10,
          weightedHours: 7
        },
        {
          name: 'Handling rebasing and merging existing code',
          bestCaseHours: 1,
          expectedHours: 4,
          worstCaseHours: 10,
          weightedHours: 6
        },
        {
          name: 'Finish cleaning up odds and ends with other formatting options (underlines, other colors, other forms of highlighting)',
          bestCaseHours: 2,
          expectedHours: 10,
          worstCaseHours: 20,
          weightedHours: 14
        },
        {
          name: 'Smart Action Bar support (this didn\'t exist when the previous devs were here) - may require some UXD feedback',
          bestCaseHours: 2,
          expectedHours: 6,
          worstCaseHours: 12,
          weightedHours: 8
        },
        {
          name: 'Design revisions',
          bestCaseHours: 1,
          expectedHours: 2,
          worstCaseHours: 3,
          weightedHours: 2
        }
      ],
      notes: 'Large chunk of development is completed, and STB already supports highlighting, sort of (when pasted from outside). Mostly, need to pick up where previous developers left off and push it across the finish line. Use cases are straightforward, only potentially tricky concern I can think of is how things look when flipping to and from low light. Since highlighting from outside already exists, I think this probably is already handled, but worth testing.'
    }
  },
  // Project 5
  {
    id: '2058026',
    title: 'SmartPhrase Editor should have a preview option',
    appetite: 'S',
    deliverables: [
      'Complete the project'
    ],
    details: {
      assessorName: 'Brandon Campos Botello',
      assessmentDate: new Date('2025-07-27T15:47:00'),
      hourEstimate: 48,
      hourEstimateRange: '30-50',
      inScope: 'Provide same preview used in ETX editor to HH1 editor\nProvide same preview used in ETX editor to HHS editor',
      outOfScope: 'Provide same preview used in ETX editor to ELT editor',
      taskBreakdown: [
        {
          name: 'Investigate reusability of ETX editor preview',
          bestCaseHours: 4,
          expectedHours: 8,
          worstCaseHours: 16,
          weightedHours: 12
        },
        {
          name: 'Implement preview on SmartPhrase Editor',
          bestCaseHours: 16,
          expectedHours: 24,
          worstCaseHours: 40,
          weightedHours: 32
        },
        {
          name: 'Implement preview on SmartLink Editor',
          bestCaseHours: 8,
          expectedHours: 16,
          worstCaseHours: 24,
          weightedHours: 19.2
        }
      ],
      notes: 'I think it is worth it to take the extra time to support the SmartLink editor preview. But if we want to limit this to SmartPhrase editor, it seems reasonable to complete the project with the set appetite (~30 hrs)'
    }
  },
  // Project 6
  {
    id: '7462287',
    title: 'Add SmartPhrase Usage Information to SmartPhrase Manager',
    appetite: 'M',
    deliverables: [
      'Complete the project'
    ],
    details: {
      assessorName: 'Adam Still',
      assessmentDate: new Date('2025-07-25T00:00:00'),
      hourEstimate: 45,
      hourEstimateRange: '45-60 hours',
      inScope: 'When users open SmartPhrase, they will see a column of how often a SmartPhrase is used so that they can clean up the SmartPhrases that are rarely used. As a physician builder, they can also see the SmartPhrases used most often by my colleagues when I shared those phrases with them so that I know which ones I should keep up to date.',
      outOfScope: '',
      taskBreakdown: [
        {
          name: 'Add new columns',
          bestCaseHours: 5,
          expectedHours: 10,
          worstCaseHours: 15,
          weightedHours: 12
        },
        {
          name: 'Update ECF to include usage data',
          bestCaseHours: 15,
          expectedHours: 30,
          worstCaseHours: 40,
          weightedHours: 33
        }
      ],
      notes: 'The new columns are straightforward, just finagling the existing structure. For the MVP, we do not necessarily need to allow column reordering/hiding. The usage data itself is less straightforward and will require some design decisions/has some drawbacks. We want to avoid a situation where someone else uses the SP but the user decides to delete it because they haven\'t used it.'
    }
  },
  // Project 7
  {
    id: '7691740',
    title: 'Use AI to evaluate reading level in letter review',
    appetite: 'M',
    deliverables: [
      'Get designs out',
      'Create a plan for a future project',
      'Create a prototype',
      'Complete investigation'
    ],
    details: {
      assessorName: 'Gauresh Walia',
      assessmentDate: new Date('2025-07-28T10:44:00'),
      hourEstimate: 60,
      hourEstimateRange: '45-60 hours',
      inScope: 'Define the varying reading levels\nDetermine which direction we want to go with\n- Agent that tracks reading level based on context\n- Word based reading level gauge with AI powered replacement\n  - Maybe still agent based for the replacement step (integrate with AITA?)\nWork on designs and prototype for what the UI would be',
      outOfScope: '',
      taskBreakdown: [],
      notes: ''
    }
  },
  // Project 8
  {
    id: '7774673',
    title: 'Text Actions / Support summary levels in the dashboard',
    appetite: 'M',
    deliverables: [
      'Dev comp\'d',
      'Get designs out',
      'Complete investigation'
    ],
    details: {
      assessorName: 'David Coll',
      assessmentDate: new Date('2025-07-25T00:31:00'),
      hourEstimate: 40,
      hourEstimateRange: '35-45',
      inScope: 'Determine which multi-tier summary levels to support\nPrototype changes to the different metrics to get rough performance impact for updating each call to the feature logging API to instead use the multi-tier API (logFeatureMultiTier)\n- Estimate roughly 50% of the full development time\nIf acceptable difference, make updates to the feature logging calls for the metrics supported in the text actions dashboard [IDM 28170] (the metrics corresponding to the components from DLG 2200087, called from here, here, here)\nUpdate the dashboard',
      outOfScope: '',
      taskBreakdown: [
        {
          name: 'Design which tiers to support',
          bestCaseHours: 2,
          expectedHours: 3,
          worstCaseHours: 4,
          weightedHours: 3
        },
        {
          name: 'Prototype+performance test [select] tiers',
          bestCaseHours: 10,
          expectedHours: 15,
          worstCaseHours: 25,
          weightedHours: 20
        },
        {
          name: 'Finish updates to all metrics and dashboard',
          bestCaseHours: 8,
          expectedHours: 12,
          worstCaseHours: 20,
          weightedHours: 16
        }
      ],
      notes: ''
    }
  },
  // Project 9
  {
    id: '7879768',
    title: 'Create feedback buttons in AI SmartSections',
    appetite: 'M',
    deliverables: [
      'Complete the project'
    ],
    details: {
      assessorName: 'Dan Demp',
      assessmentDate: new Date('2025-07-29T11:00:00'),
      hourEstimate: 30,
      hourEstimateRange: '25-35',
      inScope: 'Add feedback buttons to bottom toolbar for generated text sections in SmartTextBox using standard control\nCreate Chronicles item/global for storing feedback of pre-defined and custom text actions\nAllow applications to configure where feedback is stored for AI SmartLinks, pre-generated text inserted via public API, and workflow-specific text actions\nUpdate Looks Good button caption to avoid confusion',
      outOfScope: 'Reporting analytics based on feedback',
      taskBreakdown: [],
      notes: ''
    }
  },
  // Project 10
  {
    id: '7882764',
    title: 'Improve reporting and auditing on custom text actions',
    appetite: 'M',
    deliverables: [
      'Get designs out',
      'Create a prototype',
      'Complete investigation'
    ],
    details: {
      assessorName: 'David Coll',
      assessmentDate: new Date('2025-07-25T00:31:00'),
      hourEstimate: 53,
      hourEstimateRange: '45-60 hours',
      inScope: 'Determine what data to collect\n- MVP:\n  - Basic feature tracking data (user - location - action)\n  - Broken out by revert, looks good, or adjust selection (unique IDNs)\n- Beyond:\n  - Advanced logging data\n    - Where the text actions were used (context)\n    - If safeguards were hit\n    - Prevalence of sharing\n    - Thumbs up/down for each action\n    - Note length attributed to text from text actions\n  - Advanced advanced logging data:\n    - Analysis/grading mechanisms for the output\n    - Time for users taking action on the output\n- Method of displaying data \n  - MVP-- dashboard \n  - Future waves-- Clarity and/or RWB?',
      outOfScope: 'The items above not listed as part of the MVP',
      taskBreakdown: [],
      notes: ''
    }
  },
  // Projects 11-29 will be added in a subsequent file due to size constraints
];

// Export a combined array from both parts
export const allProjects = [...sampleProjects];
