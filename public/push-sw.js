// Service worker exclusivo das notificações do Super CT.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { title: "Super CT", body: event.data ? event.data.text() : "" };
  }
  const titulo = dados.title || "Super CT";
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: dados.body || "",
      icon: dados.icon || "/icon-192.png",
      badge: "/push-badge.png",
      data: { url: dados.url || "https://osuperct.com" },
      vibrate: [120, 60, 120],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
