use alloy_primitives::FixedBytes;
use risc0_zkvm::guest::env;
use spx_sm3::*;
use std::io::Read;
use alloy_sol_types::{SolType,sol};

type Int32Sol = sol! { int32 };

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut input_bytes = Vec::<u8>::new();
    env::stdin().read_to_end(&mut input_bytes)?;

    let received = <sol! { bytes }>::abi_decode(&input_bytes, true)?;
    
    if received.len() < CRYPTO_PUBLICKEYBYTES + CRYPTO_BYTES {
        return Err("Input length too short".into());
    }

    let pk_bytes: Vec<u8> = received[..CRYPTO_PUBLICKEYBYTES].to_vec();
    let sm_bytes: Vec<u8> = received[CRYPTO_PUBLICKEYBYTES..].to_vec();

    let sig: FixedBytes<CRYPTO_BYTES> = sm_bytes[..CRYPTO_BYTES]
        .try_into()
        .expect("Signature length mismatch");

    let msg = &sm_bytes[CRYPTO_BYTES..];
    
    let public: FixedBytes<CRYPTO_PUBLICKEYBYTES> = pk_bytes[..]
        .try_into()
        .expect("Public key length mismatch");

    let result = vrfy(sig.as_slice(), msg, public.as_slice());

    let success = result.is_ok();

    let mut ret: i32 = -1;
    if success {
        ret = 0;
    }

    let res = Int32Sol::abi_encode(&ret);
    env::commit_slice(res.as_slice());

    // for dev test
    // let res = Int32Sol::abi_encode(&0);
    // env::commit_slice(res.as_slice());

    Ok(())
}
