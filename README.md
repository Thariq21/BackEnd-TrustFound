# 🔍 TrustFound Backend API v2.0

Selamat datang di repositori backend **TrustFound**, sebuah solusi backend RESTful yang profesional dan aman untuk sistem **Lost & Found** kampus modern.

Repositori ini dirancang menggunakan arsitektur **Hybrid Database** (MySQL & MongoDB) untuk mengoptimalkan pengelolaan data relasional transaksi dan pencatatan log aktivitas yang efisien. Pada versi 2.0 ini, kami menghadirkan pembaruan signifikan untuk meningkatkan keamanan klaim, skalabilitas notifikasi, dan kenyamanan pengguna.

---

## ✨ Fitur Baru di v2.0 (Highlights)

* **Blind Listing & Smart Verification [MVP]:** Melindungi privasi barang sensitif (seperti KTP, Dompet) dengan fitur *auto-blur* gambar otomatis dan mengamankan proses klaim barang temuan.
* **QR Code E-Ticket (FR-01):** Menggantikan verifikasi nama manual. Sistem menghasilkan token kriptografi (via native Node.js `crypto`) dengan Time-to-Live (TTL) 30 menit untuk penyerahan barang (handover) fisik yang sangat aman di pos satpam.
* **Asynchronous Email & Cron Job (FR-02):** Menggunakan pola *Fire-and-Forget* melalui Nodemailer untuk mengirim email transaksional dan *broadcast* tanpa memblokir *thread* utama API. Juga dilengkapi Cron Job harian otomatis untuk mengarsipkan barang yang sudah lama.

---

## 🛠 Tech Stack

* **Runtime:** Node.js, Express.js
* **Hybrid Database:** 
  * **MySQL:** Data transaksional utama (Users, Items, Claims, Admin).
  * **MongoDB:** Menyimpan *Audit Trails* dan *Email Logs*.
* **Security:** JWT (JSON Web Token), Bcrypt, native Node.js `crypto`.
* **Automation & Services:** `nodemailer` (Email Service), `node-cron` (Job Scheduling).
* **Image Processing:** Sharp (untuk fitur *auto-blur*).

---

## 🚀 Cara Menjalankan (Local Setup)

Ikuti langkah-langkah berikut untuk menjalankan server di mesin lokal Anda.

### 1. Clone Repository

```bash
git clone https://github.com/Thariq21/BackEnd-TrustFound
cd BackEnd-TrustFound
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Konfigurasi Environment (CRITICAL)

**PENTING:** Variabel environment **WAJIB** ditempatkan di dalam file `config/config.env` (BUKAN di root folder `.env`).

Buat folder `config` (jika belum ada) dan buat file `config.env` di dalamnya. Copy dan paste snippet berikut:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret

DB_HOST=localhost
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=trustfound

MONGO_URI=mongodb+srv://<username>:<password>@cluster0.urtbfil.mongodb.net
MONGO_DB_NAME=trustfound

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 4. Jalankan Server

**Mode Development (Auto-restart dengan Nodemon):**
```bash
npm run dev
```

**Mode Production:**
```bash
npm start
```

Server akan berjalan di: `http://localhost:5000`

### Migrasi skema untuk frontend

Database lama harus menjalankan migrasi `001_pickup_slots_and_schedule.sql`, `002_frontend_business_flow.sql`, lalu `003_frontend_report_moderation.sql` setelah skema dasar tersedia. Migrasi menambahkan dukungan slot bertanggal, laporan hilang/temuan, bukti klaim privat, serta status moderasi laporan yang terpisah dari status fisik barang. Laporan mahasiswa dimulai sebagai `report_review_status=pending`, disetujui menjadi `accepted`, atau ditolak menjadi `rejected`; persetujuan tidak mengamankan barang. Hanya laporan accepted yang muncul di katalog publik, dan barang temuan tetap harus diamankan (`status=secured`) sebelum dapat diklaim. Database baru yang dibuat dari `TrustFound.sql` tetap perlu menjalankan migrasi tersebut untuk tabel dan kolom jadwal.

---

## 🧪 Cara Testing API (E2E & Postman)

Suite `frontend_business_flow.e2e.js` exercises login, lost/found reporting, public visibility before/after moderation, approval without changing physical status, rejection/restoration, item securing, optional-photo intake, batch securing, claims, admin review, slot availability and booking, ticket issuance/validation, profile, dashboard, and audit filters.

It only runs against a local, disposable database whose MySQL and MongoDB database names end in `_e2e`. The backend server and test runner must use the same local test database configuration, and migrations `001` through `003` must already be applied. It refuses to run unless `E2E_ALLOW_MUTATIONS=true` is explicitly set. On completion or failure, it removes its unique test users, reports, claims, pickup slot, uploaded images, and audit records.

Start the local backend from a PowerShell session with email delivery disabled:

```powershell
$env:DISABLE_EMAILS = 'true'
npm start
```

In a second PowerShell session, set the explicit test opt-in and run the suite:

```powershell
$env:DISABLE_EMAILS = 'true'
$env:E2E_ALLOW_MUTATIONS = 'true'
$env:E2E_BASE_URL = 'http://localhost:5000'
npm run test:e2e:frontend
```

Do not point the backend or test runner at a development, shared, or production database. The suite does not create or migrate databases.

### Menggunakan Postman / Insomnia
Jika Anda ingin melakukan testing manual:
1. Panggil *endpoint* Login (`POST /api/auth/login`).
2. Salin token `JWT` yang didapatkan dari *response*.
3. Masukkan token tersebut di menu **Authorization -> Bearer Token** pada aplikasi Postman Anda sebelum memanggil *endpoint* yang berstatus `Private/User/Admin`.

---

## 📂 Struktur Folder Utama

```text
trustfound-backend/
├── config/             # Konfigurasi DB (MySQL & Mongo) & file config.env
├── controllers/        # Logika bisnis (Auth, Item, Claim, Admin, Log, Notification)
├── middleware/         # Auth protect, upload foto, validasi input
├── models/
│   ├── mysql/          # Model data relasional transaksi
│   └── mongo/          # Model log aktivitas & email logs
├── routes/             # Definisi endpoint API v1 dan v2
├── services/           # Service eksternal (Email Async, Cron Jobs)
└── public/uploads/     # Tempat penyimpanan file foto barang
```

---

## 📡 API Endpoints Reference

### 1. Authentication (Auth)
| Method | Endpoint | Deskripsi | Akses |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Daftar akun mahasiswa baru | Public |
| `POST` | `/api/auth/login` | Login mahasiswa (mendapatkan token) | Public |
| `POST` | `/api/auth/admin/login` | Login admin/satpam (mendapatkan token) | Public |

### 2. Items (Barang Temuan)
| Method | Endpoint | Deskripsi | Akses |
| --- | --- | --- | --- |
| `POST` | `/api/items` | Lapor barang temuan (Upload Foto) | User |
| `GET` | `/api/items` | Lihat daftar barang (Support Filter) | Public |
| `GET` | `/api/items/:id` | Lihat detail satu barang | Public |
| `POST` | `/api/items/reports` | Kirim laporan hilang/temuan dengan field foto `photo` atau `image` | User |

### 3. Claims (Klaim Barang)
| Method | Endpoint | Deskripsi | Akses |
| --- | --- | --- | --- |
| `POST` | `/api/claims` | Ajukan klaim barang | User |
| `GET` | `/api/claims/my` | Lihat riwayat klaim saya | User |
| `POST` | `/api/items/:itemId/claims` | Ajukan klaim barang temuan yang sudah diamankan | User |
| `GET` | `/api/claims` | Lihat klaim sendiri; admin mendapat daftar klaim untuk review | User/Admin |
| `PATCH` | `/api/claims/:id` | Setujui (`APPROVED`/`verified`) atau tolak (`rejected`) klaim | Admin |
| `GET` | `/api/claims/:id/evidence` | Ambil bukti klaim melalui endpoint terlindungi | Admin |

### Moderasi laporan barang
| Method | Endpoint | Kegunaan | Akses |
| --- | --- | --- | --- |
| `PATCH` | `/api/admin/items/:id/reject` | Tolak laporan pending dengan alasan wajib dan catatan opsional | Admin |
| `PATCH` | `/api/admin/items/:id/approve` | Terima laporan pending tanpa mengubah status fisik barang | Admin |
| `PATCH` | `/api/admin/items/:id/restore` | Pulihkan laporan ditolak ke status pending | Admin |

### 4. V2 Claims & Handover (QR Code) - **NEW**
| Method | Endpoint | Deskripsi | Akses |
| --- | --- | --- | --- |
| `GET` | `/api/v2/claims/:claim_id/qr-token` | Buat/ambil QR Code Token dengan TTL maksimal 30 menit setelah jadwal dibuat | User |
| `POST` | `/api/v2/claims/validate-qr` | Validasi Token QR untuk Serah Terima Barang (Handover) | Satpam/Admin |

### Frontend business-flow endpoints

| Method | Endpoint | Kegunaan | Akses |
| --- | --- | --- | --- |
| `GET` | `/api/home` | Ringkasan katalog dan barang terbaru | Public |
| `GET` | `/api/profile` | Profil, laporan, dan riwayat klaim pengguna | User |
| `GET` | `/api/slots?date=YYYY-MM-DD` | Slot dan kuota yang tersedia pada tanggal tertentu | Public |
| `POST` | `/api/schedules` | Jadwalkan klaim yang sudah disetujui (`claimId`, `slotId`, `date`) | User |
| `GET` | `/api/tickets/:claimId` | Ambil/generate tiket untuk klaim terjadwal | User pemilik |
| `POST` | `/api/tickets/validate` | Validasi QR dan catat serah-terima | Admin/Satpam |
| `POST` | `/api/intake` | Catat barang temuan oleh satpam; foto opsional | Admin/Satpam |
| `PUT` | `/api/admin/items/batch-secure` | Pindahkan intake temuan terpilih ke lemari kaca | Admin/Satpam |
| `GET` | `/api/admin/dashboard` | Statistik dashboard admin | Admin |
| `GET` | `/api/admin/audit` | Log aktivitas dengan filter tanggal/aktor/aksi | Admin |

Login frontend `POST /api/auth/login` menerima NIM atau NIP dan kata sandi. Respons menyediakan `{ user: { id, nim, name, role }, token }`; peran UI adalah `MAHASISWA` atau `ADMIN_BEM`, sementara token tetap menyimpan peran backend untuk middleware otorisasi. Laporan hilang maupun temuan muncul di katalog; hanya barang temuan berstatus `secured` yang dapat diklaim. Bukti klaim disimpan di luar direktori file publik dan hanya dapat diambil melalui endpoint admin yang terlindungi.

### 5. V2 Notifications & Broadcast - **NEW**
| Method | Endpoint | Deskripsi | Akses |
| --- | --- | --- | --- |
| `POST` | `/api/v2/notifications/broadcast` | Broadcast Email Asynchronous ke semua user | Satpam/Admin |

### 6. Admin Dashboard (Satpam/Staff)
| Method | Endpoint | Deskripsi | Akses |
| --- | --- | --- | --- |
| `GET` | `/api/admin/items` | Lihat semua barang (Data Lengkap) | Admin |
| `PUT` | `/api/admin/items/:id/secure` | Verifikasi barang masuk pos (Bisa Blur/Unblur) | Admin |
| `GET` | `/api/admin/claims` | Lihat daftar klaim masuk | Admin |
| `PUT` | `/api/admin/claims/:id/process` | Setujui/Tolak klaim | Admin |
| `GET` | `/api/admin/logs` | Lihat Log Aktivitas Sistem | Admin |

---

## 📸 Fitur Gambar & Privasi (Blind Listing)

Sistem ini menggunakan logika **Blind Listing** untuk melindungi privasi pemilik barang.

1. **Auto-Blur:** Jika barang masuk kategori sensitif (misal: Dompet, HP, Dokumen), gambar akan **otomatis diblur** saat diupload oleh pelapor.
2. **Unblur (Admin Only):** Satpam/Admin memiliki hak untuk mengubah status sensitif barang melalui sistem admin. Jika status diubah menjadi **Tidak Sensitif**, gambar asli akan ditampilkan ke publik.

---

## 📝 Audit Trail (Log Aktivitas) & Email Logs

Untuk keamanan dan akuntabilitas, aksi penting dicatat dalam **MongoDB**:
* `activity_logs`: Mencatat riwayat login, laporan barang, klaim barang, proses persetujuan, verifikasi QR Handover, dan cron job harian.
* `email_logs`: Mencatat status transaksi pengiriman email (Berhasil/Gagal) secara *asynchronous*.

---
**TrustFound Team - 2024 (v2.0)**
