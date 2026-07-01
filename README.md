# 🔍 TrustFound Backend API v2.0

Selamat datang di repositori backend **TrustFound**, sebuah solusi backend RESTful yang profesional dan aman untuk sistem **Lost & Found** kampus modern.

Repositori ini dirancang menggunakan arsitektur **Hybrid Database** (MySQL & MongoDB) untuk mengoptimalkan pengelolaan data relasional transaksi dan pencatatan log aktivitas yang efisien. Pada versi 2.0 ini, kami menghadirkan pembaruan signifikan untuk meningkatkan keamanan klaim, skalabilitas notifikasi, dan kenyamanan pengguna.

---

## ✨ Fitur Baru di v2.0 (Highlights)

* **Blind Listing & Smart Verification [MVP]:** Melindungi privasi barang sensitif (seperti KTP, Dompet) dengan fitur *auto-blur* gambar otomatis dan mengamankan proses klaim barang temuan.
* **QR Code E-Ticket (FR-01):** Menggantikan verifikasi nama manual. Sistem menghasilkan token kriptografi (via native Node.js `crypto`) dengan Time-to-Live (TTL) 24 jam untuk penyerahan barang (handover) fisik yang sangat aman di pos satpam.
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
git clone <repository_url>
cd trustfound-backend
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

---

## 🧪 Cara Testing API (E2E & Postman)

Repositori ini telah dilengkapi dengan *script* otomasi **End-to-End (E2E) Integration Test** untuk menguji keseluruhan alur aplikasi dari pelaporan barang hingga cetak E-Ticket QR Code.

### Menjalankan Automated E2E Test
Script ini akan melakukan simulasi Login Mahasiswa, Report Barang, Review Admin, Login Mahasiswa Lain, Pengajuan Klaim, Verifikasi Admin, dan pembuatan QR Token.

1. Pastikan server lokal Anda sedang berjalan (lihat langkah sebelumnya).
2. Jika Anda belum menginstal paket testing, instal terlebih dahulu via terminal:
   ```bash
   npm install --save-dev axios form-data
   ```
3. Jalankan *script* testing:
   ```bash
   node e2e_test.js
   ```
   *Anda akan melihat log berurutan dari Step 1 hingga Step 8 di konsol Anda.*

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

### 3. Claims (Klaim Barang)
| Method | Endpoint | Deskripsi | Akses |
| --- | --- | --- | --- |
| `POST` | `/api/claims` | Ajukan klaim barang | User |
| `GET` | `/api/claims/my` | Lihat riwayat klaim saya | User |

### 4. V2 Claims & Handover (QR Code) - **NEW**
| Method | Endpoint | Deskripsi | Akses |
| --- | --- | --- | --- |
| `GET` | `/api/v2/claims/:claim_id/qr-token` | Generate QR Code Token dengan TTL 24 jam | User |
| `POST` | `/api/v2/claims/validate-qr` | Validasi Token QR untuk Serah Terima Barang (Handover) | Satpam/Admin |

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
