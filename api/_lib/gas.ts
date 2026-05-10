import fetch from "node-fetch";

// Helper to handle GAS Redirects
export async function fetchGAS(method: string, body?: any) {
  const url = (process.env.GAS_WEBAPP_URL || "https://script.google.com/macros/s/AKfycbxUC4lDq2OaZEHDmlYsJm1dBlltD6qqm8vbVmTaFtvayDm86z3w6ykaw8y6QkgsERrRbA/exec").trim();
  
  if (!url.startsWith("http")) {
    throw new Error("GAS_WEBAPP_URL is missing or invalid.");
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
