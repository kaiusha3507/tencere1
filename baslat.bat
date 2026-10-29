@echo off
chcp 65001 >nul
title Tencere - Gelistirme sunucusu
cd /d "%~dp0mobile"
if not exist node_modules (
  echo  Once "kurulum.bat" dosyasini calistirin.
  pause
  exit /b 1
)
echo.
echo  Tencere baslatiliyor. Ekranda bir QR kod ve menu goreceksiniz.
echo  Durdurmak icin bu pencerede Ctrl+C tuslarina basin.
echo.
call npx expo start
pause
