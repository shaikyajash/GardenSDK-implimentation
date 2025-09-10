
import  { useState, useEffect } from 'react';
import { useGarden } from '@gardenfi/react-hooks';
import { useConnect, useAccount } from 'wagmi';
import BigNumber from 'bignumber.js';
import Navbar from "./NavBar";

interface AssetConfig {
  name: string;
  decimals: number;
  symbol: string;
  logo: string;
  tokenAddress: string;
  atomicSwapAddress: string;
  min_amount: string;
  max_amount: string;
  disabled: boolean;
}

interface ChainInfo {
  chainId: string;
  networkLogo: string;
  name: string;
  networkType: string;
  assetConfig: AssetConfig[];
  identifier: string;
  disabled: boolean;
}

interface Quote {
  strategyId: string;
  quoteAmount: string;
}

const SwapComponent = () => {
  const [chains, setChains] = useState<Record<string, ChainInfo>>({});
  const [fromChain, setFromChain] = useState('');
  const [toChain, setToChain] = useState('');
  const [fromAsset, setFromAsset] = useState<AssetConfig | null>(null);
  const [toAsset, setToAsset] = useState<AssetConfig | null>(null);
  const [amount, setAmount] = useState('0.0005');
  const [btcAddress, setBtcAddress] = useState('tb1q25q3632323232323232323232323232323232');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);

  const { swapAndInitiate, getQuote } = useGarden();
  const { connect, connectors } = useConnect();
  const { address, isConnected } = useAccount();

  // Fetch chain data on component mount
  useEffect(() => {
    const fetchChainData = async () => {
      try {
        const response = await fetch('https://testnet.api.garden.finance/info/assets');
        const data = await response.json();
        
        // Filter only testnet chains that aren't disabled
        const testnetChains = Object.entries(data).reduce((acc, [key, value]: [string, any]) => {
          if (value.networkType === 'testnet' && !value.disabled) {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, ChainInfo>);
        
        setChains(testnetChains);
      } catch (error) {
        console.error('Error fetching chain data:', error);
      }
    };

    fetchChainData();
  }, []);

  const handleConnectWallet = () => {
    if (connectors && connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  };

  const handleGetQuote = async () => {
    if (!getQuote || !fromAsset || !toAsset) {
      alert('Please select both from and to assets');
      return;
    }

    setLoading(true);
    try {
      // Convert amount to the smallest unit
      const amountBN = new BigNumber(amount).multipliedBy(10 ** fromAsset.decimals);

      // Create asset objects in the format expected by Garden SDK
      const inputAsset = {
        chain: fromChain,
        symbol: fromAsset.symbol,
        decimals: fromAsset.decimals,
        tokenAddress: fromAsset.tokenAddress,
        atomicSwapAddress: fromAsset.atomicSwapAddress
      };

      const outputAsset = {
        chain: toChain,
        symbol: toAsset.symbol,
        decimals: toAsset.decimals,
        tokenAddress: toAsset.tokenAddress,
        atomicSwapAddress: toAsset.atomicSwapAddress
      };

      // Fetch quote
      const quoteResult = await getQuote({
        fromAsset: inputAsset,
        toAsset: outputAsset,
        amount: amountBN.toNumber(),
        isExactOut: false,
      });

      if (!quoteResult?.ok) {
        return alert(quoteResult?.error);
      }

      // Select the first available quote
      const [strategyId, quoteAmount] = Object.entries(quoteResult.val.quotes)[0];
      setQuote({
        strategyId,
        quoteAmount: quoteAmount as string,
      });
    } catch (error) {
      console.error('Error getting quote:', error);
      alert('Error getting quote');
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!swapAndInitiate || !quote || !fromAsset || !toAsset) {
      alert('Please get a quote first');
      return;
    }

    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const amountBN = new BigNumber(amount).multipliedBy(10 ** fromAsset.decimals);

      const inputAsset = {
        chain: fromChain,
        symbol: fromAsset.symbol,
        decimals: fromAsset.decimals,
        tokenAddress: fromAsset.tokenAddress,
        atomicSwapAddress: fromAsset.atomicSwapAddress
      };

      const outputAsset = {
        chain: toChain,
        symbol: toAsset.symbol,
        decimals: toAsset.decimals,
        tokenAddress: toAsset.tokenAddress,
        atomicSwapAddress: toAsset.atomicSwapAddress
      };

      // Initiate the swap
      const order = await swapAndInitiate({
        fromAsset: inputAsset,
        toAsset: outputAsset,
        sendAmount: amountBN.toString(),
        receiveAmount: quote.quoteAmount,
        additionalData: {
          btcAddress,
          strategyId: quote.strategyId,
        },
      });

      if (!order.ok) {
        return alert(order.error);
      }

      console.log('✅ Order created:', order.val);
      alert('Swap initiated successfully!');
      
      // Reset quote after successful swap
      setQuote(null);
    } catch (error) {
      console.error('Error executing swap:', error);
      alert('Error executing swap');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableAssets = (chainId: string) => {
    if (!chains[chainId]) return [];
    return chains[chainId].assetConfig.filter(asset => !asset.disabled);
  };

  return (
    <div>
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <h2>Garden Finance Swap</h2>
        
        {/* Wallet Connection */}
        {!isConnected ? (
          <div style={{ marginBottom: '20px' }}>
            <button 
              onClick={handleConnectWallet}
              style={{ 
                padding: '12px 24px', 
                backgroundColor: '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
            <p>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
          </div>
        )}

        {/* From Chain Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label>From Chain: </label>
          <select 
            value={fromChain} 
            onChange={(e) => {
              setFromChain(e.target.value);
              setFromAsset(null);
              setQuote(null);
            }}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          >
            <option value="">Select Chain</option>
            {Object.entries(chains).map(([chainId, chain]) => (
              <option key={chainId} value={chainId}>
                {chain.name}
              </option>
            ))}
          </select>
        </div>

        {/* From Asset Selection */}
        {fromChain && (
          <div style={{ marginBottom: '20px' }}>
            <label>From Asset: </label>
            <select 
              value={fromAsset?.tokenAddress || ''} 
              onChange={(e) => {
                const asset = getAvailableAssets(fromChain).find(a => a.tokenAddress === e.target.value);
                setFromAsset(asset || null);
                setQuote(null);
              }}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="">Select Asset</option>
              {getAvailableAssets(fromChain).map(asset => (
                <option key={asset.tokenAddress} value={asset.tokenAddress}>
                  {asset.symbol} - {asset.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* To Chain Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label>To Chain: </label>
          <select 
            value={toChain} 
            onChange={(e) => {
              setToChain(e.target.value);
              setToAsset(null);
              setQuote(null);
            }}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          >
            <option value="">Select Chain</option>
            {Object.entries(chains).map(([chainId, chain]) => (
              <option key={chainId} value={chainId}>
                {chain.name}
              </option>
            ))}
          </select>
        </div>

        {/* To Asset Selection */}
        {toChain && (
          <div style={{ marginBottom: '20px' }}>
            <label>To Asset: </label>
            <select 
              value={toAsset?.tokenAddress || ''} 
              onChange={(e) => {
                const asset = getAvailableAssets(toChain).find(a => a.tokenAddress === e.target.value);
                setToAsset(asset || null);
                setQuote(null);
              }}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="">Select Asset</option>
              {getAvailableAssets(toChain).map(asset => (
                <option key={asset.tokenAddress} value={asset.tokenAddress}>
                  {asset.symbol} - {asset.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Amount Input */}
        <div style={{ marginBottom: '20px' }}>
          <label>Amount: </label>
          <input 
            type="number" 
            value={amount} 
            onChange={(e) => {
              setAmount(e.target.value);
              setQuote(null);
            }}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            placeholder="Enter amount"
            min="0"
            step="0.000001"
          />
        </div>

        {/* Bitcoin Address for receiving funds */}
        <div style={{ marginBottom: '20px' }}>
          <label>Bitcoin Address (for receiving): </label>
          <input 
            type="text" 
            value={btcAddress} 
            onChange={(e) => setBtcAddress(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            placeholder="Enter your Bitcoin address"
          />
        </div>

        {/* Quote Display */}
        {quote && (
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
            <h4>Quote</h4>
            <p>Strategy ID: {quote.strategyId}</p>
            <p>You will receive: {quote.quoteAmount}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleGetQuote}
            disabled={loading || !fromAsset || !toAsset}
            style={{ 
              flex: 1, 
              padding: '12px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px',
              cursor: loading || !fromAsset || !toAsset ? 'not-allowed' : 'pointer',
              opacity: loading || !fromAsset || !toAsset ? 0.6 : 1
            }}
          >
            {loading ? 'Loading...' : 'Get Quote'}
          </button>

          <button 
            onClick={handleSwap}
            disabled={loading || !quote || !isConnected}
            style={{ 
              flex: 1, 
              padding: '12px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px',
              cursor: loading || !quote || !isConnected ? 'not-allowed' : 'pointer',
              opacity: loading || !quote || !isConnected ? 0.6 : 1
            }}
          >
            {loading ? 'Processing...' : 'Execute Swap'}
          </button>
        </div>

        {/* Debug Info */}
        <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
          <p>Available Chains: {Object.keys(chains).length}</p>
          {fromAsset && <p>From: {fromAsset.symbol} ({fromAsset.name})</p>}
          {toAsset && <p>To: {toAsset.symbol} ({toAsset.name})</p>}
        </div>
      </div>
    </div>
  );
};

export default SwapComponent;
