import React, { useMemo } from 'react';
import { 
  DndContext as DndKitContext, 
  TouchSensor, 
  useSensor, 
  useSensors,
  PointerSensor,
  KeyboardSensor,
  defaultDropAnimationSideEffects,
  MeasuringStrategy,
  DragOverlay,
  useDndMonitor,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import type {
  DropAnimation,
  Modifier
} from '@dnd-kit/core';
import { 
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { Project, ProjectVote } from '../../types/project-models';
import ProjectCard from './ProjectCard/ProjectCard';
import { useDragDrop } from '../../hooks/useDragDrop';

// Enhanced animation configuration for smooth transitions
const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
        transform: 'scale(1.05)',
      },
    },
    className: {
      active: 'drag-active',
      dragOverlay: 'drag-overlay',
    },
  }),
  duration: 300, // 300ms animation duration for smooth transitions
  easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)', // Bouncy effect for better feedback
};

// Constrain the drag overlay to prevent it from going off-screen
const constrainToWindowEdges: Modifier = ({ transform }) => {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const maxX = windowWidth - 250; // Adjust based on typical card width
  const maxY = windowHeight - 150; // Adjust based on typical card height
  
  return {
    ...transform,
    x: Math.min(maxX, Math.max(0, transform.x)),
    y: Math.min(maxY, Math.max(0, transform.y)),
  };
};

interface DndContextProps {
  children: React.ReactNode;
  projects: Project[];
  votes: Record<string, ProjectVote>;
  onDragEnd: (result: {
    destination?: { droppableId: string; index: number };
    source: { droppableId: string; index: number };
    draggableId: string;
  }) => void;
  userRole?: string | null;
}

export const DndContext: React.FC<DndContextProps> = ({ 
  children, 
  projects, 
  votes,
  onDragEnd,
  userRole
}) => {
  // Use our custom hook to manage drag and drop state and handlers
  const {
    activeId,
    activeProject,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    updateLastKnownDroppable,
  } = useDragDrop(projects, votes, onDragEnd);
  
  // Configure the sensors to detect drag gestures with better settings for smoother experience
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require a more intentional drag gesture to start dragging
      activationConstraint: {
        distance: 4, // Lower distance for more responsive feel
        tolerance: 5, // Distance mouse can move during activation delay
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
    useSensor(TouchSensor, {
      // Prevent scrolling while dragging on mobile
      activationConstraint: {
        delay: 150, // Lower delay for more responsive touch
        tolerance: 8, // Distance user's finger can move during delay
      },
    })
  );
  
  // Create enhanced collision detection strategy
  const collisionDetectionStrategy = (args: any) => {
    // First try standard pointer collision detection
    const pointerCollisions = pointerWithin(args);
    
    if (pointerCollisions.length > 0) {
      // If we have pointer collisions, use those
      updateLastKnownDroppable(pointerCollisions[0].id as string);
      return pointerCollisions;
    }
    
    // Otherwise, try rect intersection for broader collision detection
    const rectCollisions = rectIntersection(args);
    
    if (rectCollisions.length > 0) {
      updateLastKnownDroppable(rectCollisions[0].id as string);
      return rectCollisions;
    }
    
    return [];
  };

  // Internal component for monitoring drag events
  // This ensures useDndMonitor is called inside the DndContext
  const DragMonitor = () => {
    // Setup drag event monitoring
    useDndMonitor({
      onDragMove: (event) => {
        // Store last known valid droppable during drag
        if (event.over) {
          updateLastKnownDroppable(String(event.over.id));
        }
      }
    });
    
    // This component doesn't render anything
    return null;
  };
  
  // Configure drag auto-scroll settings
  const autoScrollOptions = useMemo(() => ({
    acceleration: 10,
    threshold: { x: 0.1, y: 0.2 },
  }), []);
  
  return (
    <DndKitContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      autoScroll={autoScrollOptions}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
    >
      {children}
      
      {/* Internal monitor for drag events */}
      <DragMonitor />
      
      {/* Enhanced overlay shows a preview of the item being dragged with better styling */}
      <DragOverlay 
        dropAnimation={dropAnimation}
        modifiers={[constrainToWindowEdges]}
        zIndex={1000}
        adjustScale={true}
      >
        {activeId && activeProject ? (
          <div 
            style={{
              transform: 'rotate(2deg) scale(1.05)', // Slight rotation for better feedback
              boxShadow: '0px 8px 15px rgba(0,0,0,0.25)',
              opacity: 0.9,
              pointerEvents: 'none',
              width: 'calc(100% / 6 - 16px)', // Match column width minus padding
              maxWidth: '250px',
              transition: 'transform 100ms cubic-bezier(0.18, 0.67, 0.6, 1.22)',
              backgroundColor: 'white', // Ensure background is visible
              borderRadius: '4px',
            }}
            className="drag-overlay-container"
          >
            <ProjectCard
              project={activeProject}
              vote={votes[activeProject.id]}
              index={-1} // Special index for the overlay
              userRole={userRole}
              isDragging={true} // New prop to indicate this is being dragged
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndKitContext>
  );
};

export default DndContext;
