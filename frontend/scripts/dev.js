/**
 * 启动 Vite dev server，自动释放占用的端口。
 */
import { execSync, spawn } from 'node:child_process'

const PORT = parseInt(process.env.VITE_PORT) || 5173

if (process.platform === 'win32') {
  try {
    const out = execSync(
      `netstat -ano | findstr /R ":${PORT}.*LISTENING"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] },
    )
    const pid = out.trim().split(/\s+/).at(-1)
    if (pid && pid !== '0') {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
      console.log(`[dev] 端口 ${PORT} 已释放 (PID ${pid})`)
    }
  } catch {
    // 端口未被占用，忽略
  }
}

const vite = spawn('npx', ['vite'], { stdio: 'inherit', shell: true })
vite.on('exit', (code) => process.exit(code ?? 0))
