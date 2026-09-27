const { chromium } = require("playwright");

async function scanWebsite(url) {
  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();

  const scripts = [];

  // Capture external JavaScript files
  page.on("response", async (response) => {
    const contentType =
      response.headers()["content-type"] || "";

    const responseUrl = response.url();

    if (
      contentType.includes("javascript") ||
      responseUrl.endsWith(".js")
    ) {
      try {
        const code = await response.text();

        scripts.push({
          source: responseUrl,
          code: code,
        });
      } catch (error) {
        console.log("Could not read:", responseUrl);
      }
    }
  });

  await page.goto(url, {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  // Capture inline JavaScript
  const inlineScripts = await page
    .locator("script:not([src])")
    .allTextContents();

  for (const code of inlineScripts) {
    scripts.push({
      source: url,
      code: code,
    });
  }

  const cryptoAssets = [];

  const patterns = [
    {
      regex: /AES-GCM/gi,
      name: "AES-GCM",
      operation: "encryption",
    },
    {
      regex: /AES-CBC/gi,
      name: "AES-CBC",
      operation: "encryption",
    },
    {
      regex: /AES-CTR/gi,
      name: "AES-CTR",
      operation: "encryption",
    },
    {
      regex: /RSA-OAEP/gi,
      name: "RSA-OAEP",
      operation: "encryption",
    },
    {
      regex: /RSA-PSS/gi,
      name: "RSA-PSS",
      operation: "signature",
    },
    {
      regex: /ECDSA/gi,
      name: "ECDSA",
      operation: "signature",
    },
    {
      regex: /ECDH/gi,
      name: "ECDH",
      operation: "key-agreement",
    },
    {
      regex: /SHA-256/gi,
      name: "SHA-256",
      operation: "digest",
    },
    {
      regex: /SHA-384/gi,
      name: "SHA-384",
      operation: "digest",
    },
    {
      regex: /SHA-512/gi,
      name: "SHA-512",
      operation: "digest",
    },
    {
      regex: /crypto\.subtle\.encrypt/gi,
      name: "Web Crypto Encryption",
      operation: "encrypt",
    },
    {
      regex: /crypto\.subtle\.decrypt/gi,
      name: "Web Crypto Decryption",
      operation: "decrypt",
    },
    {
      regex: /crypto\.subtle\.digest/gi,
      name: "Web Crypto Hash",
      operation: "digest",
    },
    {
      regex: /crypto\.subtle\.generateKey/gi,
      name: "Web Crypto Key Generation",
      operation: "generateKey",
    },
    {
      regex: /crypto\.subtle\.sign/gi,
      name: "Web Crypto Signature",
      operation: "sign",
    },
    {
      regex: /crypto\.subtle\.verify/gi,
      name: "Web Crypto Signature Verification",
      operation: "verify",
    },
    {
      regex: /crypto\.subtle\.deriveKey/gi,
      name: "Web Crypto Key Derivation",
      operation: "deriveKey",
    },
  ];

  // Scan all JavaScript
  for (const script of scripts) {
    for (const item of patterns) {
      // Reset regex state
      item.regex.lastIndex = 0;

      if (item.regex.test(script.code)) {
        cryptoAssets.push({
          name: item.name,
          type: "cryptographic-asset",
          operation: item.operation,
          source: script.source,
        });
      }
    }
  }

  await browser.close();

  return cryptoAssets;
}

module.exports = {
  scanWebsite,
};