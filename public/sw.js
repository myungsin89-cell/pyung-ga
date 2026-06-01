// 서비스 워커 버전 관리
const CACHE_NAME = 'pyung-ga-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// 서비스 워커 설치 및 캐싱
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// 활성화 및 구버전 캐시 삭제
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 페치(Fetch) 이벤트 - 오프라인 지원 및 네트워크 우선 전략
self.addEventListener('fetch', (event) => {
    // Firebase Realtime DB 및 외부 API 요청은 캐싱에서 제외
    if (
        event.request.url.includes('firebaseio.com') || 
        event.request.url.includes('firestore.googleapis.com') ||
        event.request.url.includes('googleapis.com')
    ) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // 캐시 자원이 존재하면 즉시 반환하고 백그라운드 갱신
                fetch(event.request).then((networkResponse) => {
                    if (networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkResponse);
                        });
                    }
                }).catch(() => {});
                return cachedResponse;
            }
            return fetch(event.request);
        })
    );
});
