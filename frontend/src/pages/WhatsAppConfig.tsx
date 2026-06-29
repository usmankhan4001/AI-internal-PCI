import { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, TextField, Alert, CircularProgress } from '@mui/material';
import axios from 'axios';

const API_BASE = '/api';

export default function WhatsAppConfig() {
  const [wahaUrl, setWahaUrl] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success'|'error', message: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE}/settings`);
      setWahaUrl(res.data.data.wahaApiBase || '');
      setWebhookUrl(res.data.data.bitrixWebhookUrl || '');
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
      await axios.put(`${API_BASE}/settings`, { 
        wahaApiBase: wahaUrl,
        bitrixWebhookUrl: webhookUrl
      });
      setNotification({ type: 'success', message: 'Integration settings saved successfully!' });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ maxWidth: 800 }}>
      <Typography variant="h4" gutterBottom color="white">WhatsApp & Integrations Config</Typography>

      {notification && (
        <Alert severity={notification.type} sx={{ mb: 3 }}>
          {notification.message}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 4, border: '1px solid #424242' }}>
        <Typography variant="h6" gutterBottom>API Connections</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
          Configure the Base URLs for the WAHA (WhatsApp HTTP API) engine and Bitrix CRM.
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            fullWidth
            label="WAHA API Base URL"
            placeholder="http://localhost:3000"
            value={wahaUrl}
            onChange={(e) => setWahaUrl(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            fullWidth
            label="Bitrix Webhook URL"
            placeholder="https://your-domain.bitrix24.com/rest/1/xxxx/"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Box>
            <Button 
              variant="contained" 
              onClick={handleSave} 
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
