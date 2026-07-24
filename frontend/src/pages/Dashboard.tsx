import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, CircularProgress } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import ContactsIcon from '@mui/icons-material/Contacts';
import ChatIcon from '@mui/icons-material/Chat';

interface Analytics {
  totalInternalUsers: number;
  totalKnowledgeDocs: number;
  totalExternalLeads: number;
  totalWhatsappSessions: number;
}

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('pci_token');
        const res = await fetch('/api/admin/analytics', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error('Failed to fetch analytics', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  const kpis = [
    { title: 'Internal Users', value: analytics?.totalInternalUsers || 0, icon: <PeopleIcon sx={{ fontSize: 40, color: '#90caf9' }} /> },
    { title: 'Knowledge Docs', value: analytics?.totalKnowledgeDocs || 0, icon: <LibraryBooksIcon sx={{ fontSize: 40, color: '#a5d6a7' }} /> },
    { title: 'External Leads', value: analytics?.totalExternalLeads || 0, icon: <ContactsIcon sx={{ fontSize: 40, color: '#ffcc80' }} /> },
    { title: 'WhatsApp Sessions', value: analytics?.totalWhatsappSessions || 0, icon: <ChatIcon sx={{ fontSize: 40, color: '#ce93d8' }} /> },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: 'white' }}>
        Dashboard
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {kpis.map((kpi, idx) => (
          <Box key={idx} sx={{ flex: '1 1 250px' }}>
            <Card sx={{ 
              bgcolor: '#1e1e1e', 
              color: 'white', 
              borderRadius: 3, 
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              transition: 'transform 0.3s',
              '&:hover': { transform: 'translateY(-5px)' }
            }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
                <Box>
                  <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1, fontWeight: 'medium' }}>
                    {kpi.title}
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {kpi.value}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}>
                  {kpi.icon}
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
