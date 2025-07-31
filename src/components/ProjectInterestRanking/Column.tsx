import { useDroppable } from '@dnd-kit/core';
import { Paper, Typography, Box, Stack } from '@mui/material';
import { ProjectCard } from './ProjectCard';
import type { Column as ColumnType, Project } from './types';

// Custom colors for interest level columns - using blue-purple tones for interest levels
const COLUMN_COLORS = {
  'UNSORTED': 'background.paper', // Default paper color for unsorted
  'HIGHEST': '#4A5CFF',      // Vibrant blue for highest interest
  'HIGH': '#5D78F7',        // Blue for high interest
  'MEDIUM': '#7A90F5',      // Medium blue-purple for medium interest
  'LOW': '#9BAEF0',         // Light blue-purple for low interest
  'default': 'background.paper' // Default paper color
};

type ColumnProps = {
  column: ColumnType;
  projects: Project[];
};

export function Column({ column, projects }: ColumnProps) {
  // Make the column itself a droppable area for status changes
  const { setNodeRef } = useDroppable({
    id: column.id,
  });
  
  // Get background color for the column header
  const getHeaderColor = () => {
    return COLUMN_COLORS[column.id as keyof typeof COLUMN_COLORS] || COLUMN_COLORS.default;
  };
  
  // Get text color for the header - always white for columns with background colors
  const getHeaderTextColor = () => COLUMN_COLORS[column.id as keyof typeof COLUMN_COLORS] === COLUMN_COLORS.default ? 'text.primary' : 'white';

  // Count projects in this column for display in the header
  const projectCount = projects.length;
  
  return (
    <Box 
      sx={{ 
        width: { xs: '100%', sm: '320px' }, 
        flex: '1 1 0',
        minWidth: { xs: '300px', sm: '320px' },
        maxWidth: { xs: '100%', sm: '350px' },
        mx: 0.25, // Reduce horizontal margin to decrease padding between columns
        my: 1,
        display: 'flex',
        flexDirection: 'column',
        height: { xs: 'auto', lg: 'calc(100vh - 220px)' }, // Slightly reduce height to ensure no scrollbar
      }}
      role="region"
      aria-label={`${column.title} column`}
    >
      {/* Column header - styled as a pill like the rest of the application */}
      <Paper 
        sx={{
          p: 1,
          mb: 1,
          backgroundColor: getHeaderColor(),
          color: getHeaderTextColor(),
          textAlign: 'center',
          fontWeight: 'bold',
          borderRadius: '30px', // Pill shape
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)', // Subtle shadow for depth
        }}
      >
        <Typography variant="subtitle1" sx={{ fontSize: '0.9rem' }}>
          {column.title} ({projectCount})
        </Typography>
      </Paper>
      
      <Paper
        ref={setNodeRef}
        elevation={1}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          overflow: 'hidden',
          backgroundColor: '#333333', // Dark grey for column background
          mt: -1, // Overlap with pill header
        }}
      >
        
        {/* Project cards container */}
        <Stack
          spacing={2}
          sx={{
            p: 2,
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '10px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
            },
          }}
        >
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}
