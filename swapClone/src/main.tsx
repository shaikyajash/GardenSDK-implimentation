import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import "@gardenfi/garden-book/style.css";
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { wagmiAdapter } from './layouts/WagmiConfig';
import App from './App';

const queryClient = new QueryClient();
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiAdapter .wagmiConfig}>
         <App/>
        </WagmiProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
