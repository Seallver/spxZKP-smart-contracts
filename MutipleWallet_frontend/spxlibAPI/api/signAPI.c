#include "params-sphincs-SM3-128s.h"
#include "params.h"
#include <openssl/bn.h>
#include <stdlib.h>
#include <string.h>
#include "TSS_api.h"

typedef struct {
    int x;
    const char* y;
} shards;


typedef struct {
    int x;
    BIGNUM* y;
} Share;

//拉格朗日插值法计算私钥
BIGNUM* lagrange_interpolate_at_zero(const Share* shares, int t, BIGNUM* Prime, BN_CTX* ctx) {
    BIGNUM* result = BN_new();
    BN_zero(result);

    BIGNUM *zero = BN_new();
    BN_zero(zero);
    BIGNUM *num = BN_new(), *den = BN_new();
    BIGNUM *tmp = BN_new(), *inv = BN_new();

    for (int i = 0; i < t; i++) {
        BN_one(num);
        BN_one(den);

        for (int j = 0; j < t; j++) {
            if (i == j) continue;

            // num *= -xj
            BN_set_word(tmp, shares[j].x);
            BN_mod_sub(tmp, zero, tmp, Prime, ctx);  // -xj mod p
            BN_mod_mul(num, num, tmp, Prime, ctx);

            // den *= (xi - xj)
            BN_set_word(tmp, shares[i].x - shares[j].x);
            BN_mod_mul(den, den, tmp, Prime, ctx);
        }

        // inv = den⁻¹ mod p
        BN_mod_inverse(inv, den, Prime, ctx);
        BN_mod_mul(tmp, num, inv, Prime, ctx);  // li(0)

        BN_mod_mul(tmp, tmp, shares[i].y, Prime, ctx);  // li(0) * yi
        BN_mod_add(result, result, tmp, Prime, ctx);
    }

    BN_free(zero);
    BN_free(num);
    BN_free(den);
    BN_free(tmp);
    BN_free(inv);
    
    return result;
}

int signAPI(const unsigned char *m, const int mlen, int t, shards *shard,
             char* prime, unsigned char*out_sm, int*sm_len, const char* input_pk,unsigned char* output_pk, int* out_pklen)
    {

    BIGNUM *Prime = BN_new();
    BN_dec2bn(&Prime, prime);
  
    Share *shares = malloc(sizeof(Share)* t);
    for (int i = 0; i < t; i++) {
      shares[i].x = shard[i].x;
      shares[i].y = BN_new();
      BN_dec2bn(&shares[i].y, shard[i].y);
    }

    BIGNUM *pk_bn = BN_new();
    BN_dec2bn(&pk_bn, input_pk);
    unsigned char *pk_bytes = (unsigned char *)malloc(BN_num_bytes(pk_bn));
    int pk_len = BN_bn2bin(pk_bn, pk_bytes);
    if (pk_len <= 0) {
        fprintf(stderr, "Error: Failed to convert pk\n");
        return -1;
    }

    BN_CTX* ctx = BN_CTX_new();
    BIGNUM* Seed = lagrange_interpolate_at_zero(shares, t, Prime ,ctx);
    unsigned char* seed = (unsigned char*)malloc(BN_num_bytes(Seed));
    int len = BN_bn2bin(Seed, seed);
    if (len <= 0) {
        fprintf(stderr, "Error: Failed to convert seed\n");
        return -2;
    }

    unsigned char pk[SPX_PK_BYTES];
    unsigned char sk[SPX_SK_BYTES];
    if (tss_crypto_sign_keypair(pk, sk, seed)) {
        fprintf(stderr, "Error: Failed to gen key\n");
        return -3;
    }
    unsigned char *sm = malloc(SPX_BYTES + mlen);

    // if(memcmp(pk, pk_bytes, SPX_PK_BYTES) != 0) {
    //     fprintf(stderr, "Error: pk not match!\n");
    //     return -4;
    // }

    memcpy(output_pk, pk, SPX_PK_BYTES);
    *out_pklen = SPX_PK_BYTES;

    unsigned long long smlen;
    crypto_sign(sm, &smlen, m, mlen, sk);

    memcpy(out_sm, sm, SPX_BYTES + mlen);
    *sm_len = SPX_BYTES + mlen;

    for (int i = 0; i < t; i++) {
        BN_free(shares[i].y);
    }
    free(shares);

    OPENSSL_cleanse(seed, BN_num_bytes(Seed));

    free(seed);
    free(sm);

    BN_free(Seed);
    BN_free(Prime);


    BN_CTX_free(ctx);

    return 0;
}

int vrfySigAPI(int mlen, unsigned char* sm, unsigned char* pk) {
    int spx_bytes = (SPX_N + SPX_FORS_BYTES + SPX_D * SPX_WOTS_BYTES + \
        SPX_D * SPX_TREE_HEIGHT * SPX_N);

    //验证签名
    if (tss_crypto_sign_verify(sm, spx_bytes, sm + spx_bytes, mlen, pk)) {
        printf("vrfy failed\n");
        return -1;
    }
    printf("vrfy success!\n");

    return 0;
}




