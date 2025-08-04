import { useMemo } from 'react';
import { Paper, Typography, Box, Stack } from '@mui/material';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getColumnContainerStyles, getColumnHeaderStyles, getColumnContentStyles } from '../../styles/columnStyles';
import type { TaskItem } from './KanbanData';
import UnifiedTaskCard from './UnifiedTaskCard';

// Custom colors for status columns
const STATUS_COLORS = {
  'To-Do': '#496A5C', // Darkest shade of grayish-green
  'In Progress': '#5E8272',    // Dark shade of grayish-green
  'Testing': '#739A89',  // Medium shade of grayish-green
  'Done': '#88B19F',     // Light shade of grayish-green
  'Default': '#222222' // Default dark background
};

interface UnifiedColumnProps {
  columnId: string;
  title: string;
  items: TaskItem[];
  color?: string;
}

/**
 * A unified column component based on SortableColumn but adapted for KanbanBoard
 * This component works with @dnd-kit/core library for consistent styling
 */
const UnifiedColumn = ({ 
  columnId,
  title, 
  items,
  color
}: UnifiedColumnProps) => {
  // Set up the droppable area using dnd-kit
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
    data: {
      type: 'column',
      columnId
    }
  });
  
  // Get background color for the column header
  const getHeaderColor = () => {
    if (color) return color;
    return STATUS_COLORS[title as keyof typeof STATUS_COLORS] || STATUS_COLORS.Default;
  };
  
  // Get text color for the header - always white for columns
  const getHeaderTextColor = () => 'white';

  // Create sortable items array for dnd-kit
  const sortableItems = useMemo(() => 
    items.map(item => item.id),
    [items]
  );
  
  return (
    <Box sx={getColumnContainerStyles()}>
      <Paper 
        className="rounded-column"
        elevation={2}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '8px',
        }}
      >
        {/* Column Header */}
        <Box 
          sx={{
            ...getColumnHeaderStyles(),
            backgroundColor: getHeaderColor(),
            color: getHeaderTextColor(),
          }}
        >
          <Typography variant="subtitle1" component="div" fontWeight={600}>
            {title} ({items.length})
          </Typography>
        </Box>
        
        {/* Column Content */}
        <Box 
          ref={setNodeRef}
          sx={{
            ...getColumnContentStyles(isOver, false),
            borderRadius: '0 0 8px 8px !important', // Force rounded bottom corners
            overflow: 'hidden !important',
          }}
        >
          <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
            <Stack spacing={1}>
              {/* Render task cards */}
              {items.map((item, index) => (
                <UnifiedTaskCard key={item.id} task={item} index={index} />
              ))}
              
              {/* Empty column state */}
              {items.length === 0 && (
                <Box sx={{ py: 2, opacity: 0.5, textAlign: 'center' }}>
                  <Typography variant="body2">No items</Typography>
                </Box>
              )}
            </Stack>
          </SortableContext>
        </Box>
      </Paper>
    </Box>
  );
};

export default UnifiedColumn;
