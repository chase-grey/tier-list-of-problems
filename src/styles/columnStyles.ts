/**
 * Shared column styling utilities for consistent UI across different board views
 * This centralizes the styling for all column components to maintain consistent
 * appearance across project interest, ranking, and other board sections
 * 
 * IMPORTANT: STYLING CONSISTENCY GUIDELINES
 * --------------------------------------
 * 1. All column components throughout the application should use these shared styling utilities
 *    to ensure consistent appearance and behavior across all views.
 *    
 * 2. This includes both the project interest section (using PriorityColumn/SortableColumn) 
 *    and the rank projects section (using KanbanBoard).
 *    
 * 3. When making styling changes to columns:
 *    - Always update the styling here in the shared utilities
 *    - Never add overriding styles directly in the components unless absolutely necessary
 *    - If component-specific styling is needed, apply it AFTER the shared styles
 *    
 * 4. Special attention for drag-and-drop styling:
 *    - Always use `!important` with borderRadius to prevent square corners during drag operations
 *    - The BORDER_RADIUS constant defines the consistent corner radius across all column types
 *    
 * 5. All new column components should use these utilities rather than implementing their own styling
 */
import type { SxProps, Theme } from '@mui/material';

// Constants for consistent styling
const BORDER_RADIUS = '8px';
const TRANSITION_SPEED = '0.2s';
const DRAG_OVER_COLOR = 'action.hover';
const COLUMN_BG_COLOR = 'background.paper';

/**
 * Get consistent column container styles shared across all board components
 */
// Column spacing constants for consistent padding/margin throughout the app
const COLUMN_SPACING = 0.75; // 6px in MUI spacing (provides good visual separation)

export const getColumnContainerStyles = (): SxProps<Theme> => ({
  display: 'flex',
  flexDirection: 'column',
  height: 'auto', // Allow height to grow based on content
  minHeight: 'calc(100vh - 140px)', // Much taller columns that fill most of the viewport
  px: COLUMN_SPACING / 2, // Half spacing on each side = COLUMN_SPACING between columns
  // Fixed width with minimum constraints - prioritizing visual appearance
  minWidth: '230px', // Fixed minimum width for visual consistency
  maxWidth: '300px', // Maximum width to prevent excessive stretching
  mb: COLUMN_SPACING, // Add bottom margin to match header spacing
  mt: COLUMN_SPACING // Add top margin to match header spacing
});

/**
 * Get consistent column header styles shared across all board components
 * @param backgroundColor - Optional background color override
 */
export const getColumnHeaderStyles = (backgroundColor?: string): SxProps<Theme> => ({
  p: 1,
  mb: 1,
  backgroundColor: backgroundColor || 'primary.main',
  color: 'white',
  textAlign: 'center',
  fontWeight: 'bold',
  borderRadius: BORDER_RADIUS
});

/**
 * Get consistent column content styles shared across all board components
 * These styles are applied to the droppable container element
 * @param isDraggingOver - Whether a card is being dragged over this column
 * @param isEmpty - Whether the column is empty (for optional border styling)
 */
export const getColumnContentStyles = (
  isDraggingOver: boolean,
  isEmpty: boolean = false
): SxProps<Theme> => ({
  p: 1,
  flexGrow: 1,
  backgroundColor: isDraggingOver ? DRAG_OVER_COLOR : COLUMN_BG_COLOR,
  overflowY: 'auto',
  transition: `background-color ${TRANSITION_SPEED} ease`,
  border: isEmpty ? '2px dashed rgba(0,0,0,0.1)' : 'none',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  // Use !important to ensure border radius is consistently applied
  // This prevents the square corners issue during drag operations
  borderRadius: `${BORDER_RADIUS} !important`,
  // Add these properties to ensure highlighting stays within column boundaries
  overflow: 'hidden',
  // Use this to ensure any highlight elements stay within the border-radius
  '& > *': {
    borderRadius: `${BORDER_RADIUS} !important`
  }
});

/**
 * Get shared inner list styles for columns
 * @param _isDraggingOver - Whether a card is being dragged over this column (unused but kept for consistent API)
 */
export const getInnerListStyles = (_isDraggingOver: boolean): SxProps<Theme> => ({
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  // No need for !important here as this is for internal styling
  gap: 1
});

/**
 * Get the styling for drag placeholders to ensure consistent appearance
 */
export const getPlaceholderStyles = (): SxProps<Theme> => ({
  '& [data-rbd-placeholder-context-id]': {
    maxHeight: '100px',
    opacity: 0.3,
    transition: 'none',
    margin: '0'
  }
});
