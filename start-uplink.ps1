Write-Host "--- JARVIS NEURAL UPLINK INITIALIZED ---" -ForegroundColor Cyan

# 1. Start Evolution API in Docker
Write-Host "[1/3] Starting High-Performance Engine..." -ForegroundColor Yellow
# Try to stop existing container first to avoid name conflicts
docker stop jarvis-wa-engine 2>$null
docker rm jarvis-wa-engine 2>$null
docker run -d -p 8080:8080 --name jarvis-wa-engine --restart unless-stopped -e AUTHENTICATION_API_KEY=JARVIS_SECURE_777 -e DATABASE_ENABLED=true -e DATABASE_PROVIDER=postgresql -e DATABASE_CONNECTION_URI="postgresql://postgres.qhjgubjfdklmagdluzrz:JarvisSecure2026!@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require" evoapicloud/evolution-api:latest

# 2. Start the Secure Tunnel
Write-Host "[2/3] Establishing Secure Tunnel..." -ForegroundColor Yellow
Write-Host "CRITICAL: Copy the URL that appears below into your .env.local" -ForegroundColor Red
npx -y localtunnel --port 8080
