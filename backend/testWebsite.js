const { scanWebsite } = require("./websitescanner");

async function test() {
  const result = await scanWebsite(
    "http://127.0.0.1:8080/crypto-test.html"
  );

  console.log("\nDetected crypto assets:");
  console.log(result);
}

test();