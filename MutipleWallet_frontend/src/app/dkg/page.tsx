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
  const [skList, setSkList] = useState([]);
  const [showSkModal, setShowSkModal] = useState(false);
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
        setShowSkModal(true); // 打开弹窗
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64 }}>
        <Card title="Blind SK 操作" bgColor="rgb(255, 255, 255)">
          <div style={{ display: "flex", flexDirection: "column", gap: 42 }}>
            <CompositeButton
              onClick={() => setShowScanner(true)}
              bgColor=" #10b981"
              hoverColor=" #059669"
              leftContent="扫码获取 BSK"
              rightContent="📷"
            />
            <CompositeButton
              onClick={fetchSkList}
              bgColor=" #8b5cf6"
              hoverColor=" #7c3aed"
              leftContent="查看已上传的 BSK"
              rightContent="🔍"
            />
          </div>
        </Card>

        <Card title="素数生成" bgColor="rgb(255, 255, 255)">
          <div style={{ display: "flex", flexDirection: "column", gap: 42 }}>
            <CompositeButton
              onClick={callGenPrime}
              bgColor=" #3b82f6"
              hoverColor=" #2563eb"
              leftContent="生成素数"
              rightContent="➕"
            />
            <CompositeButton
              onClick={callShowPrime}
              bgColor="#6366f1"
              hoverColor="#4f46e5"
              leftContent="查看当前素数"
              rightContent="🔍"
            />
          </div>
        </Card>

        <Card title="生成与查看 PK" bgColor="rgb(255, 255, 255)">
          <div style={{ display: "flex", flexDirection: "column", gap: 42 }}>
            <CompositeButton
              onClick={callDKG}
              bgColor=" #f59e0b"
              hoverColor=" #d97706"
              leftContent="生成 PK"
              rightContent="🚀"
            />
            <CompositeButton
              onClick={callShowPK}
              bgColor=" #2dd4bf"
              hoverColor=" #14b8a6"
              leftContent="查看 PK"
              rightContent="🔑"
            />
          </div>
        </Card>

        <Card title="清理" bgColor="rgb(253, 255, 255)">
          <div style={{ display: "flex", flexDirection: "column", gap: 42 }}>
            <CompositeButton
              onClick={cleanParams}
              bgColor=" #ef4444"
              hoverColor=" #b91c1c"
              leftContent="清除所有参数"
              rightContent="🗑️"
            />
          </div>
        </Card>
      </div>
      {/* ✅ 新增：按钮容器，放在 grid 外部 */}
      <div
        style={{ marginTop: 120, display: "flex", justifyContent: "center" }}
      >
        <CompositeButton
          onClick={() => router.back()}
          bgColor=" #9ca3af"
          hoverColor=" #6b7280"
          leftContent="返回上一级"
          rightContent="⬅️"
        />
      </div>

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

      {showSkModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <button
              style={closeButtonStyle}
              onClick={() => setShowSkModal(false)}
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
            <h3>当前上传的 blind_sk 列表：</h3>
            <ul
              style={{
                maxHeight: "300px",
                overflowY: "auto",
                textAlign: "left",
                paddingLeft: 20,
              }}
            >
              {skList.map((sk, idx) => (
                <li
                  key={idx}
                  style={{ wordBreak: "break-all", marginBottom: 8 }}
                >
                  {sk}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

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

type CardProps = {
  title: string;
  children: React.ReactNode;
  bgColor?: string; // 可选参数，默认背景色
};

function Card({ title, children, bgColor = " #fff" }: CardProps) {
  return (
    <div
      style={{
        backgroundColor: bgColor,
        padding: "10px 32px 32px 32px", // 增加内边距
        borderRadius: 16, // 圆角更大
        boxShadow: "0 6px 20px rgba(0,0,0,0.12)", // 更明显的阴影
        display: "flex",
        flexDirection: "column",
        gap: 32, // 元素间距更大
        width: "90%", // 或者指定为具体宽度，如 600
        maxWidth: 900, // 设置最大宽度
        margin: "0 auto", // 居中
      }}
    >
      <h2
        style={{
          fontSize: 20,
          fontWeight: "bold",
          marginBottom: 8,
          color: " rgb(0, 0, 0)",
        }}
      >
        {title}
      </h2>
      {children}
      <div style={{ marginBottom: 2 }} /> {/* 按钮组外层增加底部间距 */}
    </div>
  );
}

type CompositeButtonProps = {
  onClick: () => void;
  leftContent: React.ReactNode; // 左侧文字+emoji
  rightContent: React.ReactNode; // 右侧白色图标块
  bgColor: string;
  hoverColor: string;
};

export function CompositeButton({
  onClick,
  leftContent,
  rightContent,
  bgColor,
  hoverColor,
}: CompositeButtonProps) {
  const [hover, setHover] = useState(false);

  const buttonStyle: React.CSSProperties = {
    display: "flex",
    width: 500,
    height: 60,
    borderRadius: 14,
    overflow: "hidden", // 保证右边块圆角不突出
    background: `linear-gradient(90deg, ${bgColor}, ${hoverColor})`,
    boxShadow: hover
      ? "0 12px 35px rgba(0, 0, 0, 0.3)"
      : "0 10px 30px rgba(0, 0, 0, 0.2)",
    transform: hover ? "scale(1.05)" : "scale(1)",
    transition: "all 0.2s ease",
    cursor: "pointer",
    userSelect: "none",
  };

  const leftStyle: React.CSSProperties = {
    flex: 7,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: 20,
    fontWeight: 600,
  };

  const rightStyle: React.CSSProperties = {
    flex: 3,
    backgroundColor: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
  };

  return (
    <div
      style={buttonStyle}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={leftStyle}>{leftContent}</div>
      <div style={rightStyle}>{rightContent}</div>
    </div>
  );
}
