# API-Football — Mega satın almadan önce hazırlık

Bu çalışma \`api-football-integration\` dalında test edilmelidir. **Ana dala otomatik alınmaz**; canlı oyunda varsayılan olarak kapalıdır.

## Entegrasyonun kapsamı

- Yerel soru havuzu ve Wikidata mevcut şekilde çalışmaya devam eder.
- Klasik ve Takımları Sen Seç modlarında **kayıtlı cevaplarda bulunmayan** bir futbolcu için isteğe bağlı API-Football doğrulaması yapılır.
- Tic Tac Toe'da aynı pilot doğrulama yalnızca geçerli oyun turu içinde yapılır.
- \`players/profiles\` ile tekil oyuncu kimliği, \`players/teams\` ile iki kulübün de API'de yer alıp almadığı kontrol edilir.
- Birden fazla aynı adlı oyuncu varsa otomatik doğru kabul edilmez. API'de eski kulüp kaydı eksikse bu **yanlış olduğunun kanıtı değildir**.
- 24 saat olumlu / 5 dakika olumsuz önbellek, istek sınırı, 429 soğuma ve kapatma anahtarı vardır. Bu önbellek ücretsiz Render yeniden başlayınca sıfırlanır.
- Kulüp çiftlerinin tüm ortak oyuncularını API'den otomatik keşfetme ve tüm dünya kariyerlerini toplu içeri aktarma **bu ilk pilotun kapsamı dışındadır**. Bunun için veri kapsama ve saklama lisansı ayrıca teyit edilmelidir.

## Ücretsiz API kotasıyla test

\`npm test\` — API anahtarı ve gerçek istek olmadan testleri çalıştırır.

Canlı test için yalnızca **Render Environment** bölümüne şu değişkenler girilir (anahtar GitHub'a, Expo Go'ya veya sohbete yazılmaz):

\`\`\`text
APIFOOTBALL_ENABLED=1
APISPORTS_KEY=<API-Sports panelindeki gizli anahtar>
APIFOOTBALL_MAX_REQUESTS_PER_DAY=30
\`\`\`

Başlangıçta \`APIFOOTBALL_ENABLED=0\` bırakılmalıdır. GitHub Actions'taki \`APISPORTS_KEY\` secret'ı **Render'a otomatik aktarılmaz**.

Mega'ya geçince günlük istek sınırı kademeli artırılabilir; 150.000 istek/gün tümünün kullanılması gerekmez.

## Kademeli yayın

1. Testler ve geçmiş kulüp vakaları: Burak Yılmaz, Kleberson, Bobô, Rodrigo Tello, Pascal Nouma.
2. \`APIFOOTBALL_ENABLED=0\` ile ana dala alınması; mevcut oyun değişmez.
3. Render'a gizli anahtar eklenmesi, pilot bayrağının açılması ve küçük kullanıcı grubuyla test.
4. Gerçek API sonuçlarında tarihsel eksik ve hatalı kulüp kayıtlarının incelenmesi.
5. Mega satın alındığında istek sınırının ve kapsamın artırılması.

API-Football'un geçmiş verilerini kalıcı saklama, yeniden dağıtma ve ticari oyun kullanım hakları sağlayıcının sözleşmesine göre ayrıca kontrol edilmelidir.
