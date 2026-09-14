/* global self, caches */
// Remove the former API cache when upgrading. Private data must stay online-only.
self.addEventListener("activate", event => {
  event.waitUntil(caches.delete("api-cache"));
});
