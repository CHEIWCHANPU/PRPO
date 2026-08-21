// sw.js — Service Worker สำหรับ PURCHASE-EN-CCIP
// วางไฟล์นี้ไว้ที่ root เดียวกับ index.html (เช่น โฟลเดอร์ PRPO/ บน GitHub Pages)
// จุดประสงค์หลัก: ทำให้เบราว์เซอร์ (Chrome/Edge) เห็นว่ามี Service Worker ที่
// active อยู่จริง ซึ่งเป็นหนึ่งในเงื่อนไขที่ต้องผ่านก่อนจะยอมยิง
// beforeinstallprompt / แสดงไอคอนติดตั้งแอปที่แถบ URL

const CACHE_NAME = 'purchase-en-ccip-v1';
const APP_SHELL = [
  './',
  './index.html',
];

// ติดตั้ง: cache หน้าเว็บหลักไว้ล่วงหน้า
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch(() => {
            // ไม่ให้ล้มทั้ง install หากบาง path ไม่ตรง (เช่น deploy อยู่คนละ path)
          })
        )
      );
    })
  );
});

// เปิดใช้งาน: ลบ cache เวอร์ชันเก่าทิ้ง
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ดักจับ request: ใช้กลยุทธ์ network-first (พยายามโหลดสดก่อน ถ้าออฟไลน์ค่อย fallback ไป cache)
// เพื่อให้ข้อมูลจาก Google Sheet/Apps Script ที่ sync แบบ real-time ยังอัปเดตตามปกติ
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // ปล่อยผ่าน request ที่ไม่ใช่ GET (เช่น POST ไป Google Apps Script) ไม่ต้อง cache
  if (req.method !== 'GET') return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // เก็บสำเนาไว้ใน cache เผื่อออฟไลน์ครั้งถัดไป
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});
