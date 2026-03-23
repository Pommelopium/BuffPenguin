import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/server_provider.dart';
import '../services/discovery_service.dart';

class DiscoveryScreen extends ConsumerStatefulWidget {
  const DiscoveryScreen({super.key});

  @override
  ConsumerState<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends ConsumerState<DiscoveryScreen> {
  final _manualController = TextEditingController(text: 'http://');
  bool _isChecking = false;
  String? _error;

  @override
  void dispose() {
    _manualController.dispose();
    super.dispose();
  }

  Future<void> _connectManual() async {
    final url = _manualController.text.trim();
    if (url.isEmpty) return;
    setState(() { _isChecking = true; _error = null; });

    final discovery = ref.read(discoveryServiceProvider);
    final client = ref.read(apiClientProvider.notifier);

    // Verify the URL is reachable
    final apiClient = ref.read(apiClientProvider);
    final ok = await (apiClient?.checkHealth(url) ?? Future.value(false));

    if (!mounted) return;
    if (ok) {
      await discovery.saveManualUrl(url);
      ref.read(serverUrlProvider.notifier).state = url;
      if (mounted) context.go('/home');
    } else {
      setState(() {
        _isChecking = false;
        _error = 'Could not reach BuffPenguin at that address.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final discovery = ref.watch(serverDiscoveryProvider);

    // Auto-navigate when discovery succeeds
    ref.listen(serverDiscoveryProvider, (_, next) {
      if (next.value != null && mounted) context.go('/home');
    });

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                'BuffPenguin',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Looking for your server...',
                style: TextStyle(color: Colors.white54),
              ),
              const SizedBox(height: 32),
              discovery.when(
                loading: () => const CircularProgressIndicator(color: Colors.white),
                data: (url) => url == null
                    ? const Text(
                        'Server not found on this network.',
                        style: TextStyle(color: Colors.redAccent),
                      )
                    : const SizedBox.shrink(),
                error: (e, _) => Text(
                  'Discovery error: $e',
                  style: const TextStyle(color: Colors.redAccent),
                ),
              ),
              const SizedBox(height: 40),
              const Text(
                'Or enter the server address manually:',
                style: TextStyle(color: Colors.white54, fontSize: 13),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _manualController,
                style: const TextStyle(color: Colors.white),
                keyboardType: TextInputType.url,
                decoration: InputDecoration(
                  hintText: 'http://192.168.1.x:3000',
                  hintStyle: const TextStyle(color: Colors.white24),
                  enabledBorder: const OutlineInputBorder(
                    borderSide: BorderSide(color: Colors.white24),
                  ),
                  focusedBorder: const OutlineInputBorder(
                    borderSide: BorderSide(color: Colors.white),
                  ),
                  errorText: _error,
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isChecking ? null : _connectManual,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.black,
                  ),
                  child: _isChecking
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Connect'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
