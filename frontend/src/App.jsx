import React, { useMemo, useState, useEffect } from "react";
import "./App.css";

const API = "http://localhost:5000";


const CHART_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f97316", // orange
  "#f59e0b", // amber
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#14b8a6", // teal
  "#a855f7", // purple
];

function App() {
  const [scanType, setScanType] = useState("github");
  const [url, setUrl] = useState("");
  const [scannedUrl, setScannedUrl] = useState("");
  const [cbom, setCbom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalAsset, setModalAsset] = useState(null);
  const [sourceData, setSourceData] = useState(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState("");
  const [page, setPage] = useState(1);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("cbom-theme");
    return saved ? saved === "dark" : true;
  });

  useEffect(() => {
    localStorage.setItem("cbom-theme", darkMode ? "dark" : "light");
    document.body.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const perPage = 10;
  const assets = cbom?.components || [];

  /* ----------------------------------------------------------
     Helpers
  ---------------------------------------------------------- */
  const getOccurrences = (asset) =>
    Array.isArray(asset?.evidence?.occurrences)
      ? asset.evidence.occurrences
      : [];

  const getType = (asset) => {
    if (asset?.cryptoProperties?.assetType === "algorithm")
      return "Algorithm";
    if (asset?.cryptoProperties?.assetType === "cryptographic-asset")
      return "Cryptographic Asset";
    return asset?.type || "Cryptographic Asset";
  };

  const getPrimitive = (asset) =>
    asset?.cryptoProperties?.algorithmProperties?.primitive ||
    asset?.cryptoProperties?.algorithmProperties?.primitiveProperties
      ?.primitive ||
    asset?.name ||
    "Unknown";

  const getFunctions = (asset) => {
    const functions =
      asset?.cryptoProperties?.algorithmProperties?.cryptoFunctions || [];
    if (!Array.isArray(functions) || !functions.length) return ["Unknown"];
    return functions.map((fn) => {
      if (typeof fn === "string") return fn;
      if (typeof fn === "object")
        return fn.name || fn.function || fn.value || fn.id || "Unknown";
      return String(fn);
    });
  };

  /* Unique ID for each asset — falls back to name+primitive when
     bom-ref is missing so two same-named assets don't collide. */
  const getAssetId = (asset) =>
    asset["bom-ref"] ||
    `${asset.name}::${getPrimitive(asset)}`;

  /* ----------------------------------------------------------
     Scan
  ---------------------------------------------------------- */
  const scan = async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    setLoading(true);
    setError("");
    setCbom(null);
    setModalAsset(null);
    setSourceData(null);
    setSourceError("");
    setScannedUrl("");
    setPage(1);

    try {
      const endpoint =
        scanType === "github"
          ? `${API}/api/cbom/generate`
          : `${API}/api/website/scan`;

      const body =
        scanType === "github"
          ? { githubUrl: url.trim() }
          : { websiteUrl: url.trim() };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Scan failed");

      if (scanType === "github") {
        setCbom(data.cbom);
        console.log(data.cbom);
        setScannedUrl(data.githubUrl || url.trim());
      } else {
        const components = (data.cryptoAssets || []).map((asset, index) => ({
          "bom-ref": `website-${index}`,
          name: asset.name,
          type: "cryptographic-asset",
          cryptoProperties: {
            assetType: "cryptographic-asset",
            algorithmProperties: {
              primitive: asset.name,
              cryptoFunctions: [asset.operation || "Unknown"],
            },
          },
          source: asset.source,
          snippet: asset.snippet || asset.code || null,
        }));

        setCbom({
          bomFormat: "CycloneDX",
          components,
        });
        setScannedUrl(data.websiteUrl || url.trim());
      }
    } catch (err) {
      setError(err.message || "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------
     Open asset modal
  ---------------------------------------------------------- */
  const openAsset = async (asset) => {
    setModalAsset(asset);
    setSourceData(null);
    setSourceError("");

    const occurrences = getOccurrences(asset);

    if (scanType !== "github") {
      if (asset.snippet || asset.code) {
        setSourceData({
          codeBlocks: [
            {
              filePath: asset.source || "Website source",
              codeLines: String(asset.snippet || asset.code)
                .split("\n")
                .map((code, index) => ({
                  lineNumber: index + 1,
                  code,
                  detected: true,
                })),
            },
          ],
        });
      } else {
        setSourceError("Source code is not available.");
      }
      return;
    }

    if (!scannedUrl) {
      setSourceError("GitHub repository URL is not available.");
      return;
    }

    if (!occurrences.length) {
      setSourceError(
        "This asset has no source-file occurrence recorded by CBOMKit."
      );
      return;
    }

    const parseGitHubUrl = (repoUrl) => {
      try {
        const parsed = new URL(repoUrl);
        const parts = parsed.pathname
          .replace(/^\/+/, "")
          .replace(/\.git$/, "")
          .split("/")
          .filter(Boolean);
        if (parts.length < 2) return null;
        return { owner: parts[0], repo: parts[1] };
      } catch {
        return null;
      }
    };

    const repository = parseGitHubUrl(scannedUrl);
    if (!repository) {
      setSourceError("Invalid GitHub repository URL.");
      return;
    }

    const normalizeFilePath = (value) => {
      let file = String(value || "").trim();
      file = file
        .replace(
          /^https?:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[^/]+\//,
          ""
        )
        .replace(
          /^https?:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+\//,
          ""
        )
        .replace(/^\/+/, "");
      const marker = file.indexOf("#");
      if (marker >= 0) file = file.slice(0, marker);
      try {
        return decodeURIComponent(file);
      } catch {
        return file;
      }
    };

    const getLineNumbers = (occ) => {
      if (occ?.line === undefined || occ?.line === null) return [];
      return (String(occ.line).match(/\d+/g) || [])
        .map(Number)
        .filter((n) => Number.isFinite(n) && n > 0);
    };

    const grouped = {};
    occurrences.forEach((occ) => {
      const file = normalizeFilePath(occ.location || occ.file || occ.path);
      if (!file) return;
      if (!grouped[file]) grouped[file] = [];
      grouped[file].push(...getLineNumbers(occ));
    });

    if (!Object.keys(grouped).length) {
      setSourceError(
        "The CBOM occurrence does not contain a valid source-file path."
      );
      return;
    }

    setSourceLoading(true);
    try {
      const repoResponse = await fetch(
        `https://api.github.com/repos/${repository.owner}/${repository.repo}`,
        { headers: { Accept: "application/vnd.github+json" } }
      );
      if (!repoResponse.ok)
        throw new Error("Could not access the GitHub repository.");

      const repoInfo = await repoResponse.json();
      const branches = [repoInfo.default_branch, "main", "master"].filter(
        (branch, index, array) =>
          branch && array.indexOf(branch) === index
      );

      const codeBlocks = [];
      for (const [file, lines] of Object.entries(grouped)) {
        let sourceText = null;
        let usedBranch = null;

        for (const branch of branches) {
          const encodedPath = file
            .split("/")
            .map((part) => encodeURIComponent(part))
            .join("/");

          const rawUrl =
            `https://raw.githubusercontent.com/` +
            `${repository.owner}/${repository.repo}/` +
            `${encodeURIComponent(branch)}/${encodedPath}`;

          const response = await fetch(rawUrl);
          if (response.ok) {
            sourceText = await response.text();
            usedBranch = branch;
            break;
          }
        }

        if (sourceText === null)
          throw new Error(`Could not fetch source file: ${file}`);

        const allLines = sourceText.split("\n");
        const requestedLines = [...new Set(lines)].sort((a, b) => a - b);
        const lineSet = new Set();

        requestedLines.forEach((line) => {
          for (
            let n = Math.max(1, line - 3);
            n <= Math.min(allLines.length, line + 3);
            n++
          ) {
            lineSet.add(n);
          }
        });

        const codeLines = [...lineSet]
          .sort((a, b) => a - b)
          .map((lineNumber) => ({
            lineNumber,
            code: allLines[lineNumber - 1] ?? "",
            detected: requestedLines.includes(lineNumber),
          }));

        codeBlocks.push({ filePath: file, branch: usedBranch, codeLines });
      }

      setSourceData({ codeBlocks });
    } catch (err) {
      setSourceError(err.message || "Could not load actual source code.");
    } finally {
      setSourceLoading(false);
    }
  };

  const closeModal = () => {
    setModalAsset(null);
    setSourceData(null);
    setSourceError("");
  };

  /* ----------------------------------------------------------
     Memoized derived data
  ---------------------------------------------------------- */
  const primitiveData = useMemo(() => {
    const map = {};
    assets.forEach((asset) => {
      const name = getPrimitive(asset);
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map);
  }, [assets]);

  const functionData = useMemo(() => {
    const map = {};
    assets.forEach((asset) => {
      getFunctions(asset).forEach((fn) => {
        map[fn] = (map[fn] || 0) + 1;
      });
    });
    return Object.entries(map);
  }, [assets]);

  const topAssets = useMemo(() => {
    const map = {};
    assets.forEach((asset) => {
      const key = getAssetId(asset);
      if (!map[key]) map[key] = { asset, count: 0 };
      map[key].count += getOccurrences(asset).length || 1;
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [assets]);

  /* ----------------------------------------------------------
     Topology — FIXED:
     - dedupe by unique id (bom-ref, else name::primitive)
     - fallback to occ.file / occ.path when occ.location is missing
     - pass id to onAsset so the correct asset opens
  ---------------------------------------------------------- */
  const topology = useMemo(() => {
    const fileMap = {};

    assets.forEach((asset) => {
      const id = getAssetId(asset);

      getOccurrences(asset).forEach((occ) => {
        const loc = occ.location || occ.file || occ.path;
        if (!loc) return;

        if (!fileMap[loc]) fileMap[loc] = [];
        if (!fileMap[loc].some((n) => n.id === id)) {
          fileMap[loc].push({ id, name: asset.name });
        }
      });
    });

    const files = Object.entries(fileMap);

    const assetNodes = [
      ...new Map(
        files.flatMap(([, list]) => list.map((a) => [a.id, a]))
      ).values(),
    ];

    return { files, assetNodes };
  }, [assets]);

  const tableRows = useMemo(() => {
    const rows = [];
    assets.forEach((asset) => {
      const occurrences = getOccurrences(asset);
      if (occurrences.length) {
        occurrences.forEach((occ) => {
          rows.push({
            asset,
            type: getType(asset),
            primitive: getPrimitive(asset),
            location: occ.location || "N/A",
            line: occ.line || null,
          });
        });
      } else {
        rows.push({
          asset,
          type: getType(asset),
          primitive: getPrimitive(asset),
          location: asset.source || "N/A",
          line: null,
        });
      }
    });
    return rows;
  }, [assets]);

  const totalPages = Math.max(1, Math.ceil(tableRows.length / perPage));
  const currentRows = tableRows.slice((page - 1) * perPage, page * perPage);

  const stats = useMemo(() => {
    const sourceFiles = new Set();
    let evidence = 0;
    assets.forEach((asset) => {
      const occ = getOccurrences(asset);
      evidence += occ.length;
      occ.forEach((item) => {
        if (item.location) sourceFiles.add(item.location);
      });
    });
    return {
      total: assets.length,
      algorithms: assets.filter((a) => getType(a) === "Algorithm").length,
      sourceFiles: sourceFiles.size,
      evidence,
    };
  }, [assets]);

  /* ----------------------------------------------------------
     Render
  ---------------------------------------------------------- */
  return (
    <div className={darkMode ? "app darkMode" : "app lightMode"}>
      {/* animated background particles */}
      <div className="bgParticles">
        <span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span>
      </div>

      <header className="topbar">
        <div className="brand">
          <div className="brandLogo">C</div>
          <div>
            <div className="brandName">CBOM ANALYZER</div>
            <div className="brandCaption">
              Cryptographic Bill of Materials
            </div>
          </div>
        </div>

        <div className="scanModes">
          <button
            className={scanType === "github" ? "mode active" : "mode"}
            onClick={() => {
              setScanType("github");
              setCbom(null);
              setScannedUrl("");
              setError("");
            }}
          >
            GitHub
          </button>

          <button
            className={scanType === "website" ? "mode active" : "mode"}
            onClick={() => {
              setScanType("website");
              setCbom(null);
              setScannedUrl("");
              setError("");
            }}
          >
            Website
          </button>

          <button
            className="themeToggle"
            onClick={() => setDarkMode((p) => !p)}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span className="themeIcon">{darkMode ? "☀" : "☾"}</span>
            <span className="themeLabel">
              {darkMode ? "Light" : "Dark"}
            </span>
          </button>
        </div>
      </header>

      <main className="dashboard">
        <section className="hero">
          <div className="heroGrid">
            <div className="heroText">
              <span className="overline">CRYPTOGRAPHIC INTELLIGENCE</span>
              <h1>
                Understand your
                <span> cryptographic </span>
                attack surface.
              </h1>
              <p>
                Discover cryptographic algorithms, keys, source locations and
                evidence contained in your software.
              </p>
            </div>

            <div className="heroGraphic">
              <div className="heroRing ringA" />
              <div className="heroRing ringB" />
              <div className="heroRing ringC" />
              <div className="heroCore">
                <span>CBOM</span>
                <small>ANALYZER</small>
              </div>
            </div>
          </div>

          <div className="scanner">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") scan();
              }}
              placeholder={
                scanType === "github"
                  ? "Enter GitHub repository URL"
                  : "Enter website URL"
              }
            />
            <button onClick={scan} disabled={loading}>
              {loading ? "Analyzing..." : "Analyze CBOM"}
            </button>
          </div>

          {loading && (
            <div className="scanAnimation">
              <div className="scanVisual">
                <div className="scanOrbit scanOrbitOne" />
                <div className="scanOrbit scanOrbitTwo" />
                <div className="scanBeam" />
                <div className="scanCore">SCAN</div>
              </div>

              <div className="scanText">
                <strong>Analyzing cryptographic assets...</strong>
                <span>CBOMKit is scanning the repository</span>
                <div className="scanDots">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>
          )}

          {error && <div className="error">{error}</div>}
        </section>

        {assets.length > 0 && (
          <>
            <section className="metrics">
              <Metric title="Crypto Assets" value={stats.total} symbol="◈" />
              <Metric title="Algorithms" value={stats.algorithms} symbol="⌁" />
              <Metric
                title="Source Files"
                value={stats.sourceFiles}
                symbol="▤"
              />
              <Metric title="Evidence" value={stats.evidence} symbol="◎" />
              <Metric
                title="Primitives"
                value={primitiveData.length}
                symbol="△"
              />
              <Metric
                title="Functions"
                value={functionData.length}
                symbol="◉"
              />
            </section>

            <section className="panel assetMapPanel">
              <PanelHeading
                label="CRYPTOGRAPHIC LANDSCAPE"
                title="Crypto Asset Map"
                description="Interactive visualization of discovered cryptographic assets with primitive and function distribution."
              />

              <div className="assetMapLayout">
                <AssetMap assets={topAssets} onAsset={openAsset} />
                <div className="donutColumn">
                  <DonutChart
                    title="Crypto Primitives"
                    data={primitiveData}
                  />
                  <DonutChart
                    title="Crypto Functions"
                    data={functionData}
                  />
                </div>
              </div>
            </section>

            <section className="panel topologyPanel">
              <PanelHeading
                label="RELATIONSHIP ANALYSIS"
                title="Cryptographic Topology"
                description="Relationship map between source files and cryptographic assets."
              />

              <Topology
                files={topology.files}
                assetNodes={topology.assetNodes}
                onAsset={(id) => {
                  const asset = assets.find(
                    (a) => getAssetId(a) === id
                  );
                  if (asset) openAsset(asset);
                }}
              />
            </section>

            <section className="panel inventory">
              <div className="inventoryHeader">
                <div>
                  <span className="overline">EVIDENCE INVENTORY</span>
                  <h2>Cryptographic Assets</h2>
                  <p>
                    Showing{" "}
                    {tableRows.length ? (page - 1) * perPage + 1 : 0}
                    {" – "}
                    {Math.min(page * perPage, tableRows.length)}
                    {" of "}
                    {tableRows.length}
                  </p>
                </div>
                <div className="tableBadge">10 PER PAGE</div>
              </div>

              <div className="tableScroll">
                <table className="assetTable">
                  <thead>
                    <tr>
                      <th>Crypto Asset</th>
                      <th>Type</th>
                      <th>Primitive</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRows.map((row, index) => (
                      <tr key={index}>
                        <td>
                          <button
                            className="assetButton"
                            onClick={() => openAsset(row.asset)}
                          >
                            <span className="assetDot" />
                            {row.asset.name}
                          </button>
                        </td>
                        <td>
                          <span className="type">{row.type}</span>
                        </td>
                        <td>{row.primitive}</td>
                        <td>
                          <button
                            className="location"
                            onClick={() => openAsset(row.asset)}
                          >
                            <span>
                              {row.location.split("/").pop()}
                              {row.line ? `:${row.line}` : ""}
                            </span>
                            <span>↗</span>
                          </button>
                        </td>
                      </tr>
                    ))}

                    {!currentRows.length && (
                      <tr>
                        <td colSpan="4" className="empty">
                          No cryptographic assets found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pagination">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Previous
                </button>

                <div className="pageNumbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <button
                        key={p}
                        className={p === page ? "page active" : "page"}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>

                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next →
                </button>
              </div>
            </section>
          </>
        )}

        {!loading && scannedUrl && assets.length === 0 && (
          <EmptyCryptoState scanType={scanType} scannedUrl={scannedUrl} />
        )}
      </main>

      {modalAsset && (
        <div
          className="modalOverlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="sourceModal">
            <div className="modalHeader">
              <div>
                <span className="modalType">{getType(modalAsset)}</span>
                <h2>{modalAsset.name}</h2>
              </div>
              <button className="close" onClick={closeModal}>
                ×
              </button>
            </div>

            <div className="modalMeta">
              <div>
                <span>PRIMITIVE</span>
                <strong>{getPrimitive(modalAsset)}</strong>
              </div>
              <div>
                <span>OCCURRENCES</span>
                <strong>{getOccurrences(modalAsset).length}</strong>
              </div>
            </div>

            <div className="modalBody">
              <div className="codeHeading">
                <div>
                  <span className="codeLabel">SOURCE EVIDENCE</span>
                  <h3>Detected Code</h3>
                </div>
                <span className="exactBadge">EXACT CBOM LINE</span>
              </div>

              {sourceLoading && (
                <div className="loading">
                  <div className="loader" />
                  Loading source code...
                </div>
              )}

              {sourceError && (
                <div className="sourceError">{sourceError}</div>
              )}

              {sourceData?.codeBlocks?.map((block, index) => (
                <div className="codeSection" key={index}>
                  <div className="fileName">
                    {block.filePath}
                    {block.branch ? ` • ${block.branch}` : ""}
                  </div>
                  <div className="codeBox">
                    <pre>
                      {block.codeLines.map((line, i) => (
                        <div
                          className={
                            line.detected
                              ? "sourceLine detected"
                              : "sourceLine"
                          }
                          key={i}
                        >
                          <span className="lineNo">
                            {line.lineNumber}
                          </span>
                          <span className="codeText">{line.code}</span>
                        </div>
                      ))}
                    </pre>
                  </div>
                </div>
              ))}

              {!sourceLoading &&
                !sourceError &&
                !sourceData?.codeBlocks?.length && (
                  <div className="noSource">
                    Source code is not available for this asset.
                  </div>
                )}

              <div className="detectedLocations">
                <span>DETECTED LOCATIONS</span>
                {getOccurrences(modalAsset).map((occ, index) => (
                  <div key={index}>
                    <b>{occ.line}</b>
                    <span>{occ.location}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   EMPTY CRYPTO STATE
============================================================ */
function EmptyCryptoState({ scanType, scannedUrl }) {
  return (
    <section className="emptyCryptoState">
      <div className="emptyCryptoGraphic">
        <div className="emptyRing ringOne" />
        <div className="emptyRing ringTwo" />
        <div className="emptyRing ringThree" />
        <div className="emptyCore">
          <span>◇</span>
        </div>
      </div>

      <div className="emptyCryptoContent">
        <span className="overline">ANALYSIS COMPLETE</span>
        <h2>No cryptographic assets detected</h2>
        <p>
          {scanType === "github"
            ? "CBOMKit completed the repository analysis but did not identify any cryptographic assets in the scanned source."
            : "The website analysis completed successfully but no cryptographic assets were identified in the scanned content."}
        </p>

        <div className="emptyCryptoInfo">
          <div>
            <span>STATUS</span>
            <strong>SCAN COMPLETE</strong>
          </div>
          <div>
            <span>CRYPTO ASSETS</span>
            <strong>0 DETECTED</strong>
          </div>
        </div>

        <div className="emptyCryptoHint">
          Try scanning another repository or website containing cryptographic
          operations, algorithms, or libraries.
        </div>

        <div className="emptyScannedUrl">
          <span>SCANNED</span>
          <strong title={scannedUrl}>{scannedUrl}</strong>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   METRIC
============================================================ */
function Metric({ title, value, symbol }) {
  return (
    <div className="metric">
      <div className="metricSymbol">{symbol}</div>
      <div>
        <strong>{value}</strong>
        <span>{title}</span>
      </div>
    </div>
  );
}

/* ============================================================
   PANEL HEADING
============================================================ */
function PanelHeading({ label, title, description }) {
  return (
    <div className="panelHeading">
      <span>{label}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}


function AssetMap({ assets, onAsset }) {
  const max = Math.max(...assets.map((a) => a.count), 1);

  return (
    <div className="assetMap">
      <div className="mapOrbit orbit1" />
      <div className="mapOrbit orbit2" />
      <div className="mapOrbit orbit3" />
      <div className="mapOrbit orbit4" />

      {/* Decorative floating dots — also colorized */}
      <div className="orbitBall ball1" />
      <div className="orbitBall ball2" />
      <div className="orbitBall ball3" />
      <div className="orbitBall ball4" />

      <div className="mapCore">
        <strong>CBOM</strong>
        <span>CRYPTO</span>
      </div>

      {assets.map((item, index) => {
        const angle = assets.length ? (index / assets.length) * 360 : 0;
        const radius = 120 + (index % 3) * 55;
        const size = 58 + (item.count / max) * 48;

        // Pick a color from the shared palette (loops if more assets than colors)
        const color = CHART_COLORS[index % CHART_COLORS.length];

        // Convert hex → rgb so we can build rgba() glow colors
        const hexToRgb = (hex) => {
          const h = hex.replace("#", "");
          const bigint = parseInt(
            h.length === 3
              ? h
                  .split("")
                  .map((c) => c + c)
                  .join("")
              : h,
            16
          );
          return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255,
          };
        };
        const { r, g, b } = hexToRgb(color);

        return (
          <button
            key={item.asset["bom-ref"] || index}
            className="assetOrb"
            onClick={() => onAsset(item.asset)}
            style={{
              width: size,
              height: size,
              "--angle": `${angle}deg`,
              "--radius": `${radius}px`,
              animationDelay: `${index * 0.18}s`,

              // 🎨 Custom props consumed by CSS
              "--orb-color": color,
              "--orb-color-soft": `rgba(${r}, ${g}, ${b}, 0.95)`,
              "--orb-color-deep": `rgba(${Math.max(r - 60, 0)}, ${Math.max(
                g - 60,
                0
              )}, ${Math.max(b - 60, 0)}, 0.9)`,
              "--orb-glow": `rgba(${r}, ${g}, ${b}, 0.55)`,
              "--orb-glow-strong": `rgba(${r}, ${g}, ${b}, 0.9)`,
            }}
          >
            <span className="orbName">{item.asset.name}</span>
            <span className="orbCount">
              {item.count}
              <small>
                {item.count === 1 ? " occurrence" : " occurrences"}
              </small>
            </span>
          </button>
        );
      })}
    </div>
  );
}



function DonutChart({ title, data }) {
  const total = data.reduce((sum, [, value]) => sum + value, 0);
  const colors = CHART_COLORS;

  let currentAngle = -90;

  const segments = data.map(([name, value], index) => {
    const percentage = total ? value / total : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + percentage * 360;
    currentAngle = endAngle;

    return {
      name,
      value,
      percentage,
      startAngle,
      endAngle,
      color: colors[index % colors.length],
    };
  });

  const polarToCartesian = (cx, cy, radius, angle) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(radians),
      y: cy + radius * Math.sin(radians),
    };
  };

  const describeArc = (startAngle, endAngle) => {
    const outerStart = polarToCartesian(100, 100, 72, endAngle);
    const outerEnd = polarToCartesian(100, 100, 72, startAngle);
    const innerStart = polarToCartesian(100, 100, 48, endAngle);
    const innerEnd = polarToCartesian(100, 100, 48, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `
      M ${outerStart.x} ${outerStart.y}
      A 72 72 0 ${largeArc} 0
      ${outerEnd.x} ${outerEnd.y}
      L ${innerEnd.x} ${innerEnd.y}
      A 48 48 0 ${largeArc} 1
      ${innerStart.x} ${innerStart.y}
      Z
    `;
  };

  return (
    <div className="donutCard">
      <div className="donutTitle">{title}</div>

      <div className="donutChartArea">
        <svg viewBox="0 0 200 200" className="donutSvg">
          <circle cx="100" cy="100" r="72" className="donutBackground" />

          {segments.map((segment, index) => {
            const middleAngle =
              (segment.startAngle + segment.endAngle) / 2;
            const labelPosition = polarToCartesian(
              100,
              100,
              60,
              middleAngle
            );

            return (
              <g key={segment.name}>
                <path
                  d={describeArc(segment.startAngle, segment.endAngle)}
                  fill={segment.color}
                  className="donutSegment"
                  style={{ "--delay": `${index * 0.08}s` }}
                />
                {segment.percentage >= 0.06 && (
                  <text
                    x={labelPosition.x}
                    y={labelPosition.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="donutPercentage"
                  >
                    {(segment.percentage * 100).toFixed(0)}%
                  </text>
                )}
              </g>
            );
          })}

          <text x="100" y="95" textAnchor="middle" className="donutTotal">
            {total}
          </text>
          <text
            x="100"
            y="113"
            textAnchor="middle"
            className="donutCenterLabel"
          >
            Assets
          </text>
        </svg>
      </div>

      <div className="donutLegend">
        {segments.map((segment) => (
          <div className="legendItem" key={segment.name}>
            <span
              className="legendColor"
              style={{
                background: segment.color,
                color: segment.color,
              }}
            />
            <span>{segment.name}</span>
            <b>{segment.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function Topology({ files, assetNodes, onAsset }) {
  const width = 1150;
  const rowGap = 58;

  const height = Math.max(
    500,
    Math.max(files.length, assetNodes.length) * rowGap + 80
  );

  const leftX = 210;
  const rightX = 910;

  const filePositions = {};
  const assetPositions = {};

  files.forEach(([file], i) => {
    filePositions[file] = { x: leftX, y: 65 + i * rowGap };
  });

  assetNodes.forEach((node, i) => {
    assetPositions[node.id] = {
      x: rightX,
      y: 65 + i * rowGap,
      name: node.name,
    };
  });

  return (
    <div className="topology">
      <div className="topologyLegend">
        <span>
          <i className="legendFile" />
          Source
        </span>
        <span>
          <i className="legendAsset" />
          Crypto Asset
        </span>
        <span>
          <i className="legendConnection" />
          Relationship
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="nodeGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient
            id="connectionGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>

        <text x={leftX} y="25" textAnchor="middle" className="svgLabel">
          SOURCE FILES
        </text>
        <text x={rightX} y="25" textAnchor="middle" className="svgLabel">
          CRYPTO ASSETS
        </text>

        {/* CONNECTIONS — one path per (file → asset-id) pair.
            Dynamic control points + vertical spread make every
            connection visible even when source.y === target.y. */}
        {files.flatMap(([file, list]) =>
          list.map((node, k) => {
            const source = filePositions[file];
            const target = assetPositions[node.id];
            if (!source || !target) return null;

            const dy = target.y - source.y;

            // When source & target share the same Y, arc the curve
            // gently so the two endpoints don't visually collapse.
            // Also alternate direction slightly to avoid overlapping
            // when multiple assets connect to the same file.
            const sameRow = dy === 0;
            const dir = k % 2 === 0 ? 1 : -1;
            const spread = sameRow ? 45 * dir : 0;

            const midX1 = source.x + (target.x - source.x) * 0.35;
            const midX2 = source.x + (target.x - source.x) * 0.65;

            const path = `
              M ${source.x + 10} ${source.y}
              C ${midX1} ${source.y + spread},
                ${midX2} ${target.y - spread},
                ${target.x - 10} ${target.y}
            `;

            return (
              <path
                key={`${file}::${node.id}`}
                d={path}
                className="connectionPath"
              />
            );
          })
        )}

        {/* SOURCE NODES */}
        {Object.entries(filePositions).map(([file, pos]) => (
          <g key={file} className="sourceNode">
            <circle
              cx={pos.x}
              cy={pos.y}
              r="10"
              className="sourceCircle"
            />
            <circle
              cx={pos.x}
              cy={pos.y}
              r="17"
              className="sourcePulse"
            />
            <text
              x={pos.x - 23}
              y={pos.y + 4}
              textAnchor="end"
              className="nodeText"
            >
              {file.split("/").pop()}
            </text>
          </g>
        ))}

        {/* ASSET NODES */}
        {Object.entries(assetPositions).map(([id, pos]) => (
          <g
            key={id}
            className="cryptoNode"
            onClick={() => onAsset(id)}
          >
            <circle
              cx={pos.x}
              cy={pos.y}
              r="14"
              className="cryptoCircle"
            />
            <circle
              cx={pos.x}
              cy={pos.y}
              r="21"
              className="cryptoPulse"
            />
            <text
              x={pos.x + 31}
              y={pos.y + 4}
              className="nodeText assetText"
            >
              {pos.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default App;