#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
echo "Expo Go bulut testi baslatiliyor..."
echo "iPhone'da Expo Go uygulamasini acin ve QR kodunu tarayin."
echo "Codespaces aciksa terminali kapatmayin."
npx expo start --tunnel --clear
