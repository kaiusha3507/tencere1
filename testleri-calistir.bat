@echo off
chcp 65001 >nul
title Tencere - Testler
cd /d "%~dp0"
echo  Veri seti dogrulaniyor...
node --disable-warning=ExperimentalWarning scripts\validate-data.ts
if errorlevel 1 goto son
echo.
echo  Otomatik testler calisiyor...
node --disable-warning=ExperimentalWarning --test "tests/**/*.test.ts"
:son
pause
