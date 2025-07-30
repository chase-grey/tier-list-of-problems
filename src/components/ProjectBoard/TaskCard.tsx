import { Draggable } from "@hello-pangea/dnd";
import { Paper, Typography, Box, Chip, Avatar } from "@mui/material";
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { type TaskItem } from "./KanbanData";

interface TaskCardProps {
  item: TaskItem;
  index: number;
  userRole?: string | null;
}

const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'High':
      return '#e57373'; // Light red
    case 'Medium':
      return '#ffb74d'; // Light orange
    case 'Low':
      return '#81c784'; // Light green
    default:
      return '#e0e0e0'; // Light grey
  }
};

const TaskCard = ({ item, index }: TaskCardProps) => {
  // Get the first letter of the assigned person's name for the avatar
  const avatarLetter = item.assigned_To.charAt(0).toUpperCase();
  
  // Generate a random but consistent color for the avatar background
  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
  };
  
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
            p: 2,
            mb: 2,
            borderRadius: '4px',
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
            border: '1px solid #444444',
          }}
        >
          {/* Header with avatar and options */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Avatar 
              sx={{ 
                width: 28, 
                height: 28, 
                fontSize: '0.9rem',
                bgcolor: stringToColor(item.assigned_To),
                color: '#fff',
                border: '1px solid #555'
              }}
            >
              {avatarLetter}
            </Avatar>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip 
                label={`Day ${Math.floor(Math.random() * 7) + 1}`} 
                size="small"
                sx={{ 
                  height: '22px', 
                  mr: 1,
                  fontSize: '0.7rem',
                  fontWeight: 'medium',
                  bgcolor: '#555',
                  color: '#ddd'
                }}
              />
              <MoreVertIcon sx={{ fontSize: '1.2rem', color: 'text.secondary', cursor: 'pointer' }} />
            </Box>
          </Box>
          
          {/* Task title */}
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: '600',
              fontSize: '0.95rem',
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
              mb: 1.5,
              color: '#ffffff',
              lineHeight: 1.3
            }}
          >
            {item.task}
          </Typography>

          {/* Bottom section with assignee and priority */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: '0.75rem', 
                  color: '#aaaaaa',
                  fontWeight: 'medium'
                }}
              >
                {item.assignee}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FiberManualRecordIcon sx={{ 
                fontSize: '0.7rem', 
                color: getPriorityColor(item.priority),
                mr: 0.5
              }} />
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 'bold',
                  color: getPriorityColor(item.priority)
                }}>
                {item.priority}
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}
    </Draggable>
  );
};

export default TaskCard;
