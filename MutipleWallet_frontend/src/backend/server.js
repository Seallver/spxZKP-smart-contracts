const express = require("express");
const ffi = require("ffi-napi");
const ref = require("ref-napi");
const path = require("path");
const fs = require("fs");
const StructType = require("ref-struct-di")(ref);

const app = express();
app.use(express.json());
const cors = require("cors");
//只允许 3000 跨源访问
app.use(
  cors({
    origin: "http://localhost:3000",
  }),
);

counter = 0;

// 定义 Bsk 结构体
const Bsk = StructType({
  blind_sk: "string",
});

//定义 Lagrange 结构体
const Shard = StructType({
  x: "int",
  y: "string",
});

// 定义类型
const BskPtr = ref.refType(Bsk);

// 加载动态库
const libPath = path.join(__dirname, "libspx"); // 拼接成绝对路径
const libspx = ffi.Library(libPath, {
  DKGAPI: ["void", [BskPtr, "int", "string", "char *"]],
  GenPrimeAPI: ["void", ["char *"]],
  signAPI: [
    "int",
    [
      "pointer", // m
      "int", // mlen
      "int", // t
      "pointer", // shards*
      "string", // prime
      "pointer", // out_sm
      "pointer",
      "string", // pk
      "pointer", // out_pk
      "pointer", // out_pk_len
    ],
  ],
  vrfySigAPI: [
    "int",
    [
      "int", // mlen
      "pointer", // sig
      "pointer", // pk
    ],
  ],
});

//全局变量
let collectedBsk = [];
let dkgprime = "";
let pkStr = "";

let CollectedLagrange = [];
let sign_prime = "";
let transaction = "";
let sign_pk = "";
let signature = "";

app.post("/api/scan-result", (req, res) => {
  console.log("收到bsk:", req.body);
  const scannedData = req.body;

  if (scannedData && scannedData.blind_sk) {
    collectedBsk.push(scannedData.blind_sk);
    return res.json({ status: "success", total: collectedBsk.length });
  } else {
    return res
      .status(400)
      .json({ status: "error", msg: "格式错误或缺少 blind_sk" });
  }
});

app.get("/api/scan-result", (req, res) => {
  if (collectedBsk.length == 0) {
    return res.json({ status: "error", msg: "无 BSK" });
  }
  return res.json({ status: "success", bsk: collectedBsk });
});

app.get("/api/dkg", (req, res) => {
  const n = collectedBsk.length;
  if (n === 0) {
    return res.status(400).json({ status: "error", msg: "尚未收集到任何 BSK" });
  }

  if (dkgprime == "") {
    return res.status(400).json({ status: "error", msg: "尚未生成 Prime" });
  }

  const bskBuf = Buffer.alloc(Bsk.size * n);
  for (let i = 0; i < n; i++) {
    const bskStruct = new Bsk({ blind_sk: collectedBsk[i] });
    bskStruct.ref().copy(bskBuf, i * Bsk.size);
  }

  const outPkBuf = Buffer.alloc(128);
  libspx.DKGAPI(bskBuf, n, dkgprime, outPkBuf);
  pkStr = ref.readCString(outPkBuf, 0);

  res.json({ status: "success", publicKey: pkStr });
});

app.get("/api/clean", (req, res) => {
  collectedBsk = [];
  dkgprime = "";
  pkStr = "";
  return res.json({ status: "success" });
});

app.get("/api/genPrime", (req, res) => {
  const primeBuf = Buffer.alloc(256);

  libspx.GenPrimeAPI(primeBuf);

  dkgprime = ref.readCString(primeBuf, 0);

  res.json({ status: "success", prime: dkgprime });
});

app.get("/api/ShowPrime", (req, res) => {
  if (dkgprime != "") {
    res.json({ status: "success", prime: dkgprime });
  } else {
    res.json({ status: "prime null" });
  }
});

app.get("/api/ShowPK", (req, res) => {
  if (pkStr != "") {
    res.json({ status: "success", pk: pkStr });
  } else {
    res.json({ status: "pk null" });
  }
});

app.post("/api/scan-lagrange", (req, res) => {
  console.log("收到授权:", req.body);
  const { lagrange_shard, party, prime, pk } = req.body;

  if (lagrange_shard && party && prime && pk) {
    if (sign_prime == "") {
      sign_prime = prime;
    } else if (sign_prime != prime) {
      return res.status(400).json({
        status: "error",
        msg: "存在不同 Prime 的签名授权 ",
      });
    }
    if (sign_pk == "") {
      sign_pk = pk;
    } else if (sign_pk != pk) {
      return res.status(400).json({
        status: "error",
        msg: "存在不同 PK 的签名授权 ",
      });
    }

    CollectedLagrange.push({ lagrange_shard, party, prime, pk });
    return res.json({ status: "success", total: CollectedLagrange.length });
  } else {
    return res.status(400).json({
      status: "error",
      msg: "缺少字段，必须包含 lagrange_shard, party, 和 prime",
    });
  }
});

app.get("/api/scan-lagrange", (req, res) => {
  if (CollectedLagrange.length === 0) {
    return res.json({ status: "error", msg: "无授权分片" });
  }

  const publicContent = CollectedLagrange.map(({ party, prime, pk }) => ({
    party,
    prime,
    pk,
  }));
  return res.json({ status: "success", shard: publicContent });
});

app.post("/api/setTransaction", (req, res) => {
  console.log("发起交易:", req.body);
  const { Transaction } = req.body;
  if (Transaction) {
    transaction = Transaction;
    return res.json({ status: "success" });
  } else {
    return res.status(400).json({
      status: "error",
      msg: "缺少字段，必须包含 Transaction",
    });
  }
});

app.get("/api/getTransaction", (req, res) => {
  if (transaction == "") {
    return res.json({ status: "error", msg: "未设置Transaction" });
  } else {
    return res.json({ status: "success", transaction: transaction });
  }
});

app.get("/api/reset", (req, res) => {
  CollectedLagrange = [];
  sign_prime = "";
  transaction = "";
  sign_pk = "";
  signature = "";
  return res.json({ status: "success" });
});

app.get("/api/sign", (req, res) => {
  const t = CollectedLagrange.length;
  if (t === 0) {
    return res
      .status(400)
      .json({ status: "error", msg: "尚未收集到任何授权分片" });
  }

  if (transaction == "") {
    return res.status(400).json({ status: "error", msg: "未确认交易信息" });
  }

  const mBuffer = Buffer.from(transaction);
  const mlen = mBuffer.length;
  const outLenPtr = ref.alloc("int");
  const outPkLenPtr = ref.alloc("int");

  const shardList = CollectedLagrange.map((item) => {
    return new Shard({
      x: item.party,
      y: item.lagrange_shard,
    });
  });

  const shardBuffer = Buffer.alloc(Shard.size * t);
  for (let i = 0; i < t; i++) {
    shardList[i].ref().copy(shardBuffer, i * Shard.size);
  }

  const outSmBuf = Buffer.alloc(12800); // 签名输出
  const outPkBuf = Buffer.alloc(64); // 公钥输出（64字节）

  const ret = libspx.signAPI(
    mBuffer,
    mlen,
    t,
    shardBuffer,
    sign_prime,
    outSmBuf,
    outLenPtr,
    sign_pk, // 输入的十进制公钥字符串
    outPkBuf, // 输出的公钥字节数组
    outPkLenPtr,
  );

  switch (ret) {
    case 0:
      console.log("签名成功");
      break;
    case -1:
      console.log("convert pk error");
      return res
        .status(400)
        .json({ status: "error", msg: "Failed to convert pk" });
    case -2:
      console.log("convert seed error");
      return res
        .status(400)
        .json({ status: "error", msg: "Failed to convert seed" });
    case -3:
      console.log("gen key error");
      return res
        .status(400)
        .json({ status: "error", msg: "Failed to gen key" });
    case -4:
      console.log("pk error");
      return res.status(400).json({ status: "error", msg: "pk not match!" });
  }

  const sigLen = outLenPtr.deref();
  signature = outSmBuf.subarray(0, sigLen);
  const pkLen = outPkLenPtr.deref();
  const pkBuf = outPkBuf.subarray(0, pkLen); // 截取有效 pk 数据（假设 SPX_PK_BYTES 为 64）

  // 保存 JSON 文件
  const sigJson = {
    mlen: mlen,
    pk: pkBuf.toString("base64"), // ✅ 使用 base64 格式保存公钥（字节形式）
    Sig: signature.toString("base64"), // ✅ 签名结果
  };

  fs.writeFileSync(
    `../../database/signature_result_${counter}.json`,
    JSON.stringify(sigJson, null, 2),
  );
  counter++;

  res.json({
    status: "success",
    msg: `已保存为 signature_result_${counter - 1}.json`,
  });
});

app.get("/api/DownloadSig", (req, res) => {
  const filePath = `../../database/signature_result_${counter - 1}.json`;
  if (fs.existsSync(filePath)) {
    res.download(filePath, `signature_result_${counter - 1}.json`); // 第二个参数是下载时显示的文件名
  } else {
    res.status(404).json({ status: "error", msg: "签名文件不存在" });
  }
});

app.post("/api/vrfySig", (req, res) => {
  const { mlen, pk, sm } = req.body;

  if (pk && sm) {
    const pkBuffer = Buffer.from(pk, "base64");
    const smBuffer = Buffer.from(sm, "base64");

    const result = libspx.vrfySigAPI(mlen, smBuffer, pkBuffer);
    console.log("签名验证成功");
    if (result == 0) {
      console.log("签名验证成功");
      return res.json({ status: "success", msg: "签名验证成功" });
    } else {
      console.log("签名验证失败");
      return res.status(400).json({ status: "error", msg: "签名验证失败" });
    }
  } else {
    return res.status(400).json({
      status: "error",
      msg: "缺少字段，必须包含 pk 和 Sig 和 mlen",
    });
  }
});

app.listen(3001, () => {
  console.log("Server running on port 3001");
});
