import 'package:multicast_dns/multicast_dns.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';

const _prefKeyServerUrl = 'server_url';
const _mdnsServiceType = '_buffpenguin._tcp';
const _discoveryTimeout = Duration(seconds: 8);

class DiscoveryService {
  /// Returns a verified server base URL, or null if not found.
  Future<String?> discoverServer() async {
    // 1. Try cached URL first
    final cached = await _getCachedUrl();
    if (cached != null) {
      final client = ApiClient(cached);
      if (await client.checkHealth(cached)) return cached;
      // Cached URL is stale — clear it and fall through
      await _clearCachedUrl();
    }

    // 2. mDNS scan
    final url = await _scanMdns();
    if (url != null) {
      await _cacheUrl(url);
    }
    return url;
  }

  Future<void> saveManualUrl(String url) async {
    await _cacheUrl(url);
  }

  Future<String?> _getCachedUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_prefKeyServerUrl);
  }

  Future<void> _cacheUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefKeyServerUrl, url);
  }

  Future<void> _clearCachedUrl() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefKeyServerUrl);
  }

  Future<String?> _scanMdns() async {
    final client = MDnsClient();
    await client.start();

    try {
      // Look for PTR records for our service type
      await for (final ptr in client
          .lookup<PtrResourceRecord>(
            ResourceRecordQuery.serverPointer(_mdnsServiceType),
          )
          .timeout(_discoveryTimeout, onTimeout: (_) {})) {
        // Resolve the SRV record to get host and port
        await for (final srv in client
            .lookup<SrvResourceRecord>(
              ResourceRecordQuery.service(ptr.domainName),
            )
            .timeout(const Duration(seconds: 3), onTimeout: (_) {})) {
          // Resolve A record to get IP
          await for (final ip in client
              .lookup<IPAddressResourceRecord>(
                ResourceRecordQuery.addressIPv4(srv.target),
              )
              .timeout(const Duration(seconds: 3), onTimeout: (_) {})) {
            final url = 'http://${ip.address.address}:${srv.port}';
            final apiClient = ApiClient(url);
            if (await apiClient.checkHealth(url)) {
              return url;
            }
          }
        }
      }
    } catch (_) {
      // Discovery failure is non-fatal
    } finally {
      client.stop();
    }

    return null;
  }
}
