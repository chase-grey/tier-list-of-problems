import type { Project, Task, Deliverable } from '../../types/project-models';
import { calculateWeightedHours } from '../../types/project-models';
import type { Appetite } from '../../types/models';

// Helper function to create task with weighted hours
const createTask = (name: string, best: number, expected: number, worst: number): Task => {
  return {
    name,
    bestCaseHours: best,
    expectedHours: expected,
    worstCaseHours: worst,
    weightedHours: calculateWeightedHours(best, expected, worst)
  };
};

// Helper to create project data
const createProject = (
  id: string,
  title: string,
  appetite: Appetite,
  deliverables: Deliverable[],
  inScope: string,
  outOfScope: string,
  hourEstimate: number,
  tasks: Task[]
): Project => {
  return {
    id,
    title,
    appetite,
    deliverables,
    details: {
      inScope,
      outOfScope,
      hourEstimate,
      taskBreakdown: tasks,
    }
  };
};

// New projects data will be added here

export const newProjects: Project[] = [
  // Support render rich text content in plain text STB
  createProject(
    '7963374',
    'Support render rich text content in plain text STB',
    'L',
    ['Get designs out', 'Create a prototype', 'Investigate options for saving RTF as plaintext which will not detract from existing workflows'],
    'Determine and implement best way to load scripts (given QAN 7817417, it seems like all scripts are always loaded anyway). ' +
    'Determine the code paths which should be allowed to expect RTF in plaintext scenarios. ' +
    'Create an API to process RTF into paragraphs even in plaintext mode and implement it in the relevant code paths. ' + 
    'Allow STB to hibernate with complex content in plaintext mode. ' +
    'Have a preliminary design out for review. ' +
    'Investigate options for implementing saving of in-progress AI text regions which still include RTF-backed content which are recoverable upon loading.',
    'Saving in-progress documents to text may be lossy in the initial implementation, as it is difficult (theoretically impossible) to store more than text in a text-only item without being lossy',
    90,
    [
      createTask('Either always load all scripts or conditionally load extras (unsure what is possible/safe)', 4, 6, 12),
      createTask('Create an internal API to allow certain workflows to consume RTF for generating complex paragraphs even while in plaintext mode', 4, 8, 20),
      createTask('Hook up relevant code points to above API', 4, 8, 16),
      createTask('Allow hibernating full RTF in plaintext mode', 4, 10, 25),
      createTask('Allow saving in-progress state to raw text, even though it includes rich content', 20, 60, 120)
    ]
  ),
  
  // Citations for text actions
  createProject(
    '7991592',
    'Citations for text actions',
    'L',
    ['Get designs approved', 'Get designs out', 'Create a plan for a future project', 'Create a prototype', 'Complete investigation'],
    'Provide citations for each lines of generated text that a citation would be helpful. ' +
    'For example, for line summarizing a large SmartLink, the citation for that line is the original SmartLink return. ' +
    'Another example if reference the original free text meaning that, if the output says "The patient has high blood pressure", ' + 
    'it could have a hover bubble or similar next to the sentence to reference a sentence like "The patient was found to be hypertensive" in the original text.',
    'Find the source of the SmartLink. For example, we only track content from SmartLink but not what SmartLink referenced.',
    188,
    [
      createTask('UX research', 30, 40, 60),
      createTask('Design', 10, 20, 30),
      createTask('AI citation UI', 0, 0, 10),
      createTask('Feed LLM with the citation source data and more discrete information like INI, id, dat', 20, 30, 40),
      createTask('When citation is free text, figure out how to represent it', 30, 40, 50),
      createTask('M code to generate RTF based on LLM citations as the LLM response', 10, 20, 30)
    ]
  ),
  
  // ST / Pitch / Forager for custom text actions
  createProject(
    '7991593',
    'ST / Pitch / Forager for custom text actions',
    'L',
    ['Get designs out', 'Create a plan for a future project', 'Create a prototype', 'Complete investigation'],
    'Have a prototype of integrating the text assistant in with forager. ' +
    'Investigate how forager works. ' +
    'Have a design out for review showing the technical plan and if there are any UI changes that would need to happen.',
    '',
    105,
    []
  ),
  
  // ADD HIGHLIGHT FUNCTIONALITY
  createProject(
    '803923',
    'ADD HIGHLIGHT FUNCTIONALITY',
    'M',
    ['Complete the project'],
    'Support adding, removing, and changing highlighting in rich text. ' +
    'Access from toolbar, context menu, and SmartActionBar. ' +
    'Handling inversion when flipping to low light mode and vice versa.',
    '',
    55,
    [
      createTask('Review existing code from Under Dev DLG', 2, 5, 10),
      createTask('Handling rebasing and merging existing code', 1, 4, 10),
      createTask('Finish cleaning up odds and ends with other formatting options', 2, 10, 20),
      createTask('Smart Action Bar support', 2, 6, 12),
      createTask('Design revisions', 1, 2, 3)
    ]
  ),
  
  // SmartPhrase Editor / SmartPhrase Editor should have a preview option
  createProject(
    '2058026',
    'SmartPhrase Editor should have a preview option',
    'S',
    ['Complete the project'],
    'Provide same preview used in ETX editor to HH1 editor. ' +
    'Provide same preview used in ETX editor to HHS editor.',
    'Provide same preview used in ETX editor to ELT editor',
    48,
    [
      createTask('Investigate reusability of ETX editor preview', 4, 8, 16),
      createTask('Implement preview on SmartPhrase Editor', 16, 24, 40),
      createTask('Implement preview on SmartLink Editor', 8, 16, 24)
    ]
  ),
  
  // ST / Usage / Add SmartPhrase Usage Information to SmartPhrase Manager
  createProject(
    '7462287',
    'ST / Usage / Add SmartPhrase Usage Information to SmartPhrase Manager',
    'M',
    ['Complete the project'],
    'When users open SmartPhrase, they will see a column of how often a SmartPhrase is used so that they can clean up the SmartPhrases that are rarely used. ' +
    'As a physician builder, they can also see the SmartPhrases used most often by my colleagues when I shared those phrases with them so that I know which ones I should keep up to date.',
    '',
    45,
    [
      createTask('Add new columns', 5, 10, 15),
      createTask('Update ECF to include usage data', 15, 30, 40)
    ]
  ),
  
  // Use AI to evaluate reading level in letter review
  createProject(
    '7691740',
    'Use AI to evaluate reading level in letter review',
    'M',
    ['Get designs out', 'Create a plan for a future project', 'Create a prototype', 'Complete investigation'],
    'Define the varying reading levels. ' +
    'Determine which direction we want to go with: ' +
    'Agent that tracks reading level based on context, ' +
    'Word based reading level gauge with AI powered replacement. ' +
    'Maybe still agent based for the replacement step (integrate with AITA?). ' +
    'Work on designs and prototype for what the UI would be.',
    '',
    60,
    []
  ),
  
  // Text Actions / Support summary levels in the dashboard
  createProject(
    '7774673',
    'Text Actions / Support summary levels in the dashboard',
    'M',
    ['Dev comp\'d', 'Get designs out', 'Complete investigation'],
    'Determine which multi-tier summary levels to support. ' +
    'Prototype changes to the different metrics to get rough performance impact for updating each call to the feature logging API to instead use the multi-tier API (logFeatureMultiTier). ' +
    'If acceptable difference, make updates to the feature logging calls for the metrics supported in the text actions dashboard. ' +
    'Update the dashboard.',
    '',
    40,
    [
      createTask('Design which tiers to support', 2, 3, 4),
      createTask('Prototype+performance test [select] tiers', 10, 15, 25),
      createTask('Finish updates to all metrics and dashboard', 8, 12, 20)
    ]
  ),
  
  // Create feedback buttons in AI SmartSections
  createProject(
    '7879768',
    'Create feedback buttons in AI SmartSections',
    'M',
    ['Complete the project'],
    'Add feedback buttons to bottom toolbar for generated text sections in SmartTextBox using standard control. ' +
    'Create Chronicles item/global for storing feedback of pre-defined and custom text actions. ' +
    'Allow applications to configure where feedback is stored for AI SmartLinks, pre-generated text inserted via public API, and workflow-specific text actions. ' +
    'Update Looks Good button caption to avoid confusion.',
    'Reporting analytics based on feedback',
    30,
    []
  ),
  
  // Improve reporting and auditing on custom text actions
  createProject(
    '7882764',
    'Improve reporting and auditing on custom text actions',
    'M',
    ['Get designs out', 'Create a prototype', 'Complete investigation'],
    'Determine what data to collect - MVP: Basic feature tracking data (user - location - action) ' +
    'Broken out by revert, looks good, or adjust selection (unique IDNs). ' +
    'Method of displaying data - MVP-- dashboard.',
    'Advanced logging data, advanced advanced logging data, future waves-- Clarity and/or RWB?',
    53,
    []
  ),
  
  // Improve As-Needed SmartLink Search
  createProject(
    '7936231',
    'Improve As-Needed SmartLink Search',
    'M',
    ['Get designs out', 'Create a prototype', 'Complete investigation'],
    'Determine best way to present this information (create design). ' +
    'Determine realistic use cases (include in design). ' +
    'Explore options of best ways to search and categorize data (investigation). ' +
    'Create a prototype without UI (development). ' +
    'Maybe?: Determine scope of work needed to have app teams update descriptions for existing SmartLinks.',
    'Completing the project, Finalized UI designs, User research',
    65,
    [
      createTask('Brainstorm ways to present this', 1, 2, 3),
      createTask('Create design with proposed UI and user experience', 4, 8, 15),
      createTask('User research', 10, 20, 40),
      createTask('Determine way to make this feature discoverable', 3, 5, 10),
      createTask('Research ways to efficiently search existing SmartTools', 10, 20, 40)
    ]
  ),
  
  // Automated testing for model responses for the text assistant could be better
  createProject(
    '7945918',
    'Automated testing for model responses for the text assistant could be better',
    'M',
    ['Complete investigation'],
    'Short term, we can probably reuse LJ\'s test script and add safeguard prompt with locale specific test.',
    'The ideal long term to make this easier for anyone to use is to make it available in an internal environment so that it does not require complexed setup.',
    56,
    [
      createTask('Get familiar with existing test script', 5, 10, 20),
      createTask('Provide standard way to extract custom text action prompts', 3, 5, 10),
      createTask('Make testing script work in other locale', 5, 10, 20),
      createTask('Provide clear instructions for how to test', 1, 2, 4),
      createTask('Make the solution extendable to other workflow', 5, 10, 20)
    ]
  ),
  
  // Mac / Accessibilty APIs can't detect text in SmartTextBox
  createProject(
    '7964399',
    'Mac / Accessibilty APIs can\'t detect text in SmartTextBox',
    'L',
    ['Complete the project'],
    'Make content visible to 3rd party vendors',
    '',
    70,
    [
      createTask('Make content visible to 3rd party vendors', 10, 40, 80)
    ]
  ),
  
  // Use MFT data to autofit/simplify rich text STB toolbar
  createProject(
    '7968293',
    'Use MFT data to autofit/simplify rich text STB toolbar',
    'M',
    ['Complete the project'],
    'Plug into ambulatory\'s auto-fit code to automatically remove/add rich-text toolbar items based on a predetermined usage threshold. ' +
    '(The same threshold that ambulatory uses, whatever that is.) ' +
    'This is complicated code, but we should be able to reuse most of the ambulatory auto-fit code. ' +
    'I think the biggest challenge will be moving the rich-text toolbar settings over to a TUN record.',
    'Auto-fit the plain-text toolbar, Auto-fit the context menu',
    45,
    []
  ),
  
  // The text assistant is not context aware
  createProject(
    '7968764',
    'The text assistant is not context aware',
    'L',
    ['Complete the project'],
    'I can now {pass an extension to/insert an agent into} the text action infrastructure, which enables me to more quickly create new text actions with a lower lift.',
    '',
    178,
    [
      createTask('Agent setup and planning', 30, 40, 75),
      createTask('Record (E0K Creation)', 10, 15, 35),
      createTask('Chronicles APIs (database logic)', 15, 20, 45),
      createTask('Output validation', 30, 40, 75)
    ]
  ),
  
  // smarttextbox - inline header/footer support
  createProject(
    '7983072',
    'smarttextbox - inline header/footer support',
    'L',
    ['Get designs out', 'Create a prototype', 'Complete investigation'],
    'Finish UX research. Create UX design. Create prototype. Identify the scope and MVP.',
    'Feature comparable with Word, Project complete',
    175,
    [
      createTask('Initial investigation of current implementations', 8, 16, 24),
      createTask('High-level UX and technical designs for prototype', 16, 24, 40),
      createTask('SmartApples prototype development', 40, 60, 80),
      createTask('SmartApples updates', 16, 20, 24),
      createTask('App and editor integration design', 16, 24, 40)
    ]
  ),
  
  // Text Actions / Model seems unwilling to rewrite text to use the patient's name and pronouns
  createProject(
    '7987877',
    'Text Actions / Model seems unwilling to rewrite text to use the patient\'s name and pronouns',
    'M',
    ['Complete the project'],
    'Review the existing pronoun guardrail introduced by DLG 2153040. Make the language more assertive. ' +
    'Validate against all defined text actions. ' +
    'Validate against custom text actions that involve the patient.',
    'Explore options to expose more configuration for app to control the behvaior as a stretch goal',
    60,
    [
      createTask('Prompt-engineering', 4, 6, 8),
      createTask('Update prompt in database', 4, 8, 16),
      createTask('Validate in STB for pre-defined', 4, 6, 8),
      createTask('Validate in STB for custom', 4, 6, 8)
    ]
  ),
  
  // Move AITA to Sous
  createProject(
    '7991596',
    'Move AITA to Sous',
    'L',
    ['Get designs out', 'Create a plan for a future project', 'Complete investigation'],
    'Better define what the agent will look like. Get some experience with Nebula/Sous Chef development and other agents. ' +
    'Figure out how we would build/migrate the text assistant to a Sous agent. What pieces will stay on the client/HSWeb, what pieces will live on Nebula. ' +
    'Still need to load prompts to client, and send content from client. ' +
    'Start process of moving predefined prompts to live in Nebula.',
    'Have a fully functioning agent',
    100,
    []
  ),
  
  // Refreshability for AI SmartSections
  createProject(
    '7991598',
    'Refreshability for AI SmartSections',
    'M',
    ['Dev comp\'d', 'Get designs approved', 'Get designs out', 'Create a prototype', 'Complete investigation'],
    'Start tracking insertion timestamp for AI SmartSections. If timestamp is older than some amount of time, display refresh button. ' +
    'Refresh SmartLinks inside AI prompt text, then update SmartSection.',
    'Integrate with server refresh, Passively refresh/reprompt in background so update is immediate, ' +
    'Anything involving regenerating after the AI SmartSection is accepted',
    90,
    [
      createTask('SmartTextBox changes (refresh cached off document, update SmartSection)', 20, 50, 80),
      createTask('Timestamp to tell last refresh time', 10, 20, 40)
    ]
  ),
  
  // Improve touch mode support
  createProject(
    '7992275',
    'Improve touch mode support',
    'M',
    ['Dev comp\'d'],
    'QAN 7759841 is the most important outstanding QAN. I\'m not sure how difficult this will be to fix; it might require a hyperspace-level fix. ' +
    'QAN 7946051 is also important and should be a straightforward fix.',
    'There are some new issues with the new increased button size. We don\'t have a complete list yet.',
    60,
    []
  ),
  
  // Organizations cannot disable individual text actions
  createProject(
    '7992375',
    'Organizations cannot disable individual text actions',
    'S',
    ['Dev comp\'d', 'Get designs approved', 'Create a prototype'],
    'Pick up with DLG 2117627. Connect the pieces. Read new HDF item and don\'t load prompts listed.',
    '',
    40,
    []
  ),
  
  // Agents don't have an easy way to write text to a textbox
  createProject(
    '7992394',
    'Agents don\'t have an easy way to write text to a textbox',
    'S',
    ['Complete the project'],
    'We only need to consider the first four things mentioned below',
    'Tools that AI agent can interact with (instead of a one way tool calling)',
    32,
    [
      createTask('Find the API functions', 2, 4, 8),
      createTask('Standardize its description', 2, 4, 8),
      createTask('Build the tools', 3, 8, 13),
      createTask('Pass the tools and call the tools when needed', 3, 8, 13)
    ]
  ),
  
  // Personalization Station - Allow multiple versions of SmartPhrases on download
  createProject(
    '7992395',
    'Personalization Station - Allow multiple versions of SmartPhrases on download',
    'M',
    ['Complete the project'],
    'Create new item to save previously saved version (or versions?) of RTF for a SmartPhrase. ' +
    'Add UI to allow users to revert back to that. ' +
    '(Optional): Add option for users to NOT overwrite edited SmartPhrases on download.',
    'Side by side comparison, Full contacts',
    55,
    [
      createTask('Add new item to HH1', 1, 2, 4),
      createTask('Update UI in editor and download window', 2, 4, 8),
      createTask('Add revert to previous version functionality', 2, 5, 12),
      createTask('Add "Do not overwrite" for downloads functionality', 4, 8, 15)
    ]
  ),
  
  // Spell Check - Compile Wintertree from Source for Windows Version of Hyperdrive Plugin
  createProject(
    '7992604',
    'Spell Check - Compile Wintertree from Source for Windows Version of Hyperdrive Plugin',
    'M',
    ['Complete the project'],
    'Create/update a makefile, CMake list, or vcxproj file to build ssce.dll for Windows. ' +
    'Submit an HDR to have the new ssce.dll added to the third party binaries and have the old pre-compiled DLL removed.',
    '',
    30,
    [
      createTask('Create/update a makefile, CMake list, or vcxproj file to build ssce.dll for Windows', 10, 20, 40)
    ]
  ),
  
  // Improve comparison with original text
  createProject(
    '7993912',
    'Improve comparison with original text',
    'M',
    ['Complete the project', 'Create a plan for a future project'],
    'Show special underline beneath key medical terms in output that don\'t appear in the original text. ' +
    'For Fix Spelling/Grammar, we\'ll underline any mismatch, using a more muted underline style for less relevant changes. ' +
    'Hovering or putting the text cursor within the underlined text will open the original text bubble and highlight the corresponding word/phrase. ' +
    'When original text bubble open, support hovering/activating text in either the output or original text such the corresponding text is highlighted.',
    'Highlighting all additions/deletions/modifications, Evaluating a comparison score to determine the quality of the output, ' +
    'Tracking comparison metrics for auditing purposes, Improving comparison UI for pink-highlighted generated text in reports',
    60,
    []
  ),
  
  // Support spell check in standalone
  createProject(
    '6191585',
    'Support spell check in standalone',
    'L',
    ['Complete the project'],
    'Get the full Spell Check functionality we already have working in standalone: ' +
    'ELX w/ overrides, SPL records, Autocorrects, Ability to add to your personal SPL.',
    'Adding any net new Spell Check features',
    218,
    [
      createTask('Transpile SSCE to WASM', 10, 20, 40),
      createTask('Transpile Lexi to WASM', 10, 20, 40),
      createTask('Create Wrapper Code to manage Lexi and WBS interaction & transpile to WASM', 40, 60, 80),
      createTask('Host Epic-installed files on HSWeb server', 10, 20, 40),
      createTask('Update SpellChecker.ts to decide whether to use standalone solution', 20, 40, 80)
    ]
  ),
  
  // Create an easier way to have "vanishing tips"
  createProject(
    '6855847',
    'Create an easier way to have "vanishing tips"',
    'L',
    ['In QA1', 'Dev comp\'d'],
    'New SmartSection SmartLink with user-entered parameters as the configuration vehicle for customers to configure the help text to display. ' +
    'Providing a new, unique style to these SmartSections. ' +
    'Preserve some features that exist with the optional SmartList build- principally that the help text is removed on sign and pulls in other SmartTool build.',
    'Utility for swapping existing disappearing help text (SmartLists) with the new build',
    120,
    [
      createTask('Support on Mobile', 5, 15, 30),
      createTask('Ignore help text in signal', 5, 10, 20),
      createTask('Ignore help text in chart search', 1, 5, 15),
      createTask('Complete work on UI and database DLG', 40, 60, 100)
    ]
  )
];
