import { useEffect, useState } from 'react';
import { 
  Box, Typography, Button, Paper, TextField, List, ListItem, 
  ListItemText, IconButton, CircularProgress, Alert,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import axios from 'axios';

const API_BASE = '/api';

interface Document {
  id: string;
  filename: string;
  type: string;
  department: string;
  createdAt: string;
}

const DEPARTMENTS = [
  'Sales', 
  'Marketing', 
  'HR', 
  'Engineering', 
  'Projects', 
  'General'
];

export default function KnowledgeBase() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [file, setFile] = useState<File | null>(null);
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('');
  const [project, setProject] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success'|'error', message: string } | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const getHeaders = () => {
    const token = localStorage.getItem('pci_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${API_BASE}/knowledge`, { headers: getHeaders() });
      setDocuments(res.data.data || []);
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to fetch knowledge base documents.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_BASE}/knowledge/${id}`, { headers: getHeaders() });
      setDocuments(documents.filter(d => d.id !== id));
      setNotification({ type: 'success', message: 'Document deleted successfully.' });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to delete document. Ensure no dependent chunks exist or check logs.' });
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('department', department);
      formData.append('category', category);
      formData.append('project', project);

      await axios.post(`${API_BASE}/knowledge/upload`, formData, {
        headers: getHeaders()
      });
      
      setFile(null);
      setDepartment('');
      setCategory('');
      setProject('');
      fetchDocuments();
      setNotification({ type: 'success', message: 'File uploaded successfully!' });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification({ type: 'error', message: `Failed to upload file: ${err.response?.data?.message || err.message}` });
    } finally {
      setUploading(false);
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
        <Paper elevation={0} sx={{ p: 3, border: '1px solid #424242', bgcolor: 'background.paper' }}>
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
                  secondary={`Dept: ${doc.department || 'N/A'} • Type: ${doc.type} • Added: ${new Date(doc.createdAt).toLocaleDateString()}`} 
                />
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* Upload New Data */}
        <Paper elevation={0} sx={{ p: 3, border: '1px solid #424242', bgcolor: 'background.paper' }}>
          <Typography variant="h6" gutterBottom>Upload New Document</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Upload a PDF, TXT, or CSV file. The AI will chunk and embed this data for RAG.
          </Typography>
          
          <Button
            variant="outlined"
            component="label"
            fullWidth
            sx={{ mt: 2, mb: 2, textTransform: 'none' }}
          >
            {file ? file.name : "Select File (PDF, TXT, CSV)"}
            <input
              type="file"
              hidden
              accept=".pdf,.txt,.csv"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setFile(e.target.files[0]);
                }
              }}
            />
          </Button>

          <FormControl fullWidth margin="normal" size="small">
            <InputLabel id="department-label">Department</InputLabel>
            <Select
              labelId="department-label"
              value={department}
              label="Department"
              onChange={(e) => setDepartment(e.target.value)}
            >
              {DEPARTMENTS.map(dept => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            margin="normal"
            size="small"
          />

          <TextField
            fullWidth
            label="Project"
            value={project}
            onChange={(e) => setProject(e.target.value)}
            margin="normal"
            size="small"
          />

          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleUpload} 
            disabled={!file || !department || uploading}
            sx={{ mt: 2 }}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </Paper>

      </Box>
    </Box>
  );
}
