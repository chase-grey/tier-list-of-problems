import React from "react";
import { Box } from "@mui/material";
import { Droppable } from "@hello-pangea/dnd";
import { TaskList, ColumnHeader, ColumnTitle } from "./KanbanBoardStyles";
import TaskCard from "./TaskCard";
import { type KanbanColumn as KanbanColumnType } from "./KanbanData";

/**
 * Props for the KanbanColumn component
 */
interface KanbanColumnProps {
  /** Unique ID for the column, used as the droppable ID */
  columnId: string;
  /** Column data including title and items */
  column: KanbanColumnType;
  /** Optional user role for permissions */
  userRole?: string | null;
  /** Performance metrics for optimizing rendering during drag operations */
  performanceMetrics: {
    /** Whether a drag operation is in progress */
    isDragging: boolean;
    /** ID of the currently active (being dragged) item */
    activeItemId: string | null;
  };
}

/**
 * Individual column component for the Kanban board
 * 
 * Renders a column with a header and a list of draggable task cards.
 * Implements performance optimizations for drag-and-drop operations.
 */
const KanbanColumn = ({ 
  columnId, 
  column, 
  userRole,
  performanceMetrics 
}: KanbanColumnProps) => {
  // Determine column header color based on column title
  const getColumnColor = (title: string) => {
    switch (title.toLowerCase()) {
      case 'high':
        return '#e74c3c'; // Red for high priority
      case 'medium':
        return '#f39c12'; // Orange for medium priority
      case 'low':
        return '#3498db'; // Blue for low priority
      case 'done':
        return '#27ae60'; // Green for done
      case 'to-do':
      case 'todo':
        return '#5F4CFF'; // Purple for to-do
      case 'in progress':
        return '#9b59b6'; // Purple for in-progress
      case 'testing':
        return '#2980b9'; // Blue for testing
      default:
        return '#4A5CFF'; // Default blue
    }
  };

  return (
    <Box key={columnId} 
      sx={{ 
        padding: '0 2px', // Minimal padding between columns
        width: '100%',
        display: 'flex', 
        flexDirection: 'column',
        maxWidth: {
          xs: '100%', // Full width on mobile
          sm: '45%',  // 45% width on small screens (2 columns)
          md: '30%',  // 30% width on medium screens (3 columns)
          lg: '24%',  // 24% width on large screens (4 columns)
        },
      }}>
      <Box sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <ColumnHeader 
          sx={{ 
            backgroundColor: getColumnColor(column.title),
          }}
        >
          <ColumnTitle>
            {column.title}
            {column.items.length > 0 && ` (${column.items.length})`}
          </ColumnTitle>
        </ColumnHeader>
        
        <Box sx={{ 
          position: 'relative', 
          flexGrow: 1, 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          // IMPORTANT: Removed overflow:hidden to prevent nested scroll container issues
          // Only TaskList should have overflow settings as the direct parent of the Droppable
        }}>
          <Droppable key={columnId} droppableId={columnId}>
            {(provided, snapshot) => (
              <Box 
                sx={{ 
                  borderRadius: 0,
                  backgroundColor: snapshot.isDraggingOver ? '#2c2c2c' : '#000000', // Black background
                  flex: 1,
                  transition: 'background-color 0.2s ease',
                  // Removed all border styling to get rid of dividing lines
                  height: '100%', // Take full height of parent
                  minHeight: '100%', // Ensure minimum height fills container
                  maxHeight: '100%', // Prevent expanding beyond parent height
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative', // For proper scroll containment
                  // IMPORTANT: Removed overflow:hidden to prevent nested scroll container issues
                  // Only TaskList should control overflow behavior in the drag-and-drop hierarchy
                }}
              >
                <TaskList
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    backgroundColor: snapshot.isDraggingOver ? '#2a2a2a' : '#222222' // Even darker grey for columns
                  }}
                >
                  {/* Simple windowing solution to only render visible cards */}
                  {column.items.map((item, index) => {
                    // Simple visibility check based on item index
                    // Only render items that are likely to be visible (first 20)
                    // or close to being dragged (±5 from active index)
                    const isItemVisible = 
                      index < 20 || 
                      (performanceMetrics.isDragging && 
                      performanceMetrics.activeItemId && 
                      Math.abs(index - (column.items.findIndex(i => i.id === performanceMetrics.activeItemId) || 0)) < 5);
                      
                    if (!isItemVisible) {
                      // Return an empty placeholder with proper height to maintain scrolling
                      return (
                        <Box 
                          key={item.id} 
                          sx={{ 
                            height: '120px', // Approximate height of a card
                            mb: 1.5,
                            visibility: 'hidden',
                          }} 
                        />
                      );
                    }
                    
                    // Render the actual card if visible
                    return (
                      <TaskCard 
                        key={item.id} 
                        item={item} 
                        index={index} 
                        userRole={userRole} 
                      />
                    );
                  })}
                  {provided.placeholder}
                </TaskList>
              </Box>
            )}
          </Droppable>
        </Box>
      </Box>
    </Box>
  );
};

export default KanbanColumn;
