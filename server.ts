import express from "express";
import path from "path";
import axios from "axios";
import crypto from "crypto";
import "dotenv/config";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini Share Progress Image Generation
  app.post("/api/share-progress", async (req, res) => {
    try {
      const { courseName, progressPercent, studentName } = req.body;
      if (!courseName || progressPercent === undefined) {
        return res.status(400).json({ error: "courseName and progressPercent are required." });
      }

      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const studentString = studentName ? `for student ${studentName}` : "";
      const promptText = `Create a beautiful, professional, high-end 16:9 social media sharing card ${studentString} celebrating completing ${progressPercent}% of the course "${courseName}" at Cutscene Academy. The design must be extremely modern, clean, with a sleek dark slate background, elegant purple neon glows and light accents. It should display "CUTSCENE ACADEMY", the course title "${courseName}", and "${progressPercent}% COMPLETED" in bold, elegant, high-contrast futuristic typography. Minimalist, high quality, flat design UI dashboard style, photorealistic graphic design.`;

      console.log(`Generating progress share image for "${courseName}" (${progressPercent}%) using gemini-2.5-flash-image...`);

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            {
              text: promptText,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      });

      let base64Image = null;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            base64Image = part.inlineData.data;
            break;
          }
        }
      }

      if (base64Image) {
        res.json({ success: true, image: `data:image/png;base64,${base64Image}` });
      } else {
        console.error("No inlineData image found in response parts.");
        res.status(500).json({ error: "Failed to generate image bytes from Gemini." });
      }
    } catch (error: any) {
      console.error("Gemini Image Gen Error:", error.message || error);
      res.status(500).json({ error: "Failed to generate image via Gemini API." });
    }
  });

  const SIGNING_SECRET = "bunny-custom-signing-secret-123456";

  // Endpoint to issue a secure, signed upload URL/parameters
  app.post("/api/bunny-upload-signed-url", async (req, res) => {
    try {
      const { filename } = req.body;
      if (!filename) {
        return res.status(400).json({ error: "Filename is required" });
      }

      // Generate sanitized unique filename
      const timestamp = Date.now();
      const sanitizedName = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const uniqueFilename = `${timestamp}-${sanitizedName}`;
      
      const expires = Math.floor(Date.now() / 1000) + 1200; // valid for 20 minutes
      
      // Sign the filename and expiration to prevent URL tampering
      const signature = crypto
        .createHmac("sha256", SIGNING_SECRET)
        .update(`${uniqueFilename}:${expires}`)
        .digest("hex");

      const uploadUrl = `/api/bunny-upload?filename=${encodeURIComponent(uniqueFilename)}&expires=${expires}&signature=${signature}`;

      res.json({
        uploadUrl,
        uniqueFilename,
        expires
      });
    } catch (error: any) {
      console.error("Error generating signed upload parameters:", error);
      res.status(500).json({ error: "Failed to generate upload signature." });
    }
  });

  // Proxy endpoint carrying out the actual secure upload stream
  app.put("/api/bunny-upload", express.raw({ type: "*/*", limit: "50mb" }), async (req, res) => {
    try {
      const { filename, expires, signature } = req.query;

      if (!filename || !expires || !signature) {
        return res.status(400).json({ error: "Missing required parameters." });
      }

      // 1. Verify expiration
      if (Math.floor(Date.now() / 1000) > parseInt(expires as string, 10)) {
        return res.status(403).json({ error: "Temporary upload URL has expired." });
      }

      // 2. Cryptographically verify signature
      const expectedSignature = crypto
        .createHmac("sha256", SIGNING_SECRET)
        .update(`${filename}:${expires}`)
        .digest("hex");

      if (signature !== expectedSignature) {
        return res.status(403).json({ error: "Invalid signature authorization." });
      }

      // 3. Securely proxy the payload to BunnyCDN Storage API
      const fileBuffer = req.body;
      if (!fileBuffer || fileBuffer.length === 0) {
        return res.status(400).json({ error: "No payload stream provided." });
      }

      const bunnyStorageZone = process.env.BUNNY_STORAGE_ZONE || "cutscene-storage";
      const bunnyAccessKey = process.env.BUNNY_ACCESS_KEY || "de0028e8-d60e-41f8-aa8d9c23763b-0610-4dd6";
      const rawRegion = (process.env.BUNNY_STORAGE_REGION || "").trim().toLowerCase();
      // Default Falkenstein/DE region has no subdomain prefix on the storage endpoint
      const isDefaultRegion = !rawRegion || rawRegion === "de" || rawRegion === "default";
      const bunnyRegion = isDefaultRegion ? "" : rawRegion;
      const bunnyPullZone = process.env.BUNNY_PULL_ZONE || "cutscenedz.b-cdn.net";

      const host = bunnyRegion ? `${bunnyRegion}.storage.bunnycdn.com` : "storage.bunnycdn.com";
      const targetUrl = `https://${host}/${bunnyStorageZone}/${filename}`;

      console.log(`Secured signed upload incoming: Proxying ${filename} to BunnyCDN Storage on ${host}...`);

      const response = await axios.put(targetUrl, fileBuffer, {
        headers: {
          AccessKey: bunnyAccessKey,
          "Content-Type": "application/octet-stream"
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      console.log(`BunnyCDN response code: ${response.status}`);

      const publicUrl = `https://${bunnyPullZone}/${filename}`;

      res.json({
        success: true,
        filename,
        publicUrl
      });
    } catch (error: any) {
      console.error("BunnyCDN Edge Upload error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to deliver file to BunnyCDN Storage API." });
    }
  });

  // Google Search Console verification
  app.get("/google6a12a3d2ac0ead47.html", (_req, res) => {
    res.type("html").send("google-site-verification: google6a12a3d2ac0ead47.html");
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
