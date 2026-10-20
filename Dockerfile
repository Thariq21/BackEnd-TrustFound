# Menggunakan image Node.js versi 20 (Debian-based)
FROM node:20-bookworm-slim

# Set direktori kerja di dalam container
WORKDIR /app

# Menyalin file package.json dan package-lock.json terlebih dahulu
# Ini memanfaatkan layer caching Docker agar proses install tidak diulang jika tidak ada perubahan package
COPY package*.json ./

# Instal dependensi proyek
RUN npm ci --omit=dev

# Menyalin seluruh kode sumber proyek ke dalam container
COPY . .

# Membuat folder untuk penyimpanan upload jika belum ada
RUN mkdir -p public/uploads

# Expose port yang digunakan aplikasi (default 5000)
EXPOSE 5000

CMD ["node", "app.js"]