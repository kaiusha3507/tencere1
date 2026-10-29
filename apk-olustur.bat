@echo off
chcp 65001 >nul
title Tencere - Android APK olustur
cd /d "%~dp0mobile"
if not exist node_modules (
  echo  Once "kurulum.bat" dosyasini calistirin.
  pause
  exit /b 1
)
echo.
echo  Android telefona kurulabilir APK, Expo'nun bulut derleme servisinde (EAS) hazirlanir.
echo  Ucretsiz bir Expo hesabi gerekir: https://expo.dev/signup
echo.
echo  [1/2] Expo hesabiniza giris yapin:
call npx eas-cli@latest login
if errorlevel 1 goto hata
echo.
echo  [2/2] Derleme baslatiliyor. "EAS projesi olusturulsun mu?" ve "Android keystore olusturulsun mu?"
echo  sorularina Enter ile EVET deyin. Derleme bulutta 10-20 dakika surer.
call npx eas-cli@latest build --platform android --profile preview
if errorlevel 1 goto hata
echo.
echo  Bitti. Yukaridaki baglantiyi telefonunuzda acip APK dosyasini indirin ve kurun.
pause
exit /b 0
:hata
echo  [HATA] Islem tamamlanamadi. Penceredeki son satirlari bana gonderin.
pause
exit /b 1
