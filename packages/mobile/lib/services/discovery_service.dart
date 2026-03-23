// discovery_service.dart — Backend server discovery service.
// Finds the BuffPenguin backend on the local network so the user doesn't
// need to enter an IP address. Uses a three-step strategy:
//   1. Try the URL cached from the last successful connection.
//   2. Perform an mDNS scan for the _buffpenguin._tcp service type.
//   3. If both fail, return null — the caller shows the manual entry UI.
//
// Discovered/entered URLs are persisted to SharedPreferences so they
// survive app restarts without re-scanning.

import 'package:multicast_dns/multicast_dns.dart';     // external: mDNS/DNS-SD client (Flutter team package)
import 'package:shared_preferences/shared_preferences.dart'; // external: key-value persistent storage
import 'api_client.dart';

// SharedPreferences key for the cached server URL.
const _prefKeyServerUrl = 'server_url';

// The DNS-SD service type advertised by the backend via @homebridge/ciao.
const _mdnsServiceType = '_buffpenguin._tcp';

// How long to wait for mDNS responses before giving up.
const _discoveryTimeout = Duration(seconds: 8);

class DiscoveryService {
  /// Attempts to find and verify a BuffPenguin server.
  /// Returns the base URL (e.g. "http://192.168.1.10:3000") on success,
  /// or null if no server could be found.
  Future<String?> discoverServer() async {
    // Step 1: try the URL from the last successful connection.
    // This is the fast path — avoids mDNS scan on subsequent app launches.
    final cached = await _getCachedUrl(); // reads from SharedPreferences
    if (cached != null) {
      final client = ApiClient(cached);
      if (await client.checkHealth(cached)) return cached; // external: HTTP GET /health
      // Cached URL no longer responds — clear it and fall through to mDNS.
      await _clearCachedUrl(); // writes to SharedPreferences
    }

    // Step 2: scan the local network via mDNS.
    final url = await _scanMdns();
    if (url != null) {
      await _cacheUrl(url); // persist for next launch
    }
    return url;
  }

  /// Persists a manually entered URL and marks it as the active server.
  /// Called by DiscoveryScreen and SettingsScreen after the user types an IP.
  Future<void> saveManualUrl(String url) async {
    await _cacheUrl(url); // writes to SharedPreferences
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  Future<String?> _getCachedUrl() async {
    final prefs = await SharedPreferences.getInstance(); // external: async SharedPreferences access
    return prefs.getString(_prefKeyServerUrl);
  }

  Future<void> _cacheUrl(String url) async {
    final prefs = await SharedPreferences.getInstance(); // external: async SharedPreferences access
    await prefs.setString(_prefKeyServerUrl, url);
  }

  Future<void> _clearCachedUrl() async {
    final prefs = await SharedPreferences.getInstance(); // external: async SharedPreferences access
    await prefs.remove(_prefKeyServerUrl);
  }

  // Performs a DNS-SD lookup for _buffpenguin._tcp services on the LAN.
  // Resolves PTR → SRV → A records to get a final IP:port, then verifies
  // the address by calling /health before returning it.
  Future<String?> _scanMdns() async {
    final client = MDnsClient(); // external: multicast_dns MDnsClient — opens a UDP multicast socket
    await client.start();

    try {
      // Query for PTR records — each PTR points to a named service instance.
      // external: multicast_dns lookup — sends mDNS queries over the local network
      await for (final ptr in client
          .lookup<PtrResourceRecord>(
            ResourceRecordQuery.serverPointer(_mdnsServiceType),
          )
          .timeout(_discoveryTimeout, onTimeout: (_) {})) {

        // Resolve SRV record for this service instance to get hostname and port.
        await for (final srv in client
            .lookup<SrvResourceRecord>(
              ResourceRecordQuery.service(ptr.domainName),
            )
            .timeout(const Duration(seconds: 3), onTimeout: (_) {})) {

          // Resolve A record for the hostname to get the IPv4 address.
          await for (final ip in client
              .lookup<IPAddressResourceRecord>(
                ResourceRecordQuery.addressIPv4(srv.target),
              )
              .timeout(const Duration(seconds: 3), onTimeout: (_) {})) {

            final url = 'http://${ip.address.address}:${srv.port}';

            // Verify this is actually a BuffPenguin server before returning.
            // Guards against accidentally connecting to another service that
            // happens to advertise the same DNS-SD type.
            final apiClient = ApiClient(url);
            if (await apiClient.checkHealth(url)) { // external: HTTP GET /health
              return url;
            }
          }
        }
      }
    } catch (_) {
      // Any error during discovery (network unavailable, permission denied, etc.)
      // is treated as "not found" — the caller will show the manual entry UI.
    } finally {
      client.stop(); // external: closes the UDP multicast socket
    }

    return null;
  }
}
