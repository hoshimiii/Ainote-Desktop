const { execFileSync } = require('node:child_process')
const path = require('node:path')

if (process.platform !== 'win32') {
  console.log('[package] Windows unpacked app cleanup skipped on non-Windows platform.')
  process.exit(0)
}

const repoRoot = path.resolve(__dirname, '..')
const outputDir = path.resolve(repoRoot, 'release', 'win-unpacked')
const outputDirLower = outputDir.toLowerCase()

function isInOutputDir(filePath) {
  const candidate = path.resolve(filePath)
  const candidateLower = candidate.toLowerCase()
  return candidateLower === outputDirLower || candidateLower.startsWith(`${outputDirLower}${path.sep}`)
}

function listAiNoteProcesses() {
  const command = [
    "$ErrorActionPreference = 'SilentlyContinue';",
    "Get-CimInstance Win32_Process -Filter \"Name = 'AiNote.exe'\"",
    '| Select-Object ProcessId,ExecutablePath',
    '| ConvertTo-Json -Compress',
  ].join(' ')

  const output = execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command],
    { encoding: 'utf8' },
  ).trim()

  if (!output) return []
  const parsed = JSON.parse(output)
  return Array.isArray(parsed) ? parsed : [parsed]
}

function isRunning(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

const matchingProcesses = listAiNoteProcesses().filter((processInfo) => {
  if (!processInfo.ExecutablePath) return false
  return path.basename(processInfo.ExecutablePath).toLowerCase() === 'ainote.exe'
    && isInOutputDir(processInfo.ExecutablePath)
})

if (matchingProcesses.length === 0) {
  console.log('[package] No running unpacked AiNote.exe found.')
  process.exit(0)
}

console.log(`[package] Stopping ${matchingProcesses.length} running unpacked AiNote.exe process(es).`)

for (const processInfo of matchingProcesses) {
  const pid = Number(processInfo.ProcessId)
  if (!Number.isInteger(pid)) continue

  try {
    process.kill(pid)
  } catch (error) {
    if (error && error.code !== 'ESRCH') {
      throw error
    }
  }
}

const deadline = Date.now() + 5000
let stillRunning = matchingProcesses.filter((processInfo) => isRunning(Number(processInfo.ProcessId)))

while (stillRunning.length > 0 && Date.now() < deadline) {
  sleep(100)
  stillRunning = matchingProcesses.filter((processInfo) => isRunning(Number(processInfo.ProcessId)))
}

if (stillRunning.length > 0) {
  const pids = stillRunning.map((processInfo) => processInfo.ProcessId).join(', ')
  throw new Error(`Timed out waiting for unpacked AiNote.exe process(es) to exit: ${pids}`)
}

console.log('[package] Unpacked AiNote.exe cleanup complete.')
