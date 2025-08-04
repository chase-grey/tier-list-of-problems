/**
 * Styled components for KanbanBoard
 * 
 * This file contains all the styled components used in the Kanban board interface.
 * Keeping these styles separate improves maintainability and readability of the main components.
 */

import React from "react";
import { Box } from "@mui/material";

/**
 * Container component for the KanbanBoard
 * 
 * Provides the main layout container with proper styling for the Kanban board.
 * Uses flex layout to organize columns in a horizontal row.
 * 
 * @param props - Standard HTML div element props
 * @returns A styled container component
 */
export const Container = (props: React.HTMLAttributes<HTMLDivElement>) => (
  <Box
    {...props}
    sx={{
      display: 'flex',
      flexDirection: 'row',
      padding: '10px 0',
      // IMPORTANT: Removed overflowX and overflowY to avoid nested scroll container issues
      // Only TaskList should manage overflow behavior as the direct parent of Droppable
      width: '100%',
      height: '100%',
      gap: 0,
      backgroundColor: '#000000' /* Black background */
    }}
  />
);

/**
 * TaskList component that properly handles scrolling for Droppable
 * 
 * This component is critical for drag-and-drop functionality as it's the direct parent
 * of the Droppable component from react-beautiful-dnd. It handles overflow and scrolling
 * while maintaining drag-and-drop context.
 * 
 * @param props - Standard HTML div element props
 * @param ref - Forwarded ref for react-beautiful-dnd integration
 * @returns A styled scrollable container for tasks
 */
export const TaskList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
  <Box
    {...props}
    ref={ref}
    sx={{
      display: 'flex',
      flexDirection: 'column',
      background: '#222222', // Even darker grey background for columns
      width: '100%',
      borderRadius: '12px', // Match column header border radius
      padding: '10px',
      // Removed the inset box-shadow that was creating the border/line
      height: 'calc(100% - 46px)', // Adjust height to account for header
      maxHeight: 'calc(100% - 46px)', // Ensure it doesn't exceed container minus header
      // IMPORTANT: This is the only scroll container allowed for a Droppable
      // All parent elements must NOT have overflow settings
      overflowY: 'auto', // Enable vertical scrolling for each column independently
      overflowX: 'hidden', // Hide horizontal scrollbar
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      // Improved scrollbar styling to be less visually disruptive
      '&::-webkit-scrollbar': {
        width: '6px', // Slightly narrower scrollbar
        backgroundColor: 'transparent', // Transparent background
      },
      '&::-webkit-scrollbar-track': {
        background: 'transparent', // Transparent track
        margin: '5px 0', // Add some margin to top and bottom
      },
      '&::-webkit-scrollbar-thumb': {
        background: 'rgba(120, 120, 120, 0.4)', // Semi-transparent scrollbar thumb
        borderRadius: '6px',
        '&:hover': {
          background: 'rgba(140, 140, 140, 0.6)', // Slightly more opaque on hover
        },
      },
    }}
  />
));

/**
 * Task column container styles
 * 
 * Provides layout for the columns within the Kanban board.
 * Uses flex layout to distribute columns evenly and handle spacing.
 * 
 * @param props - Standard HTML div element props
 * @returns A styled container for columns
 */
export const TaskColumnStyles = (props: React.HTMLAttributes<HTMLDivElement>) => (
  <Box
    {...props}
    sx={{
      margin: 0,
      display: 'flex',
      width: '100%',
      height: '100%', // Use 100% height to fill parent container
      minHeight: 'calc(100vh - 92px)', // Ensure it fills available viewport space
      gap: 1, // Minimal spacing between columns
      padding: '0 2px', // Minimal horizontal padding
      mt: 1, // Top padding matches gap between columns
      mb: 0.5, // Reduced bottom padding
      flexGrow: 1, // Allow columns to grow and fill available space
    }}
  />
);

/**
 * Column header component with customizable styling
 * 
 * Renders the header for each column with appropriate styling.
 * Can be customized with different colors via the sx prop.
 * 
 * @param props - Props including sx for custom styling
 * @returns A styled column header
 */
export const ColumnHeader = (props: any) => (
  <Box
    {...props}
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: '8px', // Match spacing to gap between columns
      marginTop: '8px', // Match spacing to gap between columns
      padding: '10px 16px', // Maintain vertical padding
      borderRadius: '12px', // Rounded rectangle instead of full oval
      backgroundColor: '#4A5CFF', // Default color (will be overridden)
      color: '#FFFFFF',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      width: '100%', // Full width to match column width
      margin: '0 auto 8px auto', // Match spacing to gap between columns
      ...(props.sx || {})
    }}
  />
);

/**
 * Column title component
 * 
 * Displays the title text within a column header.
 * Handles text overflow with ellipsis for longer titles.
 * 
 * @param props - Standard HTML span element props
 * @returns A styled title component
 */
export const ColumnTitle = (props: React.HTMLAttributes<HTMLSpanElement>) => (
  <Box
    component="span"
    {...props}
    sx={{
      fontWeight: 600,
      fontSize: '1rem',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      textAlign: 'center',
      width: '100%',
    }}
  />
);
