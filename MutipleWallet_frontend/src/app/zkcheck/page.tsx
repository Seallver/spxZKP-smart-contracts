"use client";

import { useReadContract, useWriteContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { SpxVrfyAbi } from "../../constants/spxVrfy";
import { useRouter } from "next/navigation";
import { useRef } from "react";

import { toHex } from 'viem';

import React from "react";

const SPX_VRFY_ADDRESS = process.env
  .NEXT_PUBLIC_SPX_VRFY_ADDRESS as `0x${string}`;

export default function ZkCheckPage() {
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);

  const { data, isLoading, isError, refetch } = useReadContract({
    address: SPX_VRFY_ADDRESS,
    abi: SpxVrfyAbi,
    functionName: "get",
  });

  const router = useRouter();

  const sigjsonfileInputRef = useRef<HTMLInputElement>(null);
  const zkbinfileInputRef = useRef<HTMLInputElement>(null);

  const sigHandleButtonClick = () => {
    sigjsonfileInputRef.current?.click();
  };

  const zkHandleButtonClick = () => {
    zkbinfileInputRef.current?.click();
  };

  const downloadSeal = () => {
    window.location.href = "http://localhost:3002/api/download-seal";
  };

  const sighandleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = "";

    const formData = new FormData();
    formData.append("sigfile", file);

    setLoading(true);
    try {
      const res = await fetch("http://localhost:3002/api/zkverify", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.status === "success") {
        alert("✅ ZK 生成成功\n");
      } else {
        alert("❌ ZK 生成失败:\n" + (data.stderr || data.output || data.error));
      }
    } catch (err: any) {
      alert("请求失败: " + err.message);
    } finally {
      setLoading(false);
    }
  };

const zkhandleFileChange = async () => {
  const fileInput = zkbinfileInputRef.current;
  const file = fileInput?.files?.[0];

  if (!file) {
    alert("请先选择 seal.bin 文件！");
    return;
  }

  const arrayBuffer = await file.arrayBuffer();
  const sealBytes = new Uint8Array(arrayBuffer); // 注意是 Uint8Array

  const hexSeal = toHex(sealBytes);

  try {
    const tx = await writeContractAsync({
      address: SPX_VRFY_ADDRESS,
      abi: SpxVrfyAbi,
      functionName: "set",
      args: [hexSeal],
    });

    alert("✅ 交易确认成功！");
  } catch (err: any) {
    console.error(err);
    alert(`调用失败: ${err.message}`);
  } finally {
    if (fileInput) {
      fileInput.value = ""; // 清空文件选择
    }
  }
};


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
      <div style={{ position: "absolute", top: 20, right: 20 }}>
        <ConnectButton />
      </div>

      <h1 style={{ fontSize: 36, fontWeight: "bold", marginBottom: 20 }}>
        ZK验证状态查询
      </h1>

      {isLoading ? (
        <p>读取中...</p>
      ) : isError ? (
        <p style={{ color: "red" }}>读取失败！</p>
      ) : (
        <p style={{ fontSize: 20 }}>
          合约返回值：{" "}
          <strong style={{ color: data ? "green" : "red" }}>
            {data ? "✔ True" : "❌ False"}
          </strong>
        </p>
      )}

      <MyButton
        onClick={() => refetch()}
        bgColor="rgb(23, 91, 209)"
        hoverColor="rgb(30, 77, 173)"
      >
        🔄 刷新
      </MyButton>

      <input
        type="file"
        accept=".json"
        ref={sigjsonfileInputRef}
        style={{ display: "none" }} 
        onChange={sighandleFileChange}
      />
      <MyButton
        onClick={sigHandleButtonClick}
        bgColor="green"
        hoverColor="darkgreen"
      >
        {loading ? "⏳ 正在生成 ZK ，请稍候..." : "✨ 生成 ZK"}
      </MyButton>

      <MyButton
        onClick={downloadSeal}
        bgColor=" rgb(138, 23, 209)"
        hoverColor=" rgb(213, 36, 249)"
      >
        ⏬ 下载 ZK
      </MyButton>

      <input
        type="file"
        accept=".bin"
        ref={zkbinfileInputRef}
        style={{ display: "none" }}
        onChange={zkhandleFileChange}
      />
      <MyButton
        onClick={zkHandleButtonClick}
        bgColor="orange"
        hoverColor="darkorange"
      >
        📤 上传并验证 ZK
      </MyButton>

      <MyButton
        onClick={() => router.back()}
        bgColor=" #9ca3af"
        hoverColor=" #6b7280"
      >
        🔙 返回上一级
      </MyButton>
    </div>
  );
}

const mainButtonStyle = (
  startColor: string,
  endColor: string,
): React.CSSProperties => ({
  width: 500,
  height: 60,
  fontSize: 20,
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
