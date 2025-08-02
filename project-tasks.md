# Tier List of Problems - Enhancement Plan

## Overview
This document tracks the remaining tasks for the Tier List of Problems project, organized into phases based on dependencies.

## Implementation Phases

### Phase 1: Foundation Updates

- [ ] **Update data to use all 27 pitches from the excel sheet + 2 extras**
  - Complexity: Medium
  - Estimate: 1-2 hours
  - Dependencies: None - this is a starting point
  - Subtasks:
    - [ ] Identify and extract all 27 pitches from the excel sheet
    - [ ] Create the 2 additional pitches
    - [ ] Update data structures to accommodate all 29 pitches

- [ ] **Remove "(months/quarter)" text after "Large" designation**
  - Complexity: Low
  - Estimate: 30 minutes
  - Dependencies: None - can be done independently
  - Subtasks:
    - [ ] Locate text in codebase
    - [ ] Remove or modify as needed

- [ ] **Add proper unit to number of hours after "Large" designation**
  - Complexity: Low
  - Estimate: 30 minutes
  - Dependencies: None - can be done independently
  - Subtasks:
    - [ ] Identify where hours are displayed
    - [ ] Add appropriate unit suffix

- [ ] **Update helptext to explain stage 1 vs stage 2**
  - Complexity: Low
  - Estimate: 1 hour
  - Dependencies: None - can be done independently
  - Subtasks:
    - [ ] Draft clear explanations for both stages
    - [ ] Update the UI text
    - [ ] Ensure terminology is consistent

### Phase 2: UI Improvements

- [ ] **Update the rank project section to use a new color**
  - Complexity: Low
  - Estimate: 30 minutes
  - Dependencies: Should have updated data first
  - Subtasks:
    - [ ] Define the new color scheme
    - [ ] Update relevant CSS/styled components

- [ ] **Update popup so the link is on the QAN ID, not a section below**
  - Complexity: Low
  - Estimate: 1 hour
  - Dependencies: No major dependencies
  - Subtasks:
    - [ ] Modify component structure
    - [ ] Update event handlers
    - [ ] Test functionality

- [ ] **Update cards in the project interest section to dynamically resize based on content**
  - Complexity: High
  - Estimate: 2-3 hours
  - Dependencies: No major dependencies, but should be done before updating rank project UI
  - Subtasks:
    - [ ] Analyze current card implementation
    - [ ] Modify card component to use dynamic height
    - [ ] Implement responsive sizing based on content
    - [ ] Test with various content lengths
    - [ ] Ensure consistent layout across all cards

### Phase 3: Major Features

- [ ] **Update the rank project section to use the same UI as the project interest section**
  - Complexity: High
  - Estimate: 3-4 hours
  - Dependencies: Requires updated data and ideally completed dynamic card resizing
  - Subtasks:
    - [ ] Analyze current project interest section UI components
    - [ ] Identify reusable components and patterns
    - [ ] Implement UI components in the rank project section
    - [ ] Ensure data binding works correctly with the new UI
    - [ ] Implement transitions and interactions

### Phase 4: Verification and Testing

- [ ] **Verify that users can export a CSV file for all 29 pitches from both sections**
  - Complexity: Medium
  - Estimate: 1-2 hours
  - Dependencies: Requires updated data and rank project UI
  - Subtasks:
    - [ ] Review current export functionality
    - [ ] Update export logic to include all 29 pitches
    - [ ] Test exports from both sections
    - [ ] Verify CSV format and content

- [ ] **Verify that users can fill out the rank project section enough to unlock the project interest section**
  - Complexity: Medium
  - Estimate: 1-2 hours
  - Dependencies: Requires updated rank project UI
  - Subtasks:
    - [ ] Review current unlock conditions
    - [ ] Test with various user inputs
    - [ ] Fix any issues with the unlock mechanism

- [ ] **Test out stage 2 for a variety of users**
  - Complexity: Medium
  - Estimate: 2-3 hours
  - Dependencies: All previous tasks should be completed
  - Subtasks:
    - [ ] Create test scenarios
    - [ ] Test with different user personas
    - [ ] Document and fix any issues found

## Most Complex Tasks
1. **Update the rank project section to use the same UI as the project interest section** - Requires significant component reuse and adaptation while ensuring data integration works correctly
2. **Update cards in the project interest section to dynamically resize** - Requires careful CSS work and testing across different content scenarios
3. **Test out stage 2 for a variety of users** - Time-consuming and may reveal additional issues to fix

## Progress Tracking
As we complete each task, we'll check them off and provide notes about implementation details when relevant.

## Current Status
We're ready to begin implementation following the phased approach outlined above. The recommended workflow is:

1. Start with the foundation updates in Phase 1, particularly updating the data structure to include all 29 pitches
2. Move to the UI improvements in Phase 2, with special attention to the dynamic card resizing task
3. Tackle the major feature update of the rank project section UI in Phase 3
4. Complete with verification and testing in Phase 4

This approach allows us to build incrementally while ensuring that dependent tasks don't block progress.
