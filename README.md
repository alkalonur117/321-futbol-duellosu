# 3-2-1 Futbol Düellosu

İki cihazdan oynanan, 15 saniyelik turlarla ilerleyen ve ilk 3 puana ulaşanın kazandığı futbol bilgi oyunu.

## Çalıştırma

1. Bilgisayarına Node.js 18+ yükle.
2. Bu klasörde terminal aç.
3. `npm install` komutunu çalıştır.
4. `npm start` komutunu çalıştır.
5. Tarayıcıdan `http://localhost:3000` adresini aç.

Farklı cihazlardan internet üzerinden oynamak için projeyi WebSocket destekli bir Node.js barındırma hizmetine (ör. Render veya Railway) yükle. İki oyuncu aynı HTTPS adresini açar; birisi oda oluşturur, diğeri oda koduyla katılır.

## Kurallar

- 15 saniyelik tur, iki takım, bir oyuncu cevabı.
- Her oyuncunun tur başına **tek tahmin** hakkı vardır.
- İlk doğru cevap sunucu tarafından alınır alınmaz tur sona erer; 1 puan verilir.
- Yanlış cevaplar puan kazandırmaz. Süre dolarsa yeni tur başlar.
- 3 puana ulaşan oyuncu kazanır.
- Rövanş için iki oyuncunun da onayı gerekir.

## Veri

`questions.json` içinde başlangıç amaçlı 56 eşleşme ve yaygın cevaplar bulunmaktadır. Bu liste **eksiksiz değildir**: bazı doğru futbolcular listede olmadığı için yanlış sayılabilir. Üretim sürümünde lisanslı/izinli ve kapsamlı oyuncu-kulüp veritabanı kullanılmalıdır. Transfermarkt'a doğrudan bağlantı veya scraping bulunmamaktadır.

## Sınırlar

- Odalar sunucu belleğinde tutulur; sunucu yeniden başlatılırsa silinir.
- Bağlantı kopunca oda sıfırlanır, otomatik yeniden bağlanma yoktur.
- Aynı takımda sadece A takım resmî forma geçmişi dikkate alınmalıdır; veri seti büyütülürken kriter tutarlı tutulmalıdır.
- Cevaplar için bazı yaygın kısaltmalar tanımlanmıştır; tüm lakaplar desteklenmez.
- İnternet ortamında kullanım için HTTPS/WSS, hız sınırlaması ve kalıcı veri saklama eklenmesi önerilir.

## Hızlı yayımlama (Render)

1. Projeyi GitHub üzerinde yeni bir depoya yükle.
2. Render > New > Blueprint seçip depoyu bağla.
3. `render.yaml` ile Node.js web servisi kurulur. Oluşan HTTPS bağlantısını iki oyuncuyla paylaş.
4. Ücretsiz servis uykuya geçebilir; ilk açılış gecikebilir. Odalar RAM üzerinde olduğu için servis yeniden başlatıldığında kaybolur.

**Not:** Bu paket otomatik olarak internete yayımlanmış değildir. Transfermarkt canlı API bağlantısı içermez. Sorular seçilmiş örnek cevaplardır; tam kariyer veritabanı değildir.
