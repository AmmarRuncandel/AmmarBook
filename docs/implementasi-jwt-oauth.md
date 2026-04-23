# Implementasi JWT Custom dan OAuth Google di AmmarBook

Dokumen ini menjelaskan alur implementasi autentikasi yang dipakai pada AmmarBook:

- **JWT custom manual** untuk login, refresh token, dan proteksi route.
- **Google OAuth 2.0** untuk login / registrasi cepat tanpa menggunakan NextAuth, Auth.js, atau Supabase Auth.
- **Supabase** hanya dipakai sebagai database PostgreSQL.

## 1. Gambaran Umum

Alur autentikasi pada aplikasi ini dibagi menjadi dua:

1. **Login manual**
   - User mengisi email dan password.
   - Server memvalidasi user ke tabel `users`.
   - Server membuat `access_token` dan `refresh_token` JWT.
   - Client menyimpan token ke `localStorage`.

2. **Login Google OAuth**
   - User klik tombol **Login dengan Google**.
   - Browser diarahkan ke endpoint `/api/auth/google`.
   - Server me-redirect ke halaman consent Google.
   - Google mengirim balik `code` ke `/api/auth/google/callback`.
   - Server menukar `code` menjadi `access_token` Google.
   - Server mengambil data profil user dari Google.
   - Server mengecek apakah email sudah ada di tabel `users`.
   - Jika belum ada, server membuat user baru dengan `role: 'user'`.
   - Server membuat JWT custom dan login selesai.

## 2. Environment Variable yang Dibutuhkan

Tambahkan variabel berikut di `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Penjelasan

- `JWT_SECRET`: dipakai untuk menandatangani access token.
- `JWT_REFRESH_SECRET`: dipakai untuk menandatangani refresh token.
- `GOOGLE_CLIENT_ID`: client ID OAuth dari Google Cloud Console.
- `GOOGLE_CLIENT_SECRET`: client secret OAuth dari Google Cloud Console.

## 3. Struktur JWT

JWT pada project ini memakai dua jenis token:

- **Access token**
  - Masa berlaku singkat, sekitar 15 menit.
  - Dipakai untuk akses route API yang dilindungi.

- **Refresh token**
  - Masa berlaku lebih lama, sekitar 7 hari.
  - Dipakai untuk membuat access token baru saat token habis.

### Payload Access Token

```ts
export interface AccessTokenPayload extends JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}
```

### Fungsi JWT

File utama: [lib/jwt.ts](../lib/jwt.ts)

```ts
export async function signAccessToken(payload: {
  userId: string;
  email: string;
  name: string;
  role: Role;
}) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(accessSecret);
}

export async function signRefreshToken(payload: { userId: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(refreshSecret);
}
```

## 4. Implementasi Login Manual

### Endpoint login

File: [app/api/auth/login/route.ts](../app/api/auth/login/route.ts)

Alurnya:

1. Cek email dan password.
2. Cari user di tabel `users`.
3. Verifikasi password dengan `bcrypt.compare()`.
4. Validasi role.
5. Buat access token dan refresh token.
6. Simpan refresh token ke tabel `refresh_tokens`.
7. Kembalikan token dan data user ke client.

### Contoh syntax inti

```ts
const isValid = await bcrypt.compare(password, user.password);
if (!isValid) {
  return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
}

const accessToken = await signAccessToken({
  userId: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
});

const refreshToken = await signRefreshToken({ userId: user.id });
```

## 5. Implementasi Register Manual

### Endpoint register

File: [app/api/auth/register/route.ts](../app/api/auth/register/route.ts)

Alurnya:

1. User mengisi nama, email, dan password.
2. Server cek apakah email sudah ada.
3. Password di-hash dengan `bcrypt`.
4. Data user dimasukkan ke tabel `users`.
5. Server membuat JWT.
6. Token dikembalikan ke client.

### Contoh syntax inti

```ts
const hashedPassword = await bcrypt.hash(password, 12);

const { data: user, error } = await supabaseServer
  .from('users')
  .insert([{ name, email, password: hashedPassword }])
  .select('id, name, email, role, created_at')
  .single();
```

## 6. Implementasi Refresh Token

### Endpoint refresh

File: [app/api/auth/refresh/route.ts](../app/api/auth/refresh/route.ts)

Alurnya:

1. Client mengirim refresh token.
2. Server validasi token terhadap tabel `refresh_tokens`.
3. Server verifikasi JWT refresh token.
4. Jika valid, server membuat access token baru.
5. Token lama dapat diganti / di-rotate.

### Contoh syntax inti

```ts
const payload = await verifyRefreshToken(refreshToken);

const accessToken = await signAccessToken({
  userId: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
});
```

## 7. Proteksi Route dengan Middleware

File: [middleware.ts](../middleware.ts)

Middleware dipakai untuk melindungi route seperti `/api/books/*`.

### Fungsi utama

- Membaca header `Authorization: Bearer <token>`.
- Memverifikasi access token.
- Menyisipkan informasi user ke header request.
- Membatasi akses berdasarkan role jika diperlukan.

### Contoh syntax inti

```ts
const authHeader = request.headers.get('authorization');
const token = authHeader?.startsWith('Bearer ')
  ? authHeader.slice(7)
  : null;

const payload = await verifyAccessToken(token);
```

## 8. Role Based Authorization

Project ini memakai dua role:

- `admin`
- `user`

Aturan yang dipakai:

- `user` bisa melihat data.
- `admin` bisa melakukan create, update, dan delete.

### Contoh pengecekan role

```ts
if (userRole !== 'admin') {
  return NextResponse.json(
    { success: false, message: 'Akses ditolak: Hanya Admin yang dapat melakukan tindakan ini' },
    { status: 403 }
  );
}
```

## 9. Implementasi OAuth Google

Google OAuth dibuat secara manual menggunakan endpoint API sendiri.

### 9.1 Endpoint redirect

File: [app/api/auth/google/route.ts](../app/api/auth/google/route.ts)

Endpoint ini membuat URL otorisasi Google lalu me-redirect user.

### Contoh syntax inti

```ts
const authUrl = buildGoogleAuthUrl(clientId, redirectUri, state);
return NextResponse.json({ authUrl, success: true });
```

### Parameter yang dipakai

- `client_id`
- `redirect_uri`
- `response_type=code`
- `scope=email profile`
- `state`

## 10. Callback Google

File: [app/api/auth/google/callback/route.ts](../app/api/auth/google/callback/route.ts)

### Alur callback

1. Terima parameter `code` dari Google.
2. Tukar `code` menjadi Google access token.
3. Ambil profil user dari Google API.
4. Cek email pada tabel `users`.
5. Jika user belum ada, buat record baru.
6. Generate JWT custom.
7. Login selesai.

### Contoh syntax inti

```ts
const tokenData = await exchangeCodeForToken(code, redirectUri);
const googleUser = await getGoogleUserInfo(tokenData.access_token);

const { data: existingUser } = await supabaseServer
  .from('users')
  .select('id, name, email, role, created_at')
  .eq('email', googleUser.email)
  .single();
```

### Jika user belum ada

```ts
const hashedPassword = await bcrypt.hash(generateRandomPassword(), 12);

await supabaseServer.from('users').insert([
  {
    email: googleUser.email,
    name: googleUser.name || googleUser.email.split('@')[0],
    password: hashedPassword,
    role: 'user',
    created_at: new Date().toISOString(),
  },
]);
```

## 11. UI Login Google

File: [app/login/page.tsx](../app/login/page.tsx)

Tampilan login menyediakan:

- form login manual,
- tombol login dengan Google,
- link ke halaman register.

### Contoh tombol Google

```tsx
<button onClick={handleGoogleLogin}>
  Login dengan Google
</button>
```

## 12. Alur Register Manual di UI

File: [app/register/page.tsx](../app/register/page.tsx)

Alur:

1. User isi form register.
2. Request dikirim ke endpoint `/api/auth/register`.
3. Jika sukses, user diarahkan kembali ke `/login`.
4. User login dengan akun yang baru dibuat.

### Redirect setelah register

```ts
router.replace('/login?registered=manual');
```

## 13. Catatan Keamanan

- Jangan commit `.env.local` ke repository publik.
- JWT secret dan Google client secret harus dijaga.
- Gunakan HTTPS saat deployment.
- Jika secret Google sempat tersebar, sebaiknya rotate di Google Cloud Console.

## 14. File Penting yang Terlibat

- [lib/jwt.ts](../lib/jwt.ts)
- [lib/oauth.ts](../lib/oauth.ts)
- [app/api/auth/login/route.ts](../app/api/auth/login/route.ts)
- [app/api/auth/register/route.ts](../app/api/auth/register/route.ts)
- [app/api/auth/refresh/route.ts](../app/api/auth/refresh/route.ts)
- [app/api/auth/google/route.ts](../app/api/auth/google/route.ts)
- [app/api/auth/google/callback/route.ts](../app/api/auth/google/callback/route.ts)
- [middleware.ts](../middleware.ts)
- [app/login/page.tsx](../app/login/page.tsx)
- [app/register/page.tsx](../app/register/page.tsx)

## 15. Ringkasan Singkat

JWT dipakai untuk mengamankan akses API dan session aplikasi. OAuth Google dipakai sebagai alternatif login yang tetap menghasilkan JWT custom di aplikasi ini. Dengan begitu, autentikasi tetap terpusat di backend milik sendiri, sementara Supabase hanya berfungsi sebagai database.
