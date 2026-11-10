# API-Football: emekli futbolcu kimlik testi

Bu test **oyun sunucusunu değiştirmez**, veritabanına yazmaz ve API'nin ham yanıtlarını kaydetmez. Beş futbolcu için kimlik, doğum yılı ve bazı kulüp bağlantılarını sınar. Sonuçlar eksiksiz kariyer garantisi değildir.

## Kurulum (bir kez)

1. GitHub deposunda **Settings → Secrets and variables → Actions → New repository secret** sayfasını aç.
2. Secret adı APISPORTS_KEY olsun. Değer olarak API-Football hesabının **yenilenmiş** anahtarını kaydet. Anahtarı koda, Issues'a veya sohbete yazma.
3. **Actions → API-Football 5-player audit → Run workflow** yolunu izle. Branch main seçili olsun. İstersen include_burak seçeneğini işaretle.
4. Çalışma bitince ilgili run sayfasının bağlantısını sohbetimizde paylaş. Rapor **Summary** bölümünde ve kısa süreli **api-football-audit-report** artifact'ında görünür.

Çalışma, players/profiles ve players/teams sorgularını yapar. Gerekirse takımın transfers kayıtları üzerinden ikinci bir kimlik araması dener. Yanlış eşleşmeyi önlemek için doğum yılı ve kulüp eşleşmesini de kontrol eder.

**Dikkat:** Depo herkese açık olduğundan Actions özeti ve raporu da başkalarınca görülebilir. Rapor yalnızca kısa kimlik/kapsam kontrolü içerir; API anahtarını veya ham API yanıtlarını içermez. Üretimde veri saklama ve yeniden dağıtma işlemleri için API-Football lisans koşullarını ayrıca doğrula.

## API anahtarı olmadan kontrol

- python -m unittest discover -s tests -p test_*.py -v
- python scripts/api_football_audit.py --dry-run

## Kısıtlar

- players/profiles?search= soyadı üzerinden arama yapar ve her terim için en fazla 2 sayfa inceler; çok yaygın soyadları kaçabilir.
- transfers ve players/teams geçmişi özellikle eski yıllar, alt ligler ve altyapıda eksik olabilir.
- confirmed, ad + doğum yılı + **en az bir** kulübün eşleştiği anlamına gelir. Tüm kulüplerin bulunduğu anlamına gelmez.
- API planı, günlük kota ve geçmiş sezon erişimi sonuçları etkileyebilir. Her çalışmada API çağrı sınırı vardır.
- report.json ve report.md yalnızca kısaltılmış kontrol sonuçları içerir; ham API çıktısı kaydedilmez.
