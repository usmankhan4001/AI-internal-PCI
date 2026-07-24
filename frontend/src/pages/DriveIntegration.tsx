import { useEffect, useState } from 'react';
import { 
  Box, Typography, Button, Paper, TextField, List, ListItem, 
  ListItemText, CircularProgress, Alert, FormControl, InputLabel, 
  Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, 
  Breadcrumbs, Link as MuiLink
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import axios from 'axios';

const API_BASE = '/api';

interface DriveFile {
  id: string;
  name: string;
  mimeType?: string;
}

const DEPARTMENTS = [
  'Sales', 
  'Marketing', 
  'HR', 
  'Engineering', 
  'Projects', 
  'General'
];

export default function DriveIntegration() {
  const [folders, setFolders] = useState<DriveFile[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<DriveFile | null>(null);
  
  const [syncDialog, setSyncDialog] = useState<{ open: boolean; file: DriveFile | null }>({ open: false, file: null });
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('');
  const [project, setProject] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success'|'error', message: string } | null>(null);

  const getHeaders = () => {
    const token = localStorage.getItem('pci_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/drive/folders`, { headers: getHeaders() });
      setFolders(res.data?.data || res.data || []);
      setFiles([]);
      setSelectedFolder(null);
    } catch (err: any) {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to fetch Google Drive folders.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async (folder: DriveFile) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/drive/files/${folder.id}`, { headers: getHeaders() });
      setFiles(res.data?.data || res.data || []);
      setSelectedFolder(folder);
    } catch (err: any) {
      console.error(err);
      setNotification({ type: 'error', message: `Failed to fetch files for folder ${folder.name}.` });
    } finally {
      setLoading(false);
    }
  };

  const openSyncDialog = (file: DriveFile) => {
    setSyncDialog({ open: true, file });
    setDepartment('');
    setCategory('');
    setProject('');
  };

  const handleCloseSyncDialog = () => {
    if (!syncing) {
      setSyncDialog({ open: false, file: null });
    }
  };

  const handleSync = async () => {
    if (!syncDialog.file || !department) return;
    
    setSyncing(true);
    try {
      await axios.post(`${API_BASE}/drive/sync`, {
        fileId: syncDialog.file.id,
        filename: syncDialog.file.name,
        department,
        category,
        project
      }, {
        headers: getHeaders()
      });
      setNotification({ type: 'success', message: `File "${syncDialog.file.name}" synced to Knowledge Base successfully!` });
      setTimeout(() => setNotification(null), 4000);
      handleCloseSyncDialog();
    } catch (err: any) {
      setNotification({ type: 'error', message: `Failed to sync file: ${err.response?.data?.message || err.message}` });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom color="white">Google Drive</Typography>

      {notification && (
        <Alert severity={notification.type} sx={{ mb: 3 }}>
          {notification.message}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 3, border: '1px solid #424242', bgcolor: 'background.paper', mb: 3 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2, color: 'text.secondary' }}>
          <MuiLink 
            component="button" 
            variant="body1" 
            onClick={fetchFolders}
            underline="hover" 
            color={selectedFolder ? 'inherit' : 'text.primary'}
          >
            Drive Folders
          </MuiLink>
          {selectedFolder && (
            <Typography color="text.primary">{selectedFolder.name}</Typography>
          )}
        </Breadcrumbs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {!selectedFolder && folders.length === 0 && (
              <Typography variant="body2" color="text.secondary">No folders found in Google Drive.</Typography>
            )}
            
            {!selectedFolder && folders.map(folder => (
              <ListItem 
                key={folder.id}
                sx={{ border: '1px solid #424242', borderRadius: 1, mb: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => fetchFiles(folder)}
              >
                <FolderIcon sx={{ mr: 2, color: '#90caf9' }} />
                <ListItemText primary={folder.name} />
              </ListItem>
            ))}

            {selectedFolder && files.length === 0 && (
              <Typography variant="body2" color="text.secondary">No files found in this folder.</Typography>
            )}

            {selectedFolder && files.map(file => (
              <ListItem 
                key={file.id}
                sx={{ border: '1px solid #424242', borderRadius: 1, mb: 1 }}
                secondaryAction={
                  <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<CloudSyncIcon />}
                    onClick={() => openSyncDialog(file)}
                  >
                    Sync
                  </Button>
                }
              >
                <DescriptionIcon sx={{ mr: 2, color: 'text.secondary' }} />
                <ListItemText primary={file.name} />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Sync Dialog */}
      <Dialog open={syncDialog.open} onClose={handleCloseSyncDialog} sx={{ '& .MuiDialog-paper': { bgcolor: 'background.paper', border: '1px solid #424242' } }}>
        <DialogTitle>Sync to Knowledge Base</DialogTitle>
        <DialogContent sx={{ minWidth: 400 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
            Syncing file: <strong>{syncDialog.file?.name}</strong>
          </Typography>
          
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel id="drive-department-label">Department</InputLabel>
            <Select
              labelId="drive-department-label"
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
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleCloseSyncDialog} color="inherit" disabled={syncing}>Cancel</Button>
          <Button 
            onClick={handleSync} 
            variant="contained" 
            disabled={!department || syncing}
            startIcon={syncing ? <CircularProgress size={20} /> : <CloudSyncIcon />}
          >
            {syncing ? 'Syncing...' : 'Sync'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
