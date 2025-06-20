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
  const [showShardModal, setShowShardModal] = useState(false);

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
        setShowShardModal(true); // 打开弹窗
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64 }}>
        <Card title="Shard 操作" bgColor="rgb(255, 255, 255)">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 42,
              alignItems: "center",
            }}
          >
            <CompositeButton
              onClick={() => setShowScanner(true)}
              bgColor=" #10b981"
              hoverColor=" #059669"
              leftContent="扫码获取 Shard"
              rightContent="📷"
            />
            <CompositeButton
              onClick={fetchShardList}
              bgColor=" #8b5cf6"
              hoverColor=" #7c3aed"
              leftContent="查看已上传的 Shard"
              rightContent="📋"
            />
          </div>
        </Card>

        <Card title="交易相关" bgColor="rgb(255, 255, 255)">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 42,
              alignItems: "center",
            }}
          >
            <CompositeButton
              onClick={() => setsubmitTransaction(true)}
              bgColor=" #3b82f6"
              hoverColor=" #2563eb"
              leftContent="提交 Transaction"
              rightContent="📩"
            />
            <CompositeButton
              onClick={callShowTransaction}
              bgColor=" #6366f1"
              hoverColor=" #4f46e5"
              leftContent="读取待签交易"
              rightContent="🔢"
            />
          </div>
        </Card>

        <Card title="签名操作" bgColor="rgb(255, 255, 255)">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 42,
              alignItems: "center",
            }}
          >
            <CompositeButton
              onClick={request_sign}
              bgColor=" #f59e0b"
              hoverColor=" #d97706"
              leftContent="生成签名"
              rightContent="🚀"
            />
            <CompositeButton
              onClick={callDownloadSig}
              bgColor=" #38bdf8"
              hoverColor=" #0ea5e9"
              leftContent="下载当前签名"
              rightContent="📑"
            />
          </div>
        </Card>

        <Card title="验证与清理" bgColor="rgb(253, 255, 255)">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 42,
              alignItems: "center",
            }}
          >
            <CompositeButton
              onClick={handleFileSelect}
              bgColor=" #14b8a6"
              hoverColor=" #0d9488"
              leftContent="验证签名"
              rightContent="📁"
            />
            <CompositeButton
              onClick={reset}
              bgColor=" #ef4444"
              hoverColor=" #b91c1c"
              leftContent="清除所有参数"
              rightContent="🗑️"
            />
          </div>
        </Card>
      </div>

      {/* ✅ 新增：返回按钮单独居中、加大间距 */}
      <div
        style={{ marginTop: 120, display: "flex", justifyContent: "center" }}
      >
        <CompositeButton
          onClick={() => router.back()}
          bgColor="#9ca3af"
          hoverColor="#6b7280"
          leftContent="返回上一级"
          rightContent="⬅️"
        />
      </div>

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

      {showShardModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <button
              style={closeButtonStyle}
              onClick={() => setShowShardModal(false)}
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
              {shardList.map((shard, idx) => (
                <li key={idx} style={{ wordBreak: "break-all" }}>
                  <strong>Party:</strong> {shard.party} <br />
                  <strong>PK:</strong> {shard.pk} <br />
                  <strong>Prime:</strong> {shard.prime}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default SignPage;

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
        width: 500, // 或者指定为具体宽度，如 600
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
