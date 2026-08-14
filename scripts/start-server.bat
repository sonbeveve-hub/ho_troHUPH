@echo off
cd /d D:\Ho_Tro
:loop
echo [%date% %time%] Dang khoi dong server... >> D:\Ho_Tro\server\data\server-run.log
"%LOCALAPPDATA%\Programs\nodejs\node.exe" server\src\index.js >> D:\Ho_Tro\server\data\server-run.log 2>&1
echo [%date% %time%] server da thoat, thu lai sau 5 giay... >> D:\Ho_Tro\server\data\server-run.log
timeout /t 5 /nobreak >nul
goto loop
