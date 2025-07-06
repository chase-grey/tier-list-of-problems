// Type declarations for modules without TypeScript definitions
declare module '@hello-pangea/dnd' {
  import * as React from 'react';

  // DragDropContext
  export interface DragDropContextProps {
    onDragEnd: (result: DropResult) => void;
    onDragStart?: (initial: DragStart) => void;
    onDragUpdate?: (update: DragUpdate) => void;
    children?: React.ReactNode;
  }
  
  export interface DragStart {
    draggableId: string;
    type: string;
    source: {
      droppableId: string;
      index: number;
    };
  }
  
  export interface DragUpdate extends DragStart {
    destination?: {
      droppableId: string;
      index: number;
    };
  }
  
  export interface DropResult extends DragUpdate {
    reason: 'DROP' | 'CANCEL';
  }
  
  export const DragDropContext: React.ComponentClass<DragDropContextProps>;

  // Draggable
  export interface DraggableProps {
    draggableId: string;
    index: number;
    isDragDisabled?: boolean;
    disableInteractiveElementBlocking?: boolean;
    children: (provided: DraggableProvided, snapshot: DraggableStateSnapshot) => React.ReactNode;
  }
  
  export interface DraggableProvided {
    innerRef: (element: HTMLElement | null) => void;
    draggableProps: {
      style?: React.CSSProperties;
      [key: string]: unknown;
    };
    dragHandleProps: {
      onMouseDown: (event: React.MouseEvent<HTMLElement>) => void;
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
      onClick: (event: React.MouseEvent<HTMLElement>) => void;
      tabIndex: number;
      'aria-grabbed': boolean;
      draggable: boolean;
      onDragStart: () => void;
      role: string;
      [key: string]: unknown;
    } | null;
  }
  
  export interface DraggableStateSnapshot {
    isDragging: boolean;
    isDropAnimating: boolean;
    draggingOver: string | null;
    dropAnimation: {
      duration: number;
      curve: string;
      moveTo: {
        x: number;
        y: number;
      };
    } | null;
  }
  
  export const Draggable: React.ComponentClass<DraggableProps>;

  // Droppable
  export interface DroppableProps {
    droppableId: string;
    type?: string;
    mode?: 'standard' | 'virtual';
    isDropDisabled?: boolean;
    isCombineEnabled?: boolean;
    direction?: 'horizontal' | 'vertical';
    ignoreContainerClipping?: boolean;
    renderClone?: (provided: DraggableProvided, snapshot: DraggableStateSnapshot, rubric: Record<string, unknown>) => React.ReactNode;
    getContainerForClone?: () => HTMLElement;
    children: (provided: DroppableProvided, snapshot: DroppableStateSnapshot) => React.ReactNode;
  }
  
  export interface DroppableProvided {
    innerRef: (element: HTMLElement | null) => void;
    droppableProps: {
      [key: string]: unknown;
    };
    placeholder?: React.ReactNode;
  }
  
  export interface DroppableStateSnapshot {
    isDraggingOver: boolean;
    draggingOverWith: string | null;
    draggingFromThisWith: string | null;
    isUsingPlaceholder: boolean;
  }
  
  export const Droppable: React.ComponentClass<DroppableProps>;
}
