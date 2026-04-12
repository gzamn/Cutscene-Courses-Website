import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Chargily Checkout API
  app.post("/api/create-checkout", async (req, res) => {
    try {
      const { amount, currency, courseTitle, successUrl, failureUrl } = req.body;

      const CHARGILY_SECRET_KEY = process.env.CHARGILY_SECRET_KEY;
      
      if (!CHARGILY_SECRET_KEY) {
        return res.status(500).json({ error: "Chargily secret key is not configured." });
      }

      const response = await axios.post(
        "https://pay.chargily.net/test/api/v2/checkouts",
        {
          amount: amount,
          currency: currency.toLowerCase(),
          success_url: successUrl,
          failure_url: failureUrl,
          metadata: [
            {
              name: "course_title",
              value: courseTitle,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${CHARGILY_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      res.json({ checkout_url: response.data.checkout_url });
    } catch (error: any) {
      console.error("Chargily Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to create checkout session." });
    }
  });

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
