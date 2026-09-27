async function testExternalCrypto() {
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode("Hello")
    );
  
    console.log("SHA-256 executed");
  }
  
  testExternalCrypto();