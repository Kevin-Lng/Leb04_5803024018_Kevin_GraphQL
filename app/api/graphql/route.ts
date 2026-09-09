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
    skor: Int!
    semester: Int!
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
        const result = await pool.query(
          'SELECT * FROM nilai WHERE id_siswa = $1', // Pastikan id_siswa ini sudah benar seperti perbaikan sebelumnya
          [parent.id]
        );
        
        // Memetakan relasi nilai dengan Jaring Pengaman (Fallback)
        return result.rows.map((row) => ({
          id: row.id || row.id_nilai || row.ID,
          skor: row.skor || row.nilai || 0, 
          semester: row.semester || 0,
          // Jika nama kolom bukan mata_pelajaran, ia akan mencoba membaca 'mapel'. Jika gagal juga, akan muncul teks peringatan.
          mata_pelajaran: row.mata_pelajaran || row.mapel || row.nama_pelajaran || "Cek Nama Kolom di Neon!",
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