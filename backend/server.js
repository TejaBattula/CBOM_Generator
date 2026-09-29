require("dotenv").config();
const express=require("express");
const cors=require("cors");
const http=require("http");
const https=require("https");
const {scanWebsite}=require("./websitescanner");

const app=express();
app.use(cors());
app.use(express.json());

const CBOMKIT_URL=process.env.CBOMKIT_URL||"http://localhost:8081";

app.get("/",(req,res)=>{
  res.json({message:"CBOM Backend is running"});
});

function httpsGet(url,headers={}){
  return new Promise((resolve,reject)=>{
    const request=https.get(url,{headers},response=>{
      let data="";
      response.on("data",chunk=>data+=chunk);
      response.on("end",()=>resolve({
        statusCode:response.statusCode,
        data
      }));
    });
    request.on("error",reject);
  });
}

function parseGithubUrl(githubUrl){
  const url=new URL(githubUrl);
  if(url.hostname!=="github.com") throw new Error("Only GitHub URLs are supported");
  const parts=url.pathname.split("/").filter(Boolean);
  if(parts.length<2) throw new Error("Invalid GitHub repository URL");
  return {
    owner:parts[0],
    repo:parts[1].replace(/\.git$/,"")
  };
}

function pollForCBOM(githubUrl,res,attempts=24){
  const cbomkitUrl=new URL("/api/v1/cbom/last/10",CBOMKIT_URL);

  const request=http.request({
    hostname:cbomkitUrl.hostname,
    port:cbomkitUrl.port||80,
    path:cbomkitUrl.pathname,
    method:"GET"
  },response=>{
    let data="";
    response.on("data",chunk=>data+=chunk);

    response.on("end",()=>{
      try{
        const cboms=JSON.parse(data);
        const matchingCBOM=cboms.find(item=>item.gitUrl===githubUrl);

        if(matchingCBOM){
          return res.json({
            success:true,
            message:"CBOM generated successfully",
            githubUrl,
            cbom:matchingCBOM.bom
          });
        }

        if(attempts<=1){
          return res.status(202).json({
            success:true,
            message:"Scan is taking longer than expected",
            githubUrl
          });
        }

        setTimeout(
          ()=>pollForCBOM(githubUrl,res,attempts-1),
          5000
        );
      }catch(error){
        return res.status(500).json({
          success:false,
          error:"Could not read CBOM"
        });
      }
    });
  });

  request.on("error",()=>{
    return res.status(500).json({
      success:false,
      error:"Could not connect to CBOMkit"
    });
  });

  request.end();
}

app.post("/api/cbom/generate",(req,res)=>{
  const {githubUrl}=req.body;

  if(!githubUrl){
    return res.status(400).json({
      success:false,
      error:"GitHub URL is required"
    });
  }

  const data=JSON.stringify({scanUrl:githubUrl});
  const cbomkitUrl=new URL("/api/v1/scan",CBOMKIT_URL);

  const request=http.request({
    hostname:cbomkitUrl.hostname,
    port:cbomkitUrl.port||80,
    path:cbomkitUrl.pathname,
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Content-Length":Buffer.byteLength(data)
    }
  },response=>{
    response.on("data",()=>{});

    response.on("end",()=>{
      if(response.statusCode!==202){
        return res.status(response.statusCode).json({
          success:false,
          error:"CBOMkit could not start the scan"
        });
      }

      pollForCBOM(githubUrl,res);
    });
  });

  request.on("error",()=>{
    return res.status(500).json({
      success:false,
      error:"Could not connect to CBOMkit"
    });
  });

  request.write(data);
  request.end();
});

app.post("/api/website/scan",async(req,res)=>{
  const {websiteUrl}=req.body;

  if(!websiteUrl){
    return res.status(400).json({
      success:false,
      error:"Website URL is required"
    });
  }

  try{
    const cryptoAssets=await scanWebsite(websiteUrl);

    return res.json({
      success:true,
      message:"Website scanned successfully",
      websiteUrl,
      cryptoAssets,
      totalAssets:cryptoAssets.length
    });
  }catch(error){
    return res.status(500).json({
      success:false,
      error:"Website scan failed"
    });
  }
});

/* GET SOURCE CODE WITH CONTEXT */
app.post("/api/source-code",async(req,res)=>{
  const {githubUrl,filePath,lines}=req.body;

  if(!githubUrl||!filePath){
    return res.status(400).json({
      success:false,
      error:"GitHub URL and file path are required"
    });
  }

  try{
    const {owner,repo}=parseGithubUrl(githubUrl);

    const headers={
      "User-Agent":"CBOM-Generator",
      "Accept":"application/vnd.github+json"
    };

    if(process.env.GITHUB_TOKEN){
      headers.Authorization=`Bearer ${process.env.GITHUB_TOKEN}`;
    }

    /* Get repository default branch */
    const repoResponse=await httpsGet(
      `https://api.github.com/repos/${owner}/${repo}`,
      headers
    );

    if(repoResponse.statusCode<200||repoResponse.statusCode>=300){
      return res.status(repoResponse.statusCode||500).json({
        success:false,
        error:"Could not access GitHub repository"
      });
    }

    const repoData=JSON.parse(repoResponse.data);
    const branch=repoData.default_branch;

    /* Get source file */
    const encodedPath=filePath
      .replace(/^\/+/,"")
      .split("/")
      .map(part=>encodeURIComponent(part))
      .join("/");

    const fileUrl=
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;

    const fileResponse=await httpsGet(fileUrl,headers);

    if(fileResponse.statusCode<200||fileResponse.statusCode>=300){
      return res.status(fileResponse.statusCode||500).json({
        success:false,
        error:"Could not find source file in GitHub"
      });
    }

    const fileData=JSON.parse(fileResponse.data);

    if(fileData.type!=="file"||!fileData.content){
      return res.status(400).json({
        success:false,
        error:"Selected path is not a readable file"
      });
    }

    const sourceCode=Buffer
      .from(fileData.content,"base64")
      .toString("utf8");

    const sourceLines=sourceCode.split(/\r?\n/);

    const detectedLines=[
      ...new Set(
        (Array.isArray(lines)?lines:[])
          .map(Number)
          .filter(line=>Number.isInteger(line)&&line>0)
      )
    ].sort((a,b)=>a-b);

    /*
      Show 4 lines before and 4 lines after
      the CBOM detected line.
    */
    const codeBlocks=detectedLines.map(lineNumber=>{
      const start=Math.max(1,lineNumber-4);
      const end=Math.min(sourceLines.length,lineNumber+4);

      const codeLines=[];

      for(let i=start;i<=end;i++){
        codeLines.push({
          lineNumber:i,
          code:sourceLines[i-1],
          detected:i===lineNumber
        });
      }

      return {
        detectedLine:lineNumber,
        startLine:start,
        endLine:end,
        codeLines
      };
    });

    return res.json({
      success:true,
      repository:`${owner}/${repo}`,
      branch,
      filePath,
      codeBlocks
    });

  }catch(error){
    console.error("Source code error:",error);

    return res.status(500).json({
      success:false,
      error:error.message||"Failed to fetch source code"
    });
  }
});

const PORT=process.env.PORT||5000;

app.listen(PORT,()=>{
  console.log(`Backend running on port ${PORT}`);
});