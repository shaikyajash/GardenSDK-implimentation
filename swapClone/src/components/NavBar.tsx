import { useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";
import { Button } from "@gardenfi/garden-book";
import "../styles/NavBar.css"
import { useNavigate } from "react-router-dom";

const Navbar: React.FC = () => {
  const { open } = useAppKit();
  const { isConnected } = useAccount();
    const navigate = useNavigate();

  const handleHistoryClick = () => {

       if (!isConnected) {
        alert("Please connect your wallet to view transactions.");
        return;
      }
      
    navigate("/transactions");
  };

  return (
    <div className="navbar">
      <div className="navbar-left">
        {isConnected ? (
          <Button variant="secondary" onClick={() => open()} size="sm">
            Disconnect
          </Button>
        ) : (
          <Button variant="primary" onClick={() => open()} size="sm">
            Connect Wallet
          </Button>
        )}
      </div>
      <div className="navbar-right">
        <button className="history-btn" onClick={handleHistoryClick}>
          Transaction History
        </button>
      </div>
    </div>
  );
};


export default Navbar;
