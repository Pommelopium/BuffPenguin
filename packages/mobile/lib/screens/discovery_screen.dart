// discovery_screen.dart — Server discovery screen.
// The first screen shown after launch. Runs automatic mDNS discovery via
// serverDiscoveryProvider and navigates to /home as soon as a server is found.
// If discovery fails or times out, the user can type the server IP manually.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart'; // external: Riverpod state management
import 'package:go_router/go_router.dart';               // external: GoRouter navigation
import '../providers/server_provider.dart';
import '../services/discovery_service.dart';

class DiscoveryScreen extends ConsumerStatefulWidget {
  const DiscoveryScreen({super.key});

  @override
  ConsumerState<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends ConsumerState<DiscoveryScreen> {
  final _manualController = TextEditingController(text: 'http://');
  bool _isChecking = false; // true while the manual URL is being verified
  String? _error;           // shown below the text field on failed connect attempt

  @override
  void dispose() {
    _manualController.dispose();
    super.dispose();
  }

  // Validates the manually entered URL by calling /health, then saves it
  // and navigates to /home if the server responds correctly.
  Future<void> _connectManual() async {
    final url = _manualController.text.trim();
    if (url.isEmpty) return;
    setState(() { _isChecking = true; _error = null; });

    final discovery = ref.read(discoveryServiceProvider);
    final client = ref.read(apiClientProvider.notifier);

    // Verify the entered URL responds with status:"ok" before committing to it.
    final apiClient = ref.read(apiClientProvider);
    final ok = await (apiClient?.checkHealth(url) ?? Future.value(false)); // external: HTTP GET /health

    if (!mounted) return;
    if (ok) {
      // Persist the URL so it's tried first on the next app launch.
      await discovery.saveManualUrl(url); // external: writes to SharedPreferences
      ref.read(serverUrlProvider.notifier).state = url;
      if (mounted) context.go('/home'); // external: GoRouter navigation
    } else {
      setState(() {
        _isChecking = false;
        _error = 'Could not reach BuffPenguin at that address.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Watch the automatic discovery future — drives the loading/found/not-found UI.
    final discovery = ref.watch(serverDiscoveryProvider); // external: Riverpod FutureProvider

    // When automatic discovery succeeds, navigate immediately without waiting
    // for the user to do anything.
    ref.listen(serverDiscoveryProvider, (_, next) { // external: Riverpod side-effect listener
      if (next.value != null && mounted) context.go('/home'); // external: GoRouter navigation
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
              // Show a spinner while mDNS scan is running, a failure message
              // if it completes without finding a server, or nothing if found
              // (navigation happens immediately via the ref.listen above).
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
