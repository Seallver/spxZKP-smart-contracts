"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import QrScanner from "../utils/QrScanner";
import React from "react";

type LagrangeShard = {
  party: number;
  pk: string;
  prime: string;
};

function SignPage() {
  const [qrData, setQrData] = useState<string | null>(null);
  const [scannedText, setScannedText] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitTransaction, setsubmitTransaction] = useState(false);
  const [shardList, setShardList] = useState<LagrangeShard[]>([]);
  const router = useRouter();
  const [transaction, setTransaction] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    if (!transaction.trim()) {
      setMessage("请输入 Transaction 内容");
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/api/setTransaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ Transaction: transaction }),
      });

      const data = await res.json();
      if (data.status === "success") {
        alert("✅ Transaction 设置成功！");
      } else {
        alert("提交交易失败：" + data.msg);
      }
    } catch (err) {
      alert("❌ 网络请求失败");
      console.error(err);
    }
  }

  async function sendLagrangeShard(shard: string) {
    try {
      const shardObj = JSON.parse(shard);

      const res = await fetch("http://localhost:3001/api/scan-lagrange", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // 直接传对象里的字段
        body: JSON.stringify({
          lagrange_shard: shardObj.lagrange_shard,
          party: shardObj.party,
          prime: shardObj.prime,
          pk: shardObj.pk,
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

  async function fetchShardList() {
    try {
      const res = await fetch("http://localhost:3001/api/scan-lagrange");
      const data = await res.json();
      if (data.status === "success") {
        setShardList(data.shard);
      } else {
        setShardList([]);
        alert("获取失败：" + data.msg);
      }
    } catch (err) {
      setShardList([]);
      alert("请求异常");
    }
  }

  async function reset() {
    try {
      const res = await fetch("http://localhost:3001/api/reset");
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

  async function callShowTransaction() {
    try {
      const res = await fetch("http://localhost:3001/api/getTransaction");
      const data = await res.json();

      if (data.status != "success") {
        alert("读取交易失败: 当前未发起交易");
      } else {
        const qrContent = JSON.stringify({ transaction: data.transaction });
        setQrData(qrContent);
        setShowModal(true); // 弹出二维码窗口
      }
    } catch (error) {
      alert("请求异常");
    }
  }

  async function request_sign() {
    try {
      const res = await fetch("http://localhost:3001/api/sign");
      const data = await res.json();
      if (data.status === "success") {
        alert("签名成功");
      } else {
        alert("签名失败：" + data.msg);
      }
    } catch (err) {
      alert("请求异常");
    }
  }

  async function callDownloadSig() {
    const res = await fetch("http://localhost:3001/api/DownloadSig");
    const data = await res.json();
    if (data.status == "error") {
      alert("请求失败：" + data.msg);
    } else {
      window.location.href = "http://localhost:3001/api/DownloadSig";
    }
  }

  function handleFileSelect() {
    const input = document.getElementById("fileInput") as HTMLInputElement;
    input.click();

    input.onchange = async () => {
      if (!input.files || input.files.length === 0) return;

      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const json = JSON.parse(content);

          // 检查字段
          if (!json.pk || !json.Sig || typeof json.mlen !== "number") {
            alert("JSON 文件格式不正确，需包含 pk、Sig 和 mlen");
            return;
          }

          // 发起后端请求
          const res = await fetch("http://localhost:3001/api/vrfySig", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              pk: json.pk,
              sm: json.Sig,
              mlen: json.mlen,
            }),
          });

          const result = await res.json();
          if (result.status === "success") {
            alert("✅ 签名验证成功");
          } else {
            alert("❌ 签名验证失败：" + result.msg);
          }
        } catch (err) {
          alert("文件解析失败，请确保是合法 JSON 文件");
          console.error(err);
        } finally {
          // 清空 input value，避免重复选择同一个文件不触发 onchange
          input.value = "";
        }
      };

      reader.readAsText(file);
    };
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
      <h1 style={{ fontSize: 28, marginBottom: 40 }}>Sign</h1>

      <MyButton
        onClick={() => setShowScanner(true)}
        bgColor=" #10b981" // emerald-500
        hoverColor=" #059669"
      >
        📷 扫码获取 Shard
      </MyButton>

      <MyButton
        onClick={() => setsubmitTransaction(true)}
        bgColor=" #3b82f6" // blue-500
        hoverColor=" #2563eb"
      >
        📩 提交 Transaction
      </MyButton>

      <MyButton
        onClick={callShowTransaction}
        bgColor=" #6366f1" // indigo-500
        hoverColor=" #4f46e5"
      >
        🔢 读取待签交易
      </MyButton>

      <MyButton
        onClick={fetchShardList}
        bgColor=" #8b5cf6" // violet-500
        hoverColor=" #7c3aed"
      >
        📋 查看已上传的 Shard
      </MyButton>

      <MyButton
        onClick={request_sign}
        bgColor=" #f59e0b" // yellow-500
        hoverColor=" #d97706"
      >
        🚀 生成签名
      </MyButton>

      <MyButton
        onClick={callDownloadSig}
        bgColor=" #38bdf8" // sky-400
        hoverColor=" #0ea5e9"
      >
        📑 下载当前签名
      </MyButton>

      <MyButton
        onClick={handleFileSelect}
        bgColor=" #14b8a6" // teal-500
        hoverColor=" #0d9488"
      >
        📁 上传签名 JSON 文件验证
      </MyButton>

      <MyButton
        onClick={reset}
        bgColor=" #ef4444" // red-500
        hoverColor=" #b91c1c"
      >
        🗑 清除所有参数
      </MyButton>

      <MyButton
        onClick={() => router.back()}
        bgColor=" #9ca3af" // gray-400
        hoverColor=" #6b7280"
      >
        🔙 返回上一级
      </MyButton>

      <input
        type="file"
        accept=".json"
        style={{ display: "none" }}
        id="fileInput"
      />

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

      {submitTransaction && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 32,
              borderRadius: 14,
              width: 500,
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <h2 style={{ marginBottom: 20, color: "black" }}>
              请输入 Transaction
            </h2>
            <input
              type="text"
              value={transaction}
              onChange={(e) => setTransaction(e.target.value)}
              style={{
                width: "100%",
                height: 50,
                fontSize: 18,
                padding: "0 16px",
                marginBottom: 20,
                border: "1px solid #ccc",
                borderRadius: 10,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}
            >
              <ModalButton
                onClick={() => setsubmitTransaction(false)}
                bgColor="#ef4444"
                hoverColor="#b91c1c"
              >
                Cancle
              </ModalButton>
              <ModalButton
                onClick={async () => {
                  await handleSubmit();
                  setsubmitTransaction(false);
                }}
                bgColor="#10b981"
                hoverColor="#059669"
              >
                Submit
              </ModalButton>
            </div>
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
                  sendLagrangeShard(text);
                }}
                onError={(err) => console.error("扫码错误:", err)}
              />
            </div>
          </div>
        </div>
      )}

      {shardList.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>当前 Shard：</h3>
          <ul>
            {shardList.map((shard, idx) => (
              <li key={idx} style={{ wordBreak: "break-all" }}>
                <strong>Party:</strong> {shard.party} <br />
                <strong>PK:</strong> {shard.pk} <br />
                <strong>Prime:</strong> {shard.prime}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SignPage;

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

const ModalButtonStyle = (
  startColor: string,
  endColor: string,
): React.CSSProperties => ({
  minWidth: 100,
  height: 40,
  fontSize: 14,
  fontWeight: 500,
  color: "#fff",
  background: `linear-gradient(90deg, ${startColor}, ${endColor})`,
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
  padding: "0 16px",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  userSelect: "none",
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

type ModalButtonProps = {
  onClick: () => void;
  children: React.ReactNode;
  bgColor: string;
  hoverColor: string;
};

function ModalButton({
  onClick,
  children,
  bgColor,
  hoverColor,
}: ModalButtonProps) {
  const [hover, setHover] = React.useState(false);

  return (
    <button
      onClick={onClick}
      style={{
        ...ModalButtonStyle(bgColor, hoverColor),
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
