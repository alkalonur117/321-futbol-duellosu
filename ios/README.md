# 3-2-1 Futbol — iOS uygulaması (ilk native sürüm)

Bu klasör, mevcut çok oyunculu oyunu iPhone ve iPad'de çalıştıran **SwiftUI + WKWebView** iOS uygulamasının kaynak kodunu içerir. Bu, web sitesine ana ekran kısayolu eklemekten farklı olarak gerçek bir Xcode iOS uygulama projesidir.

## iPhone'da çalıştırma

1. macOS bilgisayarda **Xcode 16 veya üzerini** kurun.
2. XcodeGen kurun: `brew install xcodegen`.
3. Terminalde `cd ios && xcodegen generate` komutunu çalıştırın.
4. `open Three21Football.xcodeproj` ile projeyi açın.
5. Xcode'da **Signing & Capabilities** alanında kendi Apple Team'inizi ve benzersiz Bundle Identifier'ınızı seçin.
6. Bağlı iPhone'u veya iOS simülatörünü seçip **Run** düğmesine basın.

Kişisel Apple ID ile cihazda geliştirme testi yapılabilir; **TestFlight ve App Store** dağıtımı için Apple Developer Program üyeliği ve uygun imzalama gerekir. Bu ortamda macOS/Xcode ve Apple imzalama erişimi olmadığı için imzalı `.ipa` üretilememiştir.

## Mevcut özellikler

- iPhone/iPad uyumlu native SwiftUI uygulama çerçevesi
- Canlı 3-2-1 futbol oyunu, giriş, oda oluşturma, WebSocket üzerinden çok oyunculu oyun
- Yerel paylaş menüsü, yenileme, bağlantı hata bildirimi
- Gol, rakip golü, yanlış cevap ve uyarı için iPhone titreşim geri bildirimi
- Oyun ekranında önceki cevapların görünmesi ve sabit oyun arayüzü
- Harici bağlantıları Safari'de açma; uygulama içi gezinmeyi oyun alan adıyla sınırlama

## Önemli notlar

- Uygulama **internet bağlantısı** ve canlı Render sunucusu gerektirir. Oyun veritabanı ve kullanıcı oturumlarının güvenilirliği sunucu tarafındaki altyapıya bağlıdır.
- Şu anki sürüm, mevcut web oyununun native iOS kabuğudur. **App Store kabulü garanti değildir**; Apple'ın minimum işlevsellik, gizlilik ve kullanıcı deneyimi kuralları doğrultusunda daha fazla native ekran/özellik gerekebilir.
- App Store yayını öncesi gizlilik politikası, veri kullanımı beyanları, uygulama ekran görüntüleri, mağaza açıklamaları ve fiziksel cihaz testleri tamamlanmalıdır.
- Oyun servis URL'si `GameScreen.swift` içindeki `GameConfig` alanından değiştirilebilir.
