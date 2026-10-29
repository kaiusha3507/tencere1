@echo off
chcp 65001 >nul
title Tencere - Kurulum
echo.
echo  ===== Tencere kurulumu =====
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo  [HATA] Node.js bulunamadi.
  echo  https://nodejs.org adresinden "LTS" surumunu kurun, bilgisayari yeniden baslatin ve bu dosyayi tekrar calistirin.
  pause
  exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo  Node.js surumu: %%v
echo.
cd /d "%~dp0mobile"
echo  [1/2] Expo paketleri indiriliyor (ilk seferde birkac dakika surebilir)...
call npm install
if errorlevel 1 goto hata
echo.
echo  [2/2] Expo SDK ile uyumlu kutuphaneler kuruluyor...
call node ..\scripts\pin-expo-deps.mjs
if errorlevel 1 goto hata
rmdir /s /q node_modules
del /q package-lock.json 2>nul
call npm install
if errorlevel 1 goto hata
echo.
echo  Kurulum tamamlandi. Uygulamayi baslatmak icin "baslat.bat" dosyasina cift tiklayin.
pause
exit /b 0
:hata
echo.
echo  [HATA] Kurulum tamamlanamadi. Internet baglantinizi kontrol edip tekrar deneyin.
echo  Sorun devam ederse bu penceredeki son satirlari kopyalayip bana gonderin.
pause
exit /b 1
