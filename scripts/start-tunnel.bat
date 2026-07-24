@echo off
cd /d D:\Ho_Tro
rem Vòng lặp tự khởi động lại: lúc máy vừa mở, mạng có thể chưa sẵn sàng khiến
rem cloudflared tra cứu DNS thất bại và tự thoát — script này sẽ chờ rồi thử lại
rem thay vì để tunnel chết hẳn.
:loop
echo [%date% %time%] Dang khoi dong cloudflared... >> D:\Ho_Tro\server\data\tunnel-run.log
"D:\Ho_Tro\cloudflared\cloudflared.exe" tunnel --config D:\Ho_Tro\cloudflared\config.yml run >> D:\Ho_Tro\server\data\tunnel-run.log 2>&1
echo [%date% %time%] cloudflared da thoat, thu lai sau 10 giay... >> D:\Ho_Tro\server\data\tunnel-run.log
timeout /t 10 /nobreak >nul
goto loop
