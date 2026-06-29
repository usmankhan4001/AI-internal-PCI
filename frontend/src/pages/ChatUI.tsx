import { useState, useRef, useEffect } from 'react';
import { Box, TextField, IconButton, Typography, Avatar, CircularProgress, Button } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DownloadIcon from '@mui/icons-material/Download';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import axios from 'axios';

const API_BASE = '/api';

interface Message {
  role: 'user' | 'bot';
  text: string;
  file?: {
    base64: string;
    filename: string;
  };
}

export default function ChatUI() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'Hello! I am the internal PCI Assistant. Ask me to search inventory or generate payment plans.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (viewport.current) {
      viewport.current.scrollTop = viewport.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/chat`, { message: userMsg, history: messages.slice(1) });
      const { text, file } = res.data;
      setMessages(prev => [...prev, { role: 'bot', text: text || 'No response', file }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'bot', text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const downloadBase64File = (base64Data: string, fileName: string) => {
    const linkSource = `data:application/pdf;base64,${base64Data}`;
    const downloadLink = document.createElement('a');
    downloadLink.href = linkSource;
    downloadLink.download = fileName;
    downloadLink.click();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', bgcolor: '#212121' }}>
      
      {/* Messages Area */}
      <Box ref={viewport} sx={{ flex: 1, overflowY: 'auto', pb: 15 }}>
        <Box sx={{ maxWidth: '800px', mx: 'auto', p: 3 }}>
          {messages.map((msg, idx) => (
            <Box key={idx} sx={{ display: 'flex', gap: 2, mb: 4 }}>
              <Avatar sx={{ bgcolor: msg.role === 'user' ? '#90caf9' : '#424242', width: 36, height: 36 }}>
                {msg.role === 'user' ? <PersonIcon /> : <SmartToyIcon />}
              </Avatar>
              <Box sx={{ flex: 1, pt: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, color: '#e0e0e0' }}>
                  {msg.role === 'user' ? 'You' : 'PCI Assistant'}
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#bdbdbd' }}>
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
              <Avatar sx={{ bgcolor: '#424242', width: 36, height: 36 }}>
                <SmartToyIcon />
              </Avatar>
              <Box sx={{ flex: 1, pt: 1 }}>
                <CircularProgress size={20} sx={{ color: '#9e9e9e' }} />
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Input Area */}
      <Box sx={{ 
        position: 'absolute', 
        bottom: 0, left: 0, right: 0, 
        p: 3,
        background: 'linear-gradient(180deg, transparent 0%, #212121 40%)'
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
                  sx: { 
                    borderRadius: 8, 
                    bgcolor: '#2C2E33', 
                    color: 'white',
                    pr: 1
                  },
                  endAdornment: (
                    <IconButton 
                      onClick={handleSend} 
                      disabled={!input.trim() || loading}
                      sx={{ 
                        bgcolor: input.trim() ? '#90caf9' : 'transparent',
                        color: input.trim() ? '#212121' : '#757575',
                        '&:hover': { bgcolor: input.trim() ? '#64b5f6' : 'transparent' }
                      }}
                    >
                      <SendIcon fontSize="small" />
                    </IconButton>
                  )
                }
              }}
            />
          </form>
          <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#757575', mt: 1 }}>
            AI can make mistakes. Verify critical inventory with Bitrix CRM.
          </Typography>
        </Box>
      </Box>

    </Box>
  );
}
