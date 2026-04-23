/**
 * Code execution service for Electron main process.
 * Runs code in sandboxed child processes with timeout.
 */
import { spawn } from 'child_process'
import { mkdtemp, writeFile, rm } from 'fs/promises'
import { existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export interface ExecutionResult {
  stdout: string
  stderr: string
  exitCode: number
  duration: number
}

const MAX_CODE_SIZE = 64 * 1024
const EXECUTION_TIMEOUT = 10_000
const MAX_OUTPUT = 256 * 1024

function truncate(s: string, max = MAX_OUTPUT) {
  return s.length > max ? s.slice(0, max) + '\n... [truncated]' : s
}

/** Strip ANSI escape sequences (colors, cursor movement, etc.) */
function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
}

function runProcess(
  cmd: string,
  args: string[],
  opts: { cwd: string; timeout: number },
): Promise<ExecutionResult> {
  let actualCmd = cmd
  let actualArgs = args
  if (process.platform === 'win32' && cmd.toLowerCase().endsWith('.cmd')) {
    actualCmd = 'cmd.exe'
    actualArgs = ['/c', cmd, ...args]
  }

  return new Promise((resolve) => {
    const start = Date.now()
    let stdout = ''
    let stderr = ''
    let killed = false

    const proc = spawn(actualCmd, actualArgs, {
      cwd: opts.cwd,
      timeout: opts.timeout,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      windowsHide: true,
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
    })

    proc.stdout.on('data', (d) => { stdout += d.toString() })
    proc.stderr.on('data', (d) => { stderr += d.toString() })

    proc.on('error', (err) => {
      resolve({
        stdout: stripAnsi(truncate(stdout)),
        stderr: stripAnsi(truncate(err.message)),
        exitCode: 1,
        duration: Date.now() - start,
      })
    })

    proc.on('close', (code, signal) => {
      if (signal === 'SIGTERM') killed = true
      resolve({
        stdout: stripAnsi(truncate(stdout)),
        stderr: killed ? stripAnsi(truncate(stderr + '\n[Execution timed out]')) : stripAnsi(truncate(stderr)),
        exitCode: code ?? (killed ? 124 : 1),
        duration: Date.now() - start,
      })
    })
  })
}

type Lang = 'javascript' | 'typescript' | 'python'

const EXECUTORS: Record<Lang, (code: string, dir: string) => Promise<ExecutionResult>> = {
  javascript: async (code, dir) => {
    const file = join(dir, 'main.mjs')
    await writeFile(file, code, 'utf-8')
    return runProcess('node', [file], { cwd: dir, timeout: EXECUTION_TIMEOUT })
  },
  typescript: async (code, dir) => {
    const file = join(dir, 'main.ts')
    await writeFile(file, code, 'utf-8')

    // Primary: use Node's built-in TypeScript stripping (Node >= 22.6)
    const result = await runProcess('node', ['--experimental-strip-types', file], {
      cwd: dir,
      timeout: EXECUTION_TIMEOUT,
    })

    // If the flag itself is unrecognised (old Node), fall back to tsx
    if (result.exitCode !== 0 && result.stderr.includes('--experimental-strip-types')) {
      try {
        const tsxCli = require.resolve('tsx/cli')
        return runProcess('node', [tsxCli, file], { cwd: dir, timeout: EXECUTION_TIMEOUT })
      } catch {
        // tsx not resolvable – last resort npx
        const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
        return runProcess(npx, ['tsx', file], { cwd: dir, timeout: EXECUTION_TIMEOUT })
      }
    }

    return result
  },
  python: async (code, dir) => {
    const file = join(dir, 'main.py')
    await writeFile(file, code, 'utf-8')
    const python = process.platform === 'win32' ? 'python' : 'python3'
    return runProcess(python, [file], { cwd: dir, timeout: EXECUTION_TIMEOUT })
  },
}

export async function executeCode(code: string, language: string): Promise<ExecutionResult> {
  if (code.length > MAX_CODE_SIZE) {
    return { stdout: '', stderr: 'Code exceeds maximum size', exitCode: 1, duration: 0 }
  }

  const lang = language.toLowerCase() as Lang
  const executor = EXECUTORS[lang]
  if (!executor) {
    return { stdout: '', stderr: `Unsupported language: ${language}`, exitCode: 1, duration: 0 }
  }

  const dir = await mkdtemp(join(tmpdir(), 'ainote-exec-'))
  try {
    return await executor(code, dir)
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

export function supportedLanguages(): string[] {
  return Object.keys(EXECUTORS)
}
