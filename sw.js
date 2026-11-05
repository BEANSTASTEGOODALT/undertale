
const GAME_NAME = "NXTALE";
const GAME_VERSION = "0.0.0.1";

const CACHE_NAME = JSON.stringify({
    name: GAME_NAME,
    version: GAME_VERSION
});

const CACHE_FILES = [
    "runner.data",
    "runner.js",
    "runner.wasm",
    "audio-worklet.js"
];

const GAME_CHUNKS = 3;

async function reconstructGame() {
    let index = 0;

    const stream = new ReadableStream({
        async pull(controller) {
            if (index >= GAME_CHUNKS) {
                controller.close();
                return;
            }

            try {
                const name = `game.unx.part${index}`;
                const url = new URL(name, self.registration.scope);

                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`Failed to download ${name}: ${response.status}`);
                }

                const reader = response.body.getReader();

                while (true) {
                    const { done, value } = await reader.read();

                    if (done) break;

                    controller.enqueue(value);
                }

                index++;
            } catch (error) {
                controller.error(error);
            }
        }
    });

    return new Response(stream, {
        status: 200,
        headers: {
            "Content-Type": "application/octet-stream"
        }
    });
}

self.addEventListener("install", event => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener("fetch", event => {
    const url = new URL(event.request.url);

    if (url.pathname.endsWith("/game.unx")) {
        event.respondWith(reconstructGame());
        return;
    }

    const shouldCache = CACHE_FILES.some(file =>
        url.pathname.endsWith("/" + file)
    );

    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) return response;

            return fetch(event.request).then(response => {
                if (shouldCache && response.ok) {
                    const clone = response.clone();

                    caches.open(CACHE_NAME).then(cache =>
                        cache.put(event.request, clone)
                    );
                }

                return response;
            });
        })
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.map(key => {
                    try {
                        const data = JSON.parse(key);

                        if (
                            data.name === GAME_NAME &&
                            data.version !== GAME_VERSION
                        ) {
                            return caches.delete(key);
                        }
                    } catch {}
                })
            )
        ).then(() => self.clients.claim())
    );
});
