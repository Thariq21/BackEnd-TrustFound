import PDFDocument from 'pdfkit-table';
import Report from '../models/mysql/reportModel.js';

// Helper untuk format tanggal Indonesia
const formatDateIndo = (dateStr) => {
    if (!dateStr) return '-';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
};

export const generateMonthlyReport = async (req, res) => {
    try {
        // 1. Tentukan Tanggal (Default: Bulan Ini 1-31)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        const startDate = req.query.startDate || startOfMonth;
        const endDate = req.query.endDate || endOfMonth;

        // 2. Ambil Data dari Database
        const foundItems = await Report.getFoundItemsReport(startDate, endDate);
        const claimedItems = await Report.getClaimedItemsReport(startDate, endDate);
        const donatedItems = await Report.getDonatedItemsReport(startDate, endDate);

        // 3. Setup PDF Stream
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        
        // Header Response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Laporan_TrustFound_${startDate}_${endDate}.pdf`);
        
        doc.pipe(res);

        // --- KONTEN PDF ---

        // A. Header Dokumen
        doc.fontSize(18).text('LAPORAN BULANAN LOST & FOUND', { align: 'center', bold: true });
        doc.fontSize(14).text('Universitas Bakrie - TrustFound System', { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(10).text(`Periode Laporan: ${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)}`, { align: 'center' });
        doc.text(`Tanggal Cetak: ${formatDateIndo(new Date())}`, { align: 'center' });
        doc.moveDown(2);

        // B. Ringkasan Statistik
        doc.fontSize(12).font('Helvetica-Bold').text('A. RINGKASAN', { underline: true });
        doc.fontSize(10).font('Helvetica');
        doc.text(`Total Barang Masuk: ${foundItems.length} item`);
        doc.text(`Total Barang Diklaim: ${claimedItems.length} item`);
        doc.text(`Total Barang Donasi: ${donatedItems.length} item`);
        doc.moveDown(2);

        // C. Tabel 1: Barang Masuk (Found Items)
        doc.fontSize(12).font('Helvetica-Bold').text('B. DETAIL BARANG MASUK (DILAPORKAN)', { underline: true });
        doc.moveDown(0.5);

        if (foundItems.length > 0) {
            const tableFound = {
                headers: ['Tgl', 'Nama Barang', 'Kategori', 'Lokasi', 'Status', 'Pelapor (NIM)'],
                rows: foundItems.map(item => [
                    item.date,
                    item.item_name,
                    item.category || '-',
                    item.found_location,
                    (item.status || '').toUpperCase(),
                    `${item.reporter_name}\n(${item.reporter_nim})`
                ]),
            };
            
            await doc.table(tableFound, {
                prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8),
                prepareRow: () => doc.font('Helvetica').fontSize(8),
                // columnsSize dihapus agar auto-width, atau sesuaikan jika perlu
            });
        } else {
            doc.fontSize(10).font('Helvetica-Oblique').text('Tidak ada laporan barang masuk pada periode ini.');
        }

        doc.moveDown(2);

        // D. Tabel 2: Barang Keluar (Claimed)
        doc.fontSize(12).font('Helvetica-Bold').text('C. DETAIL BARANG DIKEMBALIKAN (CLAIM)', { underline: true });
        doc.moveDown(0.5);

        if (claimedItems.length > 0) {
            const tableClaim = {
                headers: ['Tgl Klaim', 'Nama Barang', 'Pemilik (Pengklaim)', 'NIM Pemilik', 'Validator'],
                rows: claimedItems.map(item => [
                    item.date,
                    item.item_name,
                    item.claimer_name,
                    item.claimer_nim,
                    item.validator_name || 'System'
                ]),
            };

            await doc.table(tableClaim, {
                prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8),
                prepareRow: () => doc.font('Helvetica').fontSize(8),
            });
        } else {
            doc.fontSize(10).font('Helvetica-Oblique').text('Tidak ada klaim disetujui pada periode ini.');
        }

        doc.moveDown(2);

        // E. Tabel 3: Barang Donasi
        if (donatedItems.length > 0) {
            doc.fontSize(12).font('Helvetica-Bold').text('D. BARANG DIDONASIKAN (TIDAK DIAMBIL > 2 MINGGU)', { underline: true });
            doc.moveDown(0.5);

            const tableDonation = {
                headers: ['Tgl Ditemukan', 'Nama Barang', 'Kategori', 'Deskripsi'],
                rows: donatedItems.map(item => [
                    item.found_date,
                    item.item_name,
                    item.category || '-',
                    item.description
                ]),
            };

            await doc.table(tableDonation, {
                prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8),
                prepareRow: () => doc.font('Helvetica').fontSize(8),
            });
        }

        // F. Footer (Tanda Tangan)
        doc.moveDown(4);
        doc.fontSize(10).font('Helvetica');
        doc.text('Jakarta, ..............................', { align: 'right', width: 500 });
        doc.text('Mengetahui,', { align: 'right', width: 500 });
        doc.moveDown(3);
        doc.text('( Biro Kemahasiswaan )', { align: 'right', width: 500 });

        // Selesai
        doc.end();

    } catch (error) {
        console.error("Error generating report:", error);
        res.status(500).json({ status: 'error', message: 'Failed to generate PDF report' });
    }
};