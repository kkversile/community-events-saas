import { spawn, spawnSync } from 'node:child_process';
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
run('npm', ['--workspace', 'community-events-backend', 'run', 'db:push']);
run('npm', ['--workspace', 'community-events-backend', 'run', 'db:seed']);
const child = spawn('npm', ['run', 'dev:apps'], { stdio:'inherit', shell:process.platform === 'win32' });
child.on('exit', code => process.exit(code ?? 0));
