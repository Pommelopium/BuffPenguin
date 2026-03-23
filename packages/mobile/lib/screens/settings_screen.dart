import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/server_provider.dart';
import '../services/discovery_service.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  late final TextEditingController _urlController;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _urlController = TextEditingController(
      text: ref.read(serverUrlProvider) ?? '',
    );
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final url = _urlController.text.trim();
    if (url.isEmpty) return;
    setState(() => _isSaving = true);

    final client = ref.read(apiClientProvider);
    final ok = await (client?.checkHealth(url) ?? Future.value(false));

    if (!mounted) return;
    if (ok) {
      await ref.read(discoveryServiceProvider).saveManualUrl(url);
      ref.read(serverUrlProvider.notifier).state = url;
      if (mounted) context.pop();
    } else {
      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not connect to that address.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUrl = ref.watch(serverUrlProvider);

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: const Text('Settings', style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Server Address',
              style: TextStyle(color: Colors.white54, fontSize: 13, letterSpacing: 0.5),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _urlController,
              style: const TextStyle(color: Colors.white),
              keyboardType: TextInputType.url,
              decoration: const InputDecoration(
                hintText: 'http://192.168.1.x:3000',
                hintStyle: TextStyle(color: Colors.white24),
                enabledBorder: OutlineInputBorder(
                  borderSide: BorderSide(color: Colors.white24),
                ),
                focusedBorder: OutlineInputBorder(
                  borderSide: BorderSide(color: Colors.white),
                ),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _isSaving ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.black,
                ),
                child: _isSaving
                    ? const CircularProgressIndicator(strokeWidth: 2)
                    : const Text('Save & Connect'),
              ),
            ),
            if (currentUrl != null) ...[
              const SizedBox(height: 24),
              Text(
                'Connected to: $currentUrl',
                style: const TextStyle(color: Colors.white38, fontSize: 12),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
