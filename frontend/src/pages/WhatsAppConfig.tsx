import { useEffect, useState } from 'react';
import { Title, Paper, TextInput, Button, Stack, Notification, Loader } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
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

  if (loading) return <Loader color="blue" type="dots" />;

  return (
    <div>
      <Title order={2} mb="lg">WhatsApp & Integrations Config</Title>

      {notification && (
        <Notification 
          icon={notification.type === 'success' ? <IconCheck size="1.1rem" /> : <IconX size="1.1rem" />} 
          color={notification.type === 'success' ? 'teal' : 'red'} 
          title={notification.type === 'success' ? 'Success' : 'Error'}
          mb="md"
          onClose={() => setNotification(null)}
        >
          {notification.message}
        </Notification>
      )}

      <Paper withBorder p="md" radius="md">
        <Title order={4} mb="xs">API Connections</Title>
        <p style={{ color: 'var(--mantine-color-dimmed)', fontSize: '14px', marginBottom: '20px' }}>
          Configure the Base URLs for the WAHA (WhatsApp HTTP API) engine and Bitrix CRM.
        </p>
        <Stack>
          <TextInput
            label="WAHA API Base URL"
            placeholder="http://localhost:3000"
            value={wahaUrl}
            onChange={(e) => setWahaUrl(e.currentTarget.value)}
          />
          <TextInput
            label="Bitrix Webhook URL"
            placeholder="https://your-domain.bitrix24.com/rest/1/xxxx/"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.currentTarget.value)}
          />
          <Button onClick={handleSave} loading={saving} color="blue">
            Save Configuration
          </Button>
        </Stack>
      </Paper>
    </div>
  );
}
