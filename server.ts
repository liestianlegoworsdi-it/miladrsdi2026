import express from "express";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const apiRouter = express.Router();

// Helper to handle GAS Redirects (GAS always redirects on POST/GET)
async function fetchGAS(method: string, body?: any) {
  // Use the latest URL as fallback
  const url = (process.env.GAS_WEBAPP_URL || "https://script.google.com/macros/s/AKfycbxUC4lDq2OaZEHDmlYsJm1dBlltD6qqm8vbVmTaFtvayDm86z3w6ykaw8y6QkgsERrRbA/exec").trim();
  
  if (!url.startsWith("http")) {
    throw new Error(`GAS_WEBAPP_URL tidak valid: ${url.substring(0, 20)}...`);
  }

  const options: any = {
    method: method,
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    redirect: 'follow'
  };
  
  if (body) options.body = JSON.stringify(body);

  const urlPreview = url.includes("/s/") ? url.split("/s/")[1].substring(0, 10) : "...";
  console.log(`[GAS] ${method} -> ${urlPreview}...`);
  
  try {
    const controller = new AbortController();
    const timeoutSignal = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout

    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutSignal);
    
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`GAS HTTP Error: ${response.status} - ${errText.substring(0, 100)}`);
    }
    
    const text = await response.text();
    
    try {
      return JSON.parse(text);
    } catch (e) {
      if (text.includes("<!DOCTYPE html>") || text.includes("<html")) {
        throw new Error("Google Script returned HTML (Deployment issue: ensure it is deployed as 'Web App' and accessible by 'Anyone').");
      }
      throw new Error(`GAS returned invalid JSON: ${text.substring(0, 100)}...`);
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error("Google Apps Script timeout (memakan waktu lebih dari 12 detik).");
    }
    console.error("[GAS Error]", err.message);
    throw err;
  }
}

// Health check
apiRouter.get("/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV });
});

// API Routes
apiRouter.get("/donations", async (req, res) => {
  try {
    console.log("Requesting donations...");
    const data = await fetchGAS("GET");
    
    if (!data || !Array.isArray(data)) {
      throw new Error(`GAS returned invalid data format: ${typeof data}`);
    }

    // Mapping keys from GAS to expected frontend keys
    const mapped = data.map((item: any) => ({
      id: String(item["NO"] || ""),
      vendorName: item["VENDOR"] || "",
      cb2025: Number(String(item["KONTRIBUSI CB 2025"] || "0").replace(/,/g, "")),
      targetAmount: Number(String(item["TARGET"] || "0").replace(/,/g, "")),
      proposalDate: item["TGL. PROPOSAL"] || "",
      sentDate: item["SENT"] || "",
      amount: Number(String(item["NILAI KOMITMEN"] || "0").replace(/,/g, "")),
      paymentMethod: item["PAID"] || "",
      status: item["NILAI KOMITMEN"] ? (item["PAID"] ? 'Received' : 'Confirmed') : 'Pledge',
    }));

    res.json(mapped);
  } catch (error: any) {
    console.error("GAS Fetch Error:", error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post("/donations", async (req, res) => {
  try {
    const result = await fetchGAS("POST", { ...req.body, action: 'upsert' });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete("/donations/:id", async (req, res) => {
  try {
    const result = await fetchGAS("POST", { id: req.params.id, action: 'delete' });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.use("/api", apiRouter);

// Vite middleware setup
export async function startServer() {
  const isVercel = !!process.env.VERCEL;
  const isProd = process.env.NODE_ENV === "production" || isVercel;

  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite dev middleware loaded");
    } catch (e) {
      console.error("Failed to load Vite middleware:", e);
    }
  } else if (!isVercel) {
    // Only serve static files manually if NOT on Vercel 
    // (Vercel has its own optimized static serving)
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Only listen if not on Vercel
  if (!isVercel) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  }
}

// Start server
if (!process.env.VERCEL) {
  startServer().catch(err => {
    console.error("Failed to start server:", err);
  });
}

export default app;
