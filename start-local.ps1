$ErrorActionPreference = 'Stop'
Write-Host 'Installing workspace dependencies...' -ForegroundColor Cyan
npm install
Write-Host 'Starting PostgreSQL, NestJS API and React UI...' -ForegroundColor Cyan
npm run dev
