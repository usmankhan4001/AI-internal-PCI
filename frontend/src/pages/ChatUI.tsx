import { useState, useRef, useEffect } from 'react';
import { TextInput, ActionIcon, Text, ScrollArea, Loader, Group, Button, Avatar } from '@mantine/core';
import { IconSend, IconDownload, IconRobot, IconUser } from '@tabler/icons-react';
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

  const scrollToBottom = () => viewport.current?.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim()) return;
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      {/* Messages Area */}
      <ScrollArea viewportRef={viewport} style={{ flex: 1, paddingBottom: '100px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
          {messages.map((msg, idx) => (
            <Group key={idx} align="flex-start" wrap="nowrap" mb="xl">
              <Avatar 
                color={msg.role === 'user' ? 'blue' : 'dark'} 
                radius="xl"
                size="md"
              >
                {msg.role === 'user' ? <IconUser size="1.2rem"/> : <IconRobot size="1.2rem"/>}
              </Avatar>
              <div style={{ flex: 1, paddingTop: '4px' }}>
                <Text size="sm" fw={600} mb="xs" c="gray.4">
                  {msg.role === 'user' ? 'You' : 'PCI Assistant'}
                </Text>
                <Text size="md" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }} c="gray.1">
                  {msg.text}
                </Text>
                
                {msg.file && (
                  <Button 
                    mt="md"
                    size="sm" 
                    variant="light" 
                    color="gray"
                    leftSection={<IconDownload size="1rem" />}
                    onClick={() => downloadBase64File(msg.file!.base64, msg.file!.filename)}
                  >
                    Download {msg.file.filename}
                  </Button>
                )}
              </div>
            </Group>
          ))}
          {loading && (
            <Group align="flex-start" wrap="nowrap" mb="xl">
              <Avatar color="dark" radius="xl" size="md">
                <IconRobot size="1.2rem"/>
              </Avatar>
              <div style={{ flex: 1, paddingTop: '10px' }}>
                <Loader color="gray" type="dots" />
              </div>
            </Group>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        padding: '24px',
        background: 'linear-gradient(180deg, transparent 0%, #212121 50%)'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
            <TextInput
              placeholder="Message PCI Assistant..."
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              disabled={loading}
              size="lg"
              radius="xl"
              styles={{
                input: {
                  backgroundColor: '#2C2E33',
                  border: 'none',
                  paddingRight: '50px'
                }
              }}
              rightSection={
                <ActionIcon 
                  size={32} 
                  radius="xl" 
                  color={input.trim() ? "white" : "dark.4"} 
                  variant={input.trim() ? "filled" : "transparent"} 
                  onClick={handleSend} 
                  disabled={!input.trim() || loading}
                  style={{ marginRight: '8px' }}
                >
                  <IconSend size="1.2rem" stroke={1.5} color={input.trim() ? "black" : "inherit"}/>
                </ActionIcon>
              }
            />
          </form>
          <Text size="xs" ta="center" c="dimmed" mt="sm">
            AI can make mistakes. Verify critical inventory with Bitrix CRM.
          </Text>
        </div>
      </div>

    </div>
  );
}
