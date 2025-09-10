import { useAppKit } from '@reown/appkit/react'
import { useAccount } from 'wagmi'
import { Button } from '@gardenfi/garden-book'

const Navbar: React.FC = () => {
  const { open } = useAppKit();
  const { isConnected } = useAccount();

  return (
    <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px" }}>
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
  );
};

export default Navbar;
