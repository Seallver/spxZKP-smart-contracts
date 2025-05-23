"use client";

import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

import React from "react";

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
        <MyButton
          onClick={() => router.push("/dkg")}
          bgColor=" #2563eb"
          hoverColor=" #4f46e5"
        >
          🔐 进入 DKG 功能页
        </MyButton>

        <MyButton
          onClick={() => router.push("/sign")}
          bgColor=" #f59e0b" // gray-400
          hoverColor=" #ef4444"
        >
          🖋 进入签名功能页
        </MyButton>

        <MyButton
          onClick={() => router.push("/zkcheck")}
          bgColor=" #10b981" // gray-400
          hoverColor=" #14b8a6"
        >
          🔍 进入交易提交页
        </MyButton>
      </div>
    </div>
  );
}

export default HomePage;

const mainButtonStyle = (
  startColor: string,
  endColor: string,
): React.CSSProperties => ({
  width: 600,
  height: 80,
  fontSize: 24,
  fontWeight: 600,
  color: "#fff",
  background: `linear-gradient(90deg, ${startColor}, ${endColor})`,
  border: "none",
  borderRadius: 14,
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(0, 0, 0, 0.12)",
  marginBottom: 30,
  transition: "transform 0.25s ease, box-shadow 0.25s ease",
  textAlign: "center",
  lineHeight: "60px",
  userSelect: "none",
  filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.15))",
});

type MyButtonProps = {
  onClick: () => void;
  children: React.ReactNode;
  bgColor: string;
  hoverColor: string;
};

function MyButton({ onClick, children, bgColor, hoverColor }: MyButtonProps) {
  const [hover, setHover] = React.useState(false);

  return (
    <button
      onClick={onClick}
      style={{
        ...mainButtonStyle(bgColor, hoverColor),
        transform: hover ? "scale(1.05)" : "scale(1)",
        boxShadow: hover
          ? "0 10px 25px rgba(0, 0, 0, 0.2)"
          : "0 8px 20px rgba(0, 0, 0, 0.15)",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </button>
  );
}
