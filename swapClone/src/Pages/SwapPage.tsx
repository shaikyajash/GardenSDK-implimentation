import Navbar from "../components/NavBar";
import SwapComponent from "../components/SwapComponent";

const SwapPage = () => {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px" }}>
        <Navbar />
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 16px 16px 16px" }}>
        <SwapComponent />
      </div>
    </div>
  );
};

export default SwapPage;
