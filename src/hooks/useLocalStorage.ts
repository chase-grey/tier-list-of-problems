import { useState, useEffect } from 'react';

/**
 * Custom hook for persistent local storage state
 * @param key The localStorage key
 * @param initialValue Default value if not found in localStorage
 * @returns [storedValue, setValue] tuple
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Get from localStorage or use initialValue
  const readValue = (): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      
      if (!item) {
        return initialValue;
      }
      
      try {
        // Parse the stored data
        const parsedItem = JSON.parse(item);
        
        // Handle migration from old AppState to new AppState with voterRole
        if (key === 'polling.appState') {
          // Check if we need to do a schema migration
          if (parsedItem && typeof parsedItem === 'object') {
            // Check if it has the required voterRole field
            if (parsedItem.voterName && !('voterRole' in parsedItem)) {
              console.log('Migrating old AppState schema to include voterRole');  
              // Add the missing voterRole field
              return {
                ...initialValue,
                ...parsedItem,
                voterRole: null
              } as T;
            }
            
            // If it has all expected properties, return it
            if ('voterRole' in parsedItem) {
              return parsedItem as T;
            }
          }
          
          // If we reach here, the schema doesn't match what we expect
          // Reset to initial value for safety
          console.warn('AppState schema incompatible, resetting to initial state');
          window.localStorage.removeItem(key);
          return initialValue;
        }
        
        return parsedItem as T;
      } catch (parseError) {
        console.warn(`Error parsing localStorage key "${key}":`, parseError);
        return initialValue;
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  };

  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  // Listen for changes to this localStorage key in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        setStoredValue(JSON.parse(e.newValue));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}
