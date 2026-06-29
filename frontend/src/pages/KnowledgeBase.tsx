import { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, TextField, List, ListItem, ListItemText, IconButton, CircularProgress, Alert } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import axios from 'axios';

const API_BASE = '/api';

interface Document {
  id: string;
  filename: string;
  type: string;
  createdAt: string;
}

export default function KnowledgeBase() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [jsonInput, setJsonInput] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success'|'error', message: string } | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${API_BASE}/knowledge`);
      setDocuments(res.data.data);
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to fetch knowledge base documents.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_BASE}/knowledge/${id}`);
      setDocuments(documents.filter(d => d.id !== id));
      setNotification({ type: 'success', message: 'Document deleted successfully.' });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to delete document. Ensure no dependent chunks exist or check logs.' });
    }
  };

  const handleIngest = async () => {
    try {
      setIngesting(true);
      const parsedData = JSON.parse(jsonInput);
      await axios.post(`${API_BASE}/knowledge/ingest-json`, {
        sourceName: sourceName || 'Manual Upload',
        data: Array.isArray(parsedData) ? parsedData : [parsedData]
      });
      setJsonInput('');
      setSourceName('');
      fetchDocuments();
      setNotification({ type: 'success', message: 'Data ingested successfully!' });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification({ type: 'error', message: `Failed to ingest data: ${err.message}` });
    } finally {
      setIngesting(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h4" gutterBottom color="white">Knowledge Base</Typography>

      {notification && (
        <Alert severity={notification.type} sx={{ mb: 3 }}>
          {notification.message}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
        
        {/* Existing Documents */}
        <Paper elevation={0} sx={{ p: 3, border: '1px solid #424242' }}>
          <Typography variant="h6" gutterBottom>Ingested Documents</Typography>
          <List>
            {documents.length === 0 && (
              <Typography variant="body2" color="text.secondary">No documents in the knowledge base.</Typography>
            )}
            {documents.map(doc => (
              <ListItem 
                key={doc.id}
                secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(doc.id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                }
                sx={{ border: '1px solid #424242', borderRadius: 1, mb: 1 }}
              >
                <DescriptionIcon sx={{ mr: 2, color: 'text.secondary' }} />
                <ListItemText 
                  primary={doc.filename} 
                  secondary={`Type: ${doc.type} • Added: ${new Date(doc.createdAt).toLocaleDateString()}`} 
                />
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* Ingest New Data */}
        <Paper elevation={0} sx={{ p: 3, border: '1px solid #424242' }}>
          <Typography variant="h6" gutterBottom>Ingest New Data</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Paste a JSON array of objects here. The AI will chunk and embed this data for RAG.
          </Typography>
          
          <TextField
            fullWidth
            label="Source Name (e.g., HR Policy 2026)"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            margin="normal"
            size="small"
          />
          <TextField
            fullWidth
            multiline
            rows={8}
            label="JSON Data"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='[{"question": "What is the refund policy?", "answer": "..."}]'
            margin="normal"
            sx={{ fontFamily: 'monospace' }}
          />
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleIngest} 
            disabled={!jsonInput || ingesting}
            sx={{ mt: 2 }}
          >
            {ingesting ? 'Processing...' : 'Ingest JSON'}
          </Button>
        </Paper>

      </Box>
    </Box>
  );
}
