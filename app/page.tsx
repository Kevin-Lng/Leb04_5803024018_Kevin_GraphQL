export default function Home() {
  return (
    <main style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '50px' }}>
      <h1>🚀 GraphQL API Siswa - Vercel</h1>
      <p>API Service untuk Praktikum Web Service telah aktif dan berjalan.</p>
      <p>
        Silakan akses endpoint GraphQL di:{' '}
        <a href="/api/graphql" style={{ color: '#0070f3', fontWeight: 'bold' }}>
          /api/graphql
        </a>
      </p>
    </main>
  );
}