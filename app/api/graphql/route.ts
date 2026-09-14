import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { NextRequest } from 'next/server';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// 1. SYARAT TUGAS: Variabel counter di luar resolver
let resolverCallCount = 0;

const typeDefs = `#graphql
  type Siswa {
    id: ID!
    nis: String!
    nama_lengkap: String!
    tanggal_lahir: String!
    tingkat_kelas: Int!
    daftar_nilai: [Nilai!]
  }

  type Nilai {
    id: ID!
    skor: Float!
    semester: String!
    mata_pelajaran: String!
  }

  type Query {
    semua_siswa: [Siswa!]
  }
`;

const resolvers = {
  Query: {
    semua_siswa: async () => {
      resolverCallCount = 0; // Reset counter setiap query baru
      console.log("=== [BUKTI N+1] 1 QUERY UTAMA DIJALANKAN (Ambil Semua Siswa) ===");
      
      const result = await pool.query('SELECT * FROM siswa ORDER BY id_siswa ASC');
      return result.rows.map((row) => ({
        id: row.id_siswa,
        nis: row.nis,
        nama_lengkap: row.nama_lengkap,
        tanggal_lahir: row.tanggal_lahir instanceof Date ? row.tanggal_lahir.toISOString().split('T')[0] : row.tanggal_lahir,
        tingkat_kelas: row.tingkat_kelas,
      }));
    },
  },
  Siswa: {
    daftar_nilai: async (parent: { id: string }) => {
      // 2. SYARAT TUGAS: Increment counter setiap kali resolver dipanggil
      resolverCallCount++;
      
      // 3. SYARAT TUGAS: Tampilkan nilainya lewat console.log
      console.log(`-> [BUKTI N+1] Resolver relasi dipanggil! (Panggilan ke-${resolverCallCount} untuk Siswa ID: ${parent.id})`);

      const result = await pool.query(
        `SELECT n.id_nilai, n.skor, n.semester, m.nama_mapel 
         FROM nilai n
         JOIN mata_pelajaran m ON n.id_mapel = m.id_mapel 
         WHERE n.id_siswa = $1`,
        [parent.id]
      );
      
      return result.rows.map((row) => ({
        id: row.id_nilai,
        skor: parseFloat(row.skor) || 0,
        semester: row.semester,
        mata_pelajaran: row.nama_mapel,
      }));
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  plugins: [
    ApolloServerPluginLandingPageLocalDefault({ footer: false }),
  ],
});

const handler = startServerAndCreateNextHandler<NextRequest>(server);

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}