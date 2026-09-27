import { useState } from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function App() {
  const [scanType, setScanType] = useState("github");
  const [url, setUrl] = useState("");
  const [cbom, setCbom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  

  const scan = async () => {
    if (!url) {
      setError("Please enter a URL");
      return;
    }

    setLoading(true);
    setError("");
    setCbom(null);

    try {
      const endpoint =
        scanType === "github"
          ? "http://localhost:5000/api/cbom/generate"
          : "http://localhost:5000/api/website/scan";

      const body =
        scanType === "github"
          ? { githubUrl: url }
          : { websiteUrl: url };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Scan failed");
        return;
      }

      if (scanType === "github") {
        setCbom(data.cbom);
      }

      // Website result
      else {
        const components = (
          data.cryptoAssets || []
        ).map((asset, index) => ({
          "bom-ref": `website-${index}`,

          name: asset.name,

          cryptoProperties: {
            assetType: "cryptographic-asset",

            algorithmProperties: {
              primitive: asset.name,

              cryptoFunctions: [
                asset.operation,
              ],
            },
          },

          source: asset.source,
        }));

        setCbom({
          bomFormat: "CycloneDX",
          specVersion: "1.6",
          components,
        });
      }
    } catch (err) {
      console.error(err);
      setError("Could not connect to backend");
    } finally {
      setLoading(false);
    }
  };

  

  const assets = cbom?.components || [];

  
  const algorithmCount = {};

  assets.forEach((asset) => {
    const name = asset.name || "";

    const algorithms = [
      "AES-GCM",
      "AES-CBC",
      "AES-CTR",
      "AES-256",
      "AES-128",
      "RSA-OAEP",
      "RSA-PSS",
      "RSA",
      "ECDSA",
      "ECDH",
      "SHA-256",
      "SHA-384",
      "SHA-512",
      "SHA-1",
      "MD5",
    ];

    const algorithm = algorithms.find((item) =>
      name.includes(item)
    );

    if (algorithm) {
      algorithmCount[algorithm] =
        (algorithmCount[algorithm] || 0) + 1;
    }
  });

  const algorithmData = Object.entries(
    algorithmCount
  ).map(([name, count]) => ({
    name,
    count,
  }));


  const colors = [
    "#8e44ad",
    "#3498db",
    "#e74c3c",
    "#1abc9c",
    "#f39c12",
    "#2ecc71",
    "#e84393",
    "#00cec9",
  ];

  

  const changeScanType = (type) => {
    setScanType(type);
    setUrl("");
    setCbom(null);
    setError("");
  };

 
  return (
    <div
      style={{
        padding: "30px",
        fontFamily: "Arial",
        background: "#f5f6fa",
        minHeight: "100vh",
      }}
    >
      

      <h1>CBOM Generator</h1>

      <p>
        Scan GitHub repositories or websites for
        cryptographic assets.
      </p>

      
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() =>
            changeScanType("github")
          }
          style={{
            padding: "10px 20px",
            marginRight: "10px",
            background:
              scanType === "github"
                ? "#3498db"
                : "#ddd",
            color:
              scanType === "github"
                ? "white"
                : "black",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          GitHub
        </button>

        <button
          onClick={() =>
            changeScanType("website")
          }
          style={{
            padding: "10px 20px",
            background:
              scanType === "website"
                ? "#3498db"
                : "#ddd",
            color:
              scanType === "website"
                ? "white"
                : "black",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Website
        </button>
      </div>

      
      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          value={url}
          onChange={(e) =>
            setUrl(e.target.value)
          }
          placeholder={
            scanType === "github"
              ? "Enter GitHub repository URL"
              : "Enter website URL"
          }
          style={{
            width: "400px",
            padding: "12px",
            marginRight: "10px",
            border: "1px solid #ccc",
            borderRadius: "5px",
          }}
        />

        <button
          onClick={scan}
          disabled={loading}
          style={{
            padding: "12px 20px",
            background: loading
              ? "#999"
              : "#3498db",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          {loading ? "Scanning..." : "Scan"}
        </button>
      </div>

      

      {error && (
        <p
          style={{
            color: "red",
            fontWeight: "bold",
          }}
        >
          {error}
        </p>
      )}

      

      {cbom && (
        <div>
          <h2>CBOM Dashboard</h2>

          

          <div
            style={{
              display: "flex",
              gap: "20px",
              flexWrap: "wrap",
              marginBottom: "30px",
            }}
          >
            <Card
              title="Total Assets"
              value={assets.length}
            />

            <Card
              title="Algorithms"
              value={algorithmData.length}
            />

            <Card
              title="Format"
              value={cbom.bomFormat}
            />

            <Card
              title="Specification"
              value={cbom.specVersion}
            />
          </div>

          {/* ================================== */}
          {/* BAR CHART */}
          {/* ================================== */}

          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "10px",
              marginBottom: "30px",
            }}
          >
            <h3>
              📊 Cryptographic Algorithms
            </h3>

            {algorithmData.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height={350}
              >
                <BarChart
                  data={algorithmData}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis dataKey="name" />

                  <YAxis
                    allowDecimals={false}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="count"
                    fill="#3498db"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p>
                No recognized algorithms found.
              </p>
            )}
          </div>

          {/* ================================== */}
          {/* BUBBLE VISUALIZATION */}
          {/* ================================== */}

          <div
            style={{
              background: "white",
              padding: "25px",
              borderRadius: "10px",
              marginBottom: "30px",
              color: "black",
            }}
          >
            <h3>
              🔵 Cryptographic Asset Visualization
            </h3>

            <p
              style={{
                color: "#bbb",
              }}
            >
              Each bubble represents a
              cryptographic algorithm.
              Bigger bubbles mean more
              occurrences.
            </p>

            {/* BUBBLES */}

            <div
              style={{
                minHeight: "350px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                alignContent: "center",
                flexWrap: "wrap",
                gap: "15px",
                padding: "30px",
              }}
            >
              {algorithmData.map(
                (item, index) => {
                  const size =
                    80 + item.count * 30;

                  return (
                    <div
                      key={item.name}
                      title={`${item.name}: ${item.count}`}
                      style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        borderRadius: "50%",

                        background:
                          colors[
                            index %
                              colors.length
                          ],

                        display: "flex",
                        flexDirection:
                          "column",
                        justifyContent:
                          "center",
                        alignItems: "center",

                        textAlign: "center",

                        border:
                          "2px solid white",

                        

                        cursor: "pointer",

                        transition:
                          "transform 0.2s",

                        padding: "10px",

                        boxSizing:
                          "border-box",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform =
                          "scale(1.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform =
                          "scale(1)";
                      }}
                    >
                      <strong>
                        {item.name}
                      </strong>

                      <span
                        style={{
                          fontSize: "24px",
                          fontWeight: "bold",
                        }}
                      >
                        {item.count}
                      </span>
                    </div>
                  );
                }
              )}
            </div>

            {/* ================================= */}
            {/* BUBBLE LEGEND */}
            {/* ================================= */}

            <h4>
              Crypto Algorithms
            </h4>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "15px",
              }}
            >
              {algorithmData.map(
                (item, index) => (
                  <div
                    key={item.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "3px",
                        background:
                          colors[
                            index %
                              colors.length
                          ],
                      }}
                    />

                    {item.name} (
                    {item.count})
                  </div>
                )
              )}
            </div>
          </div>

          {/* ================================== */}
          {/* CRYPTOGRAPHIC ASSETS */}
          {/* ================================== */}

          <h2>
            Cryptographic Assets
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "15px",
            }}
          >
            {assets.map((asset) => (
              <div
                key={asset["bom-ref"]}
                style={{
                  background: "white",
                  padding: "20px",
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                  boxShadow:
                    "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                <h3>{asset.name}</h3>

                

                <p>
                  <b>Primitive:</b>{" "}
                  {asset.cryptoProperties
                    ?.algorithmProperties
                    ?.primitive || "N/A"}
                </p>

                <p>
                  <b>Functions:</b>{" "}
                  {asset.cryptoProperties
                    ?.algorithmProperties
                    ?.cryptoFunctions
                    ?.join(", ") || "N/A"}
                </p>

                
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// CARD COMPONENT
// ==========================================

function Card({ title, value }) {
  return (
    <div
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "10px",
        minWidth: "180px",
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <h3>{title}</h3>

      <p
        style={{
          fontSize: "30px",
          fontWeight: "bold",
          margin: "10px 0",
        }}
      >
        {value || "N/A"}
      </p>
    </div>
  );
}

export default App;