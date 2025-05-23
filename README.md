# SPX 验证算法的 ZKP 生成及其在智能合约上的应用

## 项目概述

本项目整合了 [SPX-TSS](https://github.com/Seallver/SphincsplusSM3-TSS) 和 [SPX-ZKP](https://github.com/Seallver/spxZKP) 两个核心组件，基于 [RISC Zero zkVM](https://github.com/risc0/risc0-foundry-template) 框架，构建了一套完整的 SPX 签名验证零知识证明方案，并实现了智能合约端的链上验证功能。

## 核心组件

| 组件 | 功能描述 | 项目链接 |
|------|----------|----------|
| **SPX-TSS** | 基于 SM3 的 SPHINCS+ 门限签名方案实现 | [GitHub](https://github.com/Seallver/SphincsplusSM3-TSS) |
| **SPX-ZKP** | SPX 签名验证的零知识证明电路实现 | [GitHub](https://github.com/Seallver/spxZKP) |
| **RISC Zero zkVM** | 零知识证明虚拟机执行环境 | [GitHub](https://github.com/risc0/risc0-foundry-template) |

## 技术亮点

- **后量子安全**：基于 SPHINCS+ 签名方案，抵抗量子计算攻击
- **零知识验证**：将复杂的签名验证计算转移到链下 zkVM 执行
- **高效链上验证**：智能合约仅需验证简洁的零知识证明

## 使用示例

接下来是对项目构建和测试以及测试网下合约部署的使用示例，详细
使用方法可以参考RISC-Zero的使用说明：[项目介绍](./RISC%20Zero%20Foundry%20Template.md)、[合约部署](./deployment-guide.md)

### 1. 项目构建
```bash
git clone https://github.com/Seallver/spxZKP-smart-contracts.git
cd spxZKP-smart-contracts
cargo build
forge build
```

### 2. 链下测试
```bash
cargo test
```

### 3. dev模式下合约测试
此模式下的测试不会真正生成ZKP，来节约测试时间
```bash
RISC0_DEV_MODE=true forge test -vvv
```

### 4. 生产模式下合约测试
在生产模式下ZKP的生成需要依赖Bonsai或Docker

Bonsai需要申请API key，详细测试方法见[原框架的README](./RISC%20Zero%20Foundry%20Template.md)
```bash
RISC0_DEV_MODE=false forge test -vvv
```

### 5. 本地测试网anvil下合约部署

#### 先启用一个终端开启测试网anvil
```bash
anvil
```
从中能获取测试网下的一组account，以及RPC和链ID等信息

#### 切换另一个终端进行如下操作：

选择一个account，设置钱包私钥
```bash
export ETH_WALLET_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
# 以第一个account为例
```
构建项目
```bash
cargo build
```
部署合约到链上
```bash
forge script --rpc-url http://localhost:8545 --broadcast script/Deploy.s.sol
```
得到合约部署的地址后执行
```bash
export SPX_VRFY_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 #COPY SpxVrfy ADDRESS FROM DEPLOY LOGS
```
#### 与合约交互
call isValidZKProof，检查验证初始状态
```bash
cast call --rpc-url http://localhost:8545 ${SPX_VRFY_ADDRESS:?} 'get()(bool)'
```

接下来生成ZKP并上传，在合约上会对ZKP验证，若通过会更新状态
```bash
cargo run --bin publisher -- \
    --chain-id=31337 \
    --rpc-url=http://localhost:8545 \
    --contract=${SPX_VRFY_ADDRESS:?} \
    --sig=./sig.json
```

再次检查验证状态，若ZKP验证通过，这里会显示true
```bash
cast call --rpc-url http://localhost:8545 ${SPX_VRFY_ADDRESS:?} 'get()(bool)'
```

### 6. 注意事项

- 本项目只针对 f128 参数集和 simple 结构下的基于 SM3 的 SPX 签名进行了实现
- 测试和合约部署均需要签名和公钥，在项目里提供了一组[sig.json](./sig.json)，可以在[SPX TSS](https://github.com/Seallver/SphincsplusSM3-TSS)里生成
- 测试均需要准备docker或者Bonsai api


# 与 spxt-cold-wallet 项目结合应用

这里给出在anvil上的测试

### 1. 把 zkGen 编译成 Rust CLI，提供接口给后端
```bash
cargo build --release

cp ./target/release/zkGen ./MutipleWallet_frontend/src/backend/
```

### 2. 开启测试网 anvil，详见使用示例

### 3. 开启前后端服务作为冷钱包的聚合服务器
```bash 
cd MutipleWallet_frontend/ZKVM

npm run dev #开启前端服务

node src/backend/server.js #开启后端服务
```

