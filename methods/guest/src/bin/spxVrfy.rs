use alloy_primitives::FixedBytes;
use risc0_zkvm::guest::env;
use spx_sm3::*;
use std::io::Read;
use alloy_sol_types::{SolType,sol};

pub const CRYPTO_MESSAGE_BYTES: usize = 11;
type BoolSol = sol! { bool };

fn main() {
    let mut input_bytes = Vec::<u8>::new();
    env::stdin().read_to_end(&mut input_bytes).unwrap();

    // 解析 abi.encode(bytes) 编码的内容
    let received = <sol! { bytes }>::abi_decode(&input_bytes, true).unwrap();

    let pk_bytes: Vec<u8> = received[..CRYPTO_PUBLICKEYBYTES].to_vec();
    let sm_bytes: Vec<u8> = received[CRYPTO_PUBLICKEYBYTES..].to_vec();

    let sig: FixedBytes<CRYPTO_BYTES> = sm_bytes[..CRYPTO_BYTES]
        .try_into()
        .expect("Signature length mismatch");
    
    let msg: FixedBytes<CRYPTO_MESSAGE_BYTES> = sm_bytes[CRYPTO_BYTES..]
        .try_into()
        .expect("Message length mismatch");
    
    let public: FixedBytes<CRYPTO_PUBLICKEYBYTES> = pk_bytes[..]
        .try_into()
        .expect("Public key length mismatch");

    let result = vrfy(sig.as_slice(), msg.as_slice(), public.as_slice());

    let res = BoolSol::abi_encode(&result.is_ok());
    env::commit_slice(res.as_slice());

    // for dev test
    // let res = BoolSol::abi_encode(&true);
    // env::commit_slice(res.as_slice());
}
