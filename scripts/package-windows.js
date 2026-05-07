const { spawnSync } = require('node:child_process')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '..')
const builderExecutable = process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder'
const builderPath = path.join(repoRoot, 'node_modules', '.bin', builderExecutable)

const result = spawnSync(builderPath, ['--win', '-c.win.signAndEditExecutable=false'], {
  cwd: repoRoot,
  env: {
    ...process.env,
    CSC_IDENTITY_AUTO_DISCOVERY: 'false',
  },
  shell: process.platform === 'win32',
  stdio: 'inherit',
})

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 1)
