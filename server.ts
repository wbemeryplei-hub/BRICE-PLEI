import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import axios from "axios";
import session from "express-session";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());
  app.use(session({
    secret: 'geodetic-africa-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { 
      secure: true, 
      sameSite: 'none',
      httpOnly: true 
    }
  }));

  const DATA_FILE = path.join(process.cwd(), "geodetic_data.json");

  // Initialize data file if it doesn't exist
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      countries: null,
      headers: null
    }));
  }

  // API routes
  app.get("/api/data", (req, res) => {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to read data" });
    }
  });

  app.post("/api/data", (req, res) => {
    try {
      const { countries, headers } = req.body;
      fs.writeFileSync(DATA_FILE, JSON.stringify({ countries, headers }));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save data" });
    }
  });

  // GitHub OAuth Routes
  app.get("/api/auth/github/url", (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: "GITHUB_CLIENT_ID not configured" });
    }

    const redirectUri = `${process.env.APP_URL}/api/auth/github/callback`;
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,user`;
    res.json({ url });
  });

  app.get("/api/auth/github/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send("No code provided");

    try {
      const response = await axios.post("https://github.com/login/oauth/access_token", {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }, {
        headers: { Accept: "application/json" }
      });

      const { access_token } = response.data;
      if (!access_token) throw new Error("Failed to get access token");

      // Store token in session (In a real app, use a database)
      (req.session as any).githubToken = access_token;

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GITHUB_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("GitHub Auth Error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/github/user", async (req, res) => {
    const token = (req.session as any).githubToken;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    try {
      const response = await axios.get("https://api.github.com/user", {
        headers: { Authorization: `token ${token}` }
      });
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/github/push", async (req, res) => {
    const token = (req.session as any).githubToken;
    const { repo, path: filePath, message } = req.body;

    if (!token) return res.status(401).json({ error: "Not authenticated" });
    if (!repo || !filePath) return res.status(400).json({ error: "Missing repo or path" });

    try {
      // 1. Get user login
      const userRes = await axios.get("https://api.github.com/user", {
        headers: { Authorization: `token ${token}` }
      });
      const login = userRes.data.login;

      // 2. Read data
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      const base64Content = Buffer.from(content).toString("base64");

      // 3. Check if file exists to get SHA
      let sha: string | undefined;
      try {
        const fileRes = await axios.get(`https://api.github.com/repos/${login}/${repo}/contents/${filePath}`, {
          headers: { Authorization: `token ${token}` }
        });
        sha = fileRes.data.sha;
      } catch (e) {
        // File doesn't exist, that's fine
      }

      // 4. Push to GitHub
      await axios.put(`https://api.github.com/repos/${login}/${repo}/contents/${filePath}`, {
        message: message || "Update geodetic data",
        content: base64Content,
        sha
      }, {
        headers: { Authorization: `token ${token}` }
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("GitHub Push Error:", error.response?.data || error.message);
      res.status(500).json({ error: error.response?.data?.message || "Failed to push to GitHub" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
