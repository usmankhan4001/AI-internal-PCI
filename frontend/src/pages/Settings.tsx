import { useEffect, useState } from 'react';
import { Title, Paper, Textarea, Button, Stack, Notification, Loader } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import axios from 'axios';

const API_BASE = '/api';

export default function Settings() {
  const [persona, setPersona] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success'|'error', message: string } | null>(null);

  useEffect(() => {
    fetchPersona();
  }, []);

  const fetchPersona = async () => {
    try {
      const res = await axios.get(`${API_BASE}/settings/persona`);
      setPersona(res.data.persona);
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to fetch persona from server.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_BASE}/settings/persona`, { persona });
      setNotification({ type: 'success', message: 'Persona updated successfully! The bot will now use this personality.' });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to update persona.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader color="blue" type="dots" />;

  return (
    <div>
      <Title order={2} mb="lg">Bot Settings</Title>

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
        <Title order={4} mb="xs">System Persona</Title>
        <p style={{ color: 'var(--mantine-color-dimmed)', fontSize: '14px', marginBottom: '20px' }}>
          This is the core "System Prompt" that dictates exactly how the AI behaves, speaks, and follows rules.
          Changing this will instantly change the bot's personality for all future messages.
        </p>
        <Stack>
          <Textarea
            value={persona}
            onChange={(e) => setPersona(e.currentTarget.value)}
            minRows={15}
            autosize
            styles={{ input: { fontFamily: 'monospace', fontSize: '13px' } }}
          />
          <Button onClick={handleSave} loading={saving} color="blue">
            Save Persona
          </Button>
        </Stack>
      </Paper>
    </div>
  );
}
