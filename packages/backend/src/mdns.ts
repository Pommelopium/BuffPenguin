import { Bonjour } from "@homebridge/ciao";

export function advertiseMdns(port: number): void {
  try {
    const bonjour = Bonjour();
    bonjour.publish({
      name: "BuffPenguin",
      type: "buffpenguin",
      port,
      txt: { version: "1", path: "/api/v1" },
    });
    console.log(`mDNS: advertising _buffpenguin._tcp.local. on port ${port}`);
  } catch (err) {
    console.warn("mDNS advertisement failed (non-fatal):", err);
  }
}
