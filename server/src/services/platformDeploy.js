/**
 * Super-admin one-click deploy: git pull on host repo + docker compose rebuild.
 * Requires PLATFORM_DEPLOY_ENABLED=true and volume mounts (see deploy/docker-compose.yml).
 */
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execFileAsync = promisify(execFile);
const LAST_LOG = "/data/platform-deploy-last.json";

let deployRunning = false;

function deployConfig() {
  return {
    enabled: process.env.PLATFORM_DEPLOY_ENABLED === "true",
    repoPath: process.env.HOST_REPO_PATH || "/host-repo",
    branch: process.env.PLATFORM_DEPLOY_BRANCH || "main",
    remote: process.env.PLATFORM_DEPLOY_REMOTE || "origin",
    githubUrl:
      process.env.PLATFORM_DEPLOY_GITHUB_URL || "https://github.com/tradersnetworking/Trader.git",
    script: process.env.PLATFORM_DEPLOY_SCRIPT || "/host-repo/deploy/vps-update.sh",
  };
}

async function readLastLog() {
  try {
    const raw = await fs.readFile(LAST_LOG, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function readRepoHead(repoPath) {
  try {
    const { stdout } = await execFileAsync("git", ["-C", repoPath, "log", "-1", "--oneline"], {
      timeout: 15_000,
    });
    return String(stdout || "").trim();
  } catch {
    return null;
  }
}

export async function getDeployStatus() {
  const cfg = deployConfig();
  const last = await readLastLog();
  const currentCommit = cfg.enabled ? await readRepoHead(cfg.repoPath) : null;
  return {
    ...cfg,
    running: deployRunning,
    currentCommit,
    last,
  };
}

export async function runPlatformDeploy({ actorEmail, actorName } = {}) {
  const cfg = deployConfig();
  if (!cfg.enabled) {
    return {
      ok: false,
      error:
        "Platform Update is not enabled on this server. On the VPS, set PLATFORM_DEPLOY_ENABLED=true in deploy/.env, uncomment host repo + Docker socket volumes in deploy/docker-compose.yml, then rebuild once manually.",
    };
  }
  if (deployRunning) {
    return { ok: false, error: "An update is already running. Wait for it to finish." };
  }

  deployRunning = true;
  const started = new Date().toISOString();
  const startedBy = actorEmail || actorName || "superadmin";

  try {
    await fs.access(cfg.script);
  } catch {
    deployRunning = false;
    return { ok: false, error: `Deploy script not found: ${cfg.script}` };
  }

  try {
    const { stdout, stderr } = await execFileAsync("sh", [cfg.script], {
      timeout: Number(process.env.PLATFORM_DEPLOY_TIMEOUT_MS || 900_000),
      maxBuffer: 4 * 1024 * 1024,
      env: {
        ...process.env,
        HOST_REPO_PATH: cfg.repoPath,
        PLATFORM_DEPLOY_BRANCH: cfg.branch,
        PLATFORM_DEPLOY_REMOTE: cfg.remote,
      },
    });
    const finished = new Date().toISOString();
    const result = {
      ok: true,
      started,
      finished,
      startedBy,
      stdout: String(stdout || ""),
      stderr: String(stderr || ""),
      commitAfter: await readRepoHead(cfg.repoPath),
    };
    await fs.mkdir(path.dirname(LAST_LOG), { recursive: true }).catch(() => {});
    await fs.writeFile(LAST_LOG, JSON.stringify(result, null, 2));
    return result;
  } catch (e) {
    const finished = new Date().toISOString();
    const result = {
      ok: false,
      started,
      finished,
      startedBy,
      error: e.message,
      stdout: e.stdout ? String(e.stdout) : "",
      stderr: e.stderr ? String(e.stderr) : "",
    };
    await fs.mkdir(path.dirname(LAST_LOG), { recursive: true }).catch(() => {});
    await fs.writeFile(LAST_LOG, JSON.stringify(result, null, 2)).catch(() => {});
    return result;
  } finally {
    deployRunning = false;
  }
}
