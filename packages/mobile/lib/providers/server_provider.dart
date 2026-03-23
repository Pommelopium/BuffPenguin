import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_client.dart';
import '../services/discovery_service.dart';

final discoveryServiceProvider = Provider((_) => DiscoveryService());

/// Holds the resolved server base URL. Null means not yet discovered.
final serverUrlProvider = StateProvider<String?>((ref) => null);

/// The shared ApiClient instance, rebuilt whenever the server URL changes.
final apiClientProvider = Provider<ApiClient?>((ref) {
  final url = ref.watch(serverUrlProvider);
  if (url == null) return null;
  return ApiClient(url);
});

/// Initiates server discovery and updates serverUrlProvider on success.
final serverDiscoveryProvider = FutureProvider<String?>((ref) async {
  final discovery = ref.read(discoveryServiceProvider);
  final url = await discovery.discoverServer();
  if (url != null) {
    ref.read(serverUrlProvider.notifier).state = url;
  }
  return url;
});
