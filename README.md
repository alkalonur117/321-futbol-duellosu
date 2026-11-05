# 3-2-1 Futbol Oyunları V3

5 mod: Klasik 3-2-1, Takımları Sen Seç, Tic Tac Toe, Bingo ve Futbol Bilgi Yarışması.

## Kurulum
`npm install` ve `npm start`

## Render
Build: `npm install`; Start: `npm start`; Node. `DATABASE_URL` ortam değişkenini kalıcı PostgreSQL bağlantısı olarak ayarlayın. **ÖNEMLİ:** DATABASE_URL yoksa hesaplar `accounts.json` dosyasına yazılır. Render'ın geçici diskinde bu dosya deploy/restart sonrası kaybolabilir; kalıcı hesaplar için PostgreSQL zorunludur. Oyun odaları da RAM'de tutulur; sunucu yeniden başlatıldığında odalar kapanır.

## Giriş
Kullanıcı adı 3–20 harf/rakam/alt çizgi; şifre en az 8 karakter. Şifreler scrypt+salt ile saklanır. Tarayıcı sekmesi kapatılınca oturum tokeni silinir.

## Veri
Örnek takım havuzu ve 12 bilgi sorusu. Gerçek Transfermarkt API bağlantısı yoktur.
