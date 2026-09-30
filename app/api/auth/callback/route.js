import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Code tidak ditemukan' }, { status: 400 });
  }

  // Tukar code dengan access_token GitHub
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code
    })
  });
  
  const { access_token } = await tokenRes.json();

  // Ambil data profil GitHub
  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${access_token}` }
  });
  const githubUser = await userRes.json();

  // Buat JWT buatan sendiri
  const token = jwt.sign(
    { username: githubUser.login }, 
    process.env.JWT_SECRET, 
    { expiresIn: '1h' }
  );

  // Tampilkan token di layar (kamu akan copy ini untuk Postman/Apollo Sandbox)
  return NextResponse.json({ token, message: "Copy token ini untuk dimasukkan ke Header Authorization" });
}