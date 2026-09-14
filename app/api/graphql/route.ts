import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { NextRequest } from 'next/server';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { Pool } from 'pg';

// 1. Konfigurasi Koneksi Database Neon PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// 2. Definisi Skema GraphQL (TypeDefs)
const typeDefs = `#graphql
  type Siswa {
    id: ID!
    nama_lengkap: String!
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

// 3. Definisi Resolvers (Penanganan Query & Mapping Data)
const resolvers = {
  Query: {
    semua_siswa: async () => {
      try {
        const result = await pool.query('SELECT * FROM siswa');
        
        return result.rows.map((row) => ({
          id: row.id || row.id_siswa || row.ID,
          nama_lengkap: row.nama_lengkap || row.nama,
        }));
      } catch (error) {
        throw new Error('Gagal mengambil data siswa: ' + error);
      }
    },
  },
  Siswa: {
    daftar_nilai: async (parent: { id: string }) => {
      try {
        // PERBAIKAN FINAL: Gunakan SQL JOIN untuk menyatukan tabel nilai dan mata_pelajaran
        const result = await pool.query(
          `SELECT nilai.*, mata_pelajaran.nama_mapel 
           FROM nilai 
           JOIN mata_pelajaran ON nilai.id_mapel = mata_pelajaran.id_mapel 
           WHERE nilai.id_siswa = $1`,
          [parent.id]
        );
        
        return result.rows.map((row) => ({
          id: row.id || row.id_nilai || row.ID,
          skor: parseFloat(row.skor) || parseFloat(row.nilai) || 0,
          semester: row.semester || "Tidak diketahui", 
          
          // Karena sudah di-JOIN, sekarang kita bisa langsung memanggil kolom aslinya!
          mata_pelajaran: row.nama_mapel,
        }));
      } catch (error) {
        throw new Error('Gagal mengambil relasi nilai: ' + error);
      }
    },
  },
};

// 4. Inisialisasi Server Apollo dengan Plugin Sandbox
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  plugins: [
    ApolloServerPluginLandingPageLocalDefault({ footer: false }),
  ],
});

// 5. Handler untuk Next.js App Router
const handler = startServerAndCreateNextHandler<NextRequest>(server);

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}