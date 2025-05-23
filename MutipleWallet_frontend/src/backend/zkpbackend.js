const express = require("express");
const multer = require("multer");
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express(); // 初始化 Express 应用
//只允许 3000 跨源访问
app.use(
  cors({
    origin: "http://localhost:3000",
  }),
);

// 确保上传目录存在
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const sealPath = path.resolve(__dirname, "ZKbin/seal.bin");

const upload = multer({ dest: "uploads/" }); // 所有文件存 uploads 目录

app.post("/api/zkverify", upload.single("sigfile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const uploadedPath = req.file.path; // uploads/xxxxxx
    const binaryPath = path.resolve(__dirname, "zkGen");

    // 调用 ZK 程序
    const result = spawnSync(binaryPath, ["--sig", uploadedPath]);

    // 删除临时文件
    try {
      fs.unlinkSync(uploadedPath);
    } catch (err) {
      console.error("❗删除文件失败:", err);
    }

    // 判断执行是否成功
    if (result.error || result.status !== 0) {
      return res.status(500).json({
        error: "ZK 生成失败",
        details: result.stderr?.toString() || result.error?.message,
      });
    }

    // 成功返回
    return res.json({ status: "success" });
  } catch (err) {
    console.error("服务错误:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});


app.get("/api/download-seal", (req, res) => {
  if (!fs.existsSync(sealPath)) {
    return res
      .status(404)
      .json({ status: "error", msg: "Seal file not found" });
  }

  res.download(sealPath, "seal.bin", (err) => {
    if (err) {
      console.error("Error sending seal file:", err);
      res.status(500).send("Failed to download seal file.");
    }
  });
});

app.listen(3002, () => {
  console.log("ZK server running on port 3002");
});
