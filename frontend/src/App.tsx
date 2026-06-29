import { AppShell, NavLink, Title, Text, Stack } from '@mantine/core';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { IconDashboard, IconBook, IconSettings, IconMessageChatbot, IconBrandWhatsapp } from '@tabler/icons-react';
import Dashboard from './pages/Dashboard';
import KnowledgeBase from './pages/KnowledgeBase';
import Settings from './pages/Settings';
import ChatUI from './pages/ChatUI';
import WhatsAppConfig from './pages/WhatsAppConfig';

export default function App() {
  const location = useLocation();

  return (
    <AppShell
      navbar={{ width: 260, breakpoint: 'sm' }}
      padding="0"
    >
      <AppShell.Navbar p="md" bg="#171717" style={{ borderRight: 'none' }}>
        <Title order={4} c="white" mb="xl" px="sm">PCI AI Assistant</Title>
        
        <Stack gap="xs">
          <NavLink
            component={Link}
            to="/chat"
            label="Chat"
            leftSection={<IconMessageChatbot size="1.2rem" stroke={1.5} />}
            active={location.pathname === '/chat'}
            variant="filled"
            color="dark.6"
            style={{ borderRadius: '8px' }}
          />
          <NavLink
            component={Link}
            to="/"
            label="Dashboard"
            leftSection={<IconDashboard size="1.2rem" stroke={1.5} />}
            active={location.pathname === '/'}
            variant="filled"
            color="dark.6"
            style={{ borderRadius: '8px' }}
          />
          <NavLink
            component={Link}
            to="/knowledge"
            label="Knowledge Base"
            leftSection={<IconBook size="1.2rem" stroke={1.5} />}
            active={location.pathname === '/knowledge'}
            variant="filled"
            color="dark.6"
            style={{ borderRadius: '8px' }}
          />
          <NavLink
            component={Link}
            to="/waha"
            label="WhatsApp Integrations"
            leftSection={<IconBrandWhatsapp size="1.2rem" stroke={1.5} />}
            active={location.pathname === '/waha'}
            variant="filled"
            color="dark.6"
            style={{ borderRadius: '8px' }}
          />
          <NavLink
            component={Link}
            to="/settings"
            label="Persona & Settings"
            leftSection={<IconSettings size="1.2rem" stroke={1.5} />}
            active={location.pathname === '/settings'}
            variant="filled"
            color="dark.6"
            style={{ borderRadius: '8px' }}
          />
        </Stack>

        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
          <Text size="xs" c="dimmed" ta="center">PCI Internal Tools v2.0</Text>
        </div>
      </AppShell.Navbar>

      <AppShell.Main style={{ background: '#212121', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<div style={{ padding: '2rem' }}><Dashboard /></div>} />
          <Route path="/chat" element={<ChatUI />} />
          <Route path="/knowledge" element={<div style={{ padding: '2rem' }}><KnowledgeBase /></div>} />
          <Route path="/waha" element={<div style={{ padding: '2rem' }}><WhatsAppConfig /></div>} />
          <Route path="/settings" element={<div style={{ padding: '2rem' }}><Settings /></div>} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}
