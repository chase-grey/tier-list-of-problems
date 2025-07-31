import { useState, useRef, useCallback } from 'react';
import type { DragEndEvent, DragStartEvent, UniqueIdentifier } from '@dnd-kit/core';
import type { Project, ProjectVote, ProjectPriority } from '../types/project-models';

/**
 * Interface for the result object returned by the drag end handler
 */
export interface DragEndResult {
  source: {
    droppableId: string;
    index: number;
  };
  destination?: {
    droppableId: string;
    index: number;
  };
  draggableId: string;
}

/**
 * Hook for drag and drop operations in project priority management
 * Centralizes drag-drop state and handlers for better code organization
 * 
 * @param projects - List of projects
 * @param votes - Current project votes
 * @param onDragComplete - Callback when drag operation completes
 * @returns - Object with drag state and handlers
 */
export function useDragDrop(
  projects: Project[],
  votes: Record<string, ProjectVote>, // Used for activeProject lookup
  onDragComplete: (result: DragEndResult) => void
) {
  // State for active drag item
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [dragStartTime, setDragStartTime] = useState<number | null>(null);
  
  // Refs for tracking drag state
  const isDraggingRef = useRef(false);
  const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKnownDroppableRef = useRef<string | null>(null);
  const dragStartPositionRef = useRef<{ x: number, y: number } | null>(null);
  
  // Get the active project being dragged
  const activeProject = activeId ? projects.find(p => p.id === activeId) : null;
  
  // Handler for drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id);
    setDragStartTime(Date.now());
    
    // Set dragging flag
    isDraggingRef.current = true;
    
    // Store initial position for distance calculations
    if (event.active.rect.current.initial) {
      dragStartPositionRef.current = {
        x: event.active.rect.current.initial.left,
        y: event.active.rect.current.initial.top
      };
    }
    
    // Add class to body for cursor styling
    document.body.classList.add('dragging');
    
    // Safety timeout to prevent stuck drag states
    dragTimerRef.current = setTimeout(() => {
      if (isDraggingRef.current) {
        console.log('Drag safety timeout triggered - cleaning up drag state');
        handleDragCancel();
      }
    }, 30000); // 30 second timeout
    
    console.log(`Drag started: ${String(active.id)}`);
  }, []);
  
  // Handler for drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    // Clear safety timeout
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }
    
    // Calculate drag duration for analytics
    const dragDuration = dragStartTime ? Date.now() - dragStartTime : 0;
    console.log(`Drag duration: ${dragDuration}ms`);
    
    // Check for valid drop with a destination
    if (isDraggingRef.current && over && active.id !== over.id) {
      const activeContainer = active.data.current?.sortable?.containerId;
      const overContainer = over.data.current?.sortable?.containerId;
      
      // Extract project ID from the drag element ID
      const projectId = String(active.id).replace('project-', '');
      
      // Add small delay to avoid race conditions with React rendering
      setTimeout(() => {
        onDragComplete({
          source: {
            droppableId: activeContainer || 'unsorted',
            index: active.data.current?.sortable?.index || 0,
          },
          destination: {
            droppableId: overContainer || 'unsorted',
            index: over.data.current?.sortable?.index || 0,
          },
          draggableId: projectId,
        });
        
        console.log(`State updated for drag of project ${projectId}`);
      }, 10);
    } 
    // Handle drops outside valid drop areas but with last known droppable
    else if (isDraggingRef.current && !over && lastKnownDroppableRef.current) {
      console.log(`Using last known droppable: ${lastKnownDroppableRef.current}`);
      
      const activeContainer = active.data.current?.sortable?.containerId;
      const projectId = String(active.id).replace('project-', '');
      
      setTimeout(() => {
        onDragComplete({
          source: {
            droppableId: activeContainer || 'unsorted',
            index: active.data.current?.sortable?.index || 0,
          },
          destination: {
            droppableId: lastKnownDroppableRef.current || 'unsorted',
            index: 0, // Default to top of column
          },
          draggableId: projectId,
        });
        
        console.log(`Recovered drop for project ${projectId} to ${lastKnownDroppableRef.current}`);
      }, 10);
    } else {
      console.log('Drag cancelled or ended without a destination change');
    }
    
    // Reset drag state
    resetDragState();
  }, [dragStartTime, onDragComplete]);
  
  // Handler for drag cancel
  const handleDragCancel = useCallback(() => {
    console.log('Drag cancelled');
    resetDragState();
  }, []);
  
  // Helper to reset all drag state
  const resetDragState = useCallback(() => {
    // Clear safety timeout if exists
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }
    
    // Reset all state
    setActiveId(null);
    setDragStartTime(null);
    isDraggingRef.current = false;
    lastKnownDroppableRef.current = null;
    dragStartPositionRef.current = null;
    
    // Remove drag cursor class
    document.body.classList.remove('dragging');
  }, []);
  
  // Helper to update last known droppable
  const updateLastKnownDroppable = useCallback((droppableId: string | null) => {
    if (droppableId) {
      lastKnownDroppableRef.current = droppableId;
    }
  }, []);
  
  // Cleanup function to be used in useEffect
  const cleanup = useCallback(() => {
    resetDragState();
  }, [resetDragState]);
  
  return {
    // State
    activeId,
    activeProject,
    isDragging: isDraggingRef.current,
    lastKnownDroppable: lastKnownDroppableRef.current,
    
    // Handlers
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    updateLastKnownDroppable,
    resetDragState,
    cleanup,
    
    // Helper functions for components
    isProjectBeingDragged: (projectId: string) => 
      activeId ? String(activeId).includes(projectId) : false
  };
}

/**
 * Extract priority from column ID (format: "priority-highest-priority")
 * 
 * @param columnId - ID of the column
 * @returns The priority as a string, or null for "unsorted"
 */
export function getPriorityFromColumnId(columnId: string): ProjectPriority | null {
  if (columnId === 'unsorted') {
    return null;
  }
  
  // Extract priority text (remove "priority-" prefix and replace dashes with spaces)
  const priorityText = columnId.replace('priority-', '').split('-').join(' ');
  
  // Format first letter of each word as uppercase
  return priorityText
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') as ProjectPriority;
}

/**
 * Get column ID from priority value
 * 
 * @param priority - Project priority
 * @returns Column ID string
 */
export function getColumnIdFromPriority(priority: ProjectPriority | null): string {
  if (priority === null) {
    return 'unsorted';
  }
  
  // Convert to kebab case: "Highest priority" -> "priority-highest-priority"
  return `priority-${priority.toLowerCase().replace(/\s+/g, '-')}`;
}
