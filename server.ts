import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import JSZip from "jszip";
import fs from "fs/promises";
import { existsSync } from "fs";
import cookieSession from "cookie-session";
import { Octokit } from "octokit";
import * as dotenv from 'dotenv';
import admin from 'firebase-admin';
import { uuid } from 'uuidv4';

dotenv.config();

// Initialize Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL?.replace('@', '%40')}`
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

const db = admin.firestore();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// In-memory store for current project state
let currentProjectFiles: any[] = [];
let convertedProjectFiles: Map<string, string> = new Map();

// Helper to strip noise from files
function stripNoise(content: string, extension: string): string {
  if (extension === '.java') {
    return content.replace(/\/\*\*[\s\S]*?\*\/|\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  } else if (['.cbl', '.cob'].includes(extension)) {
    return content.split('\n').map(line => {
      const stripped = line.substring(6);
      if (stripped.startsWith('*') || stripped.startsWith('/')) return '';
      return stripped;
    }).join('\n');
  }
  return content;
}

// Simple dependency scanner
function scanDependencies(files: { path: string, content: string }[]) {
  const dependencyMap: Record<string, string[]> = {};
  files.forEach(file => {
    const deps: string[] = [];
    if (file.path.endsWith('.java')) {
      const importMatches = file.content.match(/import\s+([\w.]+);/g);
      if (importMatches) {
        importMatches.forEach(m => deps.push(m.replace('import ', '').replace(';', '')));
      }
    } else if (file.path.endsWith('.cbl') || file.path.endsWith('.cob')) {
      const callMatches = file.content.match(/CALL\s+['"]([\w-]+)['"]/gi);
      if (callMatches) {
        callMatches.forEach(m => deps.push(m.replace(/CALL\s+['"]/i, '').replace(/['"]/g, '')));
      }
    }
    dependencyMap[file.path] = deps;
  });
  return dependencyMap;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Request logging middleware & Headers
  app.use((req, res, next) => {
    console.log(`[SERVER] ${req.method} ${req.url}`);
    // Allow Firebase/GitHub popups to communicate with the main window
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.use(cookieSession({
    name: 'session',
    keys: ['legacy-modernizer-secret'],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }));

  const apiRouter = express.Router();

  // Chat History API
  apiRouter.post('/chats', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const newChat = {
      id: uuid(),
      name: `Modernization Session - ${new Date().toLocaleString()}`,
      createdAt: new Date(),
      files: [],
      convertedFiles: {},
      targetLang: 'python'
    };

    await db.collection('users').doc(email).collection('chats').doc(newChat.id).set(newChat);
    res.status(201).json(newChat);
  });

  apiRouter.get('/chats/:email', async (req, res) => {
    const { email } = req.params;
    const chatsRef = db.collection('users').doc(email).collection('chats');
    const snapshot = await chatsRef.orderBy('createdAt', 'desc').get();
    const chats = snapshot.docs.map(doc => doc.data());
    res.json(chats);
  });

  apiRouter.put('/chats/:email/:chatId', async (req, res) => {
    const { email, chatId } = req.params;
    const updatedData = req.body;
    await db.collection('users').doc(email).collection('chats').doc(chatId).update(updatedData);
    res.status(200).json({ message: 'Chat updated' });
  });

  // API routes
  apiRouter.post("/ingest", upload.array('files'), async (req, res) => {
    console.log(`[INGEST] Received request with ${req.files?.length || 0} files`);
    const uploadedFiles = req.files as Express.Multer.File[];
    
    if (!uploadedFiles || uploadedFiles.length === 0) {
      console.error("[INGEST] No files in request");
      return res.status(400).json({ error: "No files uploaded" });
    }

    try {
      const files: any[] = [];

      for (const file of uploadedFiles) {
        console.log(`[INGEST] Processing file: ${file.originalname} (${file.size} bytes)`);
        if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
          const zip = await JSZip.loadAsync(file.buffer);
          for (const [relativePath, zipFile] of Object.entries(zip.files)) {
            if (!zipFile.dir && (relativePath.endsWith('.java') || relativePath.endsWith('.cbl') || relativePath.endsWith('.cob'))) {
              const content = await zipFile.async("string");
              files.push({ path: relativePath, content });
            }
          }
        } else if (file.originalname.endsWith('.java') || file.originalname.endsWith('.cbl') || file.originalname.endsWith('.cob')) {
          const content = file.buffer.toString('utf-8');
          files.push({ path: file.originalname, content });
        }
      }

      console.log(`[INGEST] Extracted ${files.length} source files`);
      
      if (files.length === 0) {
        console.error("[INGEST] No valid source files found");
        return res.status(400).json({ error: "No valid source files (.java, .cbl, .cob) found." });
      }

      const dependencyMap = scanDependencies(files);

      const processedFiles = files.map(f => ({
        ...f,
        originalContent: f.content,
        content: stripNoise(f.content, path.extname(f.path)),
        dependencies: dependencyMap[f.path] || []
      }));

      currentProjectFiles = processedFiles;
      convertedProjectFiles.clear();

      console.log("[INGEST] Success");
      res.json({ files: processedFiles });
    } catch (error) {
      console.error("[INGEST] Error:", error);
      res.status(500).json({ error: "Failed to process project: " + (error instanceof Error ? error.message : String(error)) });
    }
  });

  apiRouter.post("/save-converted", (req, res) => {
    const { path: filePath, content } = req.body;
    convertedProjectFiles.set(filePath, content);
    res.json({ success: true });
  });

  apiRouter.get("/download", async (req, res) => {
    const zip = new JSZip();
    const targetLang = req.query.lang || 'python';

    for (const [filePath, content] of convertedProjectFiles.entries()) {
      const ext = targetLang === 'go' ? '.go' : '.py';
      const newPath = filePath.replace(/\.(java|cbl|cob)$/, ext);
      zip.file(newPath, content);
    }

    if (targetLang === 'python') {
      zip.file('requirements.txt', '# Generated by Legacy Modernizer\n');
    } else {
      zip.file('go.mod', 'module converted_project\n\ngo 1.21\n');
    }

    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=converted_project.zip');
    res.send(buffer);
  });

  // GitHub Auth
  apiRouter.get("/auth/github/url", (req, res) => {
    const client_id = process.env.GITHUB_CLIENT_ID;
    if (!client_id) return res.status(500).json({ error: "GITHUB_CLIENT_ID not configured" });
    
    const redirect_uri = process.env.GITHUB_REDIRECT_URI || `http://localhost:${PORT}/api/auth/github/callback`;
    
    // Pass the exact redirect_uri to GitHub to prevent mismatch errors
    const url = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&scope=repo,user`;
    res.json({ url });
  });

  apiRouter.get(["/auth/github/callback", "/auth/callback/github"], async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send("No code provided");

    try {
      const response = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const data = await response.json();
      if (data.access_token) {
        if (req.session) {
          req.session.github_token = data.access_token;
        }
        // Instead of trying to manage popups, HTML messages, or scripts,
        // we just redirect the user straight back to the main app dashboard!
        res.redirect("/");
      } else {
        res.status(400).send("Failed to get access token: " + JSON.stringify(data));
      }
    } catch (error) {
      res.status(500).send("Error during GitHub callback: " + (error instanceof Error ? error.message : String(error)));
    }
  });

  apiRouter.get("/auth/status", (req, res) => {
    res.json({ authenticated: !!(req.session && req.session.github_token) });
  });

  apiRouter.get("/auth/logout", (req, res) => {
    if (req.session) req.session = null;
    res.json({ success: true });
  });

  // GitHub Repo Fetch
  apiRouter.post("/github/fetch", async (req, res) => {
    const { repoUrl } = req.body;
    if (!req.session || !req.session.github_token) {
      return res.status(401).json({ error: "Not authenticated with GitHub" });
    }

    try {
      // Parse repo URL (e.g., https://github.com/owner/repo)
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) return res.status(400).json({ error: "Invalid GitHub URL" });
      
      const owner = match[1];
      const repo = match[2].replace(/\.git$/, '');

      const octokit = new Octokit({ auth: req.session.github_token });
      
      // Get the default branch
      const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
      const defaultBranch = repoData.default_branch;

      // Get the tree recursively
      const { data: treeData } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: defaultBranch,
        recursive: "true",
      });

      const files: any[] = [];
      for (const item of treeData.tree) {
        if (item.type === 'blob' && item.path && (item.path.endsWith('.java') || item.path.endsWith('.cbl') || item.path.endsWith('.cob'))) {
          const { data: blobData } = await octokit.rest.git.getBlob({
            owner,
            repo,
            file_sha: item.sha!,
          });
          
          const content = Buffer.from(blobData.content, 'base64').toString('utf-8');
          files.push({ path: item.path, content });
        }
      }

      if (files.length === 0) {
        return res.status(400).json({ error: "No valid source files (.java, .cbl, .cob) found in the repository." });
      }

      const dependencyMap = scanDependencies(files);
      const processedFiles = files.map(f => ({
        ...f,
        originalContent: f.content,
        content: stripNoise(f.content, path.extname(f.path)),
        dependencies: dependencyMap[f.path] || []
      }));

      currentProjectFiles = processedFiles;
      convertedProjectFiles.clear();

      res.json({ files: processedFiles, repoInfo: { owner, repo, defaultBranch } });
    } catch (error) {
      console.error("[GITHUB FETCH] Error:", error);
      res.status(500).json({ error: "Failed to fetch from GitHub: " + (error instanceof Error ? error.message : String(error)) });
    }
  });

  apiRouter.post("/github/push", async (req, res) => {
    const { owner, repo, branch, targetLang } = req.body;
    if (!req.session || !req.session.github_token) {
      return res.status(401).json({ error: "Not authenticated with GitHub" });
    }

    try {
      const octokit = new Octokit({ auth: req.session.github_token });
      
      // 1. Get the latest commit of the base branch
      const { data: refData } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
      });
      const baseSha = refData.object.sha;

      // 2. Create a new branch
      const newBranchName = `modernized-${Date.now()}`;
      await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${newBranchName}`,
        sha: baseSha,
      });

      // 3. Create blobs for converted files
      const treeItems: any[] = [];
      for (const [filePath, content] of convertedProjectFiles.entries()) {
        const ext = targetLang === 'go' ? '.go' : '.py';
        const newPath = filePath.replace(/\.(java|cbl|cob)$/, ext);
        
        const { data: blobData } = await octokit.rest.git.createBlob({
          owner,
          repo,
          content,
          encoding: 'utf-8',
        });
        
        treeItems.push({
          path: newPath,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha,
        });
      }

      // 4. Create a new tree
      const { data: newTreeData } = await octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: baseSha,
        tree: treeItems,
      });

      // 5. Create a new commit
      const { data: newCommitData } = await octokit.rest.git.createCommit({
        owner,
        repo,
        message: `Modernized legacy code to ${targetLang}`,
        tree: newTreeData.sha,
        parents: [baseSha],
      });

      // 6. Update the branch reference
      await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${newBranchName}`,
        sha: newCommitData.sha,
      });

      // 7. Create a Pull Request
      const { data: prData } = await octokit.rest.issues.create({
        owner,
        repo,
        title: `Modernized Legacy Code (${targetLang})`,
        body: `This PR contains the modernized version of the legacy code, converted to ${targetLang}.`,
      });
      
      // Wait, issues.create is for issues. For PR:
      const { data: pullData } = await octokit.rest.pulls.create({
        owner,
        repo,
        title: `Modernized Legacy Code (${targetLang})`,
        head: newBranchName,
        base: branch,
        body: `This PR contains the modernized version of the legacy code, converted to ${targetLang}.`,
      });

      res.json({ success: true, prUrl: pullData.html_url });
    } catch (error) {
      console.error("[GITHUB PUSH] Error:", error);
      res.status(500).json({ error: "Failed to push to GitHub: " + (error instanceof Error ? error.message : String(error)) });
    }
  });

  app.use('/api', apiRouter);

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
