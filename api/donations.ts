import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchGAS } from './_lib/gas';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const data = await fetchGAS("GET");
      
      if (!data || !Array.isArray(data)) {
        throw new Error(`Invalid GAS response format`);
      }

      const mapped = data.map((item: any) => ({
        id: String(item.id || item.NO || ''),
        vendor: String(item.vendor || item.VENDOR || ''),
        amount: Number(item.amount || item.KONTRIBUSI_CB_2025 || 0),
        target: Number(item.target || item.TARGET || 0),
        date: String(item.date || item.TGL_PROPOSAL || ''),
        status: String(item.status || item.SENT || 'pending'),
        paid: String(item.paid || item.PAID || 'no'),
        komitmen: Number(item.komitmen || item.NILAI_KOMITMEN || 0)
      }));

      return res.status(200).json(mapped);
    }

    if (req.method === 'POST') {
      const result = await fetchGAS("POST", { ...req.body, action: 'upsert' });
      return res.status(200).json(result);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      const result = await fetchGAS("POST", { id, action: 'delete' });
      return res.status(200).json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error("API Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
