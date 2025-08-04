import React, { useState, useMemo, useEffect } from "react";
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
      width: '100%',
      height: '100%',
      gap: 0,
      backgroundColor: '#000000'
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
      background: '#222222',
      width: '100%',
      borderRadius: '12px',
      padding: '10px',
      height: 'calc(100% - 46px)',
      maxHeight: 'calc(100% - 46px)',
      overflowY: 'auto',
      overflowX: 'hidden',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
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
  onColumnsChange?: (columnCounts: {
    unsorted: number;
    highest: number;
    high: number;
    medium: number;
    low: number;
  }) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ taskItems, userRole, onColumnsChange }) => {
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
      [columnIds.highest]: { title: 'Highest Priority', items: [], color: '#6a1b9a' },  // Darkest purple
      [columnIds.high]: { title: 'High Priority', items: [], color: '#8e24aa' },        // Dark purple
      [columnIds.medium]: { title: 'Medium Priority', items: [], color: '#ab47bc' },     // Medium purple
      [columnIds.low]: { title: 'Low Priority', items: [], color: '#ce93d8' }           // Light purple
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
    
    // All items should remain in their proper columns based on status
    
    return baseColumns;
  }, [taskItems]);
  
  const [columns, setColumns] = useState<KanbanColumns>(initialColumns);

  // Report column counts to parent component when columns change
  useEffect(() => {
    if (onColumnsChange) {
      const columnCounts = {
        unsorted: columns[columnIds.unsorted].items.length,
        highest: columns[columnIds.highest].items.length,
        high: columns[columnIds.high].items.length,
        medium: columns[columnIds.medium].items.length,
        low: columns[columnIds.low].items.length
      };
      onColumnsChange(columnCounts);
    }
  }, [columns, onColumnsChange, columnIds]);

  // Performance tracking variables and active item tracking
  const performanceMetricsRef = React.useRef({
    startTime: 0,
    frameCount: 0,
    slowFrames: 0,
    lastFrameTime: 0,
    isDragging: false,
    activeItemId: null as string | null // Track currently dragged item ID
  });
  
  // Single efficient monitoring system for drag operations
  React.useEffect(() => {
    let rafId: number | null = null;
    
    // Function to monitor frame performance
    const monitorFrame = (time: number) => {
      if (!performanceMetricsRef.current.isDragging) {
        return;
      }
      
      const now = time; // Use timestamp from rAF for more accuracy
      const lastTime = performanceMetricsRef.current.lastFrameTime;
      
      if (lastTime > 0) {
        const frameDuration = now - lastTime;
        performanceMetricsRef.current.frameCount++;
        
        // Track slow frames (>16ms means less than 60fps)
        if (frameDuration > 16) {
          performanceMetricsRef.current.slowFrames++;
        }
      }
      
      performanceMetricsRef.current.lastFrameTime = now;
      rafId = requestAnimationFrame(monitorFrame);
    };
    
    // Start monitoring when dragging begins
    const startMonitoring = () => {
      if (performanceMetricsRef.current.isDragging) {
        rafId = requestAnimationFrame(monitorFrame);
      }
    };
    
    // Watch for changes in isDragging state
    if (performanceMetricsRef.current.isDragging && !rafId) {
      startMonitoring();
    }
    
    // Cleanup
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);
  
  const onDragStart = (event: any) => {
    console.log('Started dragging', event);
    
    // Get the active item ID from the drag event
    const activeId = event?.active?.id || null;
    
    // Reset and start performance monitoring
    performanceMetricsRef.current = {
      startTime: performance.now(),
      frameCount: 0,
      slowFrames: 0,
      lastFrameTime: performance.now(),
      isDragging: true,
      activeItemId: activeId // Track which item is being dragged
    };
    
    console.log(`Active item ID: ${activeId}`);
    
    // Monitoring is now handled by the useEffect hook above
    // The initial frame time is set but the actual monitoring happens in the effect
    performanceMetricsRef.current.lastFrameTime = performance.now();
  };

  const onDragEnd = (result: any) => {
    // Stop performance monitoring
    performanceMetricsRef.current.isDragging = false;
    
    // Log performance metrics
    const { startTime, frameCount, slowFrames } = performanceMetricsRef.current;
    const dragDuration = performance.now() - startTime;
    const avgFrameTime = dragDuration / (frameCount || 1);
    const slowFramePercentage = (slowFrames / (frameCount || 1)) * 100;
    
    console.log(`Drag Performance Metrics:`);
    console.log(`- Total duration: ${dragDuration.toFixed(2)}ms`);
    console.log(`- Frames processed: ${frameCount}`);
    console.log(`- Average frame time: ${avgFrameTime.toFixed(2)}ms`);
    console.log(`- Slow frames: ${slowFrames} (${slowFramePercentage.toFixed(2)}%)`);
    
    if (!result.destination) {
      console.log('No destination, canceling');
      return; // Dropped outside the list
    }
    
    const { source, destination } = result;
    console.log(`Moving from ${source.droppableId} to ${destination.droppableId}`);
    
    // Use state updater function for better performance
    setColumns(prevColumns => {
      // If the source and destination columns are different
      if (source.droppableId !== destination.droppableId) {
        const sourceColumn = prevColumns[source.droppableId];
        const destColumn = prevColumns[destination.droppableId];
        
        if (!sourceColumn || !destColumn) {
          console.error('Could not find source or destination column', { 
            source: source.droppableId, 
            destination: destination.droppableId,
            availableColumns: Object.keys(prevColumns)
          });
          return prevColumns; // Return unchanged state
        }
        
        // Create new arrays only for the affected columns
        const sourceItems = Array.from(sourceColumn.items);
        const destItems = Array.from(destColumn.items);
        
        // Move the item
        const [removed] = sourceItems.splice(source.index, 1);
        destItems.splice(destination.index, 0, removed);
        
        // Return new state with only the changed columns updated
        return {
          ...prevColumns,
          [source.droppableId]: {
            ...sourceColumn,
            items: sourceItems,
          },
          [destination.droppableId]: {
            ...destColumn,
            items: destItems,
          },
        };
      } else {
        // OPTIMIZED: Same-column reordering
        const columnId = source.droppableId;
        const column = prevColumns[columnId];
        
        if (!column) {
          console.error('Could not find column', columnId);
          return prevColumns; // Return unchanged state
        }
        
        // Only create new array for the affected column
        const items = Array.from(column.items);
        
        // Reorder the items efficiently
        const [movedItem] = items.splice(source.index, 1);
        items.splice(destination.index, 0, movedItem);
        
        // Only update the one affected column - much more efficient
        return {
          ...prevColumns,
          [columnId]: {
            ...column,
            items
          }
        };
      }
    });
    
    // Use requestAnimationFrame to batch any additional UI updates
    // This ensures smoother visual feedback after drag operations
    requestAnimationFrame(() => {
      // Optionally trigger any animations or additional updates here
    });
  };

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%', 
      // IMPORTANT: Removed overflowX and overflowY to avoid nested scroll container issues
      // The TaskList component is the only element that should have overflow settings
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
        onDragEnd={onDragEnd}
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
                        maxHeight: '100%', // Prevent expanding beyond parent height
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
                      

                      {column.items.map((item, index) => {
                        // Simple visibility check based on item index
                        // Only render items that are likely to be visible (first 20)
                        // or close to being dragged (±5 from active index)
                        const isItemVisible = 
                          index < 20 || 
                          (performanceMetricsRef.current.isDragging && 
                           performanceMetricsRef.current.activeItemId && 
                           Math.abs(index - (column.items.findIndex(i => i.id === performanceMetricsRef.current.activeItemId) || 0)) < 5);
                          
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
            ))}
          </TaskColumnStyles>
        </Container>
      </DragDropContext>
    </Box>
  );
};

export default KanbanBoard;
