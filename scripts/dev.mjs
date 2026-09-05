import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

function waitForPort(port, host='127.0.0.1', timeoutMs=60000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.createConnection({ port, host });
      socket.on('connect', () => { socket.destroy(); resolve(); });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) reject(new Error('Timed out waiting for PostgreSQL'));
        else setTimeout(tryConnect, 1000);
      });
    };
    tryConnect();
  });
}

console.log('\n[1/4] Starting PostgreSQL via Docker Compose...');
const docker = spawnSync('docker', ['--version'], { stdio: 'ignore', shell: process.platform === 'win32' });
if (docker.status !== 0) {
  console.error('\nDocker is not available. Either install Docker Desktop, or set DATABASE_URL in community-events-backend/.env and run: npm run dev:no-docker\n');
  process.exit(1);
}
run('docker', ['compose', 'up', '-d', 'postgres']);
await waitForPort(5437);

console.log('\n[2/4] Preparing database...');
run('npm', ['--workspace', 'community-events-backend', 'run', 'db:push']);
run('npm', ['--workspace', 'community-events-backend', 'run', 'db:seed']);

console.log('\n[3/4] Starting backend on http://localhost:4004');
console.log('[4/4] Starting frontend on http://localhost:3004\n');
const child = spawn('npm', ['run', 'dev:apps'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env }
});
child.on('exit', code => process.exit(code ?? 0));
