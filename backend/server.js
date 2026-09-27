require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { scanWebsite } = require("./websitescanner");

const app = express();

app.use(cors());
app.use(express.json());

const CBOMKIT_URL  = process.env.CBOMKIT_URL || "http://localhost:8081";

app.get("/", (req, res) => {
  res.json({
    message: "CBOM Backend is running",
  });
});




function pollForCBOM(githubUrl, res, attempts = 24) {

  console.log(`Checking for CBOM... attempts left: ${attempts}`);
  const cbomkitUrl = new URL(
    "/api/v1/cbom/last/10",
    CBOMKIT_URL
  );

  const getCBOM = http.request(
    {
      hostname: cbomkitUrl.hostname,
      port: cbomkitUrl.port || 80,
      path: cbomkitUrl.pathname,
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

          const matchingCBOM = cboms.find(
            (item) => item.gitUrl === githubUrl
          );



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


          

          if (attempts <= 1) {

            console.log("CBOM generation is taking too long.");

            return res.status(202).json({
              success: true,
              message: "Scan is taking longer than expected",
              githubUrl,
            });
          }


         

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


  

  if (!githubUrl) {

    return res.status(400).json({
      error: "GitHub URL is required",
    });
  }


  console.log("Received GitHub URL:", githubUrl);


  
  const data = JSON.stringify({
    scanUrl: githubUrl,
  });


  
  const cbomkitUrl = new URL(
    "/api/v1/scan",
    CBOMKIT_URL
  );
  const options = {

    hostname: cbomkitUrl.hostname,
    port: cbomkitUrl.port || 80,
    path: cbomkitUrl.pathname,
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


        

        console.log(
          "Scan started:",
          githubUrl
        );


        

        pollForCBOM(
          githubUrl,
          res
        );

      });
    }
  );


  
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


  request.write(data);

  request.end();
});



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
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
