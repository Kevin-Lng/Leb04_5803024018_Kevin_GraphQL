const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Pool } = require('pg');
require('dotenv').config();

// Koneksi ke database Neon (Wajib SSL)
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Memuat file siswa.proto dengan keepCase: true agar format penulisan tidak diubah
const packageDef = protoLoader.loadSync('./proto/siswa.proto', {
  keepCase: true 
});
const proto = grpc.loadPackageDefinition(packageDef);
const server = new grpc.Server();

server.addService(proto.SiswaService.service, {
  GetSiswa: async (call, callback) => {
    try {
      // Menggunakan id_siswa berdasarkan struktur tabelmu
      const result = await pool.query(
        'SELECT * FROM siswa WHERE id_siswa = $1', 
        [call.request.id]
      );
      
      if (result.rows.length === 0) {
        return callback({
          code: grpc.status.NOT_FOUND,
          details: 'Data siswa tidak ditemukan'
        });
      }

      const row = result.rows[0];
      
      // Konversi tanggal dari Date object ke String (YYYY-MM-DD)
      const formatTanggal = row.tanggal_lahir instanceof Date 
        ? row.tanggal_lahir.toISOString().split('T')[0] 
        : row.tanggal_lahir;

      // Kunci data sekarang akan terbaca dengan tepat oleh gRPC
      callback(null, { 
        id: row.id_siswa.toString(), 
        nis: row.nis, 
        nama_lengkap: row.nama_lengkap,
        tanggal_lahir: formatTanggal,
        tingkat_kelas: row.tingkat_kelas
      });
    } catch (error) {
      console.error(error);
      callback({
        code: grpc.status.INTERNAL,
        details: 'Kesalahan server database'
      });
    }
  }
});

const PORT = process.env.PORT || 50051;
server.bindAsync(
  `0.0.0.0:${PORT}`,
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) return console.error(err);
    console.log(`gRPC server berjalan di port ${port}`);
  }
);