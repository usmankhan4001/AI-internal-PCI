import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import '@mantine/core/styles.css';
import './index.css';

const theme = createTheme({
  primaryColor: 'dark',
  defaultRadius: 'md',
  fontFamily: 'Inter, system-ui, sans-serif',
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5c5f66',
      '#373A40',
      '#2C2E33',
      '#25262b', // dark 6
      '#1a1b1e', // dark 7
      '#141517', // dark 8 (sidebar)
      '#101113', // dark 9 (background)
    ],
  },
  components: {
    AppShell: {
      styles: {
        main: { background: '#212121' },
      }
    },
    Paper: {
      defaultProps: {
        radius: 'lg',
      }
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} forceColorScheme="dark">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>,
);
