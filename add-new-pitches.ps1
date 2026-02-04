$newPitches = @"
  {
    "id": "7989552",
    "title": "st / pitch / rtf/html - lightweight RTF component for views",
    "details": {
      "problem": "Developers do not have a complete set of options for easily displaying RTF-backed content in their views. The wiki calls out that the ReportViewer is an ideal container because of the extra functionality it provides. Without the ability to use one (which is sometimes the case), developers have to fall back to setting something like \"dangerouslySetInnerHTML\" on a component and dealing with the risks (and shortcomings) of native HTML rendering.",
      "ideaForSolution": "Ideally, we could provide a lightweight component which is somewhere between a full ReportViewer and a simple DOM element wrapped around a string. This would remove a large amount of duplicative/boilerplate code and make it simpler for new views to include RTF-backed content.",
      "characteristics": "Being able to simply render RTF as HTML by setting a string value on a component would be a huge win. If we could also pull in all/most of the extra bells and whistles we are able to support in ReportViewer workflows (attribution, low vision, etc.) that would be a complete package.",
      "whyNow": "Now that web transitions are done, people are looking for ways to do new things and have already started reaching out (Varghese Mathew would be interested in hearing about any updates here). Additionally, now that we are no longer bound by IE limitations, we could start looking on implementing PRJ 287784 to optimize/simplify the HTML we output. By adding an extra level of abstraction we can get around a lot of the struggles we have had fighting against CSPs.",
      "smartToolsFit": "This fits our mission on several levels. First, it helps create a consistency between different implementations of RTF viewing in Hyperspace by avoiding app-specific implementation discrepancies. It will help improve efficiency of others by avoiding duplicative/boilerplate code in all of the application codebases. By adding this functionality, we make it easier for developers to consume RTF-backed content and make it easier to do the \"right thing\". Lastly, this helps make out tools easier to access by other Epic developers.",
      "epicFit": "This aligns with Epic's priorities to innovate with system intelligence to reduce developer overhead and frustration. This aligns with SmartTools' team priorities to solve existing pain points.",
      "success": "Success will be measured by being able to remove all (or at least almost all) direct implementations of the RTF-to-HTML APIs and instead route them through components which we control (and can, therefore, standardize).",
      "maintenance": "This will definitely require more testing/maintenance, as it will essentially be a new \"product\" for developers. However, it will also help alleviate some of the app-specific issues we encounter and allow us an easy way to test \"realistic\" setups by avoiding one-off situations.",
      "internCandidate": true
    }
  },
  {
    "id": "7992270",
    "title": "ST / Pitch / Create custom autocomplete model for EMC2",
    "details": {
      "problem": "EMC2 users will soon see autocomplete predictions as they type in SmartTextBoxes throughout the software. However, the word completion piece of the current autocomplete model was built using data from Cosmos Notes, meaning that the predictions are often for medical terms that are less relevant in EMC2 workflows.",
      "ideaForSolution": "As an EMC2 user, it would be great to see autocomplete suggestions as I type that are relevant to the language and structure used by Epic while writing designs, QA notes, or QA instructions. To accomplish this, we could collect data from EMC2 sources such as DLGs, QANs, SLGs, XDSs, etc. to create a new word completion model specific to EMC2 workflows.",
      "characteristics": "EMC2 users get better autocomplete suggestions within SmartTextBoxes.",
      "whyNow": "We're planning to turn autocomplete on for all users in the November 25 version. If users find the suggestions unhelpful, they will likely turn off the functionality entirely, meaning they would miss out on any future improvements."
    }
  },
  {
    "id": "7992394",
    "title": "ST / Feb '26 Pitch / Agents don't have an easy way to write text to a textbox",
    "details": {
      "problem": "Developers who are creating agents here at Epic are missing a key tool for agents to use, the ability to write to a textbox. With AI SmartSections, we have great UI and infrastructure setup for handling unreviewed AI generated text being placed in a textbox. What's missing is exposing these APIs to agents to allow an agent to put this unreviewed AI generated text in a textbox.",
      "whyNow": "Based on this 6/24/25 GenAI strategy monthly, a key way that agents will interact with the rest of the Epic system is through tools, which are: An API to do one thing, Usually deterministic, Has a structured input & output contract, Is used by agents, often via function calling. Exposing an API to allow agents to use function calling to write text to a textbox seems like an obvious foundation agent that would be useful in many workflows across Epic. Most of the work here is already done with AI SmartSections, we just need to expose it to agents now.",
      "internCandidate": false
    }
  },
  {
    "id": "7993986",
    "title": "ST / Text Actions / Feb '26 pitch / Support embedded parameter entry",
    "details": {
      "problem": "Currently, there is no way for a user to specify inputs for templated text actions when they're inserted into a SmartTextBox. The SmartText/SmartPhrase passed to the text action needs to be configured up front, and the only dynamic data will be from SmartLinks. While other AI SmartLinks can expose user-entered parameters, those can only be controlled by the user if they're directly inserting the SmartLink. If it's pulled in as part of a SmartText/SmartPhrases, any user-entered parameters would need to be similarly defined up front and thus wouldn't be dynamic.",
      "ideaForSolution": "Allow users to resolve AI SmartLinks with user-entered parameters to a section with embedded form fields for specifying inputs and buttons to generate the text once inputs are filled out or forgo generating text in favor of manual entry. This could work whether the AI SmartLink is inserted directly or pulled in via SmartText/SmartPhrase template. It could also work for AI SmartLinks without user-entered parameters if builders want users to choose before running any prompt.",
      "characteristics": "Flexible, Easy to use, Easy to build",
      "whyNow": "Templated text actions and AI SmartLinks are just taking off, and this would greatly expand their potential."
    }
  },
  {
    "id": "8033379",
    "title": "ST/ SmartPhrase/ Show user tags in the smarttool butler",
    "details": {
      "problem": "A physician has built out a bunch of tags to organize her SmartPhrases in the Manager but can't find them to use in the note so she has to switch back to the SmartPhrase Manager to be able to benefit from her new organization system with tags",
      "ideaForSolution": "Users will be able to open the SmartTool butler and filter by tags or add tags to SmartPhrases and SmartLinks. This will make it easier for end users to use their tags in their workflow and add tags to SmartLinks, which are also often hard to find and organize",
      "characteristics": "Tags will be usable in an end users actual workflow, they're easy to see and add new ones, and makes it easier to find their SmartTools",
      "whyNow": "We released tags in Nov 25 so we should keep this project moving. The main feedback that we got from usability studies is that they wanted this available in the note so it's something that is already requested and will continue to be a pain point until we fix it",
      "smartToolsFit": "Smarttool build and access should reduce time and mental load for users to use the tools and UX should make SmartTools easy to find, share, and discover and this would help achieve that.",
      "epicFit": "This is an enhancement that would help users and could help reduce burnout by improving efficiency",
      "success": "Users can use their tags while they're writing their note without having to switch workspaces",
      "maintenance": "Low, this should just be another column in the butler after it has been released",
      "internCandidate": false
    }
  },
  {
    "id": "8051800",
    "title": "ST / Text Assistant / Let Users Supply Custom Context",
    "details": {
      "problem": "As a clinician, I want the ability to add my own context to the AI Text Assistant, such as replacing \"hello\" with \"aloha\", making it sound more like me by supplying a writing sample, or letting it reference 3rd party clinical documentation that I use for patient care. This will help reduce my cognitive burden and focus more on patient care.",
      "ideaForSolution": "Now, the AI Text Assistant has an even better understanding of my tone and makes the note sound more like me.",
      "characteristics": "Provide users (or organizations) a way to: Supply custom instructions to include as part of the prompt infrastructure, Reference 3rd party documentation, such as clinical references, to include in their notes, Create a flexible framework to expand on new use cases",
      "whyNow": "Give users the best experience with AI. AITA is one of the ST cornerstone AI features.",
      "smartToolsFit": "Create tools to improve efficiency of documentation. Reduce cognitive burden and duplicative documentation; make the text assistant feel more personal; make it more fun to use",
      "epicFit": "Continue making progress on the AI Text Assistant. Innovate with infrastructure for system intelligence. This is (possibly) the next step of forager.",
      "success": "Increased adoption and widespread use of the AI Text Assistant. Track the amount and types of custom context added by users. This can also help inform future out-of-the-box text actions.",
      "maintenance": "No/low. Users would store their own context and/or opt into the behavior.",
      "internCandidate": false
    }
  },
  {
    "id": "8062765",
    "title": "ST / SmartText Editor / Allow the plaintext SmartText Editor to accept Unicode in some cases",
    "details": {
      "problem": "As a builder of MyChart ticklers (and other patient facing content), I need to take Arabic text, encode it, and add that to the SmartText Editor when adding the HTML content to the SmartText. This adds extra work for maintaining these SmartTexts and makes it harder to make changes when corrections need to be made.",
      "ideaForSolution": "Ideally, Epic would allow me to enter Arabic text directly into the SmartText Editor when building these plaintext SmartTexts.",
      "characteristics": "Support Unicode plaintext directly in plaintext SmartTexts. Only enabled for specific workflows like MyChart Ticklers but not others like MR Orders. This would likely be done using a SmartTool Context setting (N-node for the category or SmartText Editor E2N now; setting within a Context record in the future).",
      "whyNow": "Makes analyst work maintaining the system easier.",
      "smartToolsFit": "SmartTools (tools) we develop should be easy to build and expand on.",
      "epicFit": "Solving existing pain points, such as ideas frequently reported during immersion, submitted through ideas.epic.com, or from other forms of feedback",
      "success": "Builder feedback",
      "maintenance": "Overall reduction for time it takes to build and maintain MyChart Ticklers.",
      "internCandidate": false
    }
  },
  {
    "id": "8066648",
    "title": "ST / May '26 Pitch / Reevaluate and Unify SmartSection UI Across Apps",
    "details": {
      "problem": "Users are starting to encounter more and more SmartSections in their workflows, and this trend will continue as we release more SmartSections. However, each of these SmartSections looks a little different, and sometimes they have to remember which SmartSections have which buttons/features where. This adds extra cognitive load.",
      "ideaForSolution": "All SmartSections should follow some sort of pattern for their general interactive structure",
      "characteristics": "Existing SmartSections should be updated to use the new patterns. Core SmartTools code should be updated so that it's easy to do the right thing",
      "whyNow": "We are releasing more SmartSections every version. The core work of implementing many SmartSections is already done. Because we have 4-5 big SmartSections now, we can see that there has been a lot of clashes in SmartSection layout and styling",
      "smartToolsFit": "SmartTools we develop should be easy to build and expand on. App teams should not have to rehash the same discussions on styling and positioning for every new SmartSection. Tools we develop should be a joy to use. Each SmartSection should not require a separate mental model for users",
      "internCandidate": false
    }
  },
  {
    "id": "8069508",
    "title": "st / rtf/html - field logic should be refactored into derived classes",
    "details": {
      "problem": "As a developer, the Field.cs codebase has become overly cumbersome to work with. When initially created, its purpose was to help translate simple RTF field markup (which was 90%+ hyperlinks) into HTML. Since then it has become overloaded with much more complex (Epic-specific) features such as citations and TextAction results. This creates a lot of extra clutter/overhead when attempting to make changes and can unnecessarily increase testing scope due to things such as shared methods.",
      "ideaForSolution": "As a developer, it would help if the infrastructure worked more like what we currently have employed for the CharacterGroup base class. We already have a similar mechanism employed on the SmartTextBox side of things, as we had a need for a larger variety of field types much earlier on in the lifecycle. We can leave truly shared/common functionality in the base class, but then allow for derived classes to handle more specialized tasks. This would help with code cleanliness, separation, and readability. Because this serves more of a \"black box\" purpose on the C# side of things, we will still need to allow for very generic options such that we can maintain field types we do not explicitly \"support\" in full, but this should still all fall within the base/derived class scenario.",
      "characteristics": "Having all of the Epic-specific fields (and maybe even some other non-generic ones) living in separate classes would show great progress in this area.",
      "whyNow": "We seem to be relying more on overloading fields as of late, so it would be best to do this before the task becomes too daunting.",
      "smartToolsFit": "It will help improve efficiency and code stability by providing more structure around one of our most-active areas.",
      "epicFit": "This aligns with Epic's priorities to innovate with system intelligence to improve user/developer efficiency. This aligns with SmartTools' team priorities to help maintain our high quality product by encapsulating unique code concepts like we do elsewhere in our codebase. This area of the code is currently critical to the usage of AI text results as well as citations, which are both relatively new ST features requiring high quality results.",
      "success": "Representing our known field types (which are relevant for the platform) in separate classes while still allowing for generic field processing (for RTF flattening purposes) will be the key ways in which we measure success.",
      "maintenance": "Theoretically, this should help improve maintenance and testing costs long-term, as it will allow for more-targeted scoping in future projects.",
      "internCandidate": true
    }
  },
  {
    "id": "8076785",
    "title": "DoCo/SmartTools/Create an inline mobile plain text STB control",
    "details": {
      "problem": "When I am using Hyperspace on mobile and fill documentation with SmartText Box, it would be nice to start typing into the STB as if it is a inline control instead of launching the STB in a separate view to edit.",
      "ideaForSolution": "Implement a inline control version of STB that can work in mobile",
      "characteristics": "Provide good user experience. Seemless as if typing in entry field. Reduce jumping to activity and clicks",
      "whyNow": "We have much more activities will be available to mobile.",
      "internCandidate": false
    }
  },
  {
    "id": "8078994",
    "title": "ST / Gen AI / Citation Excerpt Infrastructure",
    "details": {
      "problem": "As a physician, I started to use some new AI SmartLinks to help draft my note. It pulls in some citations along with the generated content. When hover over, I see the line of content it referenced but I am not sure which part it is specifically based off when the citation contains a block of note content. It is nice to have more source context but it slows me down sometime if I have to read through all content in hover bubble to verify it is referencing the correct information and generated the right interpretation.",
      "ideaForSolution": "It would be nice if it highlight the exact words and phrases referenced from the source in the hover bubble so that I can quickly review those instead of reading through everything in the hover bubble.",
      "characteristics": "Follow the UX guideline. Consistent cross system.",
      "whyNow": "We already have he excerpt highlighting feature implemented in some released AI Citation print group but not some recent AI SmartLink generated citations.",
      "epicFit": "Innovate with system intelligence to reduce clinician burnout and improve user efficiency. Innovate with infrastructure for system intelligence, such as building new agent components and UI for app teams to leverage. Innovate with system intelligence for new SmartTools AI features. Support app team on their AI feature",
      "success": "This will need to pair this with feature tracking on reading time on citation hover bubble which is current tracked in PRJ 345350. We will meet general UX expectation and industry expectation.",
      "maintenance": "Low",
      "internCandidate": false
    }
  }
"@

# Read the existing JSON file
$json = Get-Content -Path "c:\EpicSource\tier-list-of-problems\src\assets\pitches.json" -Raw

# Remove the last closing bracket
$json = $json.TrimEnd() -replace ']$', ''

# Append the new pitches and close the JSON array
$json = $json + ",`n" + $newPitches + "`n]"

# Save the updated JSON
Set-Content -Path "c:\EpicSource\tier-list-of-problems\src\assets\pitches.json" -Value $json -Encoding UTF8

Write-Output "Successfully added 11 new pitches to the JSON file"
