import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

if (!process.env.VERCEL) {
  config();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Logger
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[${req.method}] ${req.url}`);
  }
  next();
});

// Simple CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
  next();
});

// Health check (Top level)
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL
  });
});

// Header for versioning/debugging in response
app.use((req, res, next) => {
  res.header("X-App-Version", "1.0.1");
  next();
});

const apiRouter = express.Router();

// Helper to handle GAS Redirects
async function fetchGAS(method: string, body?: any) {
  const url = (process.env.GAS_WEBAPP_URL || "https://script.google.com/macros/s/AKfycbxUC4lDq2OaZEHDmlYsJm1dBlltD6qqm8vbVmTaFtvayDm86z3w6ykaw8y6QkgsERrRbA/exec").trim();
  
  if (!url.startsWith("http")) {
    throw new Error(`GAS_WEBAPP_URL is missing or invalid.`);
  }

  const options: any = {
    method,
    headers: { 'Content-Type': 'application/json' },
    redirect: 'follow'
  };
  
  if (body) options.body = JSON.stringify(body);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`GAS HTTP ${response.status}`);
    }
    
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      if (text.includes("<!DOCTYPE html>")) {
        throw new Error("GAS returned HTML. Check 'Anyone' access.");
      }
      throw new Error("GAS returned invalid JSON.");
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error("GAS Timeout.");
    throw err;
  }
}

// API Routes
apiRouter.get("/donations", async (req, res) => {
  try {
    const data = await fetchGAS("GET");
    
    if (!data || !Array.isArray(data)) {
      console.error("[Backend] Invalid data from GAS:", data);
      throw new Error(`Invalid GAS response format`);
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
    console.error("API /donations Error:", error.message);
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

// Vite / Static serving setup
async function setupFrontend() {
  const isVercel = !!process.env.VERCEL;
  if (process.env.NODE_ENV !== "production" && !isVercel) {
    try {
      // @ts-ignore
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error("Vite skip:", e);
    }
  } else if (!isVercel) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

// Only listen if not on Vercel
if (!process.env.VERCEL) {
  setupFrontend().then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  });
}

export default app;
