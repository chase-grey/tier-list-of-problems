import React, { useState, useMemo, useRef, useEffect } from "react";
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

// Simple version for now - we'll define the enhanced version later after KanbanBoard component
const TaskList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
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
      overflowY: 'scroll', // Enable vertical scrolling while allowing hiding via ScrollShadowContainer
      overflowX: 'hidden', // Hide horizontal scrollbar
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      // Hide scrollbar in all browsers but maintain scrollability
      msOverflowStyle: 'none',  // Hide scrollbar in IE and Edge
      scrollbarWidth: 'none',   // Hide scrollbar in Firefox
      '&::-webkit-scrollbar': {
        display: 'none', // Hide scrollbar in WebKit browsers (Chrome, Safari)
        width: 0,
        background: 'transparent',
      },
      position: 'relative', // Add this to ensure proper stacking context
      zIndex: 1, // Add base z-index to establish stacking context
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
      height: 'calc(100vh - 64px)', // Match exactly to the viewport height minus header
      minHeight: '600px', // Minimum height for columns
      gap: 1, // Minimal spacing between columns
      padding: '0 2px', // Minimal horizontal padding
      mt: 1, // Top padding matches gap between columns
      mb: 0.5, // Reduced bottom padding
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
  // Track scroll state for each column to control shadow visibility
  const [columnScrollState, setColumnScrollState] = useState<Record<string, { showTopShadow: boolean, showBottomShadow: boolean }>>({});
  
  // Store refs to column content elements
  const columnRefs = useRef<Record<string, HTMLElement | null>>({});
  
  // Function to check scroll position and update shadow visibility
  const checkScrollability = (columnId: string, element: HTMLElement) => {
    const { scrollTop, scrollHeight, clientHeight } = element;
    
    // Show top shadow only when scrolled down from top
    const showTopShadow = scrollTop > 0;
    
    // Show bottom shadow only when there's more content below to scroll to
    // The -1 accounts for potential rounding errors
    const showBottomShadow = scrollTop < scrollHeight - clientHeight - 1;
    
    // Update state only if something changed
    setColumnScrollState(prevState => {
      if (
        !prevState[columnId] || 
        prevState[columnId].showTopShadow !== showTopShadow || 
        prevState[columnId].showBottomShadow !== showBottomShadow
      ) {
        return {
          ...prevState,
          [columnId]: { showTopShadow, showBottomShadow }
        };
      }
      return prevState;
    });
  }; 
  
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
  
  // Register scroll event handlers for all column lists after columns are initialized
  useEffect(() => {
    // Small delay to ensure DOM elements are rendered
    const timer = setTimeout(() => {
      // Initialize the shadow state for all columns
      Object.entries(columnRefs.current).forEach(([id, element]) => {
        if (element) {
          // Initial check
          checkScrollability(id, element);
        }
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [columns]);

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
      maxHeight: 'calc(100vh - 70px)', // Ensure it doesn't overflow viewport
    }}>
      
      <DragDropContext 
        onDragStart={onDragStart}
        onDragEnd={(result) => onDragEnd(result, columns, setColumns)}
      >
        <Container>
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
                  height: 'calc(100% - 5px)', // Reduced margin to increase height
                  position: 'relative', // For proper scroll containment
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
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative', // For proper scroll containment
                      }}
                    >
                            {/* Column container with shadows */}
                      <Box sx={{ 
                        position: 'relative', 
                        width: '100%', 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column',
                        backgroundColor: snapshot.isDraggingOver ? '#2a2a2a' : '#222222', // Background color
                        borderRadius: '8px',
                        overflow: 'visible' // Allow shadows to extend outside container
                      }}>
                        {/* Top overlay shadow - only shown when scrolled down */}
                        <Box 
                          sx={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            right: 0, 
                            height: '30px', 
                            backgroundColor: '#ff0000', // Debug color: red
                            zIndex: 20, // High enough to be visible but not interfere with other elements
                            opacity: columnScrollState[columnId]?.showTopShadow ? 0.7 : 0, // Only show when scrolled
                            pointerEvents: 'none',
                            transition: 'opacity 0.2s ease',
                          }} 
                        />
                        
                        {/* Content container that fills entire height */}
                        <Box sx={{ 
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          height: '100%',
                          minHeight: '100%',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <TaskList
                            id={columnId} /* Add unique ID for scroll tracking */
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            onScroll={() => {
                              // Direct scroll handler for immediate feedback
                              const element = columnRefs.current[columnId];
                              if (element) {
                                checkScrollability(columnId, element);
                              }
                            }}
                            sx={{
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              padding: '10px',
                              overflowY: 'auto',
                              msOverflowStyle: 'none',  // IE and Edge
                              scrollbarWidth: 'none',   // Firefox
                              '&::-webkit-scrollbar': { 
                                display: 'none' // Chrome, Safari, Opera
                              },
                              // Make list stretch to fill entire column height
                              minHeight: '100%'
                            }}
                          >
                          {column.items.length === 0 && (
                            <Box sx={{ 
                              flex: 1, 
                              display: 'flex', 
                              justifyContent: 'center',
                              alignItems: 'center',
                              height: '100%',
                              opacity: 0.4
                            }}>No items</Box>
                          )}
                          
                          {column.items.map((item, index) => (
                            <TaskCard key={item.id} item={item} index={index} userRole={userRole} />
                          ))}
                          {provided.placeholder}
                          </TaskList>
                        </Box>
                          
                        {/* Bottom overlay shadow - only shown when more content below */}
                        <Box sx={{ 
                          position: 'absolute', 
                          bottom: 0, 
                          left: 0, 
                          right: 0, 
                          height: '30px', // Match height with top shadow
                          backgroundColor: '#00ff00', // Debug color: green
                          zIndex: 20, // Match z-index with top shadow
                          opacity: columnScrollState[columnId]?.showBottomShadow ? 0.7 : 0, // Only show when needed
                          pointerEvents: 'none',
                          transition: 'opacity 0.2s ease' // Smooth transition
                        }} />
                      </Box>
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
