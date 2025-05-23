// Copyright 2024 RISC Zero, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// This application demonstrates how to send an off-chain proof request
// to the Bonsai proving service and publish the received proofs directly
// to your deployed app contract.

use anyhow::{Result};
use clap::Parser;
use methods::SPXVRFY_ELF;
use risc0_ethereum_contracts::encode_seal;
use risc0_zkvm::{default_prover, ExecutorEnv, ProverOpts, VerifierContext};
use alloy_sol_types::{SolType,sol};
use std::fs;
use serde::{Deserialize, Serialize};
use base64::{engine::general_purpose, Engine as _};

// `ISpxVrfy` interface automatically generated via the alloy `sol!` macro.
alloy::sol!(
    #[sol(rpc, all_derives)]
    "../contracts/ISpxVrfy.sol"
);

#[derive(Debug, Serialize, Deserialize)]
#[allow(non_snake_case)]
pub struct Sm3Signature {
    mlen: u32,
    pk: String,  // Base64 编码的公钥
    Sig: String, // Base64 编码的签名
}


/// Arguments of the publisher CLI.
#[derive(Parser, Debug)]
#[clap(author, version, about, long_about = None)]
struct Args {
    #[clap(long)]
    sig: String,
}

fn main() -> Result<()> {
    let arg = Args::parse();
    let json_str = fs::read_to_string(arg.sig)?;
    
    let sig_: Sm3Signature = serde_json::from_str(&json_str)?;
    
    let pk_bytes = general_purpose::STANDARD.decode(&sig_.pk)?;
    let sig_bytes = general_purpose::STANDARD.decode(&sig_.Sig)?;

    let mut pk_sm = Vec::new();
    
    pk_sm.extend_from_slice(&pk_bytes);
    pk_sm.extend_from_slice(&sig_bytes);

    let send = <sol! { bytes }>::abi_encode(&pk_sm);

    let env = ExecutorEnv::builder().write_slice(&send).build()?;

    let receipt = default_prover()
        .prove_with_ctx(
            env,
            &VerifierContext::default(),
            SPXVRFY_ELF,
            &ProverOpts::groth16(),
        )?;

    let seal = encode_seal(&receipt.receipt)?; // seal 是 Vec<u8>

    fs::write("ZKbin/seal.bin", &seal)?; // 写入 seal.bin 文件

    Ok(())
}

