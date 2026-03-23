// mdns.ts — mDNS service advertisement.
// Broadcasts the backend's presence on the local network so the Flutter
// mobile app can discover it automatically without the user entering an
// IP address. Uses the _buffpenguin._tcp service type, which the app
// queries for via the multicast_dns Dart package.
//
// This is non-fatal: if mDNS fails (e.g. the network interface doesn't
// support multicast), the server continues running normally and the user
// can fall back to entering the IP manually in the app's settings screen.

import { Bonjour } from "@homebridge/ciao"; // external: pure-TypeScript mDNS/DNS-SD library (no avahi-daemon required)

export function advertiseMdns(port: number): void {
  try {
    // Create a Bonjour instance that manages the mDNS socket.
    const bonjour = Bonjour();

    // Publish the service. The `type` field becomes the DNS-SD service type
    // (_buffpenguin._tcp.local.) that the mobile app queries for.
    // The TXT record carries the API version and base path so future clients
    // can handle version mismatches gracefully.
    bonjour.publish({
      name: "BuffPenguin",
      type: "buffpenguin",  // results in _buffpenguin._tcp.local.
      port,
      txt: { version: "1", path: "/api/v1" },
    });

    console.log(`mDNS: advertising _buffpenguin._tcp.local. on port ${port}`);
  } catch (err) {
    // Swallow the error so a multicast-incapable environment doesn't crash
    // the server. The mobile app's manual IP fallback covers this case.
    console.warn("mDNS advertisement failed (non-fatal):", err);
  }
}
