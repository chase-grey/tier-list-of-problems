
# Problem-Polling Web App

## Overview

This application provides a drag-and-drop interface for ranking problem pitches into tiers and assigning effort appetites. It's designed to help teams prioritize work items through collaborative voting.

![Problem Polling App - Dark Mode](./docs/app-preview.png)

## Features

- **Drag and Drop Ranking**: Sort pitches into 8 tier buckets
- **Effort Classification**: Mark each pitch as Small (S), Medium (M), or Large (L) appetite
- **Persistence**: All progress saved to localStorage automatically
- **CSV Export**: Download your rankings for further analysis
- **Accessibility**: WCAG 2.1 AA compliant dark mode interface
- **Responsive**: Works on desktop and tablet devices

## Tech Stack

- **Framework**: React 18 with TypeScript
- **UI Components**: Material-UI v6 (dark palette)
- **Drag-and-Drop**: @hello-pangea/dnd (maintained fork of react-beautiful-dnd)
- **CSV Export**: PapaParse
- **Build System**: Vite

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Development server with hot reload
npm run dev

# Production build
npm run build
```

## Data Structure

The application uses the following data model:

```ts
// Core entities
export interface Pitch {
  id: string;
  title: string;
  details: {
    problem: string;  // Required
    // Other optional fields...
  };
}

// Vote types
export type Appetite = 'S' | 'M' | 'L';  // Small | Medium | Large
export type Tier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// User's votes
export interface Vote {
  pitchId: string;
  appetite: Appetite;
  tier: Tier;
}
```

## Local Storage

The application persists user state in localStorage under the key `polling.appState` containing:

- `voterName`: The name entered by the current user
- `votes`: A record of all votes keyed by pitchId

## Usage

1. Enter your name at the prompt
2. Drag cards from the "Unsorted" column into appropriate tier buckets (1-8)
3. Click the colored dots on each card to assign S/M/L appetite
4. When all cards are classified and ranked, export to CSV

## Roadmap / Future Enhancements

- Light mode theme option
- Configurable tier count (6/8/10 buckets)
- Touch-optimized drag sensor for tablets
- CSV merge utility for aggregating results
- Authentication integration

