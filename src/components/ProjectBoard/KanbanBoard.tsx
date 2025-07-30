import React, { useState, useMemo } from "react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { Box, Typography } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
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
      gap: 2
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
      minHeight: '100px',
      display: 'flex',
      flexDirection: 'column',
      background: '#f9f9f9',
      minWidth: '280px',
      maxWidth: '280px',
      borderRadius: '8px',
      padding: '12px',
      boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.05)',
      height: 'fit-content',
      maxHeight: 'calc(100vh - 200px)',
      overflowY: 'auto',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none'
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
      minHeight: '70vh',
      gap: 2,
      padding: '8px'
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
      borderBottom: '1px solid #eeeeee'
    }}
  />
);

const ColumnTitle = (props: React.HTMLAttributes<HTMLSpanElement>) => (
  <Box
    component="span"
    {...props}
    sx={{
      fontWeight: 600,
      color: '#424242',
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
    <Box sx={{ width: '100%', overflowX: 'auto', padding: 2, backgroundColor: '#fafafa', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600, color: '#424242' }}>
          Project Kanban Board
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Box 
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 2, 
              py: 0.75,
              borderRadius: '20px',
              bgcolor: 'white',
              border: '1px solid #e0e0e0',
              cursor: 'pointer'
            }}
          >
            <Typography variant="body2" sx={{ mr: 1, color: '#616161', fontWeight: 500 }}>
              Filter
            </Typography>
            <FilterListIcon fontSize="small" sx={{ color: '#9e9e9e' }} />
          </Box>
        </Box>
      </Box>
      
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
                      borderRadius: 2,
                      backgroundColor: snapshot.isDraggingOver ? '#f0f4f8' : '#f9f9f9',
                      width: 280,
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <TaskList
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        backgroundColor: snapshot.isDraggingOver ? '#f0f4f8' : '#f9f9f9'
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
