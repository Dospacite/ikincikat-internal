# ikinciKat Internal

ikinciKat Kadıköy Tiyatro üyelerinin emek ve iyilikleri krediyle değiş tokuş ettiği, yalnızca üyelere açık uygulama.

## Çalıştırma

1. `.env.example` dosyasını `.env` olarak kopyalayın ve tüm `replace-me` değerlerini değiştirin. `BETTER_AUTH_URL` tarayıcıdan erişilen tam adres olmalıdır.
2. `docker compose up --build` çalıştırın.
3. `http://localhost:3000` adresini açın.

`init` servisi veritabanı göçlerini uygular ve ilk çalıştırmada `ADMIN_EMAIL` hesabını oluşturur. Geçici yönetici parolası `.env` içindeki `ADMIN_SEED_PASSWORD` değeridir; yönetici ilk girişte bunu değiştirmek zorundadır. İlk kurulumdan sonra bu değişkeni boşaltın veya parola yöneticinizde saklayıp dosyadan kaldırın.

## Geliştirme

Node.js 24 ve pnpm 11 kullanılır. Postgres ile MinIO'yu Compose üzerinden başlatıp uygulamayı yerelde çalıştırabilirsiniz:

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Kalite denetimi: `pnpm verify`. Veritabanı şemasını değiştirdikten sonra `pnpm db:generate` çalıştırın.

## Güvenlik ve veri modeli

- Better Auth e-posta/parola oturumu, 12 karakter alt sınırı, giriş hız sınırı ve zorunlu ilk parola değişikliği kullanır.
- Caddy gerçek istemci IP'sini güvenilen `X-Real-IP` başlığına yazar; kimlik doğrulama ile tüm veri değişiklikleri yöneticiye özel günlükte tutulur.
- Kredi işlemleri çift taraflı, append-only defter kayıtlarıdır. Postgres tetikleyicileri defter ve denetim kayıtlarının değiştirilmesini/silinmesini engeller; negatif bakiye desteklenir.
- Profil fotoğrafları özel MinIO kovasında WebP olarak saklanır ve yalnızca oturumlu üyelere sunulur.
- Duyuru Markdown çıktısı render sırasında sanitize edilir. Üye dizininde e-posta ve bakiye gösterilmez.

Yedeklemede hem `postgres_data` hem de `minio_data` volume'larını birlikte alın. Geri yükleme öncesinde uygulamayı durdurun ve iki veri kaynağını aynı ana geri döndürün.
