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

  # 1. Input Type untuk Create
  input CreateSiswaInput {
    nis: String!
    nama_lengkap: String!
    tanggal_lahir: String!
    tingkat_kelas: Int!
  }

  # 2. Input Type untuk Update (semua opsional)
  input UpdateSiswaInput {
    nis: String
    nama_lengkap: String
    tanggal_lahir: String
    tingkat_kelas: Int
  }

  type Query {
    # 3. Filter ditambahkan di sini (opsional berdasarkan tingkat_kelas)
    semua_siswa(tingkat_kelas: Int): [Siswa!]
  }

  type Mutation {
    # 4. Mutation CRUD
    createSiswa(input: CreateSiswaInput!): Siswa!
    updateSiswa(id: ID!, input: UpdateSiswaInput!): Siswa!
    deleteSiswa(id: ID!): Boolean!
  }
`;

const resolvers = {
  Query: {
    semua_siswa: async (_: any, { tingkat_kelas }: { tingkat_kelas?: number }) => {
      resolverCallCount = 0;
      
      // Jika ada filter tingkat_kelas yang dikirim
      if (tingkat_kelas) {
        const result = await pool.query('SELECT * FROM siswa WHERE tingkat_kelas = $1 ORDER BY id_siswa ASC', [tingkat_kelas]);
        return result.rows.map((row) => ({
          id: row.id_siswa,
          nis: row.nis,
          nama_lengkap: row.nama_lengkap,
          tanggal_lahir: row.tanggal_lahir instanceof Date ? row.tanggal_lahir.toISOString().split('T')[0] : row.tanggal_lahir,
          tingkat_kelas: row.tingkat_kelas,
        }));
      }

      // Jika tidak ada filter (tampilkan semua)
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
      resolverCallCount++;
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
  Mutation: {
    // CREATE
    createSiswa: async (_: any, { input }: any) => {
      const { nis, nama_lengkap, tanggal_lahir, tingkat_kelas } = input;
      const result = await pool.query(
        `INSERT INTO siswa (nis, nama_lengkap, tanggal_lahir, tingkat_kelas) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [nis, nama_lengkap, tanggal_lahir, tingkat_kelas]
      );
      const row = result.rows[0];
      return {
        id: row.id_siswa,
        nis: row.nis,
        nama_lengkap: row.nama_lengkap,
        tanggal_lahir: row.tanggal_lahir instanceof Date ? row.tanggal_lahir.toISOString().split('T')[0] : row.tanggal_lahir,
        tingkat_kelas: row.tingkat_kelas,
      };
    },
    // UPDATE menggunakan COALESCE sesuai modul dosen
    updateSiswa: async (_: any, { id, input }: any) => {
      const { nis, nama_lengkap, tanggal_lahir, tingkat_kelas } = input;
      const result = await pool.query(
        `UPDATE siswa 
         SET nis = COALESCE($1, nis), 
             nama_lengkap = COALESCE($2, nama_lengkap), 
             tanggal_lahir = COALESCE($3, tanggal_lahir), 
             tingkat_kelas = COALESCE($4, tingkat_kelas) 
         WHERE id_siswa = $5 RETURNING *`,
        [nis, nama_lengkap, tanggal_lahir, tingkat_kelas, id]
      );
      if (result.rows.length === 0) throw new Error("Siswa tidak ditemukan");
      const row = result.rows[0];
      return {
        id: row.id_siswa,
        nis: row.nis,
        nama_lengkap: row.nama_lengkap,
        tanggal_lahir: row.tanggal_lahir instanceof Date ? row.tanggal_lahir.toISOString().split('T')[0] : row.tanggal_lahir,
        tingkat_kelas: row.tingkat_kelas,
      };
    },
    // DELETE
    deleteSiswa: async (_: any, { id }: { id: string }) => {
      await pool.query('DELETE FROM nilai WHERE id_siswa = $1', [id]);
      const result = await pool.query('DELETE FROM siswa WHERE id_siswa = $1', [id]);
      return (result.rowCount ?? 0) > 0;
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