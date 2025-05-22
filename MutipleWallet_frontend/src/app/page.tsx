"use client";

import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

function HomePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        backgroundImage: 'url("")',
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
    >
      {/* 顶部连接按钮 */}
      <div style={{ position: "absolute", top: 20, right: 20 }}>
        <ConnectButton />
      </div>

      {/* 欢迎语 */}
      <h1 style={{ fontSize: 40, fontWeight: "bold", marginBottom: 20 }}>
        SPX Multiple Sign Cold Wallet DApp 💼
      </h1>

      {/* 钱包连接状态 */}
      <div style={{ marginBottom: 30 }}>
        {isConnected ? (
          <p style={{ color: "green" }}>
            已连接钱包：<strong>{address}</strong>
          </p>
        ) : (
          <p style={{ color: "red" }}>尚未连接钱包</p>
        )}
      </div>

      {/* 操作按钮 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "30px",
          marginTop: "60px",
        }}
      >
        <button
          onClick={() => router.push("/dkg")}
          style={{
            width: "280px", // 更宽
            height: "60px", // 更高
            fontSize: "20px",
            fontWeight: 600,
            color: "#fff",
            background: "linear-gradient(to right, #2563eb, #4f46e5)",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            boxShadow: "0 8px 20px rgba(0, 0, 0, 0.15)",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = "0 10px 25px rgba(0, 0, 0, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.15)";
          }}
        >
          🔐 进入 DKG 功能页
        </button>

        <button
          onClick={() => router.push("/sign")}
          style={{
            width: "280px",
            height: "60px",
            fontSize: "20px",
            fontWeight: 600,
            color: "#fff",
            background: "linear-gradient(to right, #f59e0b, #ef4444)",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            boxShadow: "0 8px 20px rgba(0, 0, 0, 0.15)",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = "0 10px 25px rgba(0, 0, 0, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.15)";
          }}
        >
          🖋 进入签名功能页
        </button>
      </div>
    </div>
  );
}

export default HomePage;
