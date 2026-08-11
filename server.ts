import express from "express";
import path from "path";
import fs from "fs";
import axios from "axios";
import crypto from "crypto";
import "dotenv/config";

let cachedSeoConfig: any = null;
let lastSeoCacheTime = 0;

async function getFirestoreSeoConfig() {
  const now = Date.now();
  if (cachedSeoConfig && (now - lastSeoCacheTime < 30000)) {
    return cachedSeoConfig;
  }
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (!fs.existsSync(configPath)) return null;
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsedConfig = JSON.parse(raw);
    const projectId = parsedConfig.projectId;
    const databaseId = parsedConfig.firestoreDatabaseId || "(default)";

    if (!projectId) return null;

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/config/seo`;
    const res = await axios.get(firestoreUrl, { timeout: 2500 });

    if (res.data && res.data.fields) {
      const fields = res.data.fields;
      const parsed: any = {};
      if (fields.globalTitle?.stringValue) parsed.globalTitle = fields.globalTitle.stringValue;
      if (fields.globalDescription?.stringValue) parsed.globalDescription = fields.globalDescription.stringValue;
      if (fields.globalImage?.stringValue) parsed.globalImage = fields.globalImage.stringValue;

      if (fields.routes?.arrayValue?.values) {
        parsed.routes = fields.routes.arrayValue.values.map((item: any) => {
          const map = item.mapValue?.fields || {};
          return {
            path: map.path?.stringValue || '',
            title: map.title?.stringValue || '',
            description: map.description?.stringValue || '',
            image: map.image?.stringValue || ''
          };
        });
      }

      cachedSeoConfig = parsed;
      lastSeoCacheTime = now;
      return parsed;
    }
  } catch (err) {
    // Non-blocking fallback
  }
  return cachedSeoConfig;
}

function getOgMetadataForPath(urlPath: string, host: string, protocol: string, config?: any) {
  const cleanHost = host.split(":")[0];
  const baseUrl = `${protocol}://${cleanHost}`;
  const fullUrl = `${baseUrl}${urlPath}`;

  let title = config?.globalTitle || "Cutscene - Video Editing Course";
  let description = config?.globalDescription || "Learn video editing from scratch with our complete course.";
  let image = config?.globalImage || "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop";

  const p = urlPath.toLowerCase();

  // If Firestore dynamic config exists, match routes
  if (config?.routes && Array.isArray(config.routes) && config.routes.length > 0) {
    const exactMatch = config.routes.find((r: any) => r.path && r.path.toLowerCase() === p);
    if (exactMatch) {
      return {
        title: exactMatch.title || title,
        description: exactMatch.description || description,
        image: exactMatch.image || image,
        url: fullUrl
      };
    }

    const sortedRoutes = [...config.routes].sort((a: any, b: any) => (b.path?.length || 0) - (a.path?.length || 0));
    const prefixMatch = sortedRoutes.find((r: any) => r.path && r.path !== '/' && p.startsWith(r.path.toLowerCase()));
    if (prefixMatch) {
      return {
        title: prefixMatch.title || title,
        description: prefixMatch.description || description,
        image: prefixMatch.image || image,
        url: fullUrl
      };
    }
  }

  // Fallbacks
  if (p.includes('/courses/') && (p.includes('/video/') || p.includes('/quiz/') || p.includes('/exercise/'))) {
    title = "Cutscene - Video Editing Course Session";
    description = "Learn video editing from scratch with our complete course.";
    image = "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop";
  } else if (p.includes('/courses/1')) {
    title = "Cutscene - Video Editing 101";
    description = "Master professional video editing from scratch with Premiere Pro, DaVinci Resolve and After Effects.";
    image = "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop";
  } else if (p.includes('/courses/2')) {
    title = "Cutscene - Web Development Bootcamp";
    description = "Build modern web applications from scratch with React, TypeScript, and Tailwind CSS.";
    image = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop";
  } else if (p.includes('/courses/3')) {
    title = "Cutscene - Advanced Frontend Engineering";
    description = "Master full-stack web architecture, interactive UIs, and state management.";
    image = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200&auto=format&fit=crop";
  } else if (p.includes('/courses/4')) {
    title = "Cutscene - VFX & Motion Graphics Masterclass";
    description = "Create stunning visual effects, 3D motion graphics, and compositing like a pro.";
    image = "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=1200&auto=format&fit=crop";
  } else if (p.startsWith('/courses')) {
    title = "Cutscene - Video Editing & Tech Courses";
    description = "Explore our complete masterclass curricula in video editing, motion graphics, and web development.";
    image = "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop";
  } else if (p.startsWith('/store')) {
    title = "Cutscene Store - Video Assets, Plugins & LUTs";
    description = "Download high-quality video editing templates, LUTs, light leaks, sound effects, and motion graphic presets.";
    image = "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1200&auto=format&fit=crop";
  } else if (p.startsWith('/resources')) {
    title = "Cutscene Resources - Free Editing Packs";
    description = "Access free editing assets, project files, keyboard shortcut cheat sheets, and creative tools.";
    image = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop";
  } else if (p.startsWith('/student-work')) {
    title = "Cutscene Showcase - Student Edits & Projects";
    description = "Discover amazing video edits, visual effects, and web apps created by Cutscene Academy students.";
    image = "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=1200&auto=format&fit=crop";
  } else if (p.startsWith('/support')) {
    title = "Cutscene Support & Help Desk";
    description = "Get instant assistance, reach technical support via WhatsApp or Email, and find FAQs.";
    image = "https://images.unsplash.com/photo-1534536281715-e28d76689b4d?q=80&w=1200&auto=format&fit=crop";
  } else if (p.startsWith('/complete-order') || p.startsWith('/payment')) {
    title = "Cutscene Checkout - Course Enrollment";
    description = "Securely complete your enrollment in Cutscene Academy masterclasses.";
    image = "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop";
  }

  return { title, description, image, url: fullUrl };
}

function renderHtmlWithMeta(htmlTemplate: string, meta: { title: string; description: string; image: string; url: string }) {
  const ogTags = `
    <title>${meta.title}</title>
    <meta name="title" content="${meta.title}" />
    <meta name="description" content="${meta.description}" />

    <!-- Open Graph / Facebook / WhatsApp / Instagram -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${meta.url}" />
    <meta property="og:title" content="${meta.title}" />
    <meta property="og:description" content="${meta.description}" />
    <meta property="og:image" content="${meta.image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${meta.url}" />
    <meta name="twitter:title" content="${meta.title}" />
    <meta name="twitter:description" content="${meta.description}" />
    <meta name="twitter:image" content="${meta.image}" />
  `;

  let cleaned = htmlTemplate
    .replace(/<title>.*?<\/title>/gi, '')
    .replace(/<meta\s+property=["']og:[^"']+["']\s+content=["'][^"']*["']\s*\/?>/gi, '')
    .replace(/<meta\s+content=["'][^"']*["']\s+property=["']og:[^"']+["']\s*\/?>/gi, '')
    .replace(/<meta\s+name=["']twitter:[^"']+["']\s+content=["'][^"']*["']\s*\/?>/gi, '')
    .replace(/<meta\s+content=["'][^"']*["']\s+name=["']twitter:[^"']+["']\s*\/?>/gi, '')
    .replace(/<meta\s+name=["'](title|description)["']\s+content=["'][^"']*["']\s*\/?>/gi, '');

  return cleaned.replace('</head>', `${ogTags}\n  </head>`);
}

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
      let { filename } = req.body || {};
      if (!filename || typeof filename !== "string" || !filename.trim()) {
        filename = `upload_${Date.now()}.jpg`;
      }

      // Generate sanitized unique filename
      const timestamp = Date.now();
      const extension = path.extname(filename) || ".jpg";
      const baseName = path.basename(filename, extension);
      const sanitizedBase = baseName.replace(/[^a-zA-Z0-9.\-_]/g, "_") || "file";
      const uniqueFilename = `${timestamp}-${sanitizedBase}${extension}`;
      
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

  // XML Sitemap for search engines & Google Search Console
  app.get("/sitemap.xml", (_req, res) => {
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Core Main Pages -->
  <url>
    <loc>https://cutscene-academy.com/</loc>
    <lastmod>2026-08-03</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://cutscene-academy.com/courses</loc>
    <lastmod>2026-08-03</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://cutscene-academy.com/store</loc>
    <lastmod>2026-08-03</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://cutscene-academy.com/resources</loc>
    <lastmod>2026-08-03</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://cutscene-academy.com/student-work</loc>
    <lastmod>2026-08-03</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://cutscene-academy.com/support</loc>
    <lastmod>2026-08-03</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Individual Courses -->
  <url>
    <loc>https://cutscene-academy.com/courses/1</loc>
    <lastmod>2026-08-03</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://cutscene-academy.com/courses/2</loc>
    <lastmod>2026-08-03</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://cutscene-academy.com/courses/3</loc>
    <lastmod>2026-08-03</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://cutscene-academy.com/courses/4</loc>
    <lastmod>2026-08-03</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Legal & Account Pages -->
  <url>
    <loc>https://cutscene-academy.com/login</loc>
    <lastmod>2026-08-03</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://cutscene-academy.com/terms-and-conditions</loc>
    <lastmod>2026-08-03</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://cutscene-academy.com/privacy-policy</loc>
    <lastmod>2026-08-03</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>`;
    res.type("application/xml").send(sitemapXml);
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
    app.use(express.static(distPath, { index: false }));

    app.get("*all", async (req, res) => {
      try {
        const indexPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          const template = fs.readFileSync(indexPath, "utf-8");
          const protocol = req.headers["x-forwarded-proto"] ? String(req.headers["x-forwarded-proto"]) : req.protocol;
          const host = req.headers["x-forwarded-host"] ? String(req.headers["x-forwarded-host"]) : req.get("host") || "cutscene-academy.com";

          const seoConfig = await getFirestoreSeoConfig();
          const meta = getOgMetadataForPath(req.path, host, protocol, seoConfig);
          const html = renderHtmlWithMeta(template, meta);
          return res.status(200).set({ "Content-Type": "text/html" }).end(html);
        }
      } catch (err) {
        console.error("Error rendering index.html with OG meta tags:", err);
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
