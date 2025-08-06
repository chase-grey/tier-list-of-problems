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
  _votes: Record<string, ProjectVote>, // Prefixed with underscore to indicate it's intentionally unused
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
  
  // Handler for drag end with performance optimizations
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    // Performance measurement
    const dragEndStartTime = performance.now();
    
    // Clear safety timeout
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }
    
    // Calculate drag duration for analytics
    const dragDuration = dragStartTime ? Date.now() - dragStartTime : 0;
    console.log(`Drag duration: ${dragDuration}ms`);
    
    // Extract project ID once to avoid repeated processing
    const projectId = String(active.id).replace('project-', '');
    const activeContainer = active.data.current?.sortable?.containerId || 'unsorted';
    const activeIndex = active.data.current?.sortable?.index || 0;
    
    // Prepare result object once instead of creating it multiple times
    let result: DragEndResult | null = null;
    
    // Check for valid drop with a destination
    if (isDraggingRef.current && over && active.id !== over.id) {
      const overContainer = over.data.current?.sortable?.containerId || 'unsorted';
      const overIndex = over.data.current?.sortable?.index || 0;
      
      result = {
        source: {
          droppableId: activeContainer,
          index: activeIndex,
        },
        destination: {
          droppableId: overContainer,
          index: overIndex,
        },
        draggableId: projectId,
      };
      
      console.log(`State updated for drag of project ${projectId}`);
    } 
    // Handle drops outside valid drop areas but with last known droppable
    else if (isDraggingRef.current && !over && lastKnownDroppableRef.current) {
      console.log(`Using last known droppable: ${lastKnownDroppableRef.current}`);
      
      result = {
        source: {
          droppableId: activeContainer,
          index: activeIndex,
        },
        destination: {
          droppableId: lastKnownDroppableRef.current,
          index: 0, // Default to top of column
        },
        draggableId: projectId,
      };
      
      console.log(`Recovered drop for project ${projectId} to ${lastKnownDroppableRef.current}`);
    } else {
      console.log('Drag cancelled or ended without a destination change');
    }
    
    // Call the callback outside of setTimeout to avoid setState delays
    if (result) {
      // Use requestAnimationFrame for smoother updates that are still batched
      requestAnimationFrame(() => {
        onDragComplete(result!);
        // Performance measurement
        console.log(`Drag end processing took: ${performance.now() - dragEndStartTime}ms`);
      });
    }
    
    // Reset drag state immediately to clear the UI
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
