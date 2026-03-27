const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const { marked } = require('marked');

const app = express();
const port = process.env.PORT || 3000;
const rootDir = __dirname;
const contentDirs = {
  Page: path.join(rootDir, 'posts'),
  Truth: path.join(rootDir, 'posts', 'truth')
};

const sessions = new Map();
let visitCount = 0;
const ipSet = new Set();
const recentIps = [];
const maxRecentIps = 12;

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

function normalizeDir(dir) {
  return contentDirs[dir] ? dir : 'Page';
}

function parsePost(content, fileName = '') {
  const result = {
    meta: {
      title: fileName ? fileName.replace(/\.md$/i, '') : '无标题文章',
      date: '2026-02-10',
      tags: ['生活']
    },
    html: '',
    excerpt: '',
    fileName
  };

  const frontMatterRegex = /^[\s\n]*---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const frontMatterMatch = content.match(frontMatterRegex);

  if (frontMatterMatch) {
    const yamlStr = frontMatterMatch[1];
    const markdownBody = frontMatterMatch[2];

    yamlStr.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        let value = line.slice(colonIndex + 1).trim();

        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        if (value.startsWith('[') && value.endsWith(']')) {
          value = value
            .slice(1, -1)
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
        }

        result.meta[key] = value;
      }
    });

    if (result.meta.published && (!result.meta.date || result.meta.date === '2026-02-10')) {
      result.meta.date = result.meta.published;
    }

    result.html = marked.parse(markdownBody);
    result.excerpt = markdownBody.replace(/[#*`\n]/g, ' ').trim().slice(0, 150) + '...';
    result.raw = markdownBody;
  } else {
    result.html = marked.parse(content);
    result.excerpt = content.replace(/[#*`\n]/g, ' ').trim().slice(0, 150) + '...';
    result.raw = content;
  }

  return result;
}

function parsePostSummary(content, fileName = '') {
  const result = {
    meta: {
      title: fileName ? fileName.replace(/\.md$/i, '') : '无标题文章',
      date: '2026-02-10',
      tags: ['生活']
    },
    excerpt: '',
    fileName
  };

  const frontMatterRegex = /^[\s\n]*---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const frontMatterMatch = content.match(frontMatterRegex);
  let markdownBody = content;

  if (frontMatterMatch) {
    const yamlStr = frontMatterMatch[1];
    markdownBody = frontMatterMatch[2];

    yamlStr.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        let value = line.slice(colonIndex + 1).trim();

        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        if (value.startsWith('[') && value.endsWith(']')) {
          value = value
            .slice(1, -1)
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
        }

        result.meta[key] = value;
      }
    });

    if (result.meta.published && (!result.meta.date || result.meta.date === '2026-02-10')) {
      result.meta.date = result.meta.published;
    }
  }

  const plain = markdownBody.replace(/[#*`\n]/g, ' ').trim();
  result.excerpt = plain ? `${plain.slice(0, 150)}...` : '';

  return result;
}

async function listMarkdownFiles(directory) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return entries
      .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
      .map(entry => entry.name);
  } catch {
    return [];
  }
}

async function loadPost(directory, fileName) {
  const safeName = path.basename(fileName);
  const filePath = path.join(directory, safeName);
  const resolvedDir = path.resolve(directory);
  const resolvedFile = path.resolve(filePath);
  if (!resolvedFile.startsWith(resolvedDir)) {
    return null;
  }
  const content = await fs.readFile(filePath, 'utf8');
  return parsePost(content, safeName);
}

async function loadPostSummary(directory, fileName) {
  const safeName = path.basename(fileName);
  const filePath = path.join(directory, safeName);
  const resolvedDir = path.resolve(directory);
  const resolvedFile = path.resolve(filePath);
  if (!resolvedFile.startsWith(resolvedDir)) {
    return null;
  }
  const content = await fs.readFile(filePath, 'utf8');
  return parsePostSummary(content, safeName);
}

function parseToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  return '';
}

function normalizeIp(ip) {
  if (!ip) return 'unknown';
  let value = ip.trim();
  if (value.includes(',')) {
    value = value.split(',')[0].trim();
  }
  if (value.startsWith('::ffff:')) {
    value = value.replace('::ffff:', '');
  }
  if (value === '::1') {
    value = '127.0.0.1';
  }
  return value;
}

function trackVisit(req) {
  visitCount += 1;
  const ip = normalizeIp(req.headers['x-forwarded-for'] || req.socket.remoteAddress);
  if (ip) {
    ipSet.add(ip);
    recentIps.unshift(ip);
    const uniqueRecent = Array.from(new Set(recentIps));
    recentIps.length = 0;
    uniqueRecent.slice(0, maxRecentIps).forEach(item => recentIps.push(item));
  }
}

function requireAuth(req, res, next) {
  const token = parseToken(req);
  const session = sessions.get(token);
  if (!session) {
    res.status(401).json({ error: '未登录' });
    return;
  }
  req.user = session;
  next();
}

function sanitizeFileName(name) {
  if (!name) return '';
  const base = path.basename(name);
  const cleaned = base.replace(/[\\/]+/g, '').trim();
  if (!cleaned) return '';
  if (!cleaned.toLowerCase().endsWith('.md')) {
    return `${cleaned}.md`;
  }
  return cleaned;
}

function deriveFileName(fileName, title) {
  const raw = fileName || title || `post-${Date.now()}`;
  return sanitizeFileName(raw);
}

function escapeYamlValue(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return '""';
  if (/[#:\n\r]/.test(trimmed)) {
    return `"${trimmed.replace(/"/g, '\\"')}"`;
  }
  return trimmed;
}

function buildFrontMatter(meta = {}, content = '') {
  const lines = ['---'];
  const orderedKeys = ['title', 'published', 'date', 'description', 'tags', 'category', 'image'];
  orderedKeys.forEach(key => {
    const value = meta[key];
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      const tags = value.map(tag => escapeYamlValue(String(tag))).join(', ');
      lines.push(`${key}: [${tags}]`);
      return;
    }
    lines.push(`${key}: ${escapeYamlValue(String(value))}`);
  });
  lines.push('---', '', content);
  return lines.join('\n');
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ' 甜甜' && password === 'LJBljb0814') {
    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, { username, createdAt: Date.now() });
    res.json({ token, user: { username } });
    return;
  }
  res.status(401).json({ error: '用户名或密码错误' });
});

app.post('/api/logout', (req, res) => {
  const token = parseToken(req);
  if (token) {
    sessions.delete(token);
  }
  res.json({ ok: true });
});

app.get('/api/profile', (req, res) => {
  const token = parseToken(req);
  const session = sessions.get(token);
  if (!session) {
    res.status(401).json({ error: '未登录' });
    return;
  }
  res.json({ username: session.username });
});

app.get('/api/posts', async (req, res) => {
  const dirName = normalizeDir(req.query.dir);
  const directory = contentDirs[dirName];
  const lite = req.query.lite === '1' || req.query.lite === 'true';
  const files = await listMarkdownFiles(directory);
  const posts = await Promise.all(
    files.map(async fileName => {
      try {
        const post = lite
          ? await loadPostSummary(directory, fileName)
          : await loadPost(directory, fileName);
        return post ? { ...post, directory: dirName } : null;
      } catch {
        return null;
      }
    })
  );
  const list = posts.filter(Boolean);
  list.sort((a, b) => {
    const dateA = new Date(a.meta.date || a.meta.published || '2026-02-10');
    const dateB = new Date(b.meta.date || b.meta.published || '2026-02-10');
    return dateB - dateA;
  });
  res.json(list);
});

app.get('/api/posts/:fileName', async (req, res) => {
  const dirName = normalizeDir(req.query.dir);
  const directory = contentDirs[dirName];
  const fileName = decodeURIComponent(req.params.fileName);
  try {
    const post = await loadPost(directory, fileName);
    if (!post) {
      res.status(404).json({ error: '文章未找到' });
      return;
    }
    res.json({ ...post, directory: dirName });
  } catch {
    res.status(404).json({ error: '文章未找到' });
  }
});

app.post('/api/posts', requireAuth, async (req, res) => {
  const { fileName, directory, meta, content } = req.body || {};
  const dirName = normalizeDir(directory);
  const dirPath = contentDirs[dirName];
  const safeName = deriveFileName(fileName, meta?.title);
  if (!safeName || typeof content !== 'string') {
    res.status(400).json({ error: '缺少文件名或内容' });
    return;
  }
  const filePath = path.join(dirPath, safeName);
  if (await fileExists(filePath)) {
    res.status(409).json({ error: '文章已存在' });
    return;
  }
  await ensureDir(dirPath);
  const payload = buildFrontMatter(meta, content);
  await fs.writeFile(filePath, payload, 'utf8');
  const post = await loadPost(dirPath, safeName);
  res.status(201).json({ ...post, directory: dirName });
});

app.put('/api/posts/:fileName', requireAuth, async (req, res) => {
  const dirName = normalizeDir(req.query.dir || req.body?.directory);
  const dirPath = contentDirs[dirName];
  const originalName = sanitizeFileName(decodeURIComponent(req.params.fileName));
  const newName = deriveFileName(req.body?.newFileName || req.body?.fileName || originalName, req.body?.meta?.title);
  const { meta, content } = req.body || {};
  if (!originalName || typeof content !== 'string') {
    res.status(400).json({ error: '缺少文件名或内容' });
    return;
  }
  const originalPath = path.join(dirPath, originalName);
  if (!(await fileExists(originalPath))) {
    res.status(404).json({ error: '文章未找到' });
    return;
  }
  const targetPath = path.join(dirPath, newName);
  if (newName !== originalName && (await fileExists(targetPath))) {
    res.status(409).json({ error: '目标文件名已存在' });
    return;
  }
  await ensureDir(dirPath);
  const payload = buildFrontMatter(meta, content);
  await fs.writeFile(targetPath, payload, 'utf8');
  if (newName !== originalName) {
    await fs.unlink(originalPath);
  }
  const post = await loadPost(dirPath, newName);
  res.json({ ...post, directory: dirName });
});

app.delete('/api/posts/:fileName', requireAuth, async (req, res) => {
  const dirName = normalizeDir(req.query.dir || req.body?.directory);
  const dirPath = contentDirs[dirName];
  const safeName = sanitizeFileName(decodeURIComponent(req.params.fileName));
  if (!safeName) {
    res.status(400).json({ error: '缺少文件名' });
    return;
  }
  const filePath = path.join(dirPath, safeName);
  if (!(await fileExists(filePath))) {
    res.status(404).json({ error: '文章未找到' });
    return;
  }
  await fs.unlink(filePath);
  res.json({ ok: true });
});

app.get('/api/stats', requireAuth, (req, res) => {
  res.json({
    totalVisits: visitCount,
    uniqueIps: ipSet.size,
    recentIps
  });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// 公告管理 API
const announcementsFile = path.join(rootDir, 'data', 'announcements.json');

async function loadAnnouncements() {
  try {
    const content = await fs.readFile(announcementsFile, 'utf8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function saveAnnouncements(list) {
  await ensureDir(path.dirname(announcementsFile));
  await fs.writeFile(announcementsFile, JSON.stringify(list, null, 2), 'utf8');
}

app.get('/api/announcements', async (req, res) => {
  const list = await loadAnnouncements();
  
  const token = parseToken(req);
  const session = sessions.get(token);
  const isAdmin = !!session;

  if (isAdmin) {
    res.json(list);
  } else {
    const now = Date.now();
    const visibleList = list.filter(item => {
      const publishTime = item.publishAt || item.createdAt;
      const expireTime = item.expireAt;
      
      // 必须已到达发布时间
      if (publishTime > now) return false;
      
      // 如果设置了过期时间，必须未过期
      if (expireTime && expireTime <= now) return false;
      
      return true;
    });
    res.json(visibleList);
  }
});

app.post('/api/announcements', requireAuth, async (req, res) => {
  const { content, publishAt, expireAt } = req.body;
  if (!content || !content.trim()) {
    res.status(400).json({ error: '公告内容不能为空' });
    return;
  }
  
  const list = await loadAnnouncements();
  const newAnnouncement = {
    id: crypto.randomUUID(),
    content: content.trim(),
    createdAt: Date.now(),
    publishAt: publishAt ? new Date(publishAt).getTime() : Date.now(),
    expireAt: expireAt ? new Date(expireAt).getTime() : null
  };
  
  list.unshift(newAnnouncement);
  list.sort((a, b) => (b.publishAt || b.createdAt) - (a.publishAt || a.createdAt));
  
  await saveAnnouncements(list);
  
  res.status(201).json(newAnnouncement);
});

app.delete('/api/announcements/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  let list = await loadAnnouncements();
  const originalLength = list.length;
  list = list.filter(item => item.id !== id);
  
  if (list.length === originalLength) {
    res.status(404).json({ error: '公告未找到' });
    return;
  }
  
  await saveAnnouncements(list);
  res.json({ ok: true });
});

app.use(express.static(rootDir));

app.get('/backend', (req, res) => {
  res.sendFile(path.join(rootDir, 'backend.html'));
});

app.get('/backend/', (req, res) => {
  res.sendFile(path.join(rootDir, 'backend.html'));
});

app.post('/api/visit', (req, res) => {
  trackVisit(req);
  res.json({ ok: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

if (require.main === module) {
  app.listen(port, () => {
    process.stdout.write(`Server running at http://localhost:${port}\n`);
  });
}

module.exports = app;
