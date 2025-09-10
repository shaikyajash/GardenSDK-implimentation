
import { useWalletClient } from 'wagmi';
import { GardenProvider } from '@gardenfi/react-hooks';
import { Environment } from '@gardenfi/utils';
import { Route, Routes } from 'react-router-dom';
import SwapPage from './Pages/SwapPage';
import TransactionPage from './Pages/TransactionPage';

export default function App() {
  const { data: walletClient } = useWalletClient();

  return (
    <GardenProvider
      config={{
        environment: Environment.TESTNET,
        wallets: {
          evm: walletClient,
        },
      }}
    >
        <Routes>
          <Route path="/" element={ <SwapPage/> } />
          <Route path="/transactions" element={ <TransactionPage/> } />
        </Routes>
    </GardenProvider>
  );
}