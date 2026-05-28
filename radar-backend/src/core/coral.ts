import { execFile } from 'child_process';
import { promisify } from 'util';

const execFilePromise = promisify(execFile);
const COMMAND_TIMEOUT = 10000; // 10 seconds

const ALLOWED_ENV_KEYS = [
  "GITHUB_TOKEN",
  "GITHUB_API_BASE",
  "CLICKUP_API_KEY",
  "CLICKUP_API_TOKEN",
  "NOTION_TOKEN",
  "NOTION_API_KEY",
  "LINEAR_API_KEY",
  "SLACK_TOKEN",
  "SENTRY_TOKEN",
  "DATADOG_API_KEY",
  "DATADOG_APP_KEY",
  "PAGERDUTY_TOKEN",
  "WANDB_API_KEY",
  "STRIPE_SECRET_KEY",
  "CLOUDWATCH_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "JIRA_BASE_URL",
  "JIRA_EMAIL",
  "JIRA_API_TOKEN"
];

/**
 * Filter and sanitize environment variables to prevent injection.
 */
function getSanitizedEnv(inputs?: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  // Start with a clean slate, only inheriting essential system env if needed
  // But strictly whitelist any provided inputs
  if (inputs) {
    for (const [key, value] of Object.entries(inputs)) {
      if (ALLOWED_ENV_KEYS.includes(key)) {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
}

/**
 * Robustly extract JSON from stdout that might contain warnings or non-JSON text.
 */
function extractJsonPayload(stdout: string): any {
  try {
    const start = stdout.search(/[\[\{]/);
    const end = Math.max(stdout.lastIndexOf(']'), stdout.lastIndexOf('}'));
    
    if (start === -1 || end === -1 || end < start) {
      throw new Error('No valid JSON boundary detected in output');
    }
    
    return JSON.parse(stdout.substring(start, end + 1));
  } catch (err: any) {
    throw new Error(`Failed to parse Coral JSON: ${err.message}. Raw output: ${stdout.substring(0, 200)}...`);
  }
}

/**
 * Internal command wrapper using execFile for safety.
 */
async function runCoralCommand(args: string[], inputs?: Record<string, string>): Promise<{ stdout: string; stderr: string; duration: number }> {
  const start = performance.now();
  const env = getSanitizedEnv(inputs);
  
  try {
    const { stdout, stderr } = await execFilePromise('coral', args, {
      timeout: COMMAND_TIMEOUT,
      env: { ...process.env, ...env } // Merging with existing process.env but overriding with sanitized inputs
    });
    
    const duration = Math.round(performance.now() - start);
    return { stdout, stderr, duration };
  } catch (error: any) {
    const duration = Math.round(performance.now() - start);
    
    if (error.code === 'ETIMEDOUT') {
      console.error(`[coral] timeout after ${duration}ms: coral ${args.join(' ')}`);
      throw {
        code: "CORAL_TIMEOUT",
        message: "Coral command timed out",
        command: `coral ${args[0]}`,
        duration
      };
    }
    
    throw error;
  }
}

export async function runCoralQuery(sql: string) {
  try {
    const { stdout, duration } = await runCoralCommand(['sql', '--format', 'json', sql]);
    console.log(`[coral] sql query completed in ${duration}ms`);
    return extractJsonPayload(stdout);
  } catch (error: any) {
    console.error(`[coral] sql query failed:`, error.message || error);
    throw error;
  }
}

export async function getActiveSources() {
  const { stdout, duration } = await runCoralCommand(['source', 'list']);
  console.log(`[coral] source list completed in ${duration}ms`);
  
  return stdout.split('\n')
    .slice(2)
    .filter(line => line.trim())
    .map(line => line.split(/\s+/)[0]);
}

export async function discoverSources() {
  const { stdout, duration } = await runCoralCommand(['source', 'discover']);
  console.log(`[coral] source discover completed in ${duration}ms`);
  
  return stdout.split('\n')
    .slice(2)
    .filter(line => line.trim())
    .map(line => {
      const parts = line.split(/\s+/);
      return { name: parts[0], version: parts[1], status: parts[2] };
    });
}

export async function getSourceInfo(name: string) {
  const { stdout, duration } = await runCoralCommand(['source', 'info', name]);
  console.log(`[coral] source info (${name}) completed in ${duration}ms`);
  
  const inputs: any[] = [];
  const lines = stdout.split('\n');
  let inInputs = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Inputs')) { inInputs = true; continue; }
    if (inInputs && lines[i].trim() && !lines[i].startsWith('    ')) break;
    if (inInputs && lines[i].trim()) {
      const match = lines[i].match(/^\s+([A-Z_]+)\s+\(([^)]+)\)/);
      if (match) {
        inputs.push({
          key: match[1],
          type: match[2],
          required: match[2].includes('required'),
          description: lines[i+1]?.trim().startsWith('default:') ? '' : lines[i+1]?.trim()
        });
      }
    }
  }
  return { name, inputs };
}

export async function addSource(name: string, inputs: Record<string, string>) {
  const { duration } = await runCoralCommand(['source', 'add', name], inputs);
  console.log(`[coral] source add (${name}) completed in ${duration}ms`);
  return testSource(name, inputs);
}

export async function testSource(name: string, inputs?: Record<string, string>) {
  try {
    const { stdout, duration } = await runCoralCommand(['source', 'test', name], inputs);
    console.log(`[coral] source test (${name}) completed in ${duration}ms`);
    return stdout.includes('connected successfully') || stdout.includes('Verified');
  } catch (err: any) {
    console.warn(`[coral] source test (${name}) failed:`, err.message);
    throw err;
  }
}

export async function removeSource(name: string) {
  const { duration } = await runCoralCommand(['source', 'remove', name]);
  console.log(`[coral] source remove (${name}) completed in ${duration}ms`);
  return true;
}

