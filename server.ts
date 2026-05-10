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
  const url = process.env.GAS_WEBAPP_URL || "https://script.google.com/macros/s/AKfycbx5Fd3bV2kSpXr3JCi6eucVBhHB7CivrknQt7tg7Lvl2pDUxT3Cwoi65yzw4QXMq2KVUg/exec";
  
  const options: any = {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    redirect: 'follow'
  };
  
  if (body) options.body = JSON.stringify(body);

  console.log(`[fetchGAS] Method: ${method}, URL: ${url}`);
  try {
    const response = await fetch(url, options);
    console.log(`[fetchGAS] Status: ${response.status}, OK: ${response.ok}`);
    
    // Some GAS scripts return text/plain or text/html even for JSON success (if there's a redirect issue)
    const text = await response.text();
    console.log(`[fetchGAS] Response start: ${text.substring(0, 100)}`);

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("[fetchGAS] Parsing JSON failed");
      if (text.includes("<!DOCTYPE html>") || text.includes("<html")) {
        throw new Error("Google Script mengembalikan halaman HTML. Pastikan Web App sudah di-deploy sebagai 'Anyone'.");
      }
      throw new Error(`Respon non-JSON dari Google Script: ${text.substring(0, 50)}...`);
    }
  } catch (err: any) {
    console.error("[fetchGAS] Error:", err);
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Only listen if this file is run directly (not imported as a module)
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

// Start server
if (!process.env.VERCEL) {
  startServer().catch(err => {
    console.error("Failed to start server:", err);
  });
}

export default app;
