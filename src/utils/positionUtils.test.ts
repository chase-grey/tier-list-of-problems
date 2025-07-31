import { 
  calculatePositionByIndex, 
  calculatePositionBetween, 
  findClosestInsertionIndex, 
  rebalancePositions 
} from './positionUtils';

describe('positionUtils', () => {
  describe('calculatePositionBetween', () => {
    test('should return midpoint between two positions', () => {
      expect(calculatePositionBetween(10, 20)).toBe(15);
      expect(calculatePositionBetween(0, 100)).toBe(50);
      expect(calculatePositionBetween(-10, 10)).toBe(0);
    });

    test('should handle very close positions', () => {
      const pos1 = 1.0;
      const pos2 = 1.001;
      const result = calculatePositionBetween(pos1, pos2);
      expect(result).toBeGreaterThan(pos1);
      expect(result).toBeLessThan(pos2);
    });
    
    test('should handle edge case of first position being the same as second', () => {
      expect(calculatePositionBetween(10, 10)).toBe(10);
    });
  });

  describe('calculatePositionByIndex', () => {
    test('should calculate position for first item in an empty array', () => {
      const result = calculatePositionByIndex([], 0);
      expect(result).toBe(1000); // Default first position
    });

    test('should calculate position for inserting at the beginning of an array', () => {
      const items = [{ position: 1000 }, { position: 2000 }, { position: 3000 }];
      const result = calculatePositionByIndex(items, 0);
      expect(result).toBe(500); // Half of first position
    });

    test('should calculate position for inserting at the end of an array', () => {
      const items = [{ position: 1000 }, { position: 2000 }, { position: 3000 }];
      const result = calculatePositionByIndex(items, 3);
      expect(result).toBe(4000); // Last position + 1000
    });

    test('should calculate position for inserting in the middle of an array', () => {
      const items = [{ position: 1000 }, { position: 2000 }, { position: 3000 }];
      const result = calculatePositionByIndex(items, 1);
      expect(result).toBe(1500); // Halfway between 1000 and 2000
    });

    test('should handle inserting into a larger array with random positions', () => {
      const items = [
        { position: 100 },
        { position: 350 },
        { position: 725 },
        { position: 1200 },
        { position: 1800 }
      ];
      
      // Insert between 350 and 725
      const result = calculatePositionByIndex(items, 2);
      expect(result).toBeGreaterThan(350);
      expect(result).toBeLessThan(725);
      
      // Should be the midpoint
      expect(result).toBe(537.5);
    });
  });

  describe('findClosestInsertionIndex', () => {
    test('should find the closest insertion index based on Y position', () => {
      const itemPositions = [
        { top: 10, height: 20 }, // Item ends at y=30
        { top: 40, height: 20 }, // Item ends at y=60
        { top: 70, height: 20 }, // Item ends at y=90
      ];
      
      // Mouse at y=25, closest to first item
      expect(findClosestInsertionIndex(itemPositions, 25)).toBe(0);
      
      // Mouse at y=35, closest to space between first and second items
      expect(findClosestInsertionIndex(itemPositions, 35)).toBe(1);
      
      // Mouse at y=50, closest to second item
      expect(findClosestInsertionIndex(itemPositions, 50)).toBe(1);
      
      // Mouse at y=65, closest to space between second and third items
      expect(findClosestInsertionIndex(itemPositions, 65)).toBe(2);
      
      // Mouse at y=80, closest to third item
      expect(findClosestInsertionIndex(itemPositions, 80)).toBe(2);
      
      // Mouse at y=95, closest to after third item
      expect(findClosestInsertionIndex(itemPositions, 95)).toBe(3);
    });

    test('should handle empty array of item positions', () => {
      expect(findClosestInsertionIndex([], 50)).toBe(0);
    });
  });

  describe('rebalancePositions', () => {
    test('should rebalance positions with equal spacing', () => {
      const items = [
        { position: 0.001 },
        { position: 0.002 },
        { position: 0.003 },
      ];
      
      const result = rebalancePositions(items);
      
      // Rebalanced positions should start from 1000 with increments of 1000
      expect(result).toEqual([
        { position: 1000 },
        { position: 2000 },
        { position: 3000 },
      ]);
    });

    test('should maintain order during rebalancing', () => {
      const items = [
        { position: 100 },
        { position: 101 }, // Very close positions
        { position: 101.1 }, // Very close positions
        { position: 5000 },
      ];
      
      const result = rebalancePositions(items);
      
      // Should maintain original order but with more even spacing
      expect(result[0].position).toBeLessThan(result[1].position);
      expect(result[1].position).toBeLessThan(result[2].position);
      expect(result[2].position).toBeLessThan(result[3].position);
      
      // Check for roughly equal spacing (with some tolerance)
      const diff1 = result[1].position - result[0].position;
      const diff2 = result[2].position - result[1].position;
      const diff3 = result[3].position - result[2].position;
      
      const avgDiff = (diff1 + diff2 + diff3) / 3;
      
      // Each gap should be within 10% of the average gap
      expect(Math.abs(diff1 - avgDiff) / avgDiff).toBeLessThan(0.1);
      expect(Math.abs(diff2 - avgDiff) / avgDiff).toBeLessThan(0.1);
      expect(Math.abs(diff3 - avgDiff) / avgDiff).toBeLessThan(0.1);
    });

    test('should handle empty array', () => {
      expect(rebalancePositions([])).toEqual([]);
    });

    test('should handle single item array', () => {
      expect(rebalancePositions([{ position: 42 }])).toEqual([{ position: 1000 }]);
    });
  });
});
