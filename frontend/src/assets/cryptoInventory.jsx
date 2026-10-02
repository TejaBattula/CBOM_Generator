import React, { useMemo, useState } from "react";
import "../assets/cryptoInventory.css";

/* ==========================================================
   CONSTANTS
========================================================== */

const REGULATORY_TAGS = ["CERT-In", "DPDP", "DST/NQM", "RBI"];



const KB = [
  /* ---------- RSA family ---------- */
  {
    key: "RSA-1024",
    test: /\brsa[-_ ]?1024\b|\brsa1024\b/i,
    category: "Asymmetric",
    usage: ["key_establishment", "digital_signature", "encryption"],
    math: "Integer Factorization",
    classical: "Weak",
    classicalVuln: "Key too small for modern standards",
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "critical",
    replacement: { key_establishment: "ML-KEM", digital_signature: "ML-DSA / SLH-DSA", encryption: "ML-KEM" },
    nist: ["FIPS 203", "FIPS 204", "FIPS 205"],
  },
  {
    key: "RSA-2048",
    test: /\brsa[-_ ]?2048\b|\brsa2048\b/i,
    category: "Asymmetric",
    usage: ["key_establishment", "digital_signature", "encryption"],
    math: "Integer Factorization",
    classical: "Secure (widely used)",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { key_establishment: "ML-KEM", digital_signature: "ML-DSA / SLH-DSA", encryption: "ML-KEM" },
    nist: ["FIPS 203", "FIPS 204", "FIPS 205"],
  },
  {
    key: "RSA-3072",
    test: /\brsa[-_ ]?3072\b|\brsa3072\b/i,
    category: "Asymmetric",
    usage: ["key_establishment", "digital_signature", "encryption"],
    math: "Integer Factorization",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { key_establishment: "ML-KEM", digital_signature: "ML-DSA / SLH-DSA", encryption: "ML-KEM" },
    nist: ["FIPS 203", "FIPS 204", "FIPS 205"],
  },
  {
    key: "RSA-4096",
    test: /\brsa[-_ ]?4096\b|\brsa4096\b/i,
    category: "Asymmetric",
    usage: ["key_establishment", "digital_signature", "encryption"],
    math: "Integer Factorization",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { key_establishment: "ML-KEM", digital_signature: "ML-DSA / SLH-DSA", encryption: "ML-KEM" },
    nist: ["FIPS 203", "FIPS 204", "FIPS 205"],
  },
  {
    key: "RSA-PSS",
    test: /rsa[-_ ]?pss|pss[-_ ]?rsa/i,
    category: "Asymmetric",
    usage: ["digital_signature"],
    math: "Integer Factorization",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { digital_signature: "ML-DSA / SLH-DSA" },
    nist: ["FIPS 204", "FIPS 205"],
  },
  {
    key: "RSA-PKCS#1",
    test: /rsa[-_ ]?pkcs|pkcs[-_ ]?1.*rsa|rsaencryption/i,
    category: "Asymmetric",
    usage: ["digital_signature", "encryption"],
    math: "Integer Factorization",
    classical: "Legacy padding",
    classicalVuln: "Legacy padding scheme",
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { digital_signature: "ML-DSA / SLH-DSA", encryption: "ML-KEM" },
    nist: ["FIPS 203", "FIPS 204", "FIPS 205"],
  },
  {
    key: "RSA",
    test: /\brsa\b|rsa[-_ ]?oaep/i,
    category: "Asymmetric",
    usage: ["key_establishment", "digital_signature", "encryption"],
    math: "Integer Factorization",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { key_establishment: "ML-KEM", digital_signature: "ML-DSA / SLH-DSA", encryption: "ML-KEM" },
    nist: ["FIPS 203", "FIPS 204", "FIPS 205"],
  },

  /* ---------- Diffie-Hellman ---------- */
  {
    key: "DH-1024",
    test: /\bdh[-_ ]?1024\b|diffie[-_ ]?hellman[-_ ]?1024/i,
    category: "Asymmetric",
    usage: ["key_establishment"],
    math: "Discrete Logarithm",
    classical: "Weak",
    classicalVuln: "Key too small",
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "critical",
    replacement: { key_establishment: "ML-KEM" },
    nist: ["FIPS 203"],
  },
  {
    key: "DH-2048",
    test: /\bdh[-_ ]?2048\b|diffie[-_ ]?hellman[-_ ]?2048/i,
    category: "Asymmetric",
    usage: ["key_establishment"],
    math: "Discrete Logarithm",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { key_establishment: "ML-KEM" },
    nist: ["FIPS 203"],
  },
  {
    key: "DH-3072",
    test: /\bdh[-_ ]?3072\b|diffie[-_ ]?hellman[-_ ]?3072/i,
    category: "Asymmetric",
    usage: ["key_establishment"],
    math: "Discrete Logarithm",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { key_establishment: "ML-KEM" },
    nist: ["FIPS 203"],
  },
  {
    key: "DH",
    test: /\bdh\b|diffie[-_ ]?hellman|dh[-_ ]?key|modp/i,
    category: "Asymmetric",
    usage: ["key_establishment"],
    math: "Discrete Logarithm",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { key_establishment: "ML-KEM" },
    nist: ["FIPS 203"],
  },

  /* ---------- ECDH ---------- */
  {
    key: "ECDH P-256",
    test: /ecdh.*p[-_ ]?256|ecdh.*prime256|ecdh.*secp256/i,
    category: "Asymmetric",
    usage: ["key_establishment"],
    math: "Elliptic Curve Discrete Logarithm",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { key_establishment: "ML-KEM" },
    nist: ["FIPS 203"],
  },
  {
    key: "ECDH P-384",
    test: /ecdh.*p[-_ ]?384|ecdh.*secp384/i,
    category: "Asymmetric",
    usage: ["key_establishment"],
    math: "Elliptic Curve Discrete Logarithm",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { key_establishment: "ML-KEM" },
    nist: ["FIPS 203"],
  },
  {
    key: "ECDH P-521",
    test: /ecdh.*p[-_ ]?521|ecdh.*secp521/i,
    category: "Asymmetric",
    usage: ["key_establishment"],
    math: "Elliptic Curve Discrete Logarithm",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { key_establishment: "ML-KEM" },
    nist: ["FIPS 203"],
  },
  {
    key: "ECDH",
    test: /\becdh\b/i,
    category: "Asymmetric",
    usage: ["key_establishment"],
    math: "Elliptic Curve Discrete Logarithm",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { key_establishment: "ML-KEM" },
    nist: ["FIPS 203"],
  },

  /* ---------- X25519 / X448 ---------- */
  {
    key: "X25519",
    test: /\bx25519\b|curve25519/i,
    category: "Asymmetric",
    usage: ["key_establishment"],
    math: "Elliptic Curve Discrete Logarithm",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { key_establishment: "ML-KEM / hybrid" },
    nist: ["FIPS 203"],
  },
  {
    key: "X448",
    test: /\bx448\b|curve448/i,
    category: "Asymmetric",
    usage: ["key_establishment"],
    math: "Elliptic Curve Discrete Logarithm",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { key_establishment: "ML-KEM / hybrid" },
    nist: ["FIPS 203"],
  },

  /* ---------- ECDSA ---------- */
  {
    key: "ECDSA P-256",
    test: /ecdsa.*p[-_ ]?256|ecdsa.*prime256|ecdsa.*secp256/i,
    category: "Asymmetric",
    usage: ["digital_signature"],
    math: "Elliptic Curve Discrete Logarithm",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { digital_signature: "ML-DSA / SLH-DSA" },
    nist: ["FIPS 204", "FIPS 205"],
  },
  {
    key: "ECDSA P-384",
    test: /ecdsa.*p[-_ ]?384|ecdsa.*secp384/i,
    category: "Asymmetric",
    usage: ["digital_signature"],
    math: "Elliptic Curve Discrete Logarithm",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { digital_signature: "ML-DSA / SLH-DSA" },
    nist: ["FIPS 204", "FIPS 205"],
  },
  {
    key: "ECDSA P-521",
    test: /ecdsa.*p[-_ ]?521|ecdsa.*secp521/i,
    category: "Asymmetric",
    usage: ["digital_signature"],
    math: "Elliptic Curve Discrete Logarithm",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { digital_signature: "ML-DSA / SLH-DSA" },
    nist: ["FIPS 204", "FIPS 205"],
  },
  {
    key: "ECDSA",
    test: /ecdsa|ec[-_ ]?dsa|elliptic[-_ ]?curve.*sign/i,
    category: "Asymmetric",
    usage: ["digital_signature"],
    math: "Elliptic Curve Discrete Logarithm",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { digital_signature: "ML-DSA / SLH-DSA" },
    nist: ["FIPS 204", "FIPS 205"],
  },

  /* ---------- EdDSA ---------- */
  {
    key: "Ed25519",
    test: /ed25519|eddsa|ed[-_ ]?25519/i,
    category: "Asymmetric",
    usage: ["digital_signature"],
    math: "Elliptic Curve Discrete Logarithm",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { digital_signature: "ML-DSA / SLH-DSA" },
    nist: ["FIPS 204", "FIPS 205"],
  },
  {
    key: "Ed448",
    test: /ed448/i,
    category: "Asymmetric",
    usage: ["digital_signature"],
    math: "Elliptic Curve Discrete Logarithm",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { digital_signature: "ML-DSA / SLH-DSA" },
    nist: ["FIPS 204", "FIPS 205"],
  },

  /* ---------- DSA / ElGamal / ECIES / MQV ---------- */
  {
    key: "DSA",
    test: /\bdsa\b|digital[-_ ]?signature[-_ ]?algorithm/i,
    category: "Asymmetric",
    usage: ["digital_signature"],
    math: "Discrete Logarithm",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { digital_signature: "ML-DSA / SLH-DSA" },
    nist: ["FIPS 204", "FIPS 205"],
  },
  {
    key: "ElGamal",
    test: /elgamal/i,
    category: "Asymmetric",
    usage: ["encryption"],
    math: "Discrete Logarithm",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { encryption: "ML-KEM" },
    nist: ["FIPS 203"],
  },
  {
    key: "ECIES",
    test: /ecies/i,
    category: "Asymmetric",
    usage: ["encryption"],
    math: "Elliptic Curve Discrete Logarithm",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { encryption: "ML-KEM" },
    nist: ["FIPS 203"],
  },
  {
    key: "MQV / ECMQV",
    test: /ecmqv|\bmqv\b/i,
    category: "Asymmetric",
    usage: ["key_establishment"],
    math: "Elliptic Curve Discrete Logarithm",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Shor",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { key_establishment: "ML-KEM" },
    nist: ["FIPS 203"],
  },

  /* ---------- Symmetric ---------- */
  {
    key: "DES",
    test: /(?<![a-z0-9])des(?![a-z0-9])|des[-_ ]?cbc|des[-_ ]?ecb/i,
    category: "Symmetric",
    usage: ["encryption"],
    math: "Block cipher",
    classical: "Broken",
    classicalVuln: "56-bit key brute-forceable",
    quantumAttack: "Grover (search)",
    quantumStatus: "vulnerable",
    severity: "critical",
    replacement: { encryption: "AES-256" },
    nist: [],
  },
  {
    key: "3DES",
    test: /3des|triple[-_ ]?des|des[-_ ]?ede|tdea/i,
    category: "Symmetric",
    usage: ["encryption"],
    math: "Block cipher",
    classical: "Legacy / limited",
    classicalVuln: "Small block size (Sweet32)",
    quantumAttack: "Grover (search)",
    quantumStatus: "transition",
    severity: "medium",
    replacement: { encryption: "AES-256" },
    nist: [],
  },
  {
    key: "AES-128",
    test: /\baes[-_ ]?128\b|\baes128\b|aes[-_ ]?gcm[-_ ]?128|aes[-_ ]?cbc[-_ ]?128|aes[-_ ]?ctr[-_ ]?128/i,
    category: "Symmetric",
    usage: ["encryption"],
    math: "Block cipher",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Grover (~64-bit strength)",
    quantumStatus: "reduced",
    severity: "medium",
    replacement: { encryption: "AES-256" },
    nist: [],
  },
  {
    key: "AES-192",
    test: /\baes[-_ ]?192\b|\baes192\b/i,
    category: "Symmetric",
    usage: ["encryption"],
    math: "Block cipher",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Grover (~96-bit strength)",
    quantumStatus: "reduced",
    severity: "low",
    replacement: { encryption: "AES-256" },
    nist: [],
  },
  {
    key: "AES-256",
    test: /\baes[-_ ]?256\b|\baes256\b|aes[-_ ]?gcm[-_ ]?256|aes[-_ ]?cbc[-_ ]?256|aes[-_ ]?ctr[-_ ]?256/i,
    category: "Symmetric",
    usage: ["encryption"],
    math: "Block cipher",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Grover (~128-bit strength)",
    quantumStatus: "safe",
    severity: "safe",
    replacement: { encryption: "Continue (AES-256)" },
    nist: [],
  },
  {
    key: "AES",
    test: /\baes\b|rijndael|aes[-_ ]?gcm|aes[-_ ]?cbc|aes[-_ ]?ctr/i,
    category: "Symmetric",
    usage: ["encryption"],
    math: "Block cipher",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Grover (search)",
    quantumStatus: "reduced",
    severity: "low",
    replacement: { encryption: "AES-256" },
    nist: [],
  },
  {
    key: "Blowfish",
    test: /blowfish/i,
    category: "Symmetric",
    usage: ["encryption"],
    math: "Block cipher",
    classical: "Legacy concerns (64-bit block)",
    classicalVuln: "64-bit block size",
    quantumAttack: "Grover (search)",
    quantumStatus: "transition",
    severity: "medium",
    replacement: { encryption: "AES-256" },
    nist: [],
  },
  {
    key: "RC4",
    test: /\brc4\b|arcfour/i,
    category: "Symmetric",
    usage: ["encryption"],
    math: "Stream cipher",
    classical: "Broken",
    classicalVuln: "Multiple keystream biases",
    quantumAttack: "N/A",
    quantumStatus: "vulnerable",
    severity: "critical",
    replacement: { encryption: "AES-256" },
    nist: [],
  },
  {
    key: "RC2",
    test: /\brc2\b/i,
    category: "Symmetric",
    usage: ["encryption"],
    math: "Block cipher",
    classical: "Obsolete",
    classicalVuln: "Obsolete cipher",
    quantumAttack: "N/A",
    quantumStatus: "vulnerable",
    severity: "critical",
    replacement: { encryption: "AES-256" },
    nist: [],
  },
  {
    key: "ChaCha20",
    test: /chacha20|xchacha|chacha[-_ ]?20/i,
    category: "Symmetric",
    usage: ["encryption"],
    math: "Stream cipher",
    classical: "Strong",
    classicalVuln: null,
    quantumAttack: "Grover (~128-bit strength)",
    quantumStatus: "safe",
    severity: "safe",
    replacement: { encryption: "Continue (ChaCha20-Poly1305)" },
    nist: [],
  },

  /* ---------- Hashes ---------- */
  {
    key: "MD2",
    test: /\bmd2\b/i,
    category: "Hash",
    usage: ["hash"],
    math: "Merkle–Damgård",
    classical: "Broken",
    classicalVuln: "Collisions / preimage weaknesses",
    quantumAttack: "N/A",
    quantumStatus: "vulnerable",
    severity: "critical",
    replacement: { hash: "SHA-256 / SHA-3" },
    nist: [],
  },
  {
    key: "MD4",
    test: /\bmd4\b/i,
    category: "Hash",
    usage: ["hash"],
    math: "Merkle–Damgård",
    classical: "Broken",
    classicalVuln: "Practical collisions",
    quantumAttack: "N/A",
    quantumStatus: "vulnerable",
    severity: "critical",
    replacement: { hash: "SHA-256 / SHA-3" },
    nist: [],
  },
  {
    key: "MD5",
    test: /\bmd5\b/i,
    category: "Hash",
    usage: ["hash"],
    math: "Merkle–Damgård",
    classical: "Broken",
    classicalVuln: "Practical collision attacks",
    quantumAttack: "N/A",
    quantumStatus: "vulnerable",
    severity: "critical",
    replacement: { hash: "SHA-256 / SHA-3" },
    nist: [],
  },
  {
    key: "SHA-0",
    test: /sha[-_ ]?0\b|sha0\b/i,
    category: "Hash",
    usage: ["hash"],
    math: "Merkle–Damgård",
    classical: "Broken",
    classicalVuln: "Cryptanalytic weaknesses",
    quantumAttack: "N/A",
    quantumStatus: "vulnerable",
    severity: "critical",
    replacement: { hash: "SHA-256 / SHA-3" },
    nist: [],
  },
  {
    key: "SHA-1",
    test: /sha[-_ ]?1\b|sha1\b/i,
    category: "Hash",
    usage: ["hash"],
    math: "Merkle–Damgård",
    classical: "Deprecated",
    classicalVuln: "Practical collision attacks",
    quantumAttack: "Grover (search)",
    quantumStatus: "vulnerable",
    severity: "critical",
    replacement: { hash: "SHA-256 / SHA-3" },
    nist: ["NIST transition by Dec 31, 2030"],
  },
  {
    key: "SHA-224",
    test: /sha[-_ ]?224|sha224/i,
    category: "Hash",
    usage: ["hash"],
    math: "Merkle–Damgård",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Grover (search)",
    quantumStatus: "reduced",
    severity: "medium",
    replacement: { hash: "SHA-256 / SHA-384" },
    nist: [],
  },
  {
    key: "SHA-256",
    test: /sha[-_ ]?256|sha256|sha[-_ ]?2\b/i,
    category: "Hash",
    usage: ["hash"],
    math: "Merkle–Damgård",
    classical: "Strong",
    classicalVuln: null,
    quantumAttack: "Grover (search)",
    quantumStatus: "safe",
    severity: "safe",
    replacement: { hash: "Continue (SHA-256)" },
    nist: [],
  },
  {
    key: "SHA-384",
    test: /sha[-_ ]?384|sha384/i,
    category: "Hash",
    usage: ["hash"],
    math: "Merkle–Damgård",
    classical: "Strong",
    classicalVuln: null,
    quantumAttack: "Grover (search)",
    quantumStatus: "safe",
    severity: "safe",
    replacement: { hash: "Continue (SHA-384)" },
    nist: [],
  },
  {
    key: "SHA-512",
    test: /sha[-_ ]?512|sha512/i,
    category: "Hash",
    usage: ["hash"],
    math: "Merkle–Damgård",
    classical: "Strong",
    classicalVuln: null,
    quantumAttack: "Grover (search)",
    quantumStatus: "safe",
    severity: "safe",
    replacement: { hash: "Continue (SHA-512)" },
    nist: [],
  },
  {
    key: "SHA3-224",
    test: /sha3[-_ ]?224|sha[-_ ]?3[-_ ]?224/i,
    category: "Hash",
    usage: ["hash"],
    math: "Keccak sponge",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: "Grover (search)",
    quantumStatus: "reduced",
    severity: "medium",
    replacement: { hash: "SHA3-256+" },
    nist: [],
  },
  {
    key: "SHA3-256",
    test: /sha3[-_ ]?256|sha[-_ ]?3[-_ ]?256/i,
    category: "Hash",
    usage: ["hash"],
    math: "Keccak sponge",
    classical: "Strong",
    classicalVuln: null,
    quantumAttack: "Grover (search)",
    quantumStatus: "safe",
    severity: "safe",
    replacement: { hash: "Continue (SHA3-256)" },
    nist: [],
  },
  {
    key: "SHA3-384",
    test: /sha3[-_ ]?384|sha[-_ ]?3[-_ ]?384/i,
    category: "Hash",
    usage: ["hash"],
    math: "Keccak sponge",
    classical: "Strong",
    classicalVuln: null,
    quantumAttack: "Grover (search)",
    quantumStatus: "safe",
    severity: "safe",
    replacement: { hash: "Continue (SHA3-384)" },
    nist: [],
  },
  {
    key: "SHA3-512",
    test: /sha3[-_ ]?512|sha[-_ ]?3[-_ ]?512/i,
    category: "Hash",
    usage: ["hash"],
    math: "Keccak sponge",
    classical: "Strong",
    classicalVuln: null,
    quantumAttack: "Grover (search)",
    quantumStatus: "safe",
    severity: "safe",
    replacement: { hash: "Continue (SHA3-512)" },
    nist: [],
  },

  /* ---------- MAC ---------- */
  {
    key: "HMAC-MD5",
    test: /hmac.*md5|md5.*hmac/i,
    category: "MAC",
    usage: ["mac"],
    math: "Hash-based",
    classical: "Insecure",
    classicalVuln: "Built on MD5",
    quantumAttack: "N/A",
    quantumStatus: "vulnerable",
    severity: "critical",
    replacement: { mac: "HMAC-SHA-256" },
    nist: [],
  },
  {
    key: "HMAC-SHA1",
    test: /hmac.*sha[-_ ]?1\b|sha[-_ ]?1.*hmac/i,
    category: "MAC",
    usage: ["mac"],
    math: "Hash-based",
    classical: "Legacy",
    classicalVuln: "Built on SHA-1",
    quantumAttack: "Grover (search)",
    quantumStatus: "vulnerable",
    severity: "high",
    replacement: { mac: "HMAC-SHA-256 / SHA-384" },
    nist: [],
  },
  {
    key: "HMAC-SHA256",
    test: /hmac.*sha[-_ ]?256|sha[-_ ]?256.*hmac/i,
    category: "MAC",
    usage: ["mac"],
    math: "Hash-based",
    classical: "Strong",
    classicalVuln: null,
    quantumAttack: "Grover (search)",
    quantumStatus: "safe",
    severity: "safe",
    replacement: { mac: "Continue (HMAC-SHA-256)" },
    nist: [],
  },
  {
    key: "HMAC-SHA384",
    test: /hmac.*sha[-_ ]?384|sha[-_ ]?384.*hmac/i,
    category: "MAC",
    usage: ["mac"],
    math: "Hash-based",
    classical: "Strong",
    classicalVuln: null,
    quantumAttack: "Grover (search)",
    quantumStatus: "safe",
    severity: "safe",
    replacement: { mac: "Continue (HMAC-SHA-384)" },
    nist: [],
  },
  {
    key: "HMAC-SHA512",
    test: /hmac.*sha[-_ ]?512|sha[-_ ]?512.*hmac/i,
    category: "MAC",
    usage: ["mac"],
    math: "Hash-based",
    classical: "Strong",
    classicalVuln: null,
    quantumAttack: "Grover (search)",
    quantumStatus: "safe",
    severity: "safe",
    replacement: { mac: "Continue (HMAC-SHA-512)" },
    nist: [],
  },
  {
    key: "CMAC-AES-128",
    test: /cmac.*aes[-_ ]?128|aes[-_ ]?128.*cmac/i,
    category: "MAC",
    usage: ["mac"],
    math: "Block-cipher-based",
    classical: "Strong",
    classicalVuln: null,
    quantumAttack: "Grover (search)",
    quantumStatus: "reduced",
    severity: "medium",
    replacement: { mac: "CMAC-AES-256" },
    nist: [],
  },
  {
    key: "CMAC-AES-256",
    test: /cmac.*aes[-_ ]?256|aes[-_ ]?256.*cmac/i,
    category: "MAC",
    usage: ["mac"],
    math: "Block-cipher-based",
    classical: "Strong",
    classicalVuln: null,
    quantumAttack: "Grover (search)",
    quantumStatus: "safe",
    severity: "safe",
    replacement: { mac: "Continue (CMAC-AES-256)" },
    nist: [],
  },

  /* ---------- Post-quantum ---------- */
  {
    key: "ML-KEM",
    test: /\bml[-_ ]?kem\b|kyber/i,
    category: "Post-Quantum",
    usage: ["key_establishment"],
    math: "Module-LWE",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: null,
    quantumStatus: "pqc",
    severity: "safe",
    replacement: { key_establishment: "Continue (ML-KEM)" },
    nist: ["FIPS 203"],
  },
  {
    key: "ML-DSA",
    test: /\bml[-_ ]?dsa\b|dilithium/i,
    category: "Post-Quantum",
    usage: ["digital_signature"],
    math: "Module-LWE / Module-SIS",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: null,
    quantumStatus: "pqc",
    severity: "safe",
    replacement: { digital_signature: "Continue (ML-DSA)" },
    nist: ["FIPS 204"],
  },
  {
    key: "SLH-DSA",
    test: /\bslh[-_ ]?dsa\b|sphincs/i,
    category: "Post-Quantum",
    usage: ["digital_signature"],
    math: "Hash-based",
    classical: "Secure",
    classicalVuln: null,
    quantumAttack: null,
    quantumStatus: "pqc",
    severity: "safe",
    replacement: { digital_signature: "Continue (SLH-DSA)" },
    nist: ["FIPS 205"],
  },
];

/* ---------- Lookup helpers ---------- */

function findInKb(norm) {
  for (const entry of KB) {
    if (entry.test.test(norm.haystack)) return entry;
  }
  return null;
}

/* ==========================================================
   NORMALIZATION
========================================================== */

function normalizeComponent(asset) {
  const ap = asset?.cryptoProperties?.algorithmProperties || {};
  const cp = asset?.cryptoProperties?.certificateProperties || {};
  const pr = asset?.cryptoProperties?.protocolProperties || {};
  const rp = asset?.cryptoProperties?.relatedCryptoMaterialProperties || {};

  const functions = (ap.cryptoFunctions || [])
    .map((f) =>
      typeof f === "string" ? f : f?.name || f?.function || f?.value || ""
    )
    .filter(Boolean)
    .map((f) => String(f).toLowerCase());

  const name = String(asset?.name || "").trim();
  const id = String(asset?.["bom-ref"] || "").trim();

  const haystack = [
    name,
    id,
    ap.primitive,
    ap.primitiveProperties?.primitive,
    ap.mode,
    ap.padding,
    ap.parameterSetIdentifier,
    ap.curve,
    rp.type,
    rp.algorithm,
    cp.subjectPublicKeyAlgorithm,
    cp.signatureAlgorithm,
    pr.type,
    asset?.type,
    asset?.source,
    asset?.snippet,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return { raw: asset, name, id, functions, haystack };
}

/* ==========================================================
   USAGE DETECTION — infer key_establishment / signature /
   encryption / hash / mac from functions + name.
========================================================== */

function inferUsage(norm, kbEntry) {
  const fns = norm.functions.join(" ").toLowerCase();
  const h = norm.haystack;

  // Hash-based
  if (/digest|hash|sha|md5|md4|md2/i.test(fns) || /hash|digest/i.test(h))
    return "hash";
  // MAC
  if (/mac\b|hmac|cmac|tag/i.test(fns)) return "mac";
  // Signature
  if (/sign|verify|signature/i.test(fns)) return "digital_signature";
  // Key establishment
  if (
    /keyagreement|keyexchange|key[-_ ]?establish|derive|encapsulat|decapsulat|kem/i.test(
      fns
    )
  )
    return "key_establishment";

  // Fall back to KB default usage
  return kbEntry?.usage?.[0] || "unknown";
}

/* ==========================================================
   CLASSIFICATION
========================================================== */

const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1, safe: 0 };

function classify(classified) {
  const total = classified.length;

  const critical = classified.filter(
    (c) => c.kb?.severity === "critical"
  ).length;
  const high = classified.filter((c) => c.kb?.severity === "high").length;
  const quantumVulnerable = classified.filter(
    (c) => c.kb?.quantumStatus === "vulnerable"
  ).length;
  const hndlExposed = classified.filter((c) => c.hndlExposed).length;
  const pqcReady = classified.filter(
    (c) => c.kb?.quantumStatus === "pqc"
  ).length;

  const highRiskPct = total
    ? Math.round(((critical + high) / total) * 100)
    : 0;
  const pqcReadyPct = total ? Math.round((pqcReady / total) * 100) : 0;

  return {
    total,
    critical,
    high,
    quantumVulnerable,
    hndlExposed,
    pqcReady,
    highRiskPct,
    pqcReadyPct,
  };
}

/* ==========================================================
   HNDL — Harvest Now Decrypt Later
   Only applies to asymmetric key-establishment / encryption
========================================================== */

function isHNDLExposed(usage, kbEntry) {
  if (!kbEntry) return false;
  if (kbEntry.quantumStatus !== "vulnerable") return false;
  if (
    usage === "key_establishment" ||
    usage === "encryption" ||
    kbEntry.usage?.includes("key_establishment") ||
    kbEntry.usage?.includes("encryption")
  ) {
    return true;
  }
  return false;
}

/* ==========================================================
   TOP ISSUES — from classified results
========================================================== */

function buildTopIssues(classified) {
  const has = (fn) => classified.filter(fn);

  const buckets = [
    {
      title: "RSA key vulnerable to Shor's algorithm",
      category: "Algorithms",
      severity: "critical",
      items: has((c) => /^RSA/i.test(c.kb?.key || "")),
    },
    {
      title: "Elliptic-curve / DH key vulnerable to Shor's algorithm",
      category: "Algorithms",
      severity: "critical",
      items: has((c) =>
        /^(ECDSA|ECDH|EC|DH|Ed25519|Ed448|X25519|X448|DSA|ECIES|MQV)/i.test(
          c.kb?.key || ""
        )
      ),
    },
    {
      title: "Symmetric key weakened by Grover's algorithm",
      category: "Algorithms",
      severity: "critical",
      items: has((c) => c.kb?.category === "Symmetric" && c.kb?.severity !== "safe"),
    },
    {
      title: "Classically broken algorithm in use",
      category: "Algorithms",
      severity: "high",
      items: has((c) => c.kb?.classical === "Broken" || c.kb?.severity === "critical"),
    },
    {
      title: "Sensitive data exposed to Harvest-Now-Decrypt-Later",
      category: "Data",
      severity: "high",
      items: has((c) => c.hndlExposed),
    },
    {
      title: "Weak or legacy hash function in use",
      category: "Algorithms",
      severity: "medium",
      items: has((c) =>
        ["MD2", "MD4", "MD5", "SHA-0", "SHA-1", "SHA-224", "SHA3-224"].includes(
          c.kb?.key
        )
      ),
    },
    {
      title: "Expired certificate",
      category: "Certificates",
      severity: "medium",
      items: has(
        (c) =>
          c.norm.raw?.cryptoProperties?.certificateProperties?.expired === true
      ),
    },
    {
      title: "Weak certificate signature (MD5/SHA-1)",
      category: "Certificates",
      severity: "medium",
      items: has((c) =>
        /md5|sha[-_ ]?1/i.test(
          c.norm.raw?.cryptoProperties?.certificateProperties
            ?.signatureAlgorithm || ""
        )
      ),
    },
    {
      title: "Certificate expiring within 90 days",
      category: "Certificates",
      severity: "medium",
      items: has((c) => {
        const d =
          c.norm.raw?.cryptoProperties?.certificateProperties?.expiresInDays;
        return Number.isFinite(d) && d > 0 && d <= 90;
      }),
    },
    {
      title: "Self-signed certificate in production",
      category: "Certificates",
      severity: "medium",
      items: has(
        (c) =>
          c.norm.raw?.cryptoProperties?.certificateProperties?.selfSigned ===
          true
      ),
    },
  ];

  return buckets
    .filter((b) => b.items.length > 0)
    .map((b, i) => ({
      id: i + 1,
      rank: i + 1,
      title: b.title,
      category: b.category,
      severity: b.severity,
      count: b.items.length,
    }))
    .sort((a, b) => b.count - a.count)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

/* ==========================================================
   AGGREGATION
========================================================== */

function groupByCount(items, keyFn) {
  const map = new Map();
  items.forEach((i) => {
    const k = keyFn(i);
    if (!k) return;
    map.set(k, (map.get(k) || 0) + 1);
  });
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function aggregateCbom(cbom) {
  /* Flatten */
  let components = [];
  if (Array.isArray(cbom)) {
    components = cbom.some((x) => Array.isArray(x?.components))
      ? cbom.flatMap((c) => c.components || [])
      : cbom;
  } else if (cbom && Array.isArray(cbom.components)) {
    components = cbom.components;
  }

  /* Normalize + classify */
  const seen = new Set();
  const classified = [];

  components.forEach((raw) => {
    const norm = normalizeComponent(raw);
    const key = norm.id || `${norm.name}::${norm.haystack.slice(0, 40)}`;
    if (seen.has(key)) return;
    seen.add(key);

    const kb = findInKb(norm);
    const usage = inferUsage(norm, kb);
    const hndlExposed = isHNDLExposed(usage, kb);

    classified.push({ norm, kb, usage, hndlExposed });
  });

  /* Stats */
  const stats = classify(classified);

  /* Top issues */
  const topIssues = buildTopIssues(classified);

  /* Key types */
  const keyTypes = groupByCount(
    classified.filter((c) => c.kb?.key),
    (c) => c.kb.key
  )
    .map((k) => ({
      ...k,
      quantum: classified.some(
        (c) => c.kb?.key === k.label && c.kb?.quantumStatus === "vulnerable"
      ),
    }))
    .slice(0, 8);

  /* Algorithm families — group by KB category-aware key */
  const algoRaw = groupByCount(classified, (c) => c.kb?.key);
  const algorithmFamilies = algoRaw
    .map((a) => ({
      ...a,
      quantum: classified.some(
        (c) => c.kb?.key === a.label && c.kb?.quantumStatus === "vulnerable"
      ),
    }))
    .slice(0, 10);

  /* Coverage */
  const withOccurrences = classified.filter(
    (c) =>
      Array.isArray(c.norm.raw?.evidence?.occurrences) &&
      c.norm.raw.evidence.occurrences.length > 0
  ).length;
  const coverage = stats.total
    ? `${((withOccurrences / stats.total) * 100).toFixed(1)}%`
    : "0%";

  /* Trend */
  const criticalShare = stats.total ? stats.critical / stats.total : 0;
  const trend =
    criticalShare > 0.25
      ? "worsening"
      : criticalShare < 0.1
      ? "improving"
      : "stable";

  return {
    total: stats.total,
    classified,
    metrics: {
      total: stats.total,
      critical: stats.critical,
      quantumVulnerable: stats.quantumVulnerable,
      hndlExposed: stats.hndlExposed,
      scansAggregated: 1,
    },
    gauges: {
      highRiskPct: stats.highRiskPct,
      pqcReadyPct: stats.pqcReadyPct,
    },
    topIssues,
    keyTypes,
    algorithmFamilies,
    coverage,
    trend,
  };
}

/* ==========================================================
   DEBUG HELPER — window.__debugCbom(cbom)
========================================================== */

export function debugCbom(cbom) {
  const agg = aggregateCbom(cbom);
  console.table(
    agg.classified.map((c) => ({
      name: c.norm.name,
      matched: c.kb?.key || "— no match —",
      category: c.kb?.category || "—",
      usage: c.usage,
      classical: c.kb?.classical || "—",
      quantum: c.kb?.quantumStatus || "—",
      severity: c.kb?.severity || "—",
      hndl: c.hndlExposed ? "✓" : "",
    }))
  );
  return agg;
}

if (typeof window !== "undefined") {
  window.__debugCbom = debugCbom;
}

/* ==========================================================
   GAUGE COMPONENT
========================================================== */

function GaugeArc({ value, color, size = 88 }) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg
      width={size}
      height={size / 2 + 8}
      viewBox={`0 0 ${size} ${size / 2 + 8}`}
    >
      <path
        d={`M ${stroke / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${size / 2}`}
        fill="none"
        stroke="var(--cp-track)"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <path
        d={`M ${stroke / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${size / 2}`}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

/* ==========================================================
   MAIN COMPONENT
========================================================== */

export default function CryptoInventoryPage({ cbom }) {
  const [activeReg, setActiveReg] = useState("CERT-In");
  const [sortKey, setSortKey] = useState("rank");

  const agg = useMemo(() => aggregateCbom(cbom), [cbom]);

  const sortedIssues = useMemo(() => {
    const list = [...agg.topIssues];
    if (sortKey === "count") list.sort((a, b) => b.count - a.count);
    if (sortKey === "severity") {
      const w = { critical: 3, high: 2, medium: 1, low: 0 };
      list.sort((a, b) => (w[b.severity] || 0) - (w[a.severity] || 0));
    }
    return list.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [agg, sortKey]);

  const KEY_METRICS = [
    { value: agg.metrics.total, label: "Total Assets", tone: "neutral", bar: 100 },
    {
      value: agg.metrics.critical,
      label: "Critical",
      tone: "danger",
      bar: (agg.metrics.critical / Math.max(1, agg.metrics.total)) * 100,
    },
    {
      value: agg.metrics.quantumVulnerable,
      label: "Quantum-Vulnerable",
      tone: "warn",
      bar: (agg.metrics.quantumVulnerable / Math.max(1, agg.metrics.total)) * 100,
    },
    {
      value: agg.metrics.hndlExposed,
      label: "HNDL-Exposed",
      tone: "warn",
      bar: (agg.metrics.hndlExposed / Math.max(1, agg.metrics.total)) * 100,
    },
    {
      value: agg.metrics.scansAggregated,
      label: "Scans Aggregated",
      tone: "neutral",
      bar: 100,
    },
  ];

  const RISK_GAUGES = [
    {
      value: agg.gauges.highRiskPct,
      label: "High-risk crypto objects",
      hint: "Critical / High severity",
      color: "#f97316",
    },
    {
      value: agg.gauges.pqcReadyPct,
      label: "PQC-ready algorithms",
      hint: "Quantum-safe today",
      color: "#10b981",
    },
  ];

  const maxIssue = Math.max(1, ...agg.topIssues.map((i) => i.count));
  const maxKey = Math.max(1, ...agg.keyTypes.map((k) => k.value));
  const maxAlgo = Math.max(1, ...agg.algorithmFamilies.map((a) => a.value));

  if (!agg.total) {
    return (
      <div className="cpPage">
        <div className="cpMasthead">
          <div className="cpMastheadLeft">
            <div className="cpTag">Estate · Cryptographic Posture</div>
            <h1>
              Cryptographic
              <br />
              <span className="cpAccent">Inventory</span>
            </h1>
          </div>
          <div className="cpMastheadRight">
            <p>
              No cryptographic assets were found in the scanned CBOM. Try
              scanning a repository that contains cryptographic code.
            </p>
          </div>
        </div>
        <div className="cpEmpty">
          <div className="cpEmptyIcon">◇</div>
          <h3>No cryptographic assets detected</h3>
          <p>Run a scan on a repository that uses cryptographic libraries.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cpPage">
      {/* MASTHEAD */}
      <div className="cpMasthead">
        <div className="cpMastheadLeft">
          <div className="cpTag">Estate · Cryptographic Posture</div>
          <h1>
            Cryptographic
            <br />
            <span className="cpAccent">Inventory</span>
          </h1>
        </div>

        <div className="cpMastheadRight">
          <p>
            Every cryptographic asset across all scans in this tenant —
            deduplicated, severity-ranked, and mapped to its PQC replacement
            and Indian regulatory exposure.
          </p>
          <div className="cpMeta">
            <div>
              <span>Total Assets</span>
              <strong>{agg.metrics.total}</strong>
            </div>
            <div>
              <span>Coverage</span>
              <strong>{agg.coverage}</strong>
            </div>
            <div>
              <span>Trend</span>
              <strong className="cpMetaUp">
                {agg.trend === "improving"
                  ? "↗ Improving"
                  : agg.trend === "worsening"
                  ? "↘ Worsening"
                  : "→ Stable"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* METRIC ROW */}
      <div className="cpMetricRow">
        {KEY_METRICS.map((m, i) => (
          <div key={m.label} className={`cpMetric cpMetric-${m.tone}`}>
            <div className="cpMetricHead">
              <span className="cpMetricLabel">{m.label}</span>
              <span className="cpMetricIndex">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="cpMetricValue">{m.value}</div>
            <div className="cpMetricBar">
              <div
                className="cpMetricBarFill"
                style={{ width: `${Math.min(100, m.bar)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* GAUGE PANEL */}
      <div className="cpGaugePanel">
        <div className="cpGaugeLeft">
          <span className="cpSectionLabel">Posture Snapshot</span>
          <h2>Where we stand today</h2>
          <p>
            A quick read on high-risk exposure and readiness for post-quantum
            migration across the estate.
          </p>
        </div>

        <div className="cpGaugeGrid">
          {RISK_GAUGES.map((g) => (
            <div key={g.label} className="cpGaugeCard">
              <div className="cpGaugeVisual">
                <GaugeArc value={g.value} color={g.color} />
                <div className="cpGaugeNumber" style={{ color: g.color }}>
                  {g.value}
                  <small>%</small>
                </div>
              </div>
              <div className="cpGaugeInfo">
                <strong>{g.label}</strong>
                <span>{g.hint}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      

      {/* MAIN SPLIT */}
      <div className="cpSplit">
        <section className="cpIssues">
          <div className="cpSectionHead">
            <div>
              <span className="cpSectionLabel">Ranked Findings</span>
              <h2>Top issues</h2>
            </div>
            <div className="cpSortGroup">
              {[
                ["rank", "Rank"],
                ["count", "Count"],
                ["severity", "Severity"],
              ].map(([k, l]) => (
                <button
                  key={k}
                  className={`cpSortBtn ${sortKey === k ? "isActive" : ""}`}
                  onClick={() => setSortKey(k)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="cpIssueTable">
            <div className="cpIssueTableHead">
              <span>#</span>
              <span>Issue</span>
              <span>Category</span>
              <span>Distribution</span>
              <span>Count</span>
            </div>

            {sortedIssues.length === 0 ? (
              <div className="cpEmptyRow">No issues detected.</div>
            ) : (
              sortedIssues.map((issue) => {
                const pct = (issue.count / maxIssue) * 100;
                return (
                  <div key={issue.title} className="cpIssueRow">
                    <span className={`cpIssueNum cpIssueNum-${issue.severity}`}>
                      {String(issue.rank).padStart(2, "0")}
                    </span>
                    <span className="cpIssueTitle">{issue.title}</span>
                    <span className="cpIssueCat">{issue.category}</span>
                    <div className="cpIssueDist">
                      <div
                        className={`cpIssueDistFill cpIssueDistFill-${issue.severity}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span
                      className={`cpIssueCount cpIssueCount-${issue.severity}`}
                    >
                      {issue.count}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <aside className="cpSide">
          {/* KEY TYPES */}
          <div className="cpMini">
            <div className="cpMiniHead">
              <span className="cpSectionLabel">Key Types</span>
              <span className="cpMiniMeta">
                {agg.keyTypes.reduce((s, k) => s + k.value, 0)} total
              </span>
            </div>

            <div className="cpMiniBars">
              {agg.keyTypes.length === 0 ? (
                <div className="cpEmptyRow">No key-size data available.</div>
              ) : (
                agg.keyTypes.map((k) => (
                  <div key={k.label} className="cpMiniBar">
                    <div className="cpMiniBarTop">
                      <span className="cpMiniBarLabel">{k.label}</span>
                      <span className="cpMiniBarValue">{k.value}</span>
                    </div>
                    <div className="cpMiniBarTrack">
                      <div
                        className={`cpMiniBarFill ${
                          k.quantum ? "cpMiniBarFill-warn" : "cpMiniBarFill-safe"
                        }`}
                        style={{ width: `${(k.value / maxKey) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {agg.keyTypes.some((k) => k.quantum) && (
              <div className="cpMiniFoot">
                Contains quantum-vulnerable keys
              </div>
            )}
          </div>

          {/* ALGORITHM FAMILIES */}
          <div className="cpMini">
            <div className="cpMiniHead">
              <span className="cpSectionLabel">Algorithm Families</span>
              <span className="cpMiniMeta">
                {agg.algorithmFamilies.reduce((s, a) => s + a.value, 0)} total
              </span>
            </div>

            <div className="cpMiniBars">
              {agg.algorithmFamilies.length === 0 ? (
                <div className="cpEmptyRow">No algorithm data available.</div>
              ) : (
                agg.algorithmFamilies.map((a) => (
                  <div key={a.label} className="cpMiniBar">
                    <div className="cpMiniBarTop">
                      <span className="cpMiniBarLabel">{a.label}</span>
                      <span className="cpMiniBarValue">{a.value}</span>
                    </div>
                    <div className="cpMiniBarTrack">
                      <div
                        className={`cpMiniBarFill ${
                          a.quantum
                            ? "cpMiniBarFill-danger"
                            : "cpMiniBarFill-safe"
                        }`}
                        style={{ width: `${(a.value / maxAlgo) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="cpMiniFoot">
              <span className="cpDot cpDot-danger" /> Quantum-vulnerable
              <span className="cpDot cpDot-safe" /> Quantum-safe / PQC
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}