# 3-2-1 Futbol Düellosu — V5

## Yenilikler
- 250 farklı dört seçenekli futbol sorusu (Dünya Kupası, futbol kuralları, tarih, rekorlar, finaller, önemli goller, Türkiye, kadın futbolu, Şampiyonlar Ligi). Aynı maçta 250 soru bitmeden soru tekrarı olmaz; her maçta karıştırılır.
- Kullanıcı girişi sonrası **açık odalar** listesi; 1/2 kişilik açık odaya katılma ve oda koduyla katılma.
- Tic Tac Toe'da 15 saniyelik tur, sıra bildirimi, kazanılan karede sadece futbolcunun adı ve oyuncunun rengi.
- Takımları Sen Seç: her oyuncu kendi takımını 20 saniyede seçer; eşleşme doğrulanınca 15 saniye cevap. Eksik veya geçersiz eşleşmede puan/sıra değişmez, yeniden takım seçilir.
- Wikidata'dan takım bazlı sorgu: yerel eşleşme bulunmazsa iki kulüp Wikidata'da aranır ve P54 (oynadığı takım) ilişkilerinden ortak futbolcular sorgulanır. Sonuçlar 7 gün bellekte önbelleğe alınır.
- Futbol Bingo kaldırıldı; dört mod: Klasik, Takımları Sen Seç, Tic Tac Toe, Futbol Bilgi Yarışması.

## Kurulum
`npm install` ardından `npm start`. Render mevcut GitHub deposuna bu ZIP'in içindeki dosyaları yükleyip son commit'i dağıtabilir. `DATABASE_URL` PostgreSQL bağlantısı tanımlanırsa kullanıcı hesapları kalıcı tutulur. Tanımlanmazsa `accounts.json` kullanılır; Render'ın geçici diski yeniden başlatmalarda veri kaybedebilir.

## Wikidata kapsamı ve sınırlamalar
**Bu sürüm bütün dünya futbolcularını önceden indirmez.** Seçilen kulüp çiftinde yerel cevap yoksa, maç başlatılırken canlı Wikidata sorgusu yapar. Wikidata eksik olabilir, her futbolcunun profesyonelliği ayrı doğrulanmaz; altyapı, millî takım, aynı adlı kulüp ve kulüp kimliği karışıklıkları mümkün. Kulüp araması ilk uygun Wikidata sonucunu seçebilir. Canlı bağlantı kesilirse yeniden takım seçimi istenir. Bir çiftte 250'den fazla ortak futbolcu varsa sorgu ilk 250 ile sınırlıdır. Render yeniden başlayınca önbellek sıfırlanır. Kapsamlı profesyonel futbolcu veri havuzu için Wikidata dökümlerinden kalıcı PostgreSQL aktarımı ve P54 beyanlarının niteliklerine göre doğrulama sonraki geliştirmedir.

## Bilinen sınırlamalar
- Canlı Wikidata sorgusu 20 saniyeye kadar sürebilir ve zaman aşımına uğrayabilir; oyun saati ancak doğrulamadan sonra başlar.
- Odalar sunucu belleğindedir; servis yeniden başlarsa odalar kapanır. Açık oda listesi oluşturma/katılma/ayrılmada güncellenir, solo odalar listelenmez.
- Soru havuzu editoryal kontrolden geçirilmelidir; kaynakça her sorunun içine işlenmemiştir. Soruların doğruluğunu yayına almadan önce ayrıca denetleyin.
- Wikidata yapılandırılmış verileri CC0 kapsamındadır; kulüp logoları ve futbolcu fotoğrafları bu lisansa otomatik olarak dahil değildir.

## V6 değişiklikleri
- Takımları Sen Seç modunda her turda iki oyuncu yeniden takım seçer (20 saniye); futbolcu cevabı 15 saniye.
- Oyun ekranından oda listesine dönüş ve odadan ayrılma.
- Doğru cevapta yarı saydam gol animasyonu.
- Ayrı yönetici girişi: `ADMIN_USERNAME` (varsayılan `admin321`) ve zorunlu `ADMIN_PASSWORD` Render Environment üzerinden ayarlanır. Yönetici hesabı normal kayıt ekranından oluşturulamaz. Güçlü ve benzersiz bir şifre kullanın; repoya yazmayın.
- Yönetici panelinde aktif odalar, bağlı kullanıcı sayısı ve oda kapatma.

**Not:** Kullanıcı hesaplarının kalıcı olması için `DATABASE_URL` ile PostgreSQL bağlanması gerekir. Render ücretsiz diskine yazılan `accounts.json` kalıcı değildir. Oturumlar sunucu belleğinde tutulduğu için yeniden dağıtımda oturum açmak gerekebilir.
