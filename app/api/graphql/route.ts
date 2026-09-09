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

// 3. Definisi Resolvers (Penanganan Query & Nested Relation)
const resolvers = {
  Query: {
    semua_siswa: async () => {
      try {
        const result = await pool.query('SELECT * FROM siswa');
        return result.rows;
      } catch (error) {
        throw new Error('Gagal mengambil data siswa: ' + error);
      }
    },
  },
  Siswa: {
    daftar_nilai: async (parent: { id: string }) => {
      try {
        const result = await pool.query(
          'SELECT * FROM nilai WHERE siswa_id = $1',
          [parent.id]
        );
        return result.rows;
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