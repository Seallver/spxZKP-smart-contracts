"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import QrScanner from "../utils/QrScanner";

function DKGPage() {
  const [qrData, setQrData] = useState<string | null>(null);
  const [scannedText, setScannedText] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [skList, setSkList] = useState<string[]>([]);
  const router = useRouter();

  async function callGenPrime() {
    try {
      const response = await fetch("http://localhost:3001/api/genPrime");
      if (!response.ok) {
        alert("获取素数失败: " + response.statusText);
        return;
      }

      const data = await response.json();
      const qrContent = JSON.stringify({ prime: data.prime });
      setQrData(qrContent);
      setShowModal(true); // 弹出二维码窗口
    } catch (error) {
      alert("请求异常");
    }
  }

  async function callShowPrime() {
    try {
      const response = await fetch("http://localhost:3001/api/ShowPrime");
      if (!response.ok) {
        alert("获取素数失败: " + response.statusText);
        return;
      }
      const data = await response.json();

      if (data.status != "success") {
        alert("获取素数失败: 当前未设置素数");
      } else {
        const qrContent = JSON.stringify({ prime: data.prime });
        setQrData(qrContent);
        setShowModal(true); // 弹出二维码窗口
      }
    } catch (error) {
      alert("请求异常");
    }
  }

  async function callShowPK() {
    try {
      const response = await fetch("http://localhost:3001/api/ShowPK");
      if (!response.ok) {
        alert("获取公钥失败: " + response.statusText);
        return;
      }
      const data = await response.json();

      if (data.status != "success") {
        alert("获取公钥失败: 未生成pk");
      } else {
        const qrContent = JSON.stringify({ pk: data.pk });
        setQrData(qrContent);
        setShowModal(true); // 弹出二维码窗口
      }
    } catch (error) {
      alert("请求异常");
    }
  }

  async function sendBlindSK(blind_sk: string) {
    try {
      const BSKObj = JSON.parse(blind_sk);
      const res = await fetch("http://localhost:3001/api/scan-result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          blind_sk: BSKObj.blind_sk,
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        alert("上传成功，当前数量：" + data.total);
      } else {
        alert("上传失败：" + data.msg);
      }
    } catch (err) {
      alert("上传异常");
    }
  }

  async function callDKG() {
    try {
      const res = await fetch("http://localhost:3001/api/dkg");
      const data = await res.json();
      if (data.status === "success") {
        alert("DKG 成功");
        setPublicKey(data.publicKey);
      } else {
        alert("DKG 失败：" + data.msg);
      }
    } catch (err) {
      alert("DKG 请求异常");
    }
  }

  async function fetchSkList() {
    try {
      const res = await fetch("http://localhost:3001/api/scan-result");
      const data = await res.json();
      if (data.status === "success") {
        setSkList(data.bsk);
      } else {
        alert("获取失败：" + data.msg);
      }
    } catch (err) {
      alert("请求异常");
    }
  }

  async function cleanParams() {
    try {
      const res = await fetch("http://localhost:3001/api/clean");
      const data = await res.json();
      if (data.status === "success") {
        alert("参数已被清理");
      } else {
        alert("清理失败");
      }
    } catch (err) {
      alert("请求异常");
    }
  }

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        padding: 24,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 40 }}>DKG</h1>

      <MainButton
        onClick={() => setShowScanner(true)}
        bgColor="#10b981" // emerald-500
        hoverColor="#059669"
      >
        📷 扫码获取 BSK
      </MainButton>

      <MainButton
        onClick={fetchSkList}
        bgColor="#8b5cf6" // violet-500
        hoverColor="#7c3aed"
      >
        📋 查看已上传的 BSK
      </MainButton>

      <MainButton
        onClick={callGenPrime}
        bgColor="#3b82f6" // blue-500
        hoverColor="#2563eb"
      >
        📦 生成素数
      </MainButton>

      <MainButton
        onClick={callShowPrime}
        bgColor="#6366f1" // indigo-500
        hoverColor="#4f46e5"
      >
        🔢 查看当前素数
      </MainButton>

      <MainButton
        onClick={callDKG}
        bgColor="#f59e0b" // yellow-500
        hoverColor="#d97706"
      >
        🚀 生成 PK
      </MainButton>

      <MainButton
        onClick={callShowPK}
        bgColor="#2dd4bf" // teal-400
        hoverColor="#14b8a6"
      >
        🔑 查看 PK
      </MainButton>

      <MainButton
        onClick={cleanParams}
        bgColor="#ef4444" // red-500
        hoverColor="#b91c1c"
      >
        🗑 清除所有参数
      </MainButton>

      <MainButton
        onClick={() => router.back()}
        bgColor="#9ca3af" // gray-400
        hoverColor="#6b7280"
      >
        🔙 返回上一级
      </MainButton>

      {skList.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>当前上传的 blind_sk 列表：</h3>
          <ul>
            {skList.map((sk, idx) => (
              <li key={idx} style={{ wordBreak: "break-all" }}>
                {sk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 二维码弹窗 */}
      {showModal && qrData && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <button
              style={closeButtonStyle}
              onClick={() => setShowModal(false)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow =
                  "0 10px 25px rgba(0, 0, 0, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow =
                  "0 8px 20px rgba(0, 0, 0, 0.15)";
              }}
            >
              ❌
            </button>
            <h3>QR Code</h3>
            <QRCodeSVG value={qrData} size={256} />
            <p style={{ wordBreak: "break-all", maxWidth: 400 }}>{qrData}</p>
          </div>
        </div>
      )}

      {/* 扫码弹窗 */}
      {showScanner && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <button
              style={closeButtonStyle}
              onClick={() => setShowScanner(false)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow =
                  "0 10px 25px rgba(0, 0, 0, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow =
                  "0 8px 20px rgba(0, 0, 0, 0.15)";
              }}
            >
              ❌
            </button>
            <h3>扫码</h3>
            <div style={{ width: 280, height: 280 }}>
              <QrScanner
                onResult={(text) => {
                  setScannedText(text);
                  setShowScanner(false);
                  sendBlindSK(text);
                }}
                onError={(err) => console.error("扫码错误:", err)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 按钮样式封装，增加 hover 效果和动画
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

// 弹窗蒙版样式，增加模糊背景
const modalOverlayStyle: React.CSSProperties = {
  position: "fixed" as const,
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.4)",
  backdropFilter: "blur(5px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1100,
};

// 弹窗主体样式，圆角、阴影和内边距更柔和
const modalStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  borderRadius: 16,
  boxShadow: "0 15px 40px rgba(0, 0, 0, 0.3)",
  padding: "32px 36px",
  maxWidth: 400,
  width: "90vw",
  maxHeight: "85vh",
  overflowY: "auto",
  textAlign: "center" as const,
  position: "relative" as const,
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  gap: 24,
  color: "#000", // 这里加上字体颜色为黑色
};

const closeButtonStyle: React.CSSProperties = {
  position: "absolute" as const,
  top: 14,
  right: 14,
  background: "transparent",
  border: "none",
  fontSize: 26,
  fontWeight: "bold" as const,
  color: "#999",
  cursor: "pointer",
  transition: "color 0.3s ease, transform 0.3s ease",
  userSelect: "none",
};

export default DKGPage;

type BtnProps = {
  onClick: () => void;
  children: React.ReactNode;
  bgColor: string;
  hoverColor: string;
};

export function MainButton({
  onClick,
  children,
  bgColor,
  hoverColor,
}: BtnProps) {
  const [hover, setHover] = useState(false);

  const style = {
    ...mainButtonStyle(bgColor, hoverColor),
    transform: hover ? "scale(1.05)" : "scale(1)",
    boxShadow: hover
      ? "0 10px 25px rgba(0, 0, 0, 0.2)"
      : "0 8px 20px rgba(0, 0, 0, 0.15)",
    transition: "all 0.2s ease",
    cursor: "pointer",
  };

  return (
    <button
      onClick={onClick}
      style={style}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </button>
  );
}
