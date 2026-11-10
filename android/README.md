# 3-2-1 Futbol — Android uygulaması

Bu klasör, mevcut çevrimiçi futbol oyununu Android telefona **gerçek APK olarak yüklenebilir** hâle getiren Android (Java + WebView) uygulamasının kaynak kodudur.

## APK'yı bilgisayar kullanmadan Android telefona kurma

1. GitHub'da [Android APK - 3-2-1 Futbol](https://github.com/alkalonur117/321-futbol-duellosu/actions/workflows/android-apk.yml) iş akışını açın.
2. En son **yeşil tikli** çalıştırmayı açın. Gerekirse **Run workflow** ile başlatın.
3. Sayfanın altındaki **Artifacts → Three21-Futbol-Android-APK** bağlantısına dokunun. GitHub hesabına giriş gerekebilir.
4. İndirilen ZIP dosyasını açıp içindeki `app-debug.apk` dosyasını çıkarın.
5. APK dosyasını açın. Android sorarsa dosyayı açtığınız uygulama için **Bu kaynaktan yüklemeye izin ver** seçeneğini etkinleştirin.
6. **Yükle** diyerek 3-2-1 Futbol'u ana ekranınıza ekleyin.

**Önemli:** Bu, Android için debug anahtarıyla imzalanmış test APK'sıdır; Google Play'e yüklenmeye hazır nihai sürüm değildir. Android'de bilinmeyen kaynaktan APK yüklemek riskli olabilir. Yalnızca bu projenin GitHub deposundan kendi derlediğiniz APK'yı kurun. Telefonunuzda güvenlik uyarısı görürseniz dosyanın kaynağını doğrulayın.

## İçerik

- Android ana ekranında **3-2-1 Futbol** simgesi
- Çok oyunculu oyunlar, giriş, yapay zekâ, bilgi yarışması, eski cevap geçmişi
- Yerel Android paylaş ve yenile düğmeleri
- HTTPS-only oyun alan adı; diğer HTTPS bağlantıları harici tarayıcıda açılır
- Çevrimdışı veya sunucu bağlantı hatasında yeniden dene ekranı
- Android geri tuşuyla maçtan ayrılma için oyun içi temalı onay penceresi

## Mimari ve sınırlar

Uygulama, yerel Android arayüzü içinde güvenli WebView üzerinden **mevcut canlı oyunu** çalıştırır; oyun motoru henüz tamamen Kotlin/Java'ya taşınmadı. WebSocket üzerinden çevrimiçi çok oyunculu mod için internet ve çalışan Render sunucusu gerekir. Debug APK, Android 8.0 (API 26) ve sonrası için hedeflenmiştir.

## Yerel derleme (isteğe bağlı)

Android Studio / Android SDK ve Java 17 ile `android/` klasörünü açın. GitHub Actions iş akışı ise macOS, Windows veya Android Studio gerektirmeden GitHub'ın Ubuntu sunucusunda APK derler.

Komut: `gradle :app:assembleDebug` (Gradle 8.10.2). Çıktı: `android/app/build/outputs/apk/debug/app-debug.apk`.
