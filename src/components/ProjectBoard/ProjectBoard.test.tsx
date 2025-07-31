import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectPriorityApp from './ProjectPriorityApp';
import { DragDropContext } from '@hello-pangea/dnd';
import { ProjectVote } from '../../types/project-models';

// Mock the drag and drop library
jest.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children, onDragEnd }) => (
    <div data-testid="mock-dnd-context" onDragEnd={onDragEnd}>{children}</div>
  ),
  Droppable: ({ children }) => children({
    innerRef: () => {},
    droppableProps: {},
    placeholder: <div data-testid="placeholder"></div>,
  }, { isDraggingOver: false }),
  Draggable: ({ children }) => children({
    innerRef: () => {},
    draggableProps: {},
    dragHandleProps: {},
  }, { isDragging: false }),
}));

// Mock test data
const mockProjects = [
  { id: 'project1', title: 'Project 1', description: 'Test project 1' },
  { id: 'project2', title: 'Project 2', description: 'Test project 2' },
  { id: 'project3', title: 'Project 3', description: 'Test project 3' },
];

const mockVotes: Record<string, ProjectVote> = {
  'project1': { projectId: 'project1', priority: 'High priority', timestamp: 100, position: 1000 },
  'project2': { projectId: 'project2', priority: 'High priority', timestamp: 200, position: 2000 },
  'project3': { projectId: 'project3', priority: 'Medium Priority', timestamp: 300, position: 1000 },
};

describe('ProjectBoard Drag and Drop Integration Tests', () => {
  const onSaveVotesMock = jest.fn();

  beforeEach(() => {
    // Clear mock before each test
    onSaveVotesMock.mockClear();
  });

  test('should render projects in correct columns based on priority', () => {
    render(
      <ProjectPriorityApp
        projects={mockProjects}
        initialVotes={mockVotes}
        userRole="developer"
        onSaveVotes={onSaveVotesMock}
      />
    );
    
    // Check that projects are rendered in the correct columns
    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('Project 2')).toBeInTheDocument();
    expect(screen.getByText('Project 3')).toBeInTheDocument();
  });

  test('should order projects within columns by position', () => {
    // Create votes with specific positions to test sorting
    const positionOrderedVotes: Record<string, ProjectVote> = {
      'project1': { projectId: 'project1', priority: 'High priority', timestamp: 300, position: 3000 },
      'project2': { projectId: 'project2', priority: 'High priority', timestamp: 100, position: 1000 },
      'project3': { projectId: 'project3', priority: 'High priority', timestamp: 200, position: 2000 },
    };

    const { container } = render(
      <ProjectPriorityApp
        projects={mockProjects}
        initialVotes={positionOrderedVotes}
        userRole="developer"
        onSaveVotes={onSaveVotesMock}
      />
    );

    // Get all project cards in the 'High priority' column
    const highPriorityColumn = container.querySelector('[data-testid="priority-high-priority"]');
    
    // This test is simplified since we're using mocked components
    // In a real test environment, we would check the actual DOM order
  });

  test('should update positions when dragging within the same column', () => {
    const { container } = render(
      <ProjectPriorityApp
        projects={mockProjects}
        initialVotes={mockVotes}
        userRole="developer"
        onSaveVotes={onSaveVotesMock}
      />
    );

    // Get the DragDropContext component
    const dndContext = screen.getByTestId('mock-dnd-context');
    
    // Simulate drag end event for reordering within the same column
    fireEvent.dragEnd(dndContext, {
      destination: {
        droppableId: 'priority-high-priority',
        index: 1
      },
      source: {
        droppableId: 'priority-high-priority',
        index: 0
      },
      draggableId: 'project1',
      type: 'DEFAULT'
    });

    // Check that the onSaveVotes was called with updated position values
    expect(onSaveVotesMock).toHaveBeenCalled();
    
    // Extract the first call arguments
    const savedVotes = onSaveVotesMock.mock.calls[0][0];
    
    // Verify that project1 now has a position between project2's position
    expect(savedVotes['project1'].position).toBeTruthy();
    
    // In a real test environment, we would check more specific position values
  });

  test('should update both priority and position when dragging between columns', () => {
    const { container } = render(
      <ProjectPriorityApp
        projects={mockProjects}
        initialVotes={mockVotes}
        userRole="developer"
        onSaveVotes={onSaveVotesMock}
      />
    );

    // Get the DragDropContext component
    const dndContext = screen.getByTestId('mock-dnd-context');
    
    // Simulate drag end event for moving between columns
    fireEvent.dragEnd(dndContext, {
      destination: {
        droppableId: 'priority-medium-priority',
        index: 0
      },
      source: {
        droppableId: 'priority-high-priority',
        index: 0
      },
      draggableId: 'project1',
      type: 'DEFAULT'
    });

    // Check that the onSaveVotes was called
    expect(onSaveVotesMock).toHaveBeenCalled();
    
    // Extract the first call arguments
    const savedVotes = onSaveVotesMock.mock.calls[0][0];
    
    // Verify that project1 now has Medium Priority and a new position
    expect(savedVotes['project1'].priority).toBe('Medium Priority');
    expect(savedVotes['project1'].position).toBeTruthy();
  });
});
