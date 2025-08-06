import React, { useMemo, useRef } from 'react';
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
  
  // Optimized collision detection strategy for better performance
  const collisionDetectionStrategy = useMemo(() => {
    return (args: any) => {
      // Use rectIntersection as primary strategy (more performant)
      const rectCollisions = rectIntersection(args);
      
      if (rectCollisions.length > 0) {
        updateLastKnownDroppable(rectCollisions[0].id as string);
        return rectCollisions;
      }
      
      // Only fall back to pointerWithin when needed
      const pointerCollisions = pointerWithin(args);
      
      if (pointerCollisions.length > 0) {
        updateLastKnownDroppable(pointerCollisions[0].id as string);
        return pointerCollisions;
      }
      
      return [];
    };
  }, [updateLastKnownDroppable]); // Only recreate if updateLastKnownDroppable changes

  // Internal component for monitoring drag events
  // This ensures useDndMonitor is called inside the DndContext
  const DragMonitor = () => {
    // Performance tracking variables
    const dragStartTimeRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(0);
    const frameCountRef = useRef<number>(0);
    const slowFramesRef = useRef<number>(0);

    // Setup drag event monitoring
    useDndMonitor({
      onDragStart: () => {
        // Reset performance metrics at start of drag
        dragStartTimeRef.current = performance.now();
        lastFrameTimeRef.current = performance.now();
        frameCountRef.current = 0;
        slowFramesRef.current = 0;
        console.log('Drag operation started - monitoring performance');
      },
      onDragMove: (event) => {
        // Store last known valid droppable during drag
        if (event.over) {
          updateLastKnownDroppable(String(event.over.id));
        }

        // Measure frame rate during drag
        const now = performance.now();
        const frameDuration = now - lastFrameTimeRef.current;
        
        // Track number of slow frames (> 16ms = less than 60fps)
        if (frameDuration > 16) {
          slowFramesRef.current++;
        }
        
        frameCountRef.current++;
        lastFrameTimeRef.current = now;
      },
      onDragEnd: () => {
        // Log performance metrics
        if (dragStartTimeRef.current) {
          const dragDuration = performance.now() - dragStartTimeRef.current;
          const avgFrameTime = dragDuration / (frameCountRef.current || 1);
          const slowFramePercentage = (slowFramesRef.current / (frameCountRef.current || 1)) * 100;
          
          console.log(`Drag Performance Metrics:`);
          console.log(`- Total duration: ${dragDuration.toFixed(2)}ms`);
          console.log(`- Frames processed: ${frameCountRef.current}`);
          console.log(`- Average frame time: ${avgFrameTime.toFixed(2)}ms`);
          console.log(`- Slow frames: ${slowFramesRef.current} (${slowFramePercentage.toFixed(2)}%)`);
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
      
      {/* Simplified overlay with minimal styling for better performance */}
      <DragOverlay 
        dropAnimation={dropAnimation}
        modifiers={[constrainToWindowEdges]}
        zIndex={1000}
        adjustScale={false} // Disable scale adjustment for better performance
      >
        {activeId && activeProject ? (
          <div 
            style={{
              // Simplified transform with less expensive operations
              transform: 'rotate(1deg)', 
              boxShadow: '0px 5px 10px rgba(0,0,0,0.2)',
              opacity: 0.95,
              pointerEvents: 'none',
              width: 'calc(100% / 6 - 16px)',
              maxWidth: '250px',
              // Remove transition for better performance during dragging
              backgroundColor: 'white',
              borderRadius: '4px',
            }}
            className="drag-overlay-container"
          >
            {/* Use React.memo version of ProjectCard for overlay */}
            <ProjectCard
              project={activeProject}
              vote={votes[activeProject.id]}
              userRole={userRole}
              isDragging={true}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndKitContext>
  );
};

export default DndContext;
