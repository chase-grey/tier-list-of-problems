import React, { useState } from 'react';
import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  OutlinedInput,
  TextField,
  Button,
  Stack,
  Typography
} from '@mui/material';
import type { Deliverable } from '../../types/project-models';
import { DELIVERABLE_OPTIONS } from '../../types/project-models';

interface DeliverableSelectorProps {
  value: Deliverable[];
  onChange: (deliverables: Deliverable[]) => void;
  label?: string;
  required?: boolean;
}

/**
 * Component for selecting multiple deliverable options including custom entries
 */
const DeliverableSelector = ({
  value,
  onChange,
  label = 'Deliverables',
  required = false
}: DeliverableSelectorProps) => {
  const [customValue, setCustomValue] = useState<string>('');

  // Handle selection of predefined deliverables
  const handleSelectChange = (event: any) => {
    const selectedValues = event.target.value as string[];
    // Filter out any custom values that might have been included in the selection
    const predefinedValues = selectedValues.filter(val => 
      DELIVERABLE_OPTIONS.includes(val)
    );
    
    // Keep any existing custom values from the current state
    const customValues = value.filter(val => 
      !DELIVERABLE_OPTIONS.includes(val)
    );
    
    // Combine predefined and custom values
    onChange([...predefinedValues, ...customValues]);
  };

  // Add a custom deliverable
  const handleAddCustom = () => {
    if (!customValue.trim()) return;
    
    // Only add if not already included
    if (!value.includes(customValue)) {
      onChange([...value, customValue]);
    }
    
    // Clear the input
    setCustomValue('');
  };

  // Remove a deliverable (predefined or custom)
  const handleDelete = (deliverableToDelete: Deliverable) => {
    onChange(value.filter(d => d !== deliverableToDelete));
  };

  // Handle Enter key in custom input
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddCustom();
    }
  };

  // Get the predefined selected values only
  const getPredefinedSelected = () => {
    return value.filter(val => 
      DELIVERABLE_OPTIONS.includes(val)
    );
  };

  // Get custom values only
  const getCustomValues = () => {
    return value.filter(val => 
      !DELIVERABLE_OPTIONS.includes(val)
    );
  };

  return (
    <Box>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="deliverables-label" required={required}>
          {label}
        </InputLabel>
        <Select
          labelId="deliverables-label"
          id="deliverables"
          multiple
          value={getPredefinedSelected()}
          onChange={handleSelectChange}
          input={<OutlinedInput label={label} />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(selected as string[]).map((value) => (
                <Chip 
                  key={value} 
                  label={value} 
                  sx={{ height: 24 }}
                />
              ))}
            </Box>
          )}
        >
          {DELIVERABLE_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField
          label="Add custom deliverable"
          variant="outlined"
          size="small"
          fullWidth
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button 
          variant="contained" 
          onClick={handleAddCustom}
          disabled={!customValue.trim()}
        >
          Add
        </Button>
      </Stack>

      {getCustomValues().length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Custom Deliverables:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {getCustomValues().map((customVal) => (
              <Chip
                key={customVal}
                label={customVal}
                onDelete={() => handleDelete(customVal)}
                sx={{ height: 24 }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default DeliverableSelector;
