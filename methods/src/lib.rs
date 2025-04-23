// Copyright 2023 RISC Zero, Inc.
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

//! Generated crate containing the image ID and ELF binary of the build guest.
include!(concat!(env!("OUT_DIR"), "/methods.rs"));

#[cfg(test)]
mod tests {
    use risc0_zkvm::{default_executor, ExecutorEnv};
    use serde::{Deserialize, Serialize};
    use base64::{engine::general_purpose, Engine as _};
    use alloy_sol_types::{SolType,sol};
    use std::fs;

    #[derive(Debug, Serialize, Deserialize)]
    #[allow(non_snake_case)]
    pub struct Sm3Signature {
        mlen: u32,
        pk: String,  // Base64 编码的公钥
        Sig: String, // Base64 编码的签名
    }

    type BoolSol = sol! { bool };

    #[test]
    fn proves_sig_is_valid() {

        let json_str = fs::read_to_string("./../sig.json").unwrap();
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
            .build()
            .unwrap();

        // NOTE: Use the executor to run tests without proving.
        let session_info = default_executor().execute(env, super::SPXVRFY_ELF).unwrap();
        let x: bool = BoolSol::abi_decode(&session_info.journal.bytes, true).unwrap();

        assert_eq!(x, true);
    }

    #[test]
    fn proves_sig_is_not_valid() {
        let json_str = fs::read_to_string("./../sig.json").unwrap();
        let sig_: Sm3Signature = serde_json::from_str(&json_str).unwrap();
        let pk_bytes = general_purpose::STANDARD.decode(&sig_.pk).unwrap();
        let sig_bytes = general_purpose::STANDARD.decode(&sig_.Sig).unwrap();

        let pk = pk_bytes[..].to_vec();
        let mut sm = sig_bytes[..].to_vec();

        sm[3] = 0x33; // 修改签名的第一个字节

        let mut pk_sm = Vec::new();
        pk_sm.extend_from_slice(&pk);
        pk_sm.extend_from_slice(&sm);



        let send = <sol! { bytes }>::abi_encode(&pk_sm);

        let env = ExecutorEnv::builder()
            .write_slice(&send)
            .build()
            .unwrap();

        // NOTE: Use the executor to run tests without proving.
        let session_info = default_executor().execute(env, super::SPXVRFY_ELF).unwrap();
        let x: bool = BoolSol::abi_decode(&session_info.journal.bytes, true).unwrap();

        //这里要注意，修改签名后，验证结果应该是false
        assert_eq!(x, false);
    }

    #[test]
    fn proves_pk_is_not_true() {
        let json_str = fs::read_to_string("./../sig.json").unwrap();
        let sig_: Sm3Signature = serde_json::from_str(&json_str).unwrap();
        let pk_bytes = general_purpose::STANDARD.decode(&sig_.pk).unwrap();
        let sig_bytes = general_purpose::STANDARD.decode(&sig_.Sig).unwrap();

        let mut pk = pk_bytes[..].to_vec();
        let sm = sig_bytes[..].to_vec();

        pk[3] = 0x33; // 修改签名的第一个字节

        let mut pk_sm = Vec::new();
        pk_sm.extend_from_slice(&pk);
        pk_sm.extend_from_slice(&sm);



        let send = <sol! { bytes }>::abi_encode(&pk_sm);

        let env = ExecutorEnv::builder()
            .write_slice(&send)
            .build()
            .unwrap();

        // NOTE: Use the executor to run tests without proving.
        let session_info = default_executor().execute(env, super::SPXVRFY_ELF).unwrap();
        let x: bool = BoolSol::abi_decode(&session_info.journal.bytes, true).unwrap();

        //这里要注意，修改签名后，验证结果应该是false
        assert_eq!(x, false);
    }


}
