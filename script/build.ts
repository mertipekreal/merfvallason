import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, copyFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const allowlist = [
  "@anthropic-ai/sdk",
  "@google/generative-ai",
  "@google/genai",
  "@huggingface/inference",
  "@neondatabase/serverless",
  "@octokit/rest",
  "@sentry/node",
  "@sentry/profiling-node",
  "@upstash/redis",
  "adm-zip",
  "apify-client",
  "axios",
  "bullmq",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "ioredis",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "p-limit",
  "p-retry",
  "passport",
  "passport-local",
  "pdfmake",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function copyPdfMakeAssets() {
  const trieFiles = [
    "node_modules/@foliojs-fork/fontkit/data.trie",
    "node_modules/@foliojs-fork/fontkit/indic.trie", 
    "node_modules/@foliojs-fork/fontkit/use.trie",
    "node_modules/@foliojs-fork/linebreak/src/classes.trie",
  ];

  for (const sourceFile of trieFiles) {
    const sourcePath = path.resolve(sourceFile);
    const fileName = path.basename(sourceFile);
    const destPath = path.resolve("dist", fileName);
    
    if (existsSync(sourcePath)) {
      try {
        await copyFile(sourcePath, destPath);
        console.log(`Copied ${fileName} to dist folder`);
      } catch (err) {
        console.warn(`Warning: Could not copy ${fileName}:`, err);
      }
    } else {
      console.warn(`Warning: ${fileName} not found at`, sourcePath);
    }
  }
}

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  console.log("copying additional assets...");
  await copyPdfMakeAssets();
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
