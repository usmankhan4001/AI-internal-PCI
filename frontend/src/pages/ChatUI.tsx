import { useState, useRef, useEffect } from 'react';
import { Title, Paper, TextInput, ActionIcon, Stack, Text, ScrollArea, Loader, Group, Button } from '@mantine/core';
import { IconSend, IconDownload } from '@tabler/icons-react';
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
    { role: 'bot', text: 'Hello! I am your internal PCI AI Assistant. How can I help you today?' }
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
    <Stack h="calc(100vh - 120px)">
      <Title order={2}>Team Chat</Title>

      <Paper withBorder p="md" radius="md" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ScrollArea viewportRef={viewport} style={{ flex: 1 }} pr="sm">
          <Stack gap="md">
            {messages.map((msg, idx) => (
              <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <Paper 
                  p="sm" 
                  radius="md" 
                  bg={msg.role === 'user' ? 'blue.6' : 'dark.6'}
                  c={msg.role === 'user' ? 'white' : 'gray.3'}
                >
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</Text>
                  
                  {msg.file && (
                    <Group mt="xs">
                      <Button 
                        size="xs" 
                        variant="light" 
                        color="gray"
                        leftSection={<IconDownload size="1rem" />}
                        onClick={() => downloadBase64File(msg.file!.base64, msg.file!.filename)}
                      >
                        Download {msg.file.filename}
                      </Button>
                    </Group>
                  )}
                </Paper>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start' }}>
                <Loader color="blue" type="dots" />
              </div>
            )}
          </Stack>
        </ScrollArea>

        <div style={{ paddingTop: '16px', borderTop: '1px solid var(--mantine-color-default-border)' }}>
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
            <TextInput
              placeholder="Ask about inventory, knowledge base, or generate a payment plan..."
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              disabled={loading}
              rightSection={
                <ActionIcon size={32} radius="xl" color="blue" variant="filled" onClick={handleSend} disabled={!input.trim() || loading}>
                  <IconSend size="1.2rem" stroke={1.5} />
                </ActionIcon>
              }
            />
          </form>
        </div>
      </Paper>
    </Stack>
  );
}
