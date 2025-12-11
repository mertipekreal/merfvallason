import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

const OWNER = 'mertipekreal';
const REPO = 'merffinal';

const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  '.cache',
  '.replit',
  'replit.nix',
  '.upm',
  '.config',
  'backups',
  '__pycache__',
  '.local',
  'attached_assets',
  '*.log',
  '.vscode',
  'tmp',
  'coverage',
  '.nyc_output',
  'snippets',
  '.breakpoints',
  'generated',
  '.pythonlibs'
];

// Sadece bu klasörleri dahil et
const INCLUDE_DIRS = [
  'server',
  'client', 
  'shared',
  'scripts',
  'script',
  'data',
  'docs'
];

const INCLUDE_FILES = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'tailwind.config.ts',
  'postcss.config.js',
  'drizzle.config.ts',
  'replit.md',
  'design_guidelines.md',
  'README.md',
  '.gitignore',
  'components.json',
  'main.py',
  'pyproject.toml',
  'uv.lock',
  'MERF_V35_YOL_HARITASI.md',
  'REPL_SPLIT_PLAN.md',
  'rasch_runway_prompts.md',
  'rasch_viral_strateji.md',
  'BACKTEST_ANALIZ_RAPORU.md'
];

function shouldIgnore(filePath: string): boolean {
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.startsWith('*')) {
      const ext = pattern.slice(1);
      if (filePath.endsWith(ext)) return true;
    } else if (filePath.includes(pattern)) {
      return true;
    }
  }
  return false;
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = [], isRoot = true): string[] {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (shouldIgnore(fullPath)) continue;
    
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Root'ta sadece INCLUDE_DIRS klasörlerini işle
      if (isRoot) {
        if (INCLUDE_DIRS.includes(file)) {
          getAllFiles(fullPath, arrayOfFiles, false);
        }
      } else {
        getAllFiles(fullPath, arrayOfFiles, false);
      }
    } else {
      // Root'ta sadece INCLUDE_FILES dosyalarını dahil et
      if (isRoot) {
        if (INCLUDE_FILES.includes(file)) {
          arrayOfFiles.push(fullPath);
        }
      } else {
        arrayOfFiles.push(fullPath);
      }
    }
  }

  return arrayOfFiles;
}

async function pushToGitHub() {
  console.log('🚀 GitHub\'a push başlıyor...');
  
  const octokit = await getGitHubClient();
  
  // Get authenticated user
  const { data: user } = await octokit.users.getAuthenticated();
  console.log(`✅ GitHub kullanıcısı: ${user.login}`);

  // Get all files
  const rootDir = process.cwd();
  const allFiles = getAllFiles(rootDir);
  console.log(`📁 Toplam ${allFiles.length} dosya bulundu`);

  // Get or create main branch reference
  let sha: string;
  try {
    const { data: ref } = await octokit.git.getRef({
      owner: OWNER,
      repo: REPO,
      ref: 'heads/main'
    });
    sha = ref.object.sha;
    console.log(`📌 Mevcut main branch SHA: ${sha}`);
  } catch (error: any) {
    if (error.status === 404) {
      console.log('📝 Repository boş, ilk commit oluşturuluyor...');
      sha = '';
    } else {
      throw error;
    }
  }

  // Create blobs for all files
  const tree: { path: string; mode: '100644'; type: 'blob'; sha: string }[] = [];
  
  for (let i = 0; i < allFiles.length; i++) {
    const filePath = allFiles[i];
    const relativePath = path.relative(rootDir, filePath);
    
    try {
      const content = fs.readFileSync(filePath);
      const base64Content = content.toString('base64');
      
      const { data: blob } = await octokit.git.createBlob({
        owner: OWNER,
        repo: REPO,
        content: base64Content,
        encoding: 'base64'
      });

      tree.push({
        path: relativePath,
        mode: '100644',
        type: 'blob',
        sha: blob.sha
      });

      if ((i + 1) % 50 === 0) {
        console.log(`📤 ${i + 1}/${allFiles.length} dosya yüklendi...`);
      }
    } catch (error: any) {
      console.warn(`⚠️ Dosya atlandı: ${relativePath} - ${error.message}`);
    }
  }

  console.log(`✅ ${tree.length} dosya blob olarak oluşturuldu`);

  // Create tree
  const { data: newTree } = await octokit.git.createTree({
    owner: OWNER,
    repo: REPO,
    tree: tree,
    base_tree: sha || undefined
  });
  console.log(`🌳 Tree oluşturuldu: ${newTree.sha}`);

  // Create commit
  const commitMessage = `Merf.ai - Duygu Motoru v2.0 (${new Date().toISOString().split('T')[0]})`;
  const { data: commit } = await octokit.git.createCommit({
    owner: OWNER,
    repo: REPO,
    message: commitMessage,
    tree: newTree.sha,
    parents: sha ? [sha] : []
  });
  console.log(`💾 Commit oluşturuldu: ${commit.sha}`);

  // Update or create reference
  try {
    await octokit.git.updateRef({
      owner: OWNER,
      repo: REPO,
      ref: 'heads/main',
      sha: commit.sha
    });
  } catch {
    await octokit.git.createRef({
      owner: OWNER,
      repo: REPO,
      ref: 'refs/heads/main',
      sha: commit.sha
    });
  }

  console.log('✅ GitHub\'a başarıyla push edildi!');
  console.log(`🔗 https://github.com/${OWNER}/${REPO}`);
}

pushToGitHub().catch(console.error);
