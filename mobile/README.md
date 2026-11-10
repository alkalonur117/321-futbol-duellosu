# Futbol Düellosu — native Android + iOS (ilk işlevsel sürüm)

Bu klasör React Native + Expo ile yazılmış **gerçek mobil ekranlar** içerir. WebView kullanmaz. Mevcut Node.js/WebSocket oyun sunucusuyla aynı protokolü konuşur. Mevcut web sitesi ve eski Android/iOS WebView denemeleri değiştirilmez.

## Bu sürümdeki akışlar

- Kullanıcı adı/şifre ile giriş, kayıt ve güvenli oturum saklama (Expo SecureStore)
- Dört oyun modu: Klasik 3-2-1, Takımları Sen Seç, Tic Tac Toe, Futbol Bilgi Yarışması
- Açık odalar, oda koduyla katılma, arkadaşla oyun, yapay zekâ (Kolay/Orta/Zor), uygun modlarda tek kişilik oyun
- WebSocket üzerinden canlı durum, skor, tur süresi, cevaplar, öneri onayı, rövanş ve odadan ayrılma
- Şifre onaylı hesap silme (bu değişiklik için PR'daki server.js de dağıtılmalı)

**Sınırlar:** İlk sürüm henüz gerçek cihazlarda test edilmedi. Gol sesleri/animasyonları, yönetici paneli, reklam SDK'sı, bildirimler, otomatik yeniden oda katılımı, mağaza ikonları/görselleri, gizlilik politikası ve son kalite testleri tamamlanmadan mağazaya gönderilmemeli. Sunucu bağlantısı koparsa oda oturumu kaybolabilir. Mevcut backend veri kalitesi sınırlamaları devam eder.

## Kurulum (Windows / macOS / Linux)

1. Node.js LTS yükleyin.
2. Bu klasörde: npm install
3. Test için: npx expo start
4. Android telefonda Expo Go ile QR kodu tarayın. iPhone'da da Expo Go ile geliştirme önizlemesi yapılabilir; bu, imzalı bağımsız iPhone uygulaması veya TestFlight dağıtımı değildir.
5. İsteğe bağlı .env dosyasına EXPO_PUBLIC_GAME_WS_URL=wss://... yazın. Varsayılan canlı Render adresidir. .env içine sır/API anahtarı koymayın.

WebSocket bağlantısı için sunucu ayakta olmalı. Yeni hesap silme mesajının çalışması için aynı PR'daki server.js güncellemesi dağıtılmalı.

## Gerçek Android APK (test)

- Bir Expo hesabı açın ve npx eas-cli login çalıştırın.
- npx eas-cli build:configure ve npx eas-cli build --platform android --profile preview.
- Oluşan APK'yı test Android cihazına kurun.
- Google Play için npx eas-cli build --platform android --profile production (AAB) gerekir.

## Gerçek iPhone / TestFlight

**Mac satın almak şart değil.** EAS Build iOS derlemesini bulutta yapabilir.

- Gerçek iPhone'a bağımsız IPA yüklemek veya TestFlight ile dağıtmak için **Apple Developer Program** üyeliği ve Apple imzası gerekir.
- Arkadaşlara en rahat test: npx eas-cli build --platform ios --profile production → npx eas-cli submit --platform ios --profile production → App Store Connect / TestFlight → test kullanıcılarına davet. İlk dış test sürümü Apple Beta App Review incelemesine tabidir.
- Alternatif: npx eas-cli device:create ile iPhone UDID kaydet, ardından npx eas-cli build --platform ios --profile preview; bu ad hoc yöntemde sadece kayıtlı cihazlar yükleyebilir.
- Fiziksel cihaz olmadan ilk arayüz testi: npx eas-cli build --platform ios --profile simulator. Simülatör derlemesi gerçek iPhone'a kurulamaz.

**Dikkat:** app.json içindeki uygulama adı, bundle identifier ve Android package şu anda **geçici**. Marka adı ve kalıcı paket kimliği mağaza hesaplarını açmadan önce onaylanmalı.

## Yayın öncesi kontrol listesi

- [ ] iPhone ve Android'de iki oyunculu maçlar, yeniden bağlantı, zaman aşımı ve tüm modlar test edildi
- [ ] Hesap silme ve oturum kapanışı gerçek PostgreSQL üzerinde doğrulandı
- [ ] App Store / Play Store gizlilik beyanları ve gizlilik politikası tamamlandı
- [ ] Ekran görüntüleri, ikon, splash ve yaş derecelendirmesi tamamlandı
- [ ] Futbolcu verisi, kulüp logoları ve sesler için gerekli kullanım hakları doğrulandı
- [ ] AdMob/izin yönetimi gerekiyorsa kurallara uygun entegrasyon yapıldı
- [ ] Üretim imzalama, EAS proje bağlantısı ve mağaza uygulama kayıtları tamamlandı

## Teknik not

Sunucu varsayılan olarak wss://three21-futbol-duellosu.onrender.com üzerinden erişilir. Özel alan adı bağlandığında EXPO_PUBLIC_GAME_WS_URL değiştirilip yeni mobil sürüm derlenmelidir. Sunucu üzerinde API anahtarları tutulmalı; mobil uygulama içine gizli anahtar gömülmemelidir.
