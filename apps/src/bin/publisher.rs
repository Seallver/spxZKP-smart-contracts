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

use alloy::{
    network::EthereumWallet, providers::ProviderBuilder, signers::local::PrivateKeySigner,
    sol_types::SolValue,
};
use alloy_primitives::Address;
use anyhow::{Context, Result};
use clap::Parser;
use methods::SPXVRFY_ELF;
use risc0_ethereum_contracts::encode_seal;
use risc0_zkvm::{default_prover, ExecutorEnv, ProverOpts, VerifierContext};
use url::Url;
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
    /// Ethereum chain ID
    #[clap(long)]
    chain_id: u64,

    /// Ethereum Node endpoint.
    #[clap(long, env)]
    eth_wallet_private_key: PrivateKeySigner,

    /// Ethereum Node endpoint.
    #[clap(long)]
    rpc_url: Url,

    /// Application's contract address on Ethereum
    #[clap(long)]
    contract: Address,

    /// The input to provide to the guest binary
    #[clap(long)]
    sig: String,
}

fn main() -> Result<()> {
    env_logger::init();
    // Parse CLI Arguments: The application starts by parsing command-line arguments provided by the user.
    let args = Args::parse();

    // Create an alloy provider for that private key and URL.
    let wallet = EthereumWallet::from(args.eth_wallet_private_key);
    let provider = ProviderBuilder::new().wallet(wallet).on_http(args.rpc_url);
    
    let json_str = fs::read_to_string(args.sig).unwrap();
    let sig_: Sm3Signature = serde_json::from_str(&json_str).unwrap();
    let pk_bytes = general_purpose::STANDARD.decode(&sig_.pk).unwrap();
    let sig_bytes = general_purpose::STANDARD.decode(&sig_.Sig).unwrap();

    let pk = pk_bytes[..].to_vec();
    let sm = sig_bytes[..].to_vec();

    let mut pk_sm = Vec::new();
    pk_sm.extend_from_slice(&pk);
    pk_sm.extend_from_slice(&sm);

    let send = <sol! { bytes }>::abi_encode(&pk_sm);

    let env = ExecutorEnv::builder()
    .write_slice(&send)
    .build().context("creating executor env")?;

    let receipt = default_prover()
        .prove_with_ctx(
            env,
            &VerifierContext::default(),
            SPXVRFY_ELF,
            &ProverOpts::groth16(),
        )?;

    // // Encode the seal with the selector.
    let seal = encode_seal(&receipt.receipt)?;
    
    println!("Seal size: {} bytes", seal.len());
    println!("Seal size: {:.2} KB", seal.len() as f64 / 1024.0);
    
    // // Extract the journal from the receipt.
    let journal = receipt.receipt.journal.bytes.clone();

    // // Decode Journal: Upon receiving the proof, the application decodes the journal to extract
    // // the verified number. This ensures that the number being submitted to the blockchain matches
    // // the number that was verified off-chain.
    let verified: bool = bool::abi_decode(&journal, true).context("decoding journal")?;
    
    println!("Signature verified: {}", verified);

    // // Construct function call: Using the ISpxVrfy interface, the application constructs
    // // the ABI-encoded function call for the set function of the SpxVrfy contract.
    // // This call includes the verified number, the post-state digest, and the seal (proof).
    let contract = ISpxVrfy::new(args.contract, provider);
    let call_builder = contract.set(seal.into());

    // // Initialize the async runtime environment to handle the transaction sending.
    let runtime = tokio::runtime::Runtime::new()?;

    // // Send transaction: Finally, send the transaction to the Ethereum blockchain,
    // // effectively calling the set function of the SpxVrfy contract with the verified number and proof.
    let pending_tx = runtime.block_on(call_builder.send())?;
    runtime.block_on(pending_tx.get_receipt())?;

    Ok(())
}
