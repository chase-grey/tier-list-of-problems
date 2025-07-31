import React from 'react';
import type { DropResult } from '@hello-pangea/dnd';
import type { Pitch, Vote, Tier } from '../../types/models';
import { calculateCardOrder, prepareItemsForOrdering } from '../../utils/cardSorting';

interface EnhancedDragDropProviderProps {
  pitches: Pitch[];
  votes: Record<string, Vote>;
  onDragEnd: (result: DropResult) => void;
  children: React.ReactNode;
}

/**
 * Enhanced wrapper component that adds proper order calculation to drag and drop operations
 * This component intercepts drag end events and enhances them with proper order calculation
 * before passing them to the original onDragEnd handler
 */
const EnhancedDragDropProvider: React.FC<EnhancedDragDropProviderProps> = ({ 
  pitches,
  votes,
  onDragEnd,
  children 
}) => {
  // Enhanced drag end handler that calculates proper order values
  const handleEnhancedDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    
    // If dropped outside a droppable area or in the same position, pass through directly
    if (!destination || 
        (source.droppableId === destination.droppableId && 
         source.index === destination.index)) {
      onDragEnd(result);
      return;
    }
    
    const sourceId = source.droppableId;
    const destId = destination.droppableId;
    const destinationIndex = destination.index;
    
    // Create enhanced result with calculated order property
    try {
      // If dropped in unsorted column
      if (destId === 'unsorted') {
        if (sourceId === 'unsorted') {
          // Calculate proper order for reordering within unsorted column
          const unsortedPitches = pitches
            .filter(p => p.id !== draggableId) 
            .filter(p => !votes[p.id]?.tier) 
            .map(p => p.id);
          
          // Helper function to get unsortedOrder values consistently
          const getUnsortedOrder = (pitchId: string): number => {
            return votes[pitchId]?.unsortedOrder ?? 
                   votes[pitchId]?.timestamp ?? 
                   pitchId.charCodeAt(0);
          };
          
          // Prepare items and calculate order based on destination index
          const { itemsBefore, itemsAfter } = prepareItemsForOrdering(unsortedPitches, destinationIndex);
          
          // Calculate new order value using the utility function
          const newOrder = calculateCardOrder(
            itemsBefore,
            itemsAfter,
            getUnsortedOrder
          );
          
          // Create updated vote with new unsortedOrder
          const updatedVote = { 
            ...(votes[draggableId] || {}),
            pitchId: draggableId,
            tier: null, 
            unsortedOrder: newOrder,
            timestamp: Date.now()
          } as Vote;
          
          // Store enhanced order information on the result
          Object.defineProperty(result, 'enhancedOrderInfo', {
            value: {
              vote: updatedVote,
              orderType: 'unsorted',
              newOrder
            },
            enumerable: true
          });
          
          console.log(`Enhanced unsorted order calculation: ${newOrder} for pitch ${draggableId}`);
        }
      }
      // If dropped in a tier column
      else if (destId.startsWith('tier-')) {
        const tier = parseInt(destId.replace('tier-', '')) as Tier;
        
        if (sourceId === destId) {
          // Calculate proper order for reordering within a tier column
          const sameTierPitches = pitches
            .filter(p => p.id !== draggableId) 
            .filter(p => votes[p.id]?.tier === tier) 
            .map(p => p.id);
          
          // Helper function to get order values consistently
          const getOrder = (pitchId: string): number => {
            return votes[pitchId]?.order ?? 
                   votes[pitchId]?.timestamp ?? 
                   Date.now();
          };
          
          // Prepare items and calculate order based on destination index
          const { itemsBefore, itemsAfter } = prepareItemsForOrdering(sameTierPitches, destinationIndex);
          
          // Calculate new order value using the utility function
          const newOrder = calculateCardOrder(
            itemsBefore,
            itemsAfter,
            getOrder
          );
          
          // Create updated vote with new order and tier
          const updatedVote = { 
            ...(votes[draggableId] || {}),
            pitchId: draggableId,
            tier, 
            order: newOrder,
            timestamp: Date.now()
          } as Vote;
          
          // Store enhanced order information on the result
          Object.defineProperty(result, 'enhancedOrderInfo', {
            value: {
              vote: updatedVote,
              orderType: 'tier',
              tier,
              newOrder
            },
            enumerable: true
          });
          
          console.log(`Enhanced tier order calculation: ${newOrder} for pitch ${draggableId} in tier ${tier}`);
        }
        else if (sourceId !== destId) {
          // Moving between different columns
          // Calculate proper order for placing in a new tier column
          const tierPitches = pitches
            .filter(p => p.id !== draggableId) 
            .filter(p => votes[p.id]?.tier === tier) 
            .map(p => p.id);
          
          // Helper function to get order values consistently
          const getOrder = (pitchId: string): number => {
            return votes[pitchId]?.order ?? 
                   votes[pitchId]?.timestamp ?? 
                   Date.now();
          };
          
          // Prepare items and calculate order based on destination index
          const { itemsBefore, itemsAfter } = prepareItemsForOrdering(tierPitches, destinationIndex);
          
          // Calculate new order value using the utility function
          const newOrder = calculateCardOrder(
            itemsBefore,
            itemsAfter,
            getOrder
          );
          
          // Create updated vote with new tier and order
          const updatedVote = { 
            ...(votes[draggableId] || {}),
            pitchId: draggableId,
            tier, 
            order: newOrder,
            timestamp: Date.now()
          } as Vote;
          
          // Store enhanced order information on the result
          Object.defineProperty(result, 'enhancedOrderInfo', {
            value: {
              vote: updatedVote,
              orderType: 'tier',
              tier,
              newOrder
            },
            enumerable: true
          });
          
          console.log(`Enhanced tier placement calculation: ${newOrder} for pitch ${draggableId} in new tier ${tier}`);
        }
      }
    } catch (error) {
      console.error('Error enhancing drag result:', error);
    }
    
    // Call original onDragEnd with the enhanced result
    onDragEnd(result);
  };
  
  return (
    <React.Fragment>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { 
            onDragEnd: handleEnhancedDragEnd
          });
        }
        return child;
      })}
    </React.Fragment>
  );
};

export default EnhancedDragDropProvider;
