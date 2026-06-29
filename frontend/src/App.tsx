import { AppShell, Burger, Group, NavLink, Title, Text, ActionIcon, useMantineColorScheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { IconDashboard, IconBook, IconSettings, IconSun, IconMoonStars, IconMessageChatbot, IconBrandWhatsapp } from '@tabler/icons-react';
import Dashboard from './pages/Dashboard';
import KnowledgeBase from './pages/KnowledgeBase';
import Settings from './pages/Settings';
import ChatUI from './pages/ChatUI';
import WhatsAppConfig from './pages/WhatsAppConfig';

export default function App() {
  const [opened, { toggle }] = useDisclosure();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const location = useLocation();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={3} c="blue">PCI AI Admin</Title>
          </Group>
          <ActionIcon
            variant="default"
            onClick={() => toggleColorScheme()}
            size="lg"
            aria-label="Toggle color scheme"
          >
            {colorScheme === 'dark' ? <IconSun stroke={1.5} /> : <IconMoonStars stroke={1.5} />}
          </ActionIcon>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          component={Link}
          to="/"
          label="Dashboard"
          leftSection={<IconDashboard size="1rem" stroke={1.5} />}
          active={location.pathname === '/'}
        />
        <NavLink
          component={Link}
          to="/chat"
          label="Team Chat"
          leftSection={<IconMessageChatbot size="1rem" stroke={1.5} />}
          active={location.pathname === '/chat'}
        />
        <NavLink
          component={Link}
          to="/knowledge"
          label="Knowledge Base"
          leftSection={<IconBook size="1rem" stroke={1.5} />}
          active={location.pathname === '/knowledge'}
        />
        <NavLink
          component={Link}
          to="/waha"
          label="WhatsApp Config"
          leftSection={<IconBrandWhatsapp size="1rem" stroke={1.5} />}
          active={location.pathname === '/waha'}
        />
        <NavLink
          component={Link}
          to="/settings"
          label="Bot Settings"
          leftSection={<IconSettings size="1rem" stroke={1.5} />}
          active={location.pathname === '/settings'}
        />
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--mantine-color-default-border)' }}>
          <Text size="xs" c="dimmed" ta="center">PCI AI Bot v2.0</Text>
        </div>
      </AppShell.Navbar>

      <AppShell.Main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/chat" element={<ChatUI />} />
          <Route path="/knowledge" element={<KnowledgeBase />} />
          <Route path="/waha" element={<WhatsAppConfig />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}
