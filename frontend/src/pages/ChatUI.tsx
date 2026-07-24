import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, TextField, IconButton, Typography, Avatar, CircularProgress,
  Button, List, ListItem, ListItemButton, ListItemText,
  ListItemIcon, Tooltip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DownloadIcon from '@mui/icons-material/Download';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ChatIcon from '@mui/icons-material/Chat';
import axios from 'axios';

const API_BASE = '/api';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  file?: { base64: string; filename: string };
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  messages?: { content: string }[];
}

export default function ChatUI() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem('pci_token');

  const api = axios.create({
    baseURL: API_BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const scrollToBottom = () => {
    if (viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight;
  };

  useEffect(() => { scrollToBottom(); }, [messages, loading]);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await api.get('/chat/sessions');
      setSessions(res.data.data);
    } catch (err) {
      console.error('Failed to fetch sessions', err);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const loadSession = async (sessionId: string) => {
    try {
      const res = await api.get(`/chat/sessions/${sessionId}`);
      setActiveSessionId(sessionId);
      setMessages(
        res.data.data.messages.map((m: any) => ({
          role: m.role,
          text: m.content,
        }))
      );
    } catch {
      console.error('Failed to load session');
    }
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await api.delete(`/chat/sessions/${sessionId}`);
      if (activeSessionId === sessionId) startNewChat();
      fetchSessions();
    } catch {
      console.error('Failed to delete session');
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await api.post('/chat', {
        message: userMsg,
        sessionId: activeSessionId || undefined,
      });

      const { sessionId, text, file } = res.data;

      if (!activeSessionId && sessionId) {
        setActiveSessionId(sessionId);
      }

      setMessages(prev => [...prev, { role: 'assistant', text: text || 'No response', file: file || undefined }]);
      fetchSessions(); // Refresh sidebar
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${err.response?.data?.message || err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const downloadBase64File = (base64Data: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${base64Data}`;
    link.download = fileName;
    link.click();
  };

  const sidebarWidth = 260;

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Session Sidebar */}
      <Box sx={{
        width: sidebarWidth,
        borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#1a1a1a',
      }}>
        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={startNewChat}
            sx={{
              borderColor: 'rgba(255,255,255,0.15)',
              color: 'white',
              textTransform: 'none',
              '&:hover': { borderColor: 'rgba(255,255,255,0.3)', bgcolor: 'rgba(255,255,255,0.05)' },
            }}
          >
            New Chat
          </Button>
        </Box>
        <List sx={{ flex: 1, overflowY: 'auto', px: 1 }}>
          {sessions.map((s) => (
            <ListItem
              key={s.id}
              disablePadding
              secondaryAction={
                <Tooltip title="Delete">
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              }
            >
              <ListItemButton
                selected={activeSessionId === s.id}
                onClick={() => loadSession(s.id)}
                sx={{ borderRadius: 1, pr: 5 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <ChatIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography noWrap sx={{ fontSize: '0.85rem' }}>
                      {s.title || 'New Chat'}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Chat Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <Box ref={viewport} sx={{ flex: 1, overflowY: 'auto', pb: 15 }}>
          <Box sx={{ maxWidth: '800px', mx: 'auto', p: 3 }}>
            {messages.length === 0 && (
              <Box sx={{ textAlign: 'center', mt: 12 }}>
                <SmartToyIcon sx={{ fontSize: 64, color: '#555', mb: 2 }} />
                <Typography variant="h5" color="text.secondary">PCI AI Assistant</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Ask about projects, inventory, HR policies, marketing plans, or anything PCI.
                </Typography>
              </Box>
            )}

            {messages.map((msg, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 2, mb: 4 }}>
                <Avatar sx={{ bgcolor: msg.role === 'user' ? '#90caf9' : '#424242', width: 36, height: 36 }}>
                  {msg.role === 'user' ? <PersonIcon /> : <SmartToyIcon />}
                </Avatar>
                <Box sx={{ flex: 1, pt: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: '#e0e0e0' }}>
                    {msg.role === 'user' ? 'You' : 'PCI Assistant'}
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: '#bdbdbd' }}>
                    {msg.text}
                  </Typography>
                  {msg.file && (
                    <Button
                      variant="outlined"
                      color="inherit"
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => downloadBase64File(msg.file!.base64, msg.file!.filename)}
                      sx={{ mt: 2, textTransform: 'none' }}
                    >
                      Download {msg.file.filename}
                    </Button>
                  )}
                </Box>
              </Box>
            ))}
            {loading && (
              <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                <Avatar sx={{ bgcolor: '#424242', width: 36, height: 36 }}><SmartToyIcon /></Avatar>
                <Box sx={{ pt: 1 }}><CircularProgress size={20} sx={{ color: '#9e9e9e' }} /></Box>
              </Box>
            )}
          </Box>
        </Box>

        {/* Input */}
        <Box sx={{
          position: 'absolute', bottom: 0, left: 0, right: 0, p: 3,
          background: 'linear-gradient(180deg, transparent 0%, #212121 40%)',
        }}>
          <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
            <form onSubmit={handleSend}>
              <TextField
                fullWidth
                placeholder="Message PCI Assistant..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                variant="outlined"
                slotProps={{
                  input: {
                    sx: { borderRadius: 8, bgcolor: '#2C2E33', color: 'white', pr: 1 },
                    endAdornment: (
                      <IconButton
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        sx={{
                          bgcolor: input.trim() ? '#90caf9' : 'transparent',
                          color: input.trim() ? '#212121' : '#757575',
                          '&:hover': { bgcolor: input.trim() ? '#64b5f6' : 'transparent' },
                        }}
                      >
                        <SendIcon fontSize="small" />
                      </IconButton>
                    ),
                  },
                }}
              />
            </form>
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#757575', mt: 1 }}>
              PCI Internal AI — Verify critical data with source systems.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
