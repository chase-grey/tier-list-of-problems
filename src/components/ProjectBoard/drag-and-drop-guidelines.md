# Drag-and-Drop Implementation Guidelines

## Fundamental Limitations to Understand

The `@hello-pangea/dnd` library (a fork of `react-beautiful-dnd`) has specific limitations that must be followed to ensure proper functionality and performance:

1. **Nested Scroll Container Restriction**: A Droppable component can only have ONE scroll parent (which can be itself).
2. **Single Axis Movement**: Draggables are designed to move on a single axis at a time.
3. **Performance Degradation**: Large numbers of draggable items can cause performance issues.

## Best Practices

### 1. Proper Container Structure

```
// CORRECT STRUCTURE:
<ParentContainer> (no overflow properties)
  <TaskList overflowY="auto"> (the ONLY scroll container)
    <Droppable>
      <Item />
      <Item />
    </Droppable>
  </TaskList>
</ParentContainer>
```

### 2. Scroll Container Rules

- **Only ONE container with overflow** in the hierarchy of a Droppable
- This container should typically be the direct parent of the Droppable
- All parent containers must NOT have any overflow settings

### 3. Component Optimization

- Use `React.memo` for all draggable items
- Implement proper equality checks in memo comparisons
- Use `useMemo` for expensive calculations within draggable items
- Minimize state updates during drag operations

### 4. Performance Monitoring

- Monitor frame rates during drag operations
- Log performance metrics for long-running drag operations
- Watch for slow frames (>16ms) which indicate performance issues

### 5. State Management

- Batch state updates after drag operations
- Use `requestAnimationFrame` for smoothness
- Minimize re-renders triggered by state changes

## Troubleshooting Common Issues

### 1. "Unsupported nested scroll container detected"

This error occurs when multiple elements in the component hierarchy have scroll settings (overflow: auto, scroll, etc.). Fix by ensuring only ONE container has overflow settings.

### 2. Laggy Drag Performance

- Check for unnecessary re-renders using React DevTools
- Ensure proper memoization of draggable components
- Reduce complexity of draggable items
- Consider implementing virtualization for large lists

### 3. Items Not Dropping in Expected Locations

- Verify collision detection is working properly
- Check for conflicting z-index values
- Ensure container dimensions are properly calculated

## Future Considerations

For improved performance and maintainability, consider:

1. Migrating to a more modern drag-and-drop library like `@dnd-kit/core`
2. Implementing virtualization for large lists using `react-virtuoso` or similar
3. Creating custom hooks to encapsulate drag-and-drop logic
4. Standardizing on a single drag-and-drop implementation across the codebase

Remember: The current implementation works with the limitations of `@hello-pangea/dnd`, but future refactoring should aim to consolidate libraries and improve the architectural approach to drag-and-drop functionality.
