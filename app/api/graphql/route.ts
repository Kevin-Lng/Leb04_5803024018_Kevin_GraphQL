import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { NextRequest } from 'next/server';
import { Pool } from 'pg';

// 1. Membuka Koneksi ke Neon Database (menggunakan file .env)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 2. Definisi Skema GraphQL (typeDefs)
const typeDefs = `#graphql
  type Siswa {
    id_siswa: ID!
    nis: String!
    nama_lengkap: String!
    tanggal_lahir: String!
    tingkat_kelas: Int!
    # Relasi: Satu siswa punya banyak nilai
    daftar_nilai: [Nilai!]! 
  }

  type MataPelajaran {
    id_mapel: ID!
    kode_mapel: String!
    nama_mapel: String!
    guru_pengajar: String!
    # Relasi: Satu mapel punya banyak nilai
    daftar_nilai: [Nilai!]! 
  }

  type Nilai {
    id_nilai: ID!
    semester: String!
    skor: Float!
    # Relasi Balik: Nilai ini milik siapa dan untuk mapel apa?
    siswa: Siswa!
    mata_pelajaran: MataPelajaran!
  }

  type Query {
    semua_siswa: [Siswa!]!
    semua_mapel: [MataPelajaran!]!
    siswa(nis: String!): Siswa
  }
`;

// 3. Menulis Resolver & Menjembatani Relasi (SUDAH DIPERBAIKI DENGAN ANY)
const resolvers = {
  Query: {
    semua_siswa: async () => {
      const res = await pool.query('SELECT * FROM siswa');
      return res.rows;
    },
    semua_mapel: async () => {
      const res = await pool.query('SELECT * FROM mata_pelajaran');
      return res.rows;
    },
    siswa: async (_: any, { nis }: any) => {
      const res = await pool.query('SELECT * FROM siswa WHERE nis = $1', [nis]);
      return res.rows[0];
    }
  },
  
  // Resolver Relasi untuk Tipe Siswa
  Siswa: {
    daftar_nilai: async (parent: any) => {
      const res = await pool.query('SELECT * FROM nilai WHERE id_siswa = $1', [parent.id_siswa]);
      return res.rows;
    }
  },

  // Resolver Relasi untuk Tipe MataPelajaran
  MataPelajaran: {
    daftar_nilai: async (parent: any) => {
      const res = await pool.query('SELECT * FROM nilai WHERE id_mapel = $1', [parent.id_mapel]);
      return res.rows;
    }
  },

  // Resolver Relasi untuk Tipe Nilai
  Nilai: {
    siswa: async (parent: any) => {
      const res = await pool.query('SELECT * FROM siswa WHERE id_siswa = $1', [parent.id_siswa]);
      return res.rows[0];
    },
    mata_pelajaran: async (parent: any) => {
      const res = await pool.query('SELECT * FROM mata_pelajaran WHERE id_mapel = $1', [parent.id_mapel]);
      return res.rows[0];
    }
  }
};

// 4. Inisialisasi Server Apollo
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
});

// 5. Membungkus Server agar cocok dengan Next.js App Router secara eksplisit
const handler = startServerAndCreateNextHandler<NextRequest>(server);

// Memaksa tipe data handler agar dikenali murni sebagai fungsi GET dan POST App Router
export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}