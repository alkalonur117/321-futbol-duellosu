# 3-2-1 Futbol Düellosu — Expo Go Testi

Bu klasör, mevcut Render üzerindeki oyunu Expo Go ile test etmek için hazırlanmış **geçici mobil test kabuğudur**. Asıl oyun, hesaplar, odalar, oyuncu eşleştirmeleri ve API verileri Render sunucusunda kalır. Mobil uygulama içinde API anahtarı bulunmaz.

## Expo Go ile açma

1. Bilgisayardan [Expo Snack testini aç](https://snack.expo.dev/?name=3-2-1%20Futbol%20Duellosu%20-%20Expo%20Go%20Test&description=3-2-1%20Futbol%20Duellosu%20mobil%20test%20(canli%20oyun)&sourceUrl=https%3A%2F%2Fraw.githubusercontent.com%2Falkalonur117%2F321-futbol-duellosu%2Fexpo-go-test%2Fexpo-go%2FApp.js&dependencies=react-native-webview%2Cexpo-clipboard&sdkVersion=54.0.0&platform=mydevice).
2. Snack'te `My Device / Run on your device` seçeneğindeki QR kodunu göster.
3. Telefona **Expo Go** uygulamasını yükle. Android'de Expo Go içindeki QR tarayıcıyı, iPhone'da Kamera'yı kullanarak QR kodunu aç.
4. Oyunda giriş yap, oda oluştur, oda kodunu kopyala ve iki oyuncunun skor tabelasını test et.

**Not:** Snack, `expo-go/App.js` dosyasını bu GitHub dalından `sourceUrl` üzerinden alır. Güncelleme yaparsan Snack sayfasını yeniden yükle. Expo Go SDK 54 hedeflenmiştir.

**Sunucu:** https://three21-futbol-duellosu.onrender.com/

**Kısıtlar:** Bu Expo Go testi gerçek App Store / Google Play derlemesi değildir. Telefonun internet erişimi olmalı. WebView, uygulamanın web sürümünü gösterir. Render üzerinde son değişiklikler yayınlanmadıysa Expo Go da eski arayüzü gösterir.
