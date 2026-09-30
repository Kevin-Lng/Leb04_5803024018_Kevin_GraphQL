import { NextResponse } from 'next/server';

export async function GET() {
  const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${process.env.CALLBACK_URL}`;
  return NextResponse.redirect(url);
}