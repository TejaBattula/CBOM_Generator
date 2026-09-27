const express = require("express");
const cors = require("cors");
const http = require("http");
const { scanWebsite } = require("./websitescanner");

const app = express();

app.use(cors());
app.use(express.json());



app.get("/", (req, res) => {
  res.json({
    message: "CBOM Backend is running",
  });
});




function pollForCBOM(githubUrl, res, attempts = 24) {

  console.log(`Checking for CBOM... attempts left: ${attempts}`);

  const getCBOM = http.request(
    {
      hostname: "localhost",
      port: 8081,
      path: "/api/v1/cbom/last/10",
      method: "GET",
    },

    (cbomResponse) => {

      let cbomData = "";

      cbomResponse.on("data", (chunk) => {
        cbomData += chunk;
      });


      cbomResponse.on("end", () => {

        try {

          const cboms = JSON.parse(cbomData);

          // Find CBOM for the requested GitHub repository
          const matchingCBOM = cboms.find(
            (item) => item.gitUrl === githubUrl
          );


          // ===============================
          // CBOM FOUND
          // ===============================

          if (matchingCBOM) {

            console.log("CBOM found!");
            console.log(matchingCBOM.bom);

            return res.json({
              success: true,
              message: "CBOM generated successfully",
              githubUrl,
              cbom: matchingCBOM.bom,
            });
          }


          // ===============================
          // TIMEOUT
          // ===============================

          if (attempts <= 1) {

            console.log("CBOM generation is taking too long.");

            return res.status(202).json({
              success: true,
              message: "Scan is taking longer than expected",
              githubUrl,
            });
          }


          // ===============================
          // CHECK AGAIN AFTER 5 SECONDS
          // ===============================

          console.log(
            "CBOM not ready. Checking again in 5 seconds..."
          );

          setTimeout(() => {

            pollForCBOM(
              githubUrl,
              res,
              attempts - 1
            );

          }, 5000);

        } catch (error) {

          console.error("CBOM parsing error:", error);

          return res.status(500).json({
            success: false,
            error: "Could not read CBOM",
          });
        }
      });
    }
  );


  // ===============================
  // CONNECTION ERROR
  // ===============================

  getCBOM.on("error", (error) => {

    console.error("CBOMkit connection error:", error);

    return res.status(500).json({
      success: false,
      error: "Could not connect to CBOMkit",
    });
  });


  getCBOM.end();
}


// ===============================
// GENERATE CBOM
// ===============================

app.post("/api/cbom/generate", (req, res) => {

  const { githubUrl } = req.body;


  // ===============================
  // CHECK URL
  // ===============================

  if (!githubUrl) {

    return res.status(400).json({
      error: "GitHub URL is required",
    });
  }


  console.log("Received GitHub URL:", githubUrl);


  // ===============================
  // DATA FOR CBOMKIT
  // ===============================

  const data = JSON.stringify({
    scanUrl: githubUrl,
  });


  // ===============================
  // CBOMKIT SCAN REQUEST
  // ===============================

  const options = {

    hostname: "localhost",

    port: 8081,

    path: "/api/v1/scan",

    method: "POST",

    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    },
  };


  const request = http.request(
    options,

    (response) => {

      // Consume response data
      response.on("data", () => {});


      response.on("end", () => {

        // ===============================
        // SCAN DID NOT START
        // ===============================

        if (response.statusCode !== 202) {

          console.log(
            "CBOMkit returned status:",
            response.statusCode
          );

          return res.status(response.statusCode).json({

            success: false,

            error: "CBOMkit could not start the scan",

          });
        }


        // ===============================
        // SCAN STARTED
        // ===============================

        console.log(
          "Scan started:",
          githubUrl
        );


        // ===============================
        // START POLLING
        // ===============================

        pollForCBOM(
          githubUrl,
          res
        );

      });
    }
  );


  // ===============================
  // REQUEST ERROR
  // ===============================

  request.on("error", (error) => {

    console.error(
      "Could not connect to CBOMkit:",
      error
    );

    return res.status(500).json({

      success: false,

      error: "Could not connect to CBOMkit",

    });
  });


  // Send request to CBOMkit
  request.write(data);

  request.end();
});


// ===============================
// START SERVER
// ===============================
app.post("/api/website/scan", async (req, res) => {
  const { websiteUrl } = req.body;

  if (!websiteUrl) {
    return res.status(400).json({
      success: false,
      error: "Website URL is required",
    });
  }

  console.log("Scanning website:", websiteUrl);

  try {
    const cryptoAssets = await scanWebsite(websiteUrl);

    return res.json({
      success: true,
      message: "Website scanned successfully",
      websiteUrl,
      cryptoAssets,
      totalAssets: cryptoAssets.length,
    });
  } catch (error) {
    console.error("Website scan error:", error);

    return res.status(500).json({
      success: false,
      error: "Website scan failed",
    });
  }
});
app.listen(5000, () => {

  console.log(
    "Backend running on http://localhost:5000"
  );

});