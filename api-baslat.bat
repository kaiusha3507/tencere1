@echo off
chcp 65001 >nul
title Tencere - API sunucusu (istege bagli)
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo  Node.js bulunamadi. https://nodejs.org adresinden LTS surumunu kurun.
  pause
  exit /b 1
)
if not exist api\.env (
  echo  Bilgi: api\.env dosyasi yok; AI ve Migros kapali olarak baslatiliyor.
  echo  Ayar yapmak icin api\.env.example dosyasini api\.env adiyla kopyalayip duzenleyin.
  echo.
)
node --disable-warning=ExperimentalWarning api\server.ts
pause
