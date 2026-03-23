// server_provider.dart — Riverpod providers for server connection state.
// These providers are the central point of truth for which server the app
// is currently connected to and how to talk to it.
//
// Provider dependency graph:
//   serverDiscoveryProvider (FutureProvider)
//     └─ reads discoveryServiceProvider
//     └─ writes serverUrlProvider
//   apiClientProvider (Provider)
//     └─ watches serverUrlProvider
//   All screens read apiClientProvider to make API calls.

import 'package:flutter_riverpod/flutter_riverpod.dart'; // external: Riverpod provider library
import '../services/api_client.dart';
import '../services/discovery_service.dart';

/// Provides the singleton DiscoveryService instance.
/// Using a Provider (not StateProvider) means the service is only created once.
final discoveryServiceProvider = Provider((_) => DiscoveryService());

/// Holds the resolved server base URL (e.g. "http://192.168.1.10:3000").
/// Null until discovery succeeds or the user saves a manual URL.
/// Watched by apiClientProvider — changing this URL rebuilds the API client.
final serverUrlProvider = StateProvider<String?>((ref) => null);

/// Provides the shared ApiClient instance pointed at the current server URL.
/// Returns null when no server URL is set, which screens check before
/// making API calls to avoid calling methods on a null client.
/// Automatically rebuilt by Riverpod when serverUrlProvider changes.
final apiClientProvider = Provider<ApiClient?>((ref) {
  final url = ref.watch(serverUrlProvider); // re-evaluated whenever serverUrlProvider changes
  if (url == null) return null;
  return ApiClient(url); // external: creates a new Dio-backed HTTP client
});

/// Kicks off server discovery and populates serverUrlProvider on success.
/// Watched by DiscoveryScreen to drive the loading/found/not-found UI states.
/// Uses FutureProvider so the UI can show a spinner while discovery runs.
final serverDiscoveryProvider = FutureProvider<String?>((ref) async {
  final discovery = ref.read(discoveryServiceProvider);
  // external: calls DiscoveryService.discoverServer() which tries cached URL
  // then mDNS scan, making HTTP requests to /health to verify each candidate.
  final url = await discovery.discoverServer();
  if (url != null) {
    // Write the result into serverUrlProvider so apiClientProvider rebuilds
    // and all screens gain access to the correct ApiClient immediately.
    ref.read(serverUrlProvider.notifier).state = url;
  }
  return url;
});
