import { useState, useEffect } from "react";
import { useGarden } from "@gardenfi/react-hooks";
import { useConnect, useAccount } from "wagmi";
import BigNumber from "bignumber.js";
import "../styles/SwapComponent.css";

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
  const [fromChain, setFromChain] = useState("");
  const [toChain, setToChain] = useState("");
  const [fromAsset, setFromAsset] = useState<AssetConfig | null>(null);
  const [toAsset, setToAsset] = useState<AssetConfig | null>(null);
  const [amount, setAmount] = useState("0.0005");
  const [btcAddress, setBtcAddress] = useState(
    "tb1q25q3632323232323232323232323232323232"
  );
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);

  const { swapAndInitiate, getQuote } = useGarden();
  const { connect, connectors } = useConnect();
  const { address, isConnected } = useAccount();
  const [orderID, setOrderID] = useState<string | null>(null);

  // Fetch chain data on component mount
  useEffect(() => {
    const fetchChainData = async () => {
      try {
        const response = await fetch(
          "https://testnet.api.garden.finance/info/assets"
        );
        const data = await response.json();

        // Filter only testnet chains that aren't disabled
        const testnetChains = Object.entries(data).reduce(
          (acc, [key, value]: [string, any]) => {
            if (value.networkType === "testnet" && !value.disabled) {
              acc[key] = value;
            }
            return acc;
          },
          {} as Record<string, ChainInfo>
        );

        setChains(testnetChains);
      } catch (error) {
        console.error("Error fetching chain data:", error);
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
      alert("Please select both from and to assets");
      return;
    }

    setLoading(true);
    try {
      // Convert amount to the smallest unit
      const amountBN = new BigNumber(amount).multipliedBy(
        10 ** fromAsset.decimals
      );

      // Create asset objects in the format expected by Garden SDK
      const inputAsset = {
        chain: fromChain as "bitcoin_testnet" | "ethereum_sepolia" | "arbitrum_sepolia",
        symbol: fromAsset.symbol,
        decimals: fromAsset.decimals,
        tokenAddress: fromAsset.tokenAddress,
        atomicSwapAddress: fromAsset.atomicSwapAddress,
        name: fromAsset.name,
      };
      const outputAsset = {
        chain: toChain as "bitcoin_testnet" | "ethereum_sepolia" | "arbitrum_sepolia" | "bitcoin" | "bitcoin_regtest" | "ethereum" | "base" | "arbitrum" | "arbitrum_localnet" | "ethereum_localnet" | "core",
        symbol: toAsset.symbol,
        decimals: toAsset.decimals,
        tokenAddress: toAsset.tokenAddress,
        atomicSwapAddress: toAsset.atomicSwapAddress,
        name: toAsset.name,
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
      const [strategyId, quoteAmount] = Object.entries(
        quoteResult.val.quotes
      )[0];
      setQuote({
        strategyId,
        quoteAmount: quoteAmount as string,
      });
    } catch (error) {
      console.error("Error getting quote:", error);
      alert("Error getting quote");
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!swapAndInitiate || !quote || !fromAsset || !toAsset) {
      alert("Please get a quote first");
      return;
    }

    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    setLoading(true);
    try {
      const amountBN = new BigNumber(amount).multipliedBy(
        10 ** fromAsset.decimals
      );

      const inputAsset = {
        chain: fromChain as "bitcoin" | "bitcoin_testnet" | "bitcoin_regtest" | "ethereum" | "base" | "arbitrum" | "ethereum_sepolia" | "arbitrum_localnet" | "arbitrum_sepolia" | "ethereum_localnet" | "core",
        symbol: fromAsset.symbol,
        decimals: fromAsset.decimals,
        tokenAddress: fromAsset.tokenAddress,
        atomicSwapAddress: fromAsset.atomicSwapAddress,
        name: fromAsset.name,
      };

      const outputAsset = {
        chain: toChain as "bitcoin" | "bitcoin_testnet" | "bitcoin_regtest" | "ethereum" | "base" | "arbitrum" | "ethereum_sepolia" | "arbitrum_localnet" | "arbitrum_sepolia" | "ethereum_localnet" | "core" | "solana" | "sui" | "sui_testnet",
        symbol: toAsset.symbol,
        decimals: toAsset.decimals,
        tokenAddress: toAsset.tokenAddress,
        atomicSwapAddress: toAsset.atomicSwapAddress,
        name: toAsset.name,
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

      setOrderID(order.val.create_order.create_id);
      alert("Swap initiated successfully!");

      // Reset quote after successful swap
      setQuote(null);
    } catch (error) {
      console.error("Error executing swap:", error);
      alert("Error executing swap");
    } finally {
      setLoading(false);
    }
  };

  const getAvailableAssets = (chainId: string) => {
    if (!chains[chainId]) return [];
    return chains[chainId].assetConfig.filter((asset) => !asset.disabled);
  };

  const formatQuoteAmount = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6
    }).format(num);
  };

  // Helper function to check if the destination chain is Bitcoin
  const isBitcoinChain = (chainId: string) => {
    return chainId.toLowerCase().includes('bitcoin') || chainId === 'bitcoin_testnet';
  };

  return (
    <div className="swap-component">
      <h2 className="swap-component__title">Swap Across Chains</h2>

      {/* Wallet Connection Status */}
      {isConnected ? (
        <div className="swap-component__wallet-status">
          Wallet Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>
      ) : (
        <button
          onClick={handleConnectWallet}
          className="swap-component__button swap-component__button--primary"
        >
          Connect Wallet
        </button>
      )}

      {/* From Chain Selection */}
      <div className="swap-component__form-group">
        <label className="swap-component__label">From Chain</label>
        <select
          className="swap-component__select"
          value={fromChain}
          onChange={(e) => {
            setFromChain(e.target.value);
            setFromAsset(null);
            setQuote(null);
          }}
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
        <div className="swap-component__form-group">
          <label className="swap-component__label">From Asset</label>
          <select
            className="swap-component__select"
            value={fromAsset?.tokenAddress || ""}
            onChange={(e) => {
              const asset = getAvailableAssets(fromChain).find(
                (a) => a.tokenAddress === e.target.value
              );
              setFromAsset(asset || null);
              setQuote(null);
            }}
          >
            <option value="">Select Asset</option>
            {getAvailableAssets(fromChain).map((asset) => (
              <option key={asset.tokenAddress} value={asset.tokenAddress}>
                {asset.symbol} - {asset.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* To Chain Selection */}
      <div className="swap-component__form-group">
        <label className="swap-component__label">To Chain</label>
        <select
          className="swap-component__select"
          value={toChain}
          onChange={(e) => {
            setToChain(e.target.value);
            setToAsset(null);
            setQuote(null);
          }}
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
        <div className="swap-component__form-group">
          <label className="swap-component__label">To Asset</label>
          <select
            className="swap-component__select"
            value={toAsset?.tokenAddress || ""}
            onChange={(e) => {
              const asset = getAvailableAssets(toChain).find(
                (a) => a.tokenAddress === e.target.value
              );
              setToAsset(asset || null);
              setQuote(null);
            }}
          >
            <option value="">Select Asset</option>
            {getAvailableAssets(toChain).map((asset) => (
              <option key={asset.tokenAddress} value={asset.tokenAddress}>
                {asset.symbol} - {asset.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Amount Input */}
      <div className="swap-component__form-group">
        <label className="swap-component__label">Amount</label>
        <input
          type="number"
          className="swap-component__input"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setQuote(null);
          }}
          placeholder="Enter amount"
          min="0"
          step="0.000001"
        />
      </div>

      {/* Bitcoin Address for receiving funds */}
      {isBitcoinChain(toChain) && (
        <div className="swap-component__form-group">
          <label className="swap-component__label">Bitcoin Address (for receiving)</label>
          <input
            type="text"
            className="swap-component__input"
            value={btcAddress}
            onChange={(e) => setBtcAddress(e.target.value)}
            placeholder="Enter your Bitcoin address"
          />
        </div>
      )}

      {/* Quote Display */}
      {quote && (
        <div className="swap-component__quote-card">
          <h4 className="swap-component__quote-title">Quote</h4>
          <div className="swap-component__quote-detail">
            <strong>Strategy ID:</strong> {quote.strategyId}
          </div>
          <div className="swap-component__quote-detail">
            <strong>You will receive:</strong>
            <div className="swap-component__quote-amount">
              {formatQuoteAmount(quote.quoteAmount)} {toAsset?.symbol}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="swap-component__buttons">
        <button
          onClick={handleGetQuote}
          disabled={loading || !fromAsset || !toAsset}
          className={`swap-component__button swap-component__button--primary ${
            loading ? 'swap-component__button--loading' : ''
          }`}
        >
          {loading ? "Loading..." : "Get Quote"}
        </button>

        <button
          onClick={handleSwap}
          disabled={loading || !quote || !isConnected}
          className={`swap-component__button swap-component__button--secondary ${
            loading ? 'swap-component__button--loading' : ''
          }`}
        >
          {loading ? "Processing..." : "Execute Swap"}
        </button>
      </div>

      {/* Order Success Display */}
      {orderID && (
        <div className="swap-component__order-success">
          <h4 className="swap-component__order-title">Swap Initiated Successfully!</h4>
          <div className="swap-component__order-id">
            Swap ID: {orderID}
          </div>
          <div>
            <a
              href={`https://testnet-explorer.garden.finance/order/${orderID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="swap-component__explorer-link"
            >
              View in Garden Explorer →
            </a>
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="swap-component__debug">
        <div className="swap-component__debug-title">Debug Information</div>
        <div className="swap-component__debug-item">
          <span className="swap-component__debug-label">Available Chains:</span>
          <span className="swap-component__debug-value">{Object.keys(chains).length}</span>
        </div>
        {fromAsset && (
          <div className="swap-component__debug-item">
            <span className="swap-component__debug-label">From:</span>
            <span className="swap-component__debug-value">
              {fromAsset.symbol} ({fromAsset.name})
            </span>
          </div>
        )}
        {toAsset && (
          <div className="swap-component__debug-item">
            <span className="swap-component__debug-label">To:</span>
            <span className="swap-component__debug-value">
              {toAsset.symbol} ({toAsset.name})
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SwapComponent;