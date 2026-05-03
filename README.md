# Alfread X Addon Website

Website modern mobile-first untuk berbagi addon Minecraft.

## 🚀 Setup

### 1. Firebase
- Firebase config sudah di-embed di `firebase.js`
- Buat Firestore database di Firebase console
- Buat Storage bucket
- Set rules (lihat bawah)

### 2. Firestore Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /addons/{docId} {
      allow read: if true;
      allow write: if true; // ubah ke auth sesuai kebutuhan
    }
  }
}
```

### 3. Storage Rules
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

## 📁 Struktur File
```
alfread-x-addon/
├── index.html          ← Homepage (addon list)
├── admin.html          ← Admin dashboard
├── style.css           ← Semua style
├── script.js           ← Logic homepage
├── firebase.js         ← Firebase config & exports
└── assets/
    ├── logo.svg        ← Logo website (ganti dengan logo.png)
    ├── placeholder.svg ← Placeholder gambar
    └── loading.mp4     ← Video loading screen (tambahkan sendiri)
```

## 🔧 Konfigurasi

### Ganti Logo
Taruh file `logo.png` di folder `assets/`

### Tambah Video Loading
Taruh file `loading.mp4` di folder `assets/`
Video akan tampil di fullscreen saat website pertama dibuka.
Ukuran disarankan: 1:1 ratio, 3-5 detik, loop.

### Ganti Link Social Media
Edit `index.html` bagian footer:
- WhatsApp: ganti `https://wa.me/`
- TikTok: ganti `https://tiktok.com/`
- Instagram: ganti `https://instagram.com/`
- YouTube: ganti `https://youtube.com/`

## 🔐 Admin Login
- URL: `/admin.html`
- Username: `alfread`
- Password: `alfread12345`

> ⚠️ Untuk produksi, ganti credential di `admin.html` atau gunakan Firebase Auth

## 🌐 Deploy

### Vercel
1. Push ke GitHub
2. Import repo di vercel.com
3. Deploy otomatis ✅

### GitHub Pages
1. Push ke GitHub
2. Settings → Pages → Deploy from branch (main)
3. Website live di `username.github.io/repo-name`

### Netlify
1. Drag & drop folder ke netlify.com
2. Done ✅

## 📱 Fitur

- ✅ Mobile-first design
- ✅ Dark minimal theme
- ✅ Firebase Firestore realtime
- ✅ Firebase Storage untuk gambar
- ✅ Search dengan debounce
- ✅ Infinite scroll / load more
- ✅ Skeleton loading
- ✅ Detail bottom sheet (swipe to close)
- ✅ Like button dengan localStorage
- ✅ View counter
- ✅ Share (WA, IG, Telegram, Copy link)
- ✅ Theme picker (accent color)
- ✅ Loading screen (video + fallback)
- ✅ Toast notifications
- ✅ Scroll to top button
- ✅ Offline detection
- ✅ Admin dashboard mobile-friendly
- ✅ Upload dengan progress bar
- ✅ Edit & delete addon
- ✅ Stats dashboard

## 📦 Dependencies (CDN)
- Google Fonts: Poppins
- Firebase v10.12.2 (modular)

Tidak ada npm install yang diperlukan!
