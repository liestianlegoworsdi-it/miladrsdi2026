import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to handle GAS Redirects (GAS always redirects on POST/GET)
async function fetchGAS(method: string, body?: any) {
  const url = process.env.GAS_WEBAPP_URL;
  if (!url) {
    throw new Error("GAS_WEBAPP_URL is not defined. Please add your Google Apps Script Web App URL to the Secrets/Settings panel.");
  }
  
  const options: any = {
    method: method,
    headers: { 'Content-Type': 'application/json' },
  };
  
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  return await response.json();
}

// API Routes
app.get("/api/donations", async (req, res) => {
  try {
    const data = await fetchGAS("GET");
    
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

app.post("/api/donations", async (req, res) => {
  try {
    const result = await fetchGAS("POST", { ...req.body, action: 'upsert' });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/donations/:id", async (req, res) => {
  try {
    const result = await fetchGAS("POST", { id: req.params.id, action: 'delete' });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
