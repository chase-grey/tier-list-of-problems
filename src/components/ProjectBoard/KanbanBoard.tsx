import React, { useState, useMemo } from "react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { Box, Typography } from "@mui/material";
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
      width: '100%',
      height: '100%',
      gap: 0
    }}
  />
);

const TaskList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((
  props, 
  ref
) => (
  <Box
    {...props}
    ref={ref}
    sx={{
      display: 'flex',
      flexDirection: 'column',
      background: '#1e1e1e', // Dark background
      width: '100%',
      borderRadius: '0',
      padding: '12px',
      boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
      height: '100%',
      overflowY: 'auto',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        background: '#2d2d2d',
      },
      '&::-webkit-scrollbar-thumb': {
        background: '#555',
        borderRadius: '4px',
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
      height: 'calc(100vh - 80px)',
      gap: 0,
      padding: 0
    }}
  />
);

const ColumnHeader = (props: React.HTMLAttributes<HTMLDivElement>) => (
  <Box
    {...props}
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
      paddingBottom: '8px',
      borderBottom: '1px solid #444444'
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
    toDo: 'column-to-do',
    inProgress: 'column-in-progress',
    testing: 'column-testing',
    done: 'column-done'
  };

  const initialColumns: KanbanColumns = useMemo(() => {
    // Create a base structure with empty columns
    const baseColumns: KanbanColumns = {
      [columnIds.toDo]: { title: 'To-Do', items: [] },
      [columnIds.inProgress]: { title: 'In Progress', items: [] },
      [columnIds.testing]: { title: 'Testing', items: [] },
      [columnIds.done]: { title: 'Done', items: [] }
    };
    
    // Add items to appropriate columns based on their status
    taskItems.forEach(item => {
      const status = item.Status.toLowerCase().replace(/\s+/g, '-');
      if (status === 'to-do') {
        baseColumns[columnIds.toDo].items.push({...item});
      } else if (status === 'in-progress') {
        baseColumns[columnIds.inProgress].items.push({...item});
      } else if (status === 'testing') {
        baseColumns[columnIds.testing].items.push({...item});
      } else if (status === 'done') {
        baseColumns[columnIds.done].items.push({...item});
      } else {
        // Default to To-Do if status doesn't match any column
        baseColumns[columnIds.toDo].items.push({...item});
      }
    });
    
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
      backgroundColor: '#000000', // Match the background color of the app
      borderRadius: 0,
      position: 'relative'
    }}>
      
      <DragDropContext 
        onDragStart={onDragStart}
        onDragEnd={(result) => onDragEnd(result, columns, setColumns)}
      >
        <Container>
          <TaskColumnStyles>
            {Object.entries(columns).map(([columnId, column]) => (
              <Droppable key={columnId} droppableId={columnId}>
                {(provided: any, snapshot: any) => (
                  <Box 
                    sx={{ 
                      borderRadius: 0,
                      backgroundColor: snapshot.isDraggingOver ? '#1a1a1a' : '#000000',
                      flex: 1,
                      transition: 'background-color 0.2s ease',
                      border: '1px solid #333333',
                      borderTop: 'none',
                      borderBottom: 'none',
                    }}
                  >
                    <TaskList
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        backgroundColor: snapshot.isDraggingOver ? '#1a1a1a' : '#000000'
                      }}
                    >
                      <ColumnHeader>
                        <ColumnTitle>{column.title}</ColumnTitle>
                        <Typography 
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            backgroundColor: '#eeeeee',
                            color: '#616161',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}
                        >
                          {column.items.length}
                        </Typography>
                      </ColumnHeader>
                      
                      {column.items.map((item, index) => (
                        <TaskCard key={item.id} item={item} index={index} userRole={userRole} />
                      ))}
                      {provided.placeholder}
                      
                      {column.items.length === 0 && (
                        <Typography 
                          sx={{ 
                            textAlign: 'center', 
                            color: '#9e9e9e',
                            py: 3,
                            fontSize: '0.85rem',
                            fontStyle: 'italic'
                          }}
                        >
                          Drag cards here
                        </Typography>
                      )}
                    </TaskList>
                  </Box>
                )}
              </Droppable>
            ))}
          </TaskColumnStyles>
        </Container>
      </DragDropContext>
    </Box>
  );
};

export default KanbanBoard;
