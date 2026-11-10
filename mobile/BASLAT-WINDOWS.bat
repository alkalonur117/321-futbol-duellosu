@echo off
setlocal
cd /d "%~dp0"
title Futbol Duellosu - Expo Go Test
echo.
echo ==========================================
echo   FUTBOL DUELLOSU - EXPO GO IPHONE TESTI
echo ==========================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js kurulu degil. https://nodejs.org adresinden LTS surumunu kurun.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo npm bulunamadi. Node.js LTS kurulumunu kontrol edin.
  pause
  exit /b 1
)
echo [1/2] Gerekli paketler kontrol ediliyor...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo Paket kurulumu basarisiz. Internet baglantinizi kontrol edin.
  pause
  exit /b 1
)
echo.
echo [2/2] Expo Go icin QR kodu hazirlaniyor...
echo Bilgisayar ve iPhone AYNI Wi-Fi aginda olmali.
echo iPhone'da Kamera ile QR kodunu tarayin.
echo Farkli agdaysaniz bu pencereyi kapatip su komutu deneyin:
echo npx expo start --tunnel
echo.
call npx expo start --lan
if errorlevel 1 (
  echo Expo baslatilamadi. Hata mesajini ChatGPT'ye gonderin.
  pause
  exit /b 1
)
pause
