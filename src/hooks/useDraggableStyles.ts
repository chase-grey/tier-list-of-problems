/**
 * Custom hook that provides consistent drag-and-drop styling across components
 * This centralizes drag-and-drop styling logic to ensure consistent behavior
 * across project interest, ranking, and other board sections
 */
import { useState, useCallback } from 'react';
import { getColumnContentStyles, getInnerListStyles } from '../styles/columnStyles';

interface UseDraggableStylesProps {
  isEmpty?: boolean;
  initialIsDragging?: boolean;
}

interface UseDraggableStylesResult {
  isDraggingOver: boolean;
  setIsDraggingOver: (isDragging: boolean) => void;
  columnContentStyles: any;
  innerListStyles: any;
  handleDragOver: (isDraggingOver: boolean) => void;
  handleDragEnd: () => void;
}

/**
 * Hook to provide consistent drag and drop styling across different components
 * 
 * @param isEmpty - Whether the column is empty (for optional border styling)
 * @param initialIsDragging - Initial dragging state
 * @returns Styles and handlers for drag and drop operations
 */
export function useDraggableStyles({
  isEmpty = false,
  initialIsDragging = false
}: UseDraggableStylesProps = {}): UseDraggableStylesResult {
  const [isDraggingOver, setIsDraggingOver] = useState(initialIsDragging);
  
  // Get column content styles based on drag state
  const columnContentStyles = getColumnContentStyles(isDraggingOver, isEmpty);
  
  // Get inner list styles based on drag state
  const innerListStyles = getInnerListStyles(isDraggingOver);
  
  // Handler for drag over events
  const handleDragOver = useCallback((isDraggingOver: boolean) => {
    setIsDraggingOver(isDraggingOver);
  }, []);
  
  // Handler for drag end events
  const handleDragEnd = useCallback(() => {
    setIsDraggingOver(false);
  }, []);
  
  return {
    isDraggingOver,
    setIsDraggingOver,
    columnContentStyles,
    innerListStyles,
    handleDragOver,
    handleDragEnd
  };
}
