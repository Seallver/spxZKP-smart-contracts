#include "params-sphincs-SM3-128s.h"
#include "params.h"
#include <openssl/bn.h>
#include <openssl/types.h>
#include <string.h>
#include "TSS_api.h"

#define MIN_PRIME_BITS 3 * SPX_N * 8

typedef struct {
  const char *blind_sk;
} Bsk;

void recover_secret(BIGNUM* secret, BIGNUM** shares, int shards_len, BIGNUM*prime) {
    BN_CTX* BNctx = BN_CTX_new();
    BIGNUM* tmp = BN_new();
    BN_zero(tmp);
    //累加份额恢复私钥
    for (int i = 0; i < shards_len; i++) {
        BN_mod_add(tmp, tmp, shares[i], prime, BNctx);
    }
    BN_copy(secret, tmp);

    BN_CTX_free(BNctx);
    BN_free(tmp);
}

void GenPrimeAPI(char *p) {
    BIGNUM *P = BN_new();
    // 生成安全素数
    BN_generate_prime_ex(P, MIN_PRIME_BITS, 1, NULL, NULL, NULL);

    char* p_dec = BN_bn2dec(P);
    printf("Gen prime in decimal: %s\n", p_dec);
    strcpy(p, p_dec); 

    // 释放内存
    BN_free(P);
}



void DKGAPI(Bsk *bsk, int n, const char*p, char*out_pk) {
    BIGNUM* total_sk = BN_new();
    BIGNUM** shards = (BIGNUM**)malloc(sizeof(BIGNUM*) * n);
    for (int i = 0; i < n; i++) {
      shards[i] = BN_new();
      BN_dec2bn(&shards[i], bsk[i].blind_sk);
    }

    BIGNUM *prime = BN_new();
    BN_dec2bn(&prime, p);
    recover_secret(total_sk, shards, n, prime);
    

    unsigned char* seed = (unsigned char*)malloc(BN_num_bytes(total_sk));
    int len = BN_bn2bin(total_sk, seed);
    if (len <= 0) {
        fprintf(stderr, "Error: Failed to gen seed\n");
    }

    unsigned char pk[SPX_PK_BYTES];
    unsigned char sk[SPX_SK_BYTES];
    tss_crypto_sign_keypair(pk, sk, seed);

    BIGNUM* seed_bn = BN_bin2bn(seed, len, NULL);
    char* seed_dec = BN_bn2dec(seed_bn);
    // printf("Recover seed in decimal: %s\n", seed_dec);

    OPENSSL_free(seed_dec);
    BN_free(seed_bn);

    BIGNUM* pk_bn = BN_bin2bn(pk, SPX_PK_BYTES, NULL);
    char* pk_dec = BN_bn2dec(pk_bn);
    printf("Gen pk in decimal: %s\n", pk_dec);

    strcpy(out_pk, pk_dec); 

    OPENSSL_free(pk_dec);
    BN_free(pk_bn);

    for (int i = 0; i < n; i++) {
        BN_free(shards[i]);
    }

    free(shards);
    BN_free(total_sk);
    free(seed);
}
