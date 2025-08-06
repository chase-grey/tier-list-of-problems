import { useState } from "react";
import { Box } from "@mui/material";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
} from '@dnd-kit/core';
import type {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  UniqueIdentifier
} from '@dnd-kit/core';
import { 
  arrayMove, 
  sortableKeyboardCoordinates, 
} from '@dnd-kit/sortable';
import { type KanbanColumns } from "./KanbanData";
import UnifiedColumn from "./UnifiedColumn";

interface KanbanBoardProps {
  columns: KanbanColumns;
  onColumnUpdate?: (columns: KanbanColumns) => void;
  userRole?: string | null;
}

/**
 * Unified KanbanBoard component using @dnd-kit/core library
 * Replaces the old implementation that used @hello-pangea/dnd
 */
const UnifiedKanbanBoard = ({ columns, onColumnUpdate }: KanbanBoardProps) => {
  // State to store the dragged item
  const [_activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  // Store the columns in state to update them during drag operations
  const [boardColumns, setBoardColumns] = useState<KanbanColumns>(columns);
  
  // Configure the drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activation
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Handle the start of a drag operation
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id);
  };
  
  // Handle the drag over event to preview item position
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    // Skip if we don't have both an active and over item
    if (!active || !over) return;
    
    const activeId = String(active.id);
    const overId = String(over.id);
    
    // Find which columns these items belong to
    let activeColumn: string | null = null;
    let overColumn: string | null = null;
    
    // Find the column containing the active item
    Object.entries(boardColumns).forEach(([columnId, column]) => {
      if (column.items.some(item => item.id === activeId)) {
        activeColumn = columnId;
      }
      if (column.items.some(item => item.id === overId)) {
        overColumn = columnId;
      }
    });
    
    // If we're not dragging between columns, no need to update
    if (activeColumn === overColumn) return;
    
    // Skip if we don't know the source column
    if (!activeColumn || !overColumn) return;
    
    // Make a copy of the columns to modify
    const newColumns = { ...boardColumns };
    
    // Find the item being dragged
    const activeItem = newColumns[activeColumn].items.find(
      item => item.id === activeId
    );
    
    if (!activeItem) return;
    
    // Remove the item from its source column
    newColumns[activeColumn].items = newColumns[activeColumn].items.filter(
      item => item.id !== activeId
    );
    
    // Find the index where to insert the active item in the target column
    const overItemIndex = newColumns[overColumn].items.findIndex(
      item => item.id === overId
    );
    
    if (overItemIndex !== -1) {
      // Insert at the found position
      newColumns[overColumn].items.splice(overItemIndex, 0, activeItem);
    } else {
      // Add to the end of the column
      newColumns[overColumn].items.push(activeItem);
    }
    
    // Update state
    setBoardColumns(newColumns);
  };
  
  // Handle the end of a drag operation
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Reset the active item
    setActiveId(null);
    
    if (!over) return;
    
    const activeId = String(active.id);
    const overId = String(over.id);
    
    // Skip if nothing has changed
    if (activeId === overId) return;
    
    // Find which column and position the items belong to
    let sourceColumnId: string | null = null;
    let destinationColumnId: string | null = null;
    let sourceIndex = -1;
    let destinationIndex = -1;
    
    // Find the source and destination details
    Object.entries(boardColumns).forEach(([columnId, column]) => {
      const activeIndex = column.items.findIndex(item => item.id === activeId);
      if (activeIndex !== -1) {
        sourceColumnId = columnId;
        sourceIndex = activeIndex;
      }
      
      const overIndex = column.items.findIndex(item => item.id === overId);
      if (overIndex !== -1) {
        destinationColumnId = columnId;
        destinationIndex = overIndex;
      }
    });
    
    // Skip if we don't have all the necessary information
    if (!sourceColumnId || sourceIndex === -1 || destinationIndex === -1) return;
    
    // Make a copy of the columns to modify
    const newColumns = { ...boardColumns };
    
    // Handle reordering within the same column
    if (sourceColumnId === destinationColumnId) {
      const column = newColumns[sourceColumnId];
      const newItems = arrayMove(
        column.items,
        sourceIndex,
        destinationIndex
      );
      column.items = newItems;
    }
    
    // Update columns state and call the callback if provided
    setBoardColumns(newColumns);
    if (onColumnUpdate) {
      onColumnUpdate(newColumns);
    }
  };
  
  return (
    <Box 
      sx={{
        display: 'flex',
        flexDirection: 'row',
        padding: '10px 0',
        overflowX: 'auto',
        overflowY: 'hidden', /* Hide vertical scrollbar at container level */
        width: '100%',
        height: '100%',
        gap: 0,
        backgroundColor: '#000000', /* Black background */
        // Improved scrollbar styling for better horizontal scrolling experience
        '&::-webkit-scrollbar': {
          height: '8px', // Slightly thicker horizontal scrollbar
          backgroundColor: 'transparent',
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '4px',
          margin: '0 10px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
          },
        },
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {Object.entries(boardColumns).map(([columnId, column]) => (
          <UnifiedColumn
            key={columnId}
            columnId={columnId}
            title={column.title}
            items={column.items}
            color={column.color}
          />
        ))}
      </DndContext>
    </Box>
  );
};

export default UnifiedKanbanBoard;
