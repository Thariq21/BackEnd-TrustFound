# 🔍 TrustFound Backend API

Selamat datang di repositori backend **TrustFound**, sebuah solusi backend yang kuat dan aman untuk sistem **Lost & Found** kampus modern.

Repositori ini menyediakan API yang mendukung fitur-fitur inovatif seperti **Blind Listing** untuk menjaga privasi barang sensitif dan **Smart Verification** untuk proses klaim yang aman. Backend ini dirancang dengan arsitektur RESTful API, serta mengadopsi pendekatan **Hybrid Database** (MySQL & MongoDB) untuk mengoptimalkan pengelolaan data relasional dan pencatatan log aktivitas secara efisien.

> Dokumen ini ditujukan untuk tim Frontend dan pengembang lain untuk memahami cara menggunakan API yang tersedia.

## 🛠 Tech Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Database (Hybrid):**
    * **MySQL:** Data Utama (User, Item, Claim, Admin).
    * **MongoDB:** Audit Trail & Activity Logs.
* **Image Processing:** Sharp (untuk fitur *auto-blur*).
* **Auth:** JWT (JSON Web Token).

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

### 3. Konfigurasi Environment (.env)

Buat file konfigurasi (biasanya di `config/config.env` atau `.env`) dan pastikan kredensial database MySQL dan MongoDB sudah benar.

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

## 📂 Struktur Folder Utama

```text
trustfound-backend/
├── config/             # Konfigurasi DB (MySQL & Mongo)
├── controllers/        # Logika bisnis (Auth, Item, Claim, Admin, Log)
├── middleware/         # Auth protect, upload foto, validasi input
├── models/
│   ├── mysql/          # Model data relasional
│   └── mongo/          # Model log aktivitas
├── routes/             # Definisi endpoint API
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

### 2. Categories

| Method | Endpoint | Deskripsi | Akses |
| --- | --- | --- | --- |
| `GET` | `/api/categories` | Ambil daftar kategori (untuk dropdown) | Public |

### 3. Items (Barang Temuan)

| Method | Endpoint | Deskripsi | Akses |
| --- | --- | --- | --- |
| `POST` | `/api/items` | Lapor barang temuan (Upload Foto) | User |
| `GET` | `/api/items` | Lihat daftar barang (Support Filter) | Public |
| `GET` | `/api/items/:id` | Lihat detail satu barang | Public |

**Filter pada `GET /api/items`:**

* `?status=secured` (Lihat barang yang sudah diamankan di pos satpam)
* `?category_id=1` (Filter per kategori)
* `?startDate=YYYY-MM-DD` (Filter berdasarkan tanggal lapor)

### 4. Claims (Klaim Barang)

| Method | Endpoint | Deskripsi | Akses |
| --- | --- | --- | --- |
| `POST` | `/api/claims` | Ajukan klaim barang | User |
| `GET` | `/api/claims/my` | Lihat riwayat klaim saya | User |

**Contoh Body JSON untuk `POST /api/claims`:**

```json
{
  "item_id": 2,
  "challange_answer": "Dompet warna coklat, ada kartu perpus a.n Budi."
}

```

### 5. Admin Dashboard (Satpam/Staff)

| Method | Endpoint | Deskripsi | Akses |
| --- | --- | --- | --- |
| `GET` | `/api/admin/items` | Lihat semua barang (Data Lengkap) | Admin |
| `PUT` | `/api/admin/items/:id/secure` | Verifikasi barang masuk pos (Bisa Blur/Unblur) | Admin |
| `GET` | `/api/admin/claims` | Lihat daftar klaim masuk | Admin |
| `PUT` | `/api/admin/claims/:id/process` | Setujui/Tolak klaim | Admin |
| `GET` | `/api/admin/logs` | Lihat Log Aktivitas Sistem | Admin |

**Filter pada `GET /api/admin/claims`:**

* `?status=pending` (Default: yang perlu diproses)
* `?status=all` (Semua history)
* `?status=verified` (Yang disetujui)

---

## 📸 Fitur Gambar & Privasi (Blind Listing)

Sistem ini menggunakan logika **Blind Listing** untuk melindungi privasi pemilik barang.

1. **Auto-Blur:**
* Jika barang masuk kategori sensitif (misal: Dompet, HP, Dokumen), gambar akan **otomatis diblur** saat diupload oleh pelapor.


2. **Unblur (Admin Only):**
* Satpam/Admin memiliki hak untuk mengubah status sensitif barang melalui endpoint `PUT /api/admin/items/:id/secure`.
* Jika status diubah menjadi **Tidak Sensitif**, gambar asli akan ditampilkan ke publik.
* Jika status diubah menjadi **Sensitif**, gambar akan diblur ulang.



---

## 📝 Audit Trail (Log Aktivitas)

Untuk keamanan dan akuntabilitas, setiap aksi penting dicatat dalam **MongoDB** (`activity_logs`). Data yang dicatat meliputi:

* Siapa yang login/register.
* Siapa yang melapor barang.
* Siapa yang mengklaim barang.
* Siapa admin yang menyetujui atau menolak klaim.
* Riwayat perubahan status barang.

---

**TrustFound Team - 2023**
