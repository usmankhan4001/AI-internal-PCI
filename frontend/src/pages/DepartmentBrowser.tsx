import { useEffect, useState } from 'react';
import { 
  Box, Typography, CircularProgress, Alert, 
  Accordion, AccordionSummary, AccordionDetails, 
  List, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import axios from 'axios';

const API_BASE = '/api';

interface Document {
  id: string;
  filename: string;
  type: string;
  department: string;
  category?: string;
  project?: string;
  createdAt: string;
}

export default function DepartmentBrowser() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      setError('Failed to fetch knowledge base documents.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  // Group by department -> category -> project
  const grouped: Record<string, Record<string, Record<string, Document[]>>> = {};

  documents.forEach(doc => {
    const dept = doc.department || 'Uncategorized';
    const cat = doc.category || 'General';
    const proj = doc.project || 'No Project';

    if (!grouped[dept]) grouped[dept] = {};
    if (!grouped[dept][cat]) grouped[dept][cat] = {};
    if (!grouped[dept][cat][proj]) grouped[dept][cat][proj] = [];

    grouped[dept][cat][proj].push(doc);
  });

  return (
    <Box>
      <Typography variant="h4" gutterBottom color="white" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <AccountTreeIcon fontSize="large" />
        Department Browser
      </Typography>

      <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        Browse knowledge base documents organized by department, category, and project.
      </Typography>

      {Object.entries(grouped).map(([dept, categories]) => (
        <Accordion key={dept} sx={{ mb: 2, bgcolor: '#1e1e1e', color: 'white' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
            <FolderIcon sx={{ mr: 2, color: '#90caf9' }} />
            <Typography variant="h6">{dept}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {Object.entries(categories).map(([cat, projects]) => (
              <Accordion key={cat} sx={{ mb: 1, bgcolor: '#2c2c2c', color: 'white' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
                  <FolderIcon sx={{ mr: 2, color: '#ffb74d' }} />
                  <Typography variant="subtitle1">{cat}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {Object.entries(projects).map(([proj, docs]) => (
                    <Accordion key={proj} sx={{ mb: 1, bgcolor: '#383838', color: 'white' }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
                        <FolderIcon sx={{ mr: 2, color: '#81c784' }} />
                        <Typography variant="subtitle2">{proj}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <List dense>
                          {docs.map(doc => (
                            <ListItem key={doc.id} sx={{ bgcolor: '#424242', mb: 1, borderRadius: 1 }}>
                              <ListItemIcon>
                                <DescriptionIcon sx={{ color: 'white' }} />
                              </ListItemIcon>
                              <ListItemText 
                                primary={doc.filename}
                                secondary={`Type: ${doc.type} | Added: ${new Date(doc.createdAt).toLocaleDateString()}`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </AccordionDetails>
              </Accordion>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
