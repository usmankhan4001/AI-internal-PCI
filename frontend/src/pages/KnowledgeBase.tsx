import { useEffect, useState } from 'react';
import { Title, Paper, Table, Button, Group, Text, ActionIcon, Loader, Modal, Textarea, TextInput } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconTrash, IconPlus } from '@tabler/icons-react';
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

interface Document {
  id: string;
  filename: string;
  type: string;
  createdAt: string;
  _count?: { chunks: number };
}

export default function KnowledgeBase() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  
  // Upload State
  const [sourceName, setSourceName] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${API_BASE}/knowledge`);
      setDocuments(res.data.data);
    } catch (err) {
      console.error('Failed to fetch knowledge docs', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this knowledge source?')) return;
    try {
      await axios.delete(`${API_BASE}/knowledge/${id}`);
      fetchDocuments();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const handleUpload = async () => {
    try {
      setUploading(true);
      const parsedData = JSON.parse(jsonInput);
      await axios.post(`${API_BASE}/knowledge/ingest-json`, {
        sourceName,
        data: parsedData
      });
      close();
      setSourceName('');
      setJsonInput('');
      fetchDocuments();
    } catch (err: any) {
      alert('Upload failed: ' + (err.message || 'Invalid JSON'));
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <Loader color="blue" type="dots" />;

  const rows = documents.map((element) => (
    <Table.Tr key={element.id}>
      <Table.Td>{element.filename}</Table.Td>
      <Table.Td>{element.type}</Table.Td>
      <Table.Td>{element._count?.chunks || 0}</Table.Td>
      <Table.Td>{new Date(element.createdAt).toLocaleDateString()}</Table.Td>
      <Table.Td>
        <ActionIcon color="red" variant="subtle" onClick={() => handleDelete(element.id)}>
          <IconTrash size="1.2rem" />
        </ActionIcon>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <div>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Knowledge Base</Title>
        <Button leftSection={<IconPlus size="1rem" />} onClick={open}>
          Add Knowledge
        </Button>
      </Group>

      <Paper withBorder radius="md">
        <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Source Name</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Items/Chunks</Table.Th>
              <Table.Th>Date Added</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows.length > 0 ? rows : (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text c="dimmed" ta="center">No knowledge documents found.</Text>
              </Table.Td>
            </Table.Tr>
          )}</Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={opened} onClose={close} title="Ingest New Knowledge" size="lg">
        <TextInput
          label="Source Name"
          placeholder="e.g. River Hills FAQs"
          required
          value={sourceName}
          onChange={(e) => setSourceName(e.currentTarget.value)}
          mb="md"
        />
        <Textarea
          label="Structured JSON Array"
          placeholder={'[\n  { "category": "FAQ", "topic": "Amenities", "content": "Gym and Pool" }\n]'}
          required
          minRows={10}
          value={jsonInput}
          onChange={(e) => setJsonInput(e.currentTarget.value)}
          mb="md"
          styles={{ input: { fontFamily: 'monospace', fontSize: '12px' } }}
        />
        <Button fullWidth onClick={handleUpload} loading={uploading} disabled={!sourceName || !jsonInput}>
          Ingest Knowledge
        </Button>
      </Modal>
    </div>
  );
}
