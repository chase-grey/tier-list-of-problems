import React, { useState, useMemo } from "react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { Box } from "@mui/material";
import { type KanbanColumns, type TaskItem } from "./KanbanData";
import TaskCard from "./TaskCard";

const Container = (props: React.HTMLAttributes<HTMLDivElement>) => (
  <Box
    {...props}
    sx={{
      display: 'flex',
      flexDirection: 'row',
      padding: '10px 0',
      overflowX: 'auto',
      overflowY: 'hidden', /* Hide vertical scrollbar at container level */
      width: '100%',
      height: '100%',
      gap: 0,
      backgroundColor: '#000000' /* Black background */
    }}
  />
);

const TaskList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((  props, 
  ref
) => (
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

const TaskColumnStyles = (props: React.HTMLAttributes<HTMLDivElement>) => (
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

// Use SX prop with Material UI Box component
const ColumnHeader = (props: any) => (
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

const ColumnTitle = (props: React.HTMLAttributes<HTMLSpanElement>) => (
  <Box
    component="span"
    {...props}
    sx={{
      fontWeight: 600,
      color: '#ffffff',
      fontSize: '14px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    }}
  />
);

interface KanbanBoardProps {
  taskItems: TaskItem[];
  userRole?: string | null;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ taskItems, userRole }) => {
  // Create columns from task items, grouped by status
  // Create fixed column IDs to ensure consistent droppableIds
  const columnIds = {
    unsorted: 'column-unsorted',
    highest: 'column-highest',
    high: 'column-high',
    medium: 'column-medium',
    low: 'column-low'
  };

  const initialColumns: KanbanColumns = useMemo(() => {
    // Create a base structure with empty columns
    const baseColumns: KanbanColumns = {
      [columnIds.unsorted]: { title: 'Unsorted', items: [], color: '#666666' },         // Lighter grey for Unsorted
      [columnIds.highest]: { title: 'Highest Interest', items: [], color: '#6a1b9a' },  // Darkest purple
      [columnIds.high]: { title: 'High Interest', items: [], color: '#8e24aa' },        // Dark purple
      [columnIds.medium]: { title: 'Medium Interest', items: [], color: '#ab47bc' },     // Medium purple
      [columnIds.low]: { title: 'Low Interest', items: [], color: '#ce93d8' }           // Light purple
    };
    
    // Add items to appropriate columns based on their status
    taskItems.forEach(item => {
      const status = item.Status.toLowerCase().replace(/\s+/g, '-');
      if (status === 'to-do') {
        baseColumns[columnIds.unsorted].items.push({...item});
      } else if (status === 'in-progress') {
        baseColumns[columnIds.high].items.push({...item});
      } else if (status === 'testing') {
        baseColumns[columnIds.medium].items.push({...item});
      } else if (status === 'done') {
        baseColumns[columnIds.low].items.push({...item});
      } else {
        // Default to Unsorted if status doesn't match any column
        baseColumns[columnIds.unsorted].items.push({...item});
      }
    });
    
    // Distribute some items to highest interest for demonstration
    if (baseColumns[columnIds.unsorted].items.length > 1) {
      const itemsToMove = baseColumns[columnIds.unsorted].items.splice(0, 1);
      baseColumns[columnIds.highest].items.push(...itemsToMove);
    }
    
    return baseColumns;
  }, [taskItems]);
  
  const [columns, setColumns] = useState<KanbanColumns>(initialColumns);

  // Console log to help debug drag events
  const onDragStart = () => {
    console.log('Drag started');
  };

  const onDragEnd = (result: any, columns: KanbanColumns, setColumns: React.Dispatch<React.SetStateAction<KanbanColumns>>) => {
    console.log('Drag ended', result);
    
    if (!result.destination) {
      console.log('No destination, canceling');
      return; // Dropped outside the list
    }
    
    const { source, destination } = result;
    console.log(`Moving from ${source.droppableId} to ${destination.droppableId}`);

    // If the source and destination columns are different
    if (source.droppableId !== destination.droppableId) {
      const sourceColumn = columns[source.droppableId];
      const destColumn = columns[destination.droppableId];
      
      if (!sourceColumn || !destColumn) {
        console.error('Could not find source or destination column', { 
          source: source.droppableId, 
          destination: destination.droppableId,
          availableColumns: Object.keys(columns)
        });
        return;
      }
      
      const sourceItems = [...sourceColumn.items];
      const destItems = [...destColumn.items];
      
      // Remove item from source column
      const [removed] = sourceItems.splice(source.index, 1);
      console.log('Removed item:', removed);
      
      // Add item to destination column
      destItems.splice(destination.index, 0, removed);
      
      const newColumns = {
        ...columns,
        [source.droppableId]: {
          ...sourceColumn,
          items: sourceItems,
        },
        [destination.droppableId]: {
          ...destColumn,
          items: destItems,
        },
      };
      
      console.log('Setting new columns state:', newColumns);
      setColumns(newColumns);
    } else {
      // If the source and destination columns are the same
      const column = columns[source.droppableId];
      if (!column) {
        console.error('Could not find column', source.droppableId);
        return;
      }
      
      const copiedItems = [...column.items];
      
      // Remove the item from its original position
      const [removed] = copiedItems.splice(source.index, 1);
      
      // Add the item to its new position
      copiedItems.splice(destination.index, 0, removed);
      
      const newColumns = {
        ...columns,
        [source.droppableId]: {
          ...column,
          items: copiedItems,
        },
      };
      
      console.log('Setting new columns state (same column):', newColumns);
      setColumns(newColumns);
    }
  };

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%', 
      overflowX: 'auto',
      overflowY: 'hidden', // Hide vertical scrollbar at container level
      backgroundColor: '#000000', // Black background
      borderRadius: 0,
      position: 'relative',
      pb: 0.5, // Reduce bottom padding
      minHeight: 'calc(100vh - 70px)', // Ensure minimum height
      display: 'flex', // Use flexbox for better space distribution
      flexDirection: 'column', // Stack children vertically
    }}>
      
      <DragDropContext 
        onDragStart={onDragStart}
        onDragEnd={(result) => onDragEnd(result, columns, setColumns)}
      >
        <Container style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
          <TaskColumnStyles>
            {Object.entries(columns).map(([columnId, column]) => (
              <Box key={columnId} sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                flex: 1,
                mb: 1 // Match bottom margin to gap between columns
              }}>
                {/* Pill-shaped column header above the column */}
                <ColumnHeader sx={{ backgroundColor: column.color || '#4A5CFF' }}>
                  <ColumnTitle>{column.title} ({column.items.length})</ColumnTitle>
                </ColumnHeader>

                {/* Separate droppable area */}
                <Box sx={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column',
                  height: 'calc(100% - 10px)', // Ensure it takes the full height minus margin
                  position: 'relative', // For proper scroll containment
                  minHeight: '100%', // Minimum height to fill available space
                }}>
                  <Droppable key={columnId} droppableId={columnId}>
                  {(provided: any, snapshot: any) => (
                    <Box 
                      sx={{ 
                        borderRadius: 0,
                        backgroundColor: snapshot.isDraggingOver ? '#2c2c2c' : '#000000', // Black background
                        flex: 1,
                        transition: 'background-color 0.2s ease',
                        // Removed all border styling to get rid of dividing lines
                        height: '100%', // Take full height of parent
                        minHeight: '100%', // Ensure minimum height fills container
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative', // For proper scroll containment
                      }}
                    >
                      <TaskList
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          backgroundColor: snapshot.isDraggingOver ? '#2a2a2a' : '#222222' // Even darker grey for columns
                        }}
                      >
                      
                      {column.items.map((item, index) => (
                        <TaskCard key={item.id} item={item} index={index} userRole={userRole} />
                      ))}
                      {provided.placeholder}
                      
                      {/* Empty columns no longer show placeholder text */}
                    </TaskList>
                  </Box>
                )}
                  </Droppable>
                </Box>
              </Box>
            ))}
          </TaskColumnStyles>
        </Container>
      </DragDropContext>
    </Box>
  );
};

export default KanbanBoard;
