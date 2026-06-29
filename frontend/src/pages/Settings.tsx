import { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, TextField, Alert, CircularProgress } from '@mui/material';
import axios from 'axios';

const API_BASE = '/api';

export default function Settings() {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success'|'error', message: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE}/settings`);
      setSystemPrompt(res.data.data.systemPrompt || '');
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to fetch settings from server.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_BASE}/settings`, { systemPrompt });
      setNotification({ type: 'success', message: 'Persona saved successfully!' });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to update persona settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ maxWidth: 800 }}>
      <Typography variant="h4" gutterBottom color="white">AI Persona</Typography>

      {notification && (
        <Alert severity={notification.type} sx={{ mb: 3 }}>
          {notification.message}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 4, border: '1px solid #424242' }}>
        <Typography variant="h6" gutterBottom>System Prompt</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
          Define how the AI should behave, its tone, and strict rules it must follow when communicating with the team or clients.
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            fullWidth
            multiline
            rows={12}
            label="Base Persona Instructions"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            placeholder="You are a helpful assistant..."
          />
          <Box>
            <Button 
              variant="contained" 
              onClick={handleSave} 
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Persona'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
