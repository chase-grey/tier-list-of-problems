import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Select, MenuItem, FormControl, InputLabel, Box,
} from '@mui/material';

interface AddPitchDialogProps {
  open: boolean;
  categories: string[];
  defaultCategory?: string;
  onAdd: (title: string, category: string) => void;
  onClose: () => void;
}

export default function AddPitchDialog({ open, categories, defaultCategory, onAdd, onClose }: AddPitchDialogProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(defaultCategory ?? categories[0] ?? '');

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed || !category) return;
    onAdd(trimmed, category);
    setTitle('');
    setCategory(defaultCategory ?? categories[0] ?? '');
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setCategory(defaultCategory ?? categories[0] ?? '');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add project</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            autoFocus
            fullWidth
            required
          />
          <FormControl fullWidth required>
            <InputLabel>Category</InputLabel>
            <Select
              value={category}
              label="Category"
              onChange={e => setCategory(e.target.value)}
            >
              {categories.map(cat => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!title.trim() || !category}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
