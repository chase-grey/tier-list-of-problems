import React from 'react';
import { useDndMonitor } from '@dnd-kit/core';

interface DragEventMonitorProps {
  onUpdateDroppable: (droppableId: string) => void;
}

/**
 * Component that monitors drag events inside the DndContext
 * Uses useDndMonitor hook which must be used within DndContext
 */
const DragEventMonitor: React.FC<DragEventMonitorProps> = ({ onUpdateDroppable }) => {
  // Setup drag event monitoring
  useDndMonitor({
    onDragMove: (event) => {
      // Store last known valid droppable during drag
      if (event.over) {
        onUpdateDroppable(String(event.over.id));
      }
    }
  });

  // This component doesn't render anything
  return null;
};

export default DragEventMonitor;
