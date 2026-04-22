// Security scanner for game submissions
// Checks manifest validity, forbidden code patterns, file whitelist

export interface ScanResult {
  passed: boolean;
  warnings: string[];
  errors: string[];
  scannedAt: string;
}

// Forbidden code patterns that could be dangerous in submitted game code
const FORBIDDEN_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\beval\s*\(/, reason: 'eval() is forbidden — arbitrary code execution risk' },
  { pattern: /new\s+Function\s*\(/, reason: 'new Function() is forbidden — arbitrary code execution risk' },
  { pattern: /\bprocess\.env\b/, reason: 'process.env access is forbidden — environment variable leak risk' },
  { pattern: /require\s*\(\s*['"]fs['"]/, reason: 'fs module is forbidden — filesystem access risk' },
  { pattern: /require\s*\(\s*['"]child_process['"]/, reason: 'child_process is forbidden — system command risk' },
  { pattern: /require\s*\(\s*['"]net['"]/, reason: 'net module is forbidden — network access risk' },
  { pattern: /require\s*\(\s*['"]http['"]/, reason: 'direct http module is forbidden' },
  { pattern: /require\s*\(\s*['"]https['"]/, reason: 'direct https module is forbidden' },
  { pattern: /<script\s+src\s*=\s*["']https?:\/\/(?!cdn\.jsdelivr|unpkg|cdnjs)/, reason: 'External script injection detected — only trusted CDNs allowed' },
  { pattern: /document\.cookie/, reason: 'document.cookie access is forbidden — cookie theft risk' },
  { pattern: /localStorage\s*\.\s*getItem\s*\(\s*['"]token['"]/, reason: 'Token access from localStorage is forbidden' },
  { pattern: /window\.parent/, reason: 'window.parent access is forbidden — iframe escape risk' },
  { pattern: /window\.top/, reason: 'window.top access is forbidden — iframe escape risk' },
  { pattern: /parent\.postMessage/, reason: 'parent.postMessage is restricted — use game API instead' },
  { pattern: /XMLHttpRequest|fetch\s*\(/, reason: 'Direct network requests detected — verify URLs are safe' },
  { pattern: /WebSocket\s*\(/, reason: 'WebSocket creation detected — verify it connects only to game server' },
];

// Allowed file extensions for game assets
const ALLOWED_EXTENSIONS = [
  '.html', '.htm', '.css', '.js', '.ts', '.json',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
  '.mp3', '.wav', '.ogg', '.mp4', '.webm',
  '.woff', '.woff2', '.ttf', '.eot',
  '.glb', '.gltf', '.obj', '.fbx',
  '.wasm',
  '.txt', '.md',
];

// Required manifest fields
const REQUIRED_MANIFEST_FIELDS = ['name', 'version', 'entry'];

export interface GameManifest {
  name: string;
  version: string;
  entry: string;
  description?: string;
  author?: string;
  mode?: string;
  minPlayers?: number;
  maxPlayers?: number;
  permissions?: string[];
}

export function validateManifest(manifestJson: string): { valid: boolean; manifest?: GameManifest; errors: string[] } {
  const errors: string[] = [];

  let manifest: any;
  try {
    manifest = JSON.parse(manifestJson);
  } catch {
    return { valid: false, errors: ['Invalid JSON in manifest'] };
  }

  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (!manifest[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (manifest.name && (typeof manifest.name !== 'string' || manifest.name.length < 2 || manifest.name.length > 50)) {
    errors.push('name must be a string between 2-50 characters');
  }

  if (manifest.version && !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
    errors.push('version must follow semver format (e.g. 1.0.0)');
  }

  if (manifest.entry && typeof manifest.entry !== 'string') {
    errors.push('entry must be a string (filename or URL)');
  }

  if (manifest.minPlayers !== undefined && (typeof manifest.minPlayers !== 'number' || manifest.minPlayers < 1)) {
    errors.push('minPlayers must be a positive number');
  }

  if (manifest.maxPlayers !== undefined && (typeof manifest.maxPlayers !== 'number' || manifest.maxPlayers < 1)) {
    errors.push('maxPlayers must be a positive number');
  }

  return {
    valid: errors.length === 0,
    manifest: errors.length === 0 ? manifest as GameManifest : undefined,
    errors,
  };
}

export function scanFileExtensions(filenames: string[]): { allowed: string[]; blocked: string[] } {
  const allowed: string[] = [];
  const blocked: string[] = [];

  for (const filename of filenames) {
    const ext = '.' + filename.split('.').pop()?.toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      allowed.push(filename);
    } else {
      blocked.push(filename);
    }
  }

  return { allowed, blocked };
}

export function scanCodeContent(code: string, filename: string): { warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Only scan code files
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  if (!['.js', '.ts', '.html', '.htm'].includes(ext)) {
    return { warnings, errors };
  }

  for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
    if (pattern.test(code)) {
      // Some patterns are warnings, some are hard errors
      if (reason.includes('forbidden')) {
        errors.push(`[${filename}] ${reason}`);
      } else {
        warnings.push(`[${filename}] ${reason}`);
      }
    }
  }

  // Check for very large inline scripts (potential obfuscation)
  if (code.length > 500000) {
    warnings.push(`[${filename}] Very large file (${Math.round(code.length / 1024)}KB) — may contain obfuscated code`);
  }

  return { warnings, errors };
}

export function performFullScan(manifest: string, sourceFiles: Record<string, string>): ScanResult {
  const allWarnings: string[] = [];
  const allErrors: string[] = [];

  // 1. Validate manifest
  const manifestResult = validateManifest(manifest);
  if (!manifestResult.valid) {
    allErrors.push(...manifestResult.errors.map(e => `[manifest] ${e}`));
  }

  // 2. Check file extensions
  const filenames = Object.keys(sourceFiles);
  const extResult = scanFileExtensions(filenames);
  if (extResult.blocked.length > 0) {
    allErrors.push(`Blocked file types: ${extResult.blocked.join(', ')}`);
  }

  // 3. Scan code content
  for (const [filename, content] of Object.entries(sourceFiles)) {
    const codeResult = scanCodeContent(content, filename);
    allWarnings.push(...codeResult.warnings);
    allErrors.push(...codeResult.errors);
  }

  return {
    passed: allErrors.length === 0,
    warnings: allWarnings,
    errors: allErrors,
    scannedAt: new Date().toISOString(),
  };
}
