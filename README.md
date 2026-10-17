# GENSET CARE — Berau Coal Electrification

Aplikasi Next.js 15 + TypeScript + Prisma + PostgreSQL/Supabase untuk pencatatan inspeksi P2H, monitoring temuan, tindak lanjut, dan histori.

## Fitur
- Dashboard KPI P2H harian, progress per site, unit genset, temuan aktif dan temuan AA.
- Form P2H berdasarkan foto checklist yang diberikan: 30 item (11 Engine, 10 Elektrik System, 7 Tambahan, 2 House Keeping).
- Kolom parameter kosong dan berbeban untuk temperatur radiator, oil pressure, RPM, load, voltage L-L, dan voltage battery.
- Semua checklist wajib dijawab; shift hanya I/II; validasi HM akhir >= HM awal; unit wajib cocok dengan site.
- Item RUSAK/PERBAIKI otomatis membuat temuan dengan severity mengikuti hazard master A/AA.
- Register temuan: buat, edit, assign PIC, deadline, corrective action, status dan closure notes.
- Temuan CLOSED tidak dapat dihapus melalui API/UI dan tetap ada dalam histori.
- Export temuan CSV.
- API health check database.

## Menjalankan lokal
1. Install Node.js 20+ dan PostgreSQL/Supabase project.
2. Salin `.env.example` menjadi `.env`, lalu isi kredensial database Supabase:
   - `DATABASE_URL`: gunakan connection string Session Pooler untuk runtime, umumnya port `6543` dengan `pgbouncer=true&connection_limit=1`.
   - `DIRECT_URL`: koneksi direct atau session pooler port `5432` untuk operasi schema.
   - Jangan commit `.env` atau membagikan password database.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Generate Prisma client dan buat tabel:
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```
5. Jalankan:
   ```bash
   npm run dev
   ```
6. Buka `http://localhost:3000`. Cek `http://localhost:3000/api/health`.

## Supabase notes
- Proyek menggunakan PostgreSQL melalui Prisma; tidak perlu memasang Supabase JS client untuk akses database server-side.
- Jika `api/health` gagal, cek `DATABASE_URL`, password URL-encoding, host/region, dan port pooler. Jangan pernah menaruh kredensial di kode frontend.
- Jika schema sudah ada, backup database sebelum menjalankan perubahan schema.
- Seed tidak membuat temuan dummy.
- Daftar sumber memuat duplikasi kode `BC-GE-P-23` untuk Binungan dan Sambarata. Seed menghindari konflik unique constraint dengan melewati entri Sambarata; verifikasi asset code resmi sebelum menambahkannya.
- Nama unit/model kosong pada daftar sumber tetap kosong, tidak dibuat-buat.

## Checklist dan keselamatan
`src/lib/checklist.ts` adalah transkripsi dari foto formulir yang diberikan. Sebelum dipakai operasional, cocokkan ejaan, kategori, dan kode bahaya dengan master formulir resmi. Batas parameter operasi tidak ditanamkan karena harus mengikuti SOP/OEM. Kode AA pada formulir berarti STOP OPERASI sesuai prosedur yang berlaku; aplikasi bukan pengganti otorisasi operasi atau prosedur keselamatan.

## Batasan produksi yang perlu dituntaskan
Versi ini sudah memiliki database server-side, tetapi belum memiliki login/role-based access control, audit log formal, tanda tangan digital tersertifikasi, approval workflow, atau aturan zona waktu perusahaan yang dikonfirmasi. Jangan deploy ke penggunaan operasional multi-user sebelum autentikasi dan otorisasi disiapkan.


## Debugging validasi inspeksi
Jika penyimpanan ditolak, UI menampilkan pesan validasi Zod per field/item. Periksa nama inspector, tanggal, shift, site/unit, HM/KM, serta seluruh 30 hasil checklist. Respons API `POST /api/inspections` mengembalikan `details` dan `issues` untuk diagnosis.


## Versi dengan autentikasi dan approval
- Role: `TECHNICIAN`, `SUPERVISOR`, `ADMIN`. Semua role yang login dapat melihat dashboard, history, form inspeksi, dan register temuan. Hanya teknisi/admin yang dapat mengirim inspeksi; hanya pengawas/admin yang dapat membuat dan mengelola temuan atau menyetujui/menolak inspeksi; hanya admin yang dapat membuat akun.
- Inspeksi baru berstatus `PENDING`, kemudian pengawas menyetujui (`APPROVED`) atau menolak (`REJECTED`) dari menu History.
- History menyediakan filter Harian, Mingguan, Bulanan, 3 bulan, 6 bulan, dan Tahunan.
- Model unit pada form dropdown: Komatsu, Weichai, Cummins, Caterpillar. Model yang dipilih disimpan pada master generator terpilih.
- `BC-GE-P-23` terduplikasi pada sumber (Binungan dan Sambarata). Karena `assetCode` harus unik, entri Sambarata belum dibuat sampai kode resminya diklarifikasi.

### Setup database existing
1. Backup database existing terlebih dahulu. Jangan menjalankan `db push` di database produksi tanpa meninjau perubahan schema.
2. Set `DATABASE_URL`, `DIRECT_URL`, dan `AUTH_SECRET` di `.env`.
3. Jalankan `npm install`, `npm run db:generate`, lalu tinjau dan jalankan `npm run db:push`. Perubahan menambahkan tabel `User` dan kolom approval ke `Inspection`.
4. Untuk membuat admin pertama, isi sementara `ADMIN_NAME`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` di `.env`, lalu jalankan `npm run db:bootstrap-admin`. Setelah berhasil, hapus variabel `ADMIN_PASSWORD` (dan variabel bootstrap lain) dari `.env`. Admin kemudian membuat akun teknisi/pengawas dari menu Manajemen Akun.
5. Jalankan `npm run db:seed` hanya setelah memeriksa master data. Script upsert berdasarkan `assetCode` dan tidak membuat temuan dummy.
6. Jalankan `npm run dev`.

**Keamanan:** ganti `AUTH_SECRET` dengan nilai acak panjang. Versi ini memakai sesi cookie HTTP-only dan hash password bcrypt. Sebelum produksi, tetap lakukan review keamanan dan uji migrasi di database staging.

## Revisi penugasan site dan status operasional

Versi revisi ini menambahkan:
- Penugasan satu atau beberapa site untuk akun teknisi/pengawas. Admin mengatur penugasan dari menu **Manajemen Akun**. Teknisi dan pengawas wajib memiliki minimal satu site.
- Pemeriksaan hak akses di API: teknisi hanya dapat membuat inspeksi pada site penugasannya; pengawas hanya dapat menyetujui inspeksi, mengelola temuan, dan memperbarui status operasional pada site penugasannya.
- Status operasional genset terpisah dari kelayakan target P2H: `UNASSESSED`, `OPERABLE`, `RESTRICTED`, dan `NOT_OPERABLE`. Perubahan status memerlukan alasan/referensi otorisasi dan tercatat pada tabel `GeneratorStatusLog`.
- Filter site pada History dan Master Unit.
- Detail inspeksi dari History untuk membaca catatan umum, catatan pengawas, parameter kosong/berbeban, serta catatan per item checklist.

### Terapkan perubahan database

Setelah menimpa source project dengan file versi revisi ini, dari folder project jalankan:

```powershell
npm install
npx prisma validate
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

`db:push` menambahkan kolom/tabel yang dibutuhkan pada database yang dikonfigurasi di `.env`. Pastikan `DATABASE_URL` dan `DIRECT_URL` mengarah ke database Supabase yang benar sebelum menjalankannya. Jangan hapus project database atau melakukan reset database untuk menerapkan revisi ini.

### Catatan operasional

Status `OPERABLE` tidak ditetapkan otomatis dari hasil P2H. Status harus mengikuti keputusan dan otorisasi operasional yang berlaku di perusahaan. Status aplikasi bukan pengganti SOP, izin kerja, atau keputusan resmi pengawas. Periksa master unit dan penugasan site setelah seed; kode aset yang masih ambigu harus dikonfirmasi sebelum digunakan.


### Status operasional berbasis temuan
Status operasional dihitung dari temuan yang belum CLOSED: temuan AA terbuka menghasilkan `NOT_OPERABLE`; temuan terbuka non-AA menghasilkan `RESTRICTED`; jika tidak ada temuan terbuka dan sebelumnya ada temuan tercatat, status menjadi `OPERABLE`; jika belum pernah ada temuan, status `UNASSESSED`. Membuat temuan dan mengubah status temuan akan menghitung ulang status unit. Temuan CLOSED tetap tersimpan untuk audit/history. Kebijakan ini perlu diselaraskan dengan SOP keselamatan perusahaan sebelum digunakan sebagai keputusan operasional.

Password akun bootstrap dan akun baru minimum 5 karakter sesuai konfigurasi aplikasi. Untuk penggunaan nyata, tetap disarankan memakai password lebih panjang dan unik.
# P2H-Genset
