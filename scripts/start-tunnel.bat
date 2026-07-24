@echo off
cd /d D:\Ho_Tro
"D:\Ho_Tro\cloudflared\cloudflared.exe" tunnel --config D:\Ho_Tro\cloudflared\config.yml run >> D:\Ho_Tro\server\data\tunnel-run.log 2>&1
