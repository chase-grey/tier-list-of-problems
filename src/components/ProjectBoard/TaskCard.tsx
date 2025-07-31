import { Draggable } from "@hello-pangea/dnd";
import { Paper, Typography, Box, IconButton, Tooltip } from "@mui/material";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { type TaskItem } from "./KanbanData";

interface TaskCardProps {
  item: TaskItem;
  index: number;
  userRole?: string | null;
}

// No longer needed priority color function

const TaskCard = ({ item, index }: TaskCardProps) => {
  
  // Ensure draggable ID is always a string
  const draggableId = `task-${item.id}`;
  
  return (
    <Draggable draggableId={draggableId} index={index}>
      {(provided, snapshot) => (
        <Paper
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          elevation={snapshot.isDragging ? 3 : 1}
          sx={{
            p: 1, // Reduced padding to match InterestRanking style
            mb: 0.75, // Reduced bottom margin to match InterestRanking style
            borderRadius: '12px', // Match column and header border radius
            transition: 'all 0.2s ease',
            cursor: 'grab',
            userSelect: 'none', // Prevent text selection during drag
            WebkitUserSelect: 'none', // For Safari
            MozUserSelect: 'none', // For Firefox
            msUserSelect: 'none', // For IE/Edge
            '&:hover': {
              backgroundColor: '#2d2d2d',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            },
            '&:active': {
              cursor: 'grabbing',
            },
            position: 'relative',
            backgroundColor: snapshot.isDragging ? '#2d2d2d' : '#333333',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '80px',
            opacity: snapshot.isDragging ? 0.8 : 1
          }}
        >
          {/* Top section with title and info button - matching InterestRanking style */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexGrow: 1 }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                mr: 1,
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
                paddingBottom: '24px', // Add bottom padding to avoid text getting cut off
                fontSize: '0.85rem',
                flexGrow: 1
              }}
            >
              {item.task}
            </Typography>
            
            {/* Info button similar to InterestRanking */}
            <Tooltip title="View details">
              <IconButton
                size="small" 
                aria-label="View task details"
                sx={{ 
                  color: 'primary.main',
                  p: 0.5,
                  mt: -0.5,
                  flexShrink: 0,
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.04)'
                  }
                }}
              >
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>
      )}
    </Draggable>
  );
};

export default TaskCard;
