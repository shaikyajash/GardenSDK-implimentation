import { useEffect, useState, useMemo } from "react";
import { useAccount } from "wagmi";
import "../styles/TransactionHistory.css";

interface MatchedOrder {
  order_id?: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  create_order: {
    create_id: string;
    source_chain: string;
    destination_chain: string;
    source_asset: string;
    destination_asset: string;
    source_amount: string;
    destination_amount: string;
    created_at: string;
  };
  source_swap: {
    chain: string;
    asset: string;
    amount: string;
    initiate_tx_hash?: string;
    redeem_tx_hash?: string;
    created_at: string;
  };
  destination_swap: {
    chain: string;
    asset: string;
    amount: string;
    initiate_tx_hash?: string;
    redeem_tx_hash?: string;
    created_at: string;
  };
}

interface ApiResponse {
  status: string;
  result: {
    data: MatchedOrder[];
    page: number;
    per_page: number;
    total_pages: number;
    total_items: number;
  };
}

const TransactionHistory: React.FC = () => {
  const { address } = useAccount();

  const [items, setItems] = useState<MatchedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  const fetchTransactions = async () => {
    if (!address) return;
    setLoading(true);

    try {
      const url = `https://testnet.api.garden.finance/orders/user/${address}/matched?page=${page}&per_page=${perPage}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      
      console.log("API response:", data); // Debug log

      // Handle the nested response structure
      if (data.status === 'Ok' && data.result) {
        setItems(data.result.data || []);
        setTotalPages(data.result.total_pages || 1);
        setTotalItems(data.result.total_items || 0);
      } else {
        setItems([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setItems([]);
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  // refetch when relevant controls change
  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, page, perPage]);

  // Helper functions to extract data
  const getCreatedAt = (item: MatchedOrder) => {
    return item.created_at || item.create_order?.created_at || item.source_swap?.created_at || item.destination_swap?.created_at || "-";
  };

  const getSourceChain = (item: MatchedOrder) => {
    return item.source_swap?.chain || item.create_order?.source_chain || "-";
  };

  const getDestinationChain = (item: MatchedOrder) => {
    return item.destination_swap?.chain || item.create_order?.destination_chain || "-";
  };

  const getSourceAmount = (item: MatchedOrder) => {
    return item.source_swap?.amount || item.create_order?.source_amount || "-";
  };

  const getDestinationAmount = (item: MatchedOrder) => {
    return item.destination_swap?.amount || item.create_order?.destination_amount || "-";
  };

  const getSourceAsset = (item: MatchedOrder) => {
    const asset = item.source_swap?.asset || item.create_order?.source_asset || "-";
    if (asset.startsWith("0x")) {
      return `${asset.substring(0, 6)}...${asset.substring(asset.length - 4)}`;
    }
    return asset;
  };

  const getDestinationAsset = (item: MatchedOrder) => {
    const asset = item.destination_swap?.asset || item.create_order?.destination_asset || "-";
    if (asset.startsWith("0x")) {
      return `${asset.substring(0, 6)}...${asset.substring(asset.length - 4)}`;
    }
    return asset;
  };

  const getSourceTx = (item: MatchedOrder) => {
    return item.source_swap?.initiate_tx_hash || null;
  };

  const getRedeemTx = (item: MatchedOrder) => {
    return item.destination_swap?.redeem_tx_hash || item.source_swap?.redeem_tx_hash || null;
  };

  const getOrderId = (item: MatchedOrder) => {
    return item.create_order?.create_id || item.order_id || "-";
  };

  const getOrderStatus = (item: MatchedOrder) => {
    const srcTx = getSourceTx(item);
    const redeemTx = getRedeemTx(item);

    if (redeemTx) {
      return "Completed";
    } else if (srcTx) {
      return "In Progress";
    } else {
      return "Pending";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const baseClass = "transaction-history__status-badge";
    switch (status) {
      case "Completed":
        return `${baseClass} transaction-history__status-badge--completed`;
      case "In Progress":
        return `${baseClass} transaction-history__status-badge--in-progress`;
      case "Pending":
        return `${baseClass} transaction-history__status-badge--pending`;
      default:
        return `${baseClass} transaction-history__status-badge--default`;
    }
  };

  // memoized sorted items
  const displayedItems = useMemo(() => {
    return [...items].sort((a: MatchedOrder, b: MatchedOrder) => {
      const ta = Date.parse(getCreatedAt(a) ?? "") || 0;
      const tb = Date.parse(getCreatedAt(b) ?? "") || 0;
      return tb - ta;
    });
  }, [items]);

  const getExplorerLink = (tx: string | null, chain: string) => {
    if (!tx) return null;
    
    const chainLower = chain?.toLowerCase() ?? '';
    
    if (tx.startsWith("0x")) {
      if (chainLower.includes("sepolia") || chainLower.includes("ethereum_sepolia")) {
        return `https://sepolia.etherscan.io/tx/${tx}`;
      } else if (chainLower.includes("ethereum") || chainLower.includes("mainnet")) {
        return `https://etherscan.io/tx/${tx}`;
      } else if (chainLower.includes("arbitrum_sepolia")) {
        return `https://sepolia.arbiscan.io/tx/${tx}`;
      } else if (chainLower.includes("arbitrum")) {
        return `https://arbiscan.io/tx/${tx}`;
      } else if (chainLower.includes("polygon")) {
        return `https://polygonscan.com/tx/${tx}`;
      } else if (chainLower.includes("base")) {
        return `https://basescan.org/tx/${tx}`;
      } else if (chainLower.includes("optimism")) {
        return `https://optimistic.etherscan.io/tx/${tx}`;
      }
    }
    
    return null;
  };

  const formatChainName = (chain: string) => {
    return chain.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (num > 1000000) {
      return (num / 1000000).toFixed(6);
    } else if (num > 1000) {
      return (num / 1000).toFixed(3) + "K";
    }
    return num.toString();
  };

  return (
    <div className="transaction-history">
      <h2 className="transaction-history__title">Transaction History</h2>

      {!address && (
        <div className="transaction-history__warning">
          Please connect your wallet to view transaction history.
        </div>
      )}

      {/* Pagination Controls */}
      <div className="transaction-history__controls">
        <div className="transaction-history__per-page">
          <label className="transaction-history__per-page-label">Items per page:</label>
          <select
            className="transaction-history__per-page-select"
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="transaction-history__pagination">
          <button
            className="transaction-history__pagination-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            Prev
          </button>
          <div className="transaction-history__pagination-info">
            Page {page} / {totalPages}
          </div>
          <button
            className="transaction-history__pagination-btn"
            onClick={() => setPage((p) => Math.min(totalPages || 1, p + 1))}
            disabled={page >= (totalPages || 1) || loading}
          >
            Next
          </button>

          <button
            className="transaction-history__refresh-btn"
            onClick={() => fetchTransactions()}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="transaction-history__loading">
          <div>Loading transactions...</div>
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="transaction-history__empty">
          {address ? "No transactions found." : "Connect wallet to view transactions."}
        </div>
      ) : (
        <div className="transaction-history__table-container">
          <table className="transaction-history__table">
            <thead>
              <tr>
                <th className="transaction-history__table-header">Date</th>
                <th className="transaction-history__table-header">Order ID</th>
                <th className="transaction-history__table-header">Status</th>
                <th className="transaction-history__table-header">From Chain</th>
                <th className="transaction-history__table-header">To Chain</th>
                <th className="transaction-history__table-header">Amount</th>
                <th className="transaction-history__table-header">Initiate Tx</th>
                <th className="transaction-history__table-header">Redeem Tx</th>
              </tr>
            </thead>
            <tbody>
              {displayedItems.map((item, idx) => {
                const created = getCreatedAt(item);
                const orderId = getOrderId(item);
                const orderStatus = getOrderStatus(item);
                const fromChain = getSourceChain(item);
                const toChain = getDestinationChain(item);
                const srcAmt = getSourceAmount(item);
                const dstAmt = getDestinationAmount(item);
                const srcAsset = getSourceAsset(item);
                const dstAsset = getDestinationAsset(item);
                const srcTx = getSourceTx(item);
                const rTx = getRedeemTx(item);

                return (
                  <tr key={idx} className="transaction-history__table-row">
                    <td className="transaction-history__table-cell">
                      {created && created !== "-" ? new Date(created).toLocaleString() : "-"}
                    </td>
                    <td className="transaction-history__table-cell">
                      {orderId && orderId !== "-" ? (
                        <a 
                          href={`https://testnet-explorer.garden.finance/order/${orderId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="transaction-history__order-link"
                        >
                          {orderId.substring(0, 8)}...
                        </a>
                      ) : "-"}
                    </td>
                    <td className="transaction-history__table-cell">
                      <span className={getStatusBadgeClass(orderStatus)}>
                        {orderStatus}
                      </span>
                    </td>
                    <td className="transaction-history__table-cell">{formatChainName(fromChain)}</td>
                    <td className="transaction-history__table-cell">{formatChainName(toChain)}</td>
                    <td className="transaction-history__table-cell">
                      <div className="transaction-history__amount-container">
                        <div>
                          {formatAmount(srcAmt)} → {formatAmount(dstAmt)}
                        </div>
                        <div className="transaction-history__amount-detail">
                          {srcAsset} → {dstAsset}
                        </div>
                      </div>
                    </td>
                    <td className="transaction-history__table-cell">
                      {srcTx ? (
                        getExplorerLink(srcTx, fromChain) ? (
                          <a 
                            href={getExplorerLink(srcTx, fromChain)!} 
                            target="_blank" 
                            rel="noreferrer"
                            className="transaction-history__tx-link"
                          >
                            View
                          </a>
                        ) : (
                          <span className="transaction-history__tx-hash">
                            {srcTx.substring(0, 10)}...
                          </span>
                        )
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="transaction-history__table-cell">
                      {rTx ? (
                        getExplorerLink(rTx, toChain) ? (
                          <a 
                            href={getExplorerLink(rTx, toChain)!} 
                            target="_blank" 
                            rel="noreferrer"
                            className="transaction-history__tx-link"
                          >
                            View
                          </a>
                        ) : (
                          <span className="transaction-history__tx-hash">
                            {rTx.substring(0, 10)}...
                          </span>
                        )
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="transaction-history__summary">
        Showing {displayedItems.length} of {totalItems} items
      </div>
    </div>
  );
};

export default TransactionHistory;