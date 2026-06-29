import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Divider } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SettingsIcon from '@mui/icons-material/Settings';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

import ChatUI from './pages/ChatUI';
import KnowledgeBase from './pages/KnowledgeBase';
import Settings from './pages/Settings';
import WhatsAppConfig from './pages/WhatsAppConfig';

const drawerWidth = 260;

export default function App() {
  const location = useLocation();

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: '#171717',
            borderRight: 'none',
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Box sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" color="white" sx={{ fontWeight: 'bold' }}>
            PCI AI Assistant
          </Typography>
        </Box>
        
        <List sx={{ px: 1 }}>
          <ListItem disablePadding sx={{ mb: 1 }}>
            <ListItemButton 
              component={Link} 
              to="/" 
              selected={location.pathname === '/'}
              sx={{ borderRadius: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}><ChatIcon /></ListItemIcon>
              <ListItemText primary="Chat" />
            </ListItemButton>
          </ListItem>
        </List>

        <Box sx={{ flexGrow: 1 }} />

        <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
        
        <List sx={{ px: 1 }}>
          <ListItem disablePadding>
            <ListItemButton 
              component={Link} 
              to="/knowledge" 
              selected={location.pathname === '/knowledge'}
              sx={{ borderRadius: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}><MenuBookIcon /></ListItemIcon>
              <ListItemText primary="Knowledge Base" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton 
              component={Link} 
              to="/waha" 
              selected={location.pathname === '/waha'}
              sx={{ borderRadius: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}><WhatsAppIcon /></ListItemIcon>
              <ListItemText primary="WhatsApp" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton 
              component={Link} 
              to="/settings" 
              selected={location.pathname === '/settings'}
              sx={{ borderRadius: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}><SettingsIcon /></ListItemIcon>
              <ListItemText primary="Persona" />
            </ListItemButton>
          </ListItem>
        </List>
        
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            PCI Internal Tools v2.0
          </Typography>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<ChatUI />} />
          <Route path="/knowledge" element={<Box sx={{ p: 4, flex: 1, overflowY: 'auto' }}><KnowledgeBase /></Box>} />
          <Route path="/waha" element={<Box sx={{ p: 4, flex: 1, overflowY: 'auto' }}><WhatsAppConfig /></Box>} />
          <Route path="/settings" element={<Box sx={{ p: 4, flex: 1, overflowY: 'auto' }}><Settings /></Box>} />
        </Routes>
      </Box>
    </Box>
  );
}
