# TrustFound Backend API

Backend REST API untuk sistem **UBLost&Found**. API ini mengelola akun mahasiswa, laporan barang hilang/temuan, moderasi admin, klaim barang, jadwal pengambilan, QR e-ticket, notifikasi, dan audit log.

## Daftar Isi

- [Gambaran singkat](#gambaran-singkat)
- [Menjalankan dengan Docker](#menjalankan-dengan-docker-rekomendasi)
- [Menjalankan secara lokal](#menjalankan-secara-lokal)
- [Konfigurasi environment](#konfigurasi-environment)
- [Dokumentasi interaktif](#dokumentasi-interaktif)
- [Konsep penting](#konsep-penting)
- [Autentikasi JWT](#autentikasi-jwt)
- [Contoh penggunaan](#contoh-penggunaan)
- [Daftar endpoint](#daftar-endpoint)
- [Upload file dan privasi](#upload-file-dan-privasi)
- [Testing E2E](#testing-e2e)
- [Struktur folder](#struktur-folder)

## Gambaran singkat

### Teknologi

- Node.js 20 dan Express 5
- MariaDB/MySQL untuk data transaksi
- MongoDB untuk audit log dan email log
- JWT dan bcrypt untuk autentikasi
- Multer dan Sharp untuk upload serta blur gambar sensitif
- Nodemailer untuk email dan node-cron untuk pekerjaan terjadwal

### Base URL

Jika dijalankan lokal atau dengan Docker:

```text
http://localhost:5000
```

Semua endpoint API menggunakan prefix `/api`, misalnya `POST /api/auth/login`.

## Menjalankan dengan Docker (rekomendasi)

Dari folder root proyek `Capstone-Project`:

```powershell
docker compose up --build
```

Perintah tersebut menjalankan:

- Backend pada `http://localhost:5000`
- Frontend pada `http://localhost:8080`
- MariaDB pada port `3306`
- MongoDB audit di jaringan Docker internal

Database dan migrasi dijalankan otomatis ketika volume database dibuat pertama kali. Jika ingin mengulang inisialisasi database dari awal, hentikan layanan lalu hapus **volume Docker proyek** yang memang ingin di-reset; tindakan ini menghapus data database lokal.

Uji status backend:

```powershell
curl http://localhost:5000/health
```

Response yang diharapkan:

```json
{ "status": "ok" }
```

## Menjalankan secara lokal

### Prasyarat

- Node.js 20 atau lebih baru
- MySQL/MariaDB yang sudah berjalan
- MongoDB yang sudah berjalan
- Database MySQL sudah dibuat

### Instalasi

```powershell
cd BackEnd-TrustFound
npm install
```

Salin `config/config.env.example` jika file contoh tersedia. Jika tidak, buat file `BackEnd-TrustFound/config/config.env` secara manual menggunakan contoh pada bagian [Konfigurasi environment](#konfigurasi-environment). Jangan menaruh kredensial di README atau melakukan commit terhadap file konfigurasi berisi secret.

Jalankan skema dasar dan migrasi SQL berikut secara berurutan:

1. `TrustFound.sql`
2. `migrations/001_pickup_slots_and_schedule.sql`
3. `migrations/002_frontend_business_flow.sql`
4. `migrations/003_frontend_report_moderation.sql`

Jalankan server:

```powershell
npm run dev
```

Untuk menjalankan tanpa Nodemon:

```powershell
npm start
```

## Konfigurasi environment

File yang dibaca aplikasi adalah `config/config.env`.

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=ganti-dengan-secret-yang-kuat

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=password_mysql
DB_NAME=trustfound

MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=trustfound

CORS_ORIGINS=http://localhost:8080,http://localhost:5173
SERVER_BASE_URL=http://localhost:5000

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alamat-email-gmail
SMTP_PASS=gmail-app-password
```

Keterangan:

- `JWT_SECRET` wajib sama selama token masih digunakan dan harus berbeda untuk production.
- `CORS_ORIGINS` berisi daftar origin yang dipisahkan koma.
- `SERVER_BASE_URL` dipakai saat membuat URL gambar pada email.
- `SMTP_*` dipakai untuk email transaksi dan broadcast.
- Set `DISABLE_EMAILS=true` hanya untuk development atau testing lokal.
- Pada Docker Compose, nilai koneksi database sudah disediakan oleh `docker-compose.yml`; jangan gunakan `localhost` untuk host database dari dalam container backend.
- Untuk Gmail, gunakan **App Password**, bukan password login Gmail biasa. Simpan nilai ini di `config/config.env` lokal atau environment Docker dan jangan commit ke repository.

### Notifikasi email otomatis

Email dikirim secara asynchronous sehingga response API tidak menunggu proses SMTP selesai. Setiap email berhasil/gagal dicatat di koleksi MongoDB `email_logs`.

- Barang baru yang sudah diamankan (`secured`) dibroadcast ke seluruh email mahasiswa. Ini berlaku untuk pengamanan satu item, upload langsung oleh admin, dan batch secure.
- Saat mahasiswa mengajukan klaim, mahasiswa menerima konfirmasi dan seluruh admin yang memiliki email menerima notifikasi untuk review.
- Saat klaim disetujui/ditolak, mahasiswa menerima hasil keputusan.
- Saat jadwal pickup dibuat, mahasiswa menerima tanggal, waktu, dan lokasi.
- Saat admin mengubah slot yang sedang dipakai oleh klaim terjadwal, mahasiswa terkait menerima email jadwal terbaru.
- Setelah QR berhasil divalidasi, mahasiswa menerima tanda terima handover.

Jika `DISABLE_EMAILS=true`, tidak ada email yang dikirim. Pastikan `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, dan `SMTP_PASS` tersedia sebelum mengaktifkan pengiriman.

## Dokumentasi interaktif

Setelah server hidup, buka:

- **Scalar API Reference:** `http://localhost:5000/reference`
- **OpenAPI JSON:** `http://localhost:5000/openapi.json`

Di Scalar, pilih endpoint, klik **Authorize**, masukkan token JWT, lalu jalankan request langsung dari browser. Spesifikasi sumbernya berada di [`docs/openapi.json`](./docs/openapi.json).

## Konsep penting

### Peran pengguna

- **Mahasiswa:** mendaftar, login, melihat katalog, mengirim laporan, mengajukan klaim, dan menjadwalkan pengambilan.
- **Satpam/Admin:** login, meninjau laporan, mengamankan barang, memproses klaim, mengelola slot, memvalidasi QR, melihat dashboard/audit, dan mengirim broadcast.

Token admin dapat memiliki role backend `admin`, `super_admin`, `satpam`, atau `ADMIN_BEM`. Semua role tersebut diterima oleh middleware admin.

### Status laporan dan status fisik

Keduanya berbeda:

1. Laporan mahasiswa dibuat dengan `report_review_status=pending`.
2. Admin menerima (`accepted`) atau menolak (`rejected`) laporan.
3. Menerima laporan **tidak** berarti barang sudah diamankan.
4. Barang temuan yang diterima harus diproses admin dari `pending` menjadi `secured`.
5. Hanya barang temuan `secured` yang dapat diklaim.

Barang yang tidak diklaim lebih dari 90 hari dapat dipindahkan otomatis ke status `donated` oleh cron job.

## Autentikasi JWT

1. Panggil endpoint login.
2. Ambil nilai `token` dari response.
3. Kirim token pada setiap endpoint privat:

```http
Authorization: Bearer <JWT_TOKEN>
```

Jika header tidak ada atau token tidak valid, API mengembalikan `401`. Jika token mahasiswa dipakai pada endpoint admin, API mengembalikan `403`.

## Contoh penggunaan

### 1. Registrasi dan login mahasiswa

```powershell
curl -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"nim":"1232001011","full_name":"Thariq Rahman","email":"1232001011@student.bakrie.ac.id","phone_number":"0881024468406","password":"secret123"}'
```

```powershell
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"nim":"1232001011","password":"secret123"}'
```

Simpan `token` dari response login ke variabel PowerShell:

```powershell
$token = "<JWT_TOKEN>"
```

Login admin dapat dilakukan dengan salah satu cara berikut:

```powershell
curl -X POST http://localhost:5000/api/auth/admin/login `
  -H "Content-Type: application/json" `
  -d '{"nip":"<NIP>","password":"<PASSWORD>"}'
```

atau login melalui `POST /api/auth/login` dengan field `nim` berisi NIP admin.

### 2. Melihat katalog

```powershell
curl "http://localhost:5000/api/items?report_type=found&search=dompet"
```

Filter yang tersedia antara lain `status`, `category_id`, `category`, `report_type`/`type`, `startDate`, `endDate`, `search`/`q`. Format tanggal adalah `YYYY-MM-DD`.

### 3. Mengirim laporan barang

Endpoint ini menggunakan `multipart/form-data`. Field foto wajib bernama `image` atau `photo` dan maksimal 5 MB, JPG/PNG.

```powershell
curl -X POST http://localhost:5000/api/items/reports `
  -H "Authorization: Bearer $token" `
  -F "name=Dompet hitam" `
  -F "description=Dompet kulit dengan kartu mahasiswa" `
  -F "found_location=Perpustakaan lantai 2" `
  -F "category_id=1" `
  -F "found_date=2026-10-20" `
  -F "report_type=found" `
  -F "photo=@C:\path\dompet.jpg"
```

`report_type` dapat berupa `found` atau `lost`. Foto laporan mahasiswa wajib dikirim; intake admin adalah pengecualian karena foto bersifat opsional.

### 4. Mengajukan klaim

Barang harus sudah berstatus `secured`. Untuk endpoint yang memakai `:itemId`, kirim dua jawaban verifikasi sebagai array JSON. Bukti bersifat opsional dan field-nya `evidence`.

```powershell
curl -X POST http://localhost:5000/api/items/123/claims `
  -H "Authorization: Bearer $token" `
  -F 'answers=["Ciri khusus: goresan di bagian depan","Isi dompet: kartu mahasiswa"]' `
  -F "evidence=@C:\path\bukti.jpg"
```

Alternatif endpoint legacy `POST /api/claims` menerima `item_id` di form body. Riwayat klaim tersedia di `GET /api/claims/my`.

### 5. Alur admin dan QR handover

1. Admin menerima laporan: `PATCH /api/admin/items/:id/approve`.
2. Admin mengamankan barang: `PUT /api/admin/items/:id/secure` dengan body JSON opsional `{"is_sensitive":true}`.
3. Admin memproses klaim: `PUT /api/admin/claims/:id/process` atau `PATCH /api/claims/:id`.
4. Mahasiswa memilih slot dari `GET /api/slots?date=YYYY-MM-DD`.
5. Mahasiswa membuat jadwal melalui `POST /api/schedules` atau `POST /api/claims/:id/schedule`.
6. Mahasiswa mengambil QR melalui `GET /api/tickets/:claimId` atau `GET /api/v2/claims/:claimId/qr-token`.
7. Satpam memvalidasi QR melalui `POST /api/tickets/validate` atau `POST /api/v2/claims/validate-qr`.

Token QR berlaku maksimal 30 menit dan hanya dapat digunakan oleh admin/satpam untuk handover.

## Daftar endpoint

Semua endpoint di bawah ini menggunakan prefix `/api`.

### Publik dan autentikasi

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | `/` | Pesan status API |
| GET | `/health` | Health check |
| POST | `/auth/register` | Registrasi mahasiswa |
| POST | `/auth/login` | Login mahasiswa atau admin |
| POST | `/auth/admin/login` | Login admin/satpam |
| GET | `/items` | Katalog publik |
| GET | `/items/:id` | Detail item |
| GET | `/categories` | Daftar kategori |
| GET | `/home` | Ringkasan katalog |
| GET | `/slots` | Slot pickup publik |
| GET | `/slots/:id` | Detail slot |

### Mahasiswa/user

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| POST | `/items` | Laporan barang temuan dengan field `image` |
| POST | `/items/reports` | Laporan hilang/temuan dengan field `image` atau `photo` |
| POST | `/items/:itemId/claims` | Klaim item dengan jawaban dan bukti opsional |
| GET | `/claims` | Klaim milik user; admin mendapat daftar klaim admin |
| POST | `/claims` | Klaim legacy dengan `item_id` |
| GET | `/claims/my` | Riwayat klaim sendiri |
| POST | `/claims/:id/schedule` | Jadwalkan pengambilan |
| GET | `/profile` | Profil, laporan, dan riwayat klaim |
| POST | `/schedules` | Jadwalkan pengambilan |
| GET | `/tickets/:claimId` | Ambil/generate tiket QR |
| GET | `/v2/claims/:claimId/qr-token` | Ambil/generate token QR V2 |

### Admin/satpam

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | `/admin/dashboard` atau `/admin/dashboard/stats` | Statistik dashboard |
| GET | `/admin/items` | Semua item dan filter admin |
| POST | `/admin/items` | Catat item langsung sebagai admin |
| PUT | `/admin/items/:id/secure` | Ubah item pending menjadi secured |
| PUT | `/admin/items/batch-secure` | Amankan beberapa item sekaligus |
| PATCH | `/admin/items/:id/approve` | Terima laporan |
| PATCH | `/admin/items/:id/reject` | Tolak laporan |
| PATCH | `/admin/items/:id/restore` | Pulihkan laporan ditolak |
| GET | `/admin/claims` | Daftar klaim |
| PUT | `/admin/claims/:id/process` | Setujui/tolak klaim |
| PATCH | `/claims/:id` | Setujui/tolak klaim legacy |
| GET | `/claims/:id/evidence` | Ambil bukti klaim privat |
| GET | `/admin/slots` | Kelola slot |
| POST | `/admin/slots` | Buat slot |
| PATCH | `/admin/slots/:id` | Ubah slot |
| DELETE | `/admin/slots/:id` | Nonaktifkan slot |
| GET | `/admin/audit` atau `/admin/logs` | Audit log dengan filter |
| GET | `/admin/reports/monthly` | Download laporan PDF; dukung `startDate` dan `endDate` |
| POST | `/intake` | Intake barang temuan, foto opsional |
| POST | `/tickets/validate` | Validasi QR dan catat handover |
| POST | `/v2/claims/validate-qr` | Validasi QR V2 |
| POST | `/v2/notifications/broadcast` | Broadcast email ke user |

## Upload file dan privasi

- File gambar publik hanya menerima JPG/PNG dan maksimal 5 MB.
- Gambar publik disimpan di `public/uploads` dan dapat diakses melalui `/uploads/<filename>`.
- Bukti klaim disimpan di `private/evidence`; gunakan endpoint admin untuk mengambilnya, bukan URL publik.
- Kategori sensitif dapat menghasilkan gambar blur otomatis dengan Sharp.
- Admin dapat mengubah `is_sensitive` saat mengamankan item.

Response error umumnya berbentuk:

```json
{
  "status": "error",
  "message": "Penjelasan error"
}
```

Validation error juga memiliki array `errors`. Status yang sering muncul adalah `400` (input salah), `401` (belum login/token salah), `403` (role tidak sesuai), `404` (data tidak ditemukan), `409` (konflik status), dan `413` (file terlalu besar).

## Testing E2E

Test bisnis frontend memerlukan database lokal disposable. Test menolak berjalan jika database bukan lokal atau nama database tidak berakhiran `_e2e`.

Jalankan backend pada terminal pertama:

```powershell
$env:DISABLE_EMAILS = 'true'
npm start
```

Jalankan test pada terminal kedua:

```powershell
$env:DISABLE_EMAILS = 'true'
$env:E2E_ALLOW_MUTATIONS = 'true'
$env:E2E_BASE_URL = 'http://localhost:5000'
npm run test:e2e:frontend
```

Migrasi harus sudah diterapkan dan backend/test runner harus menggunakan database `_e2e` yang sama. Test tidak membuat atau memigrasikan database. Jangan menjalankannya pada database development bersama atau production.

## Struktur folder

```text
BackEnd-TrustFound/
├── app.js                 # Inisialisasi Express dan mounting route
├── config/                # Koneksi database dan config.env
├── controllers/           # Logika bisnis
├── docs/openapi.json      # Spesifikasi OpenAPI
├── middleware/            # JWT, upload, dan validasi
├── migrations/            # Migrasi skema database
├── models/mysql/          # Model transaksi MySQL/MariaDB
├── models/mongo/          # Model audit log MongoDB
├── routes/                # Definisi endpoint
├── services/              # Email dan cron job
├── public/uploads/        # Gambar publik
└── private/evidence/      # Bukti klaim privat
```

## Lisensi dan kontak

Untuk pertanyaan atau pelaporan masalah, hubungi tim UBLost&Found melalui `support@student.bakrie.ac.id`.
