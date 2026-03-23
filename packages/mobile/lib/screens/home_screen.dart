import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../providers/session_provider.dart';
import '../providers/server_provider.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeSession = ref.watch(activeSessionProvider);
    final history = ref.watch(sessionHistoryProvider);
    final serverUrl = ref.watch(serverUrlProvider);

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: const Text('BuffPenguin', style: TextStyle(color: Colors.white)),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings, color: Colors.white54),
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: Column(
        children: [
          if (activeSession != null)
            _ActiveSessionBanner(session: activeSession)
          else
            Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.fitness_center),
                  label: const Text('Start Workout'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.black,
                    textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  onPressed: () => _startSession(context, ref),
                ),
              ),
            ),
          const Divider(color: Colors.white12),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Recent Sessions',
                style: TextStyle(color: Colors.white54, fontSize: 13, letterSpacing: 0.5),
              ),
            ),
          ),
          Expanded(
            child: history.when(
              loading: () => const Center(child: CircularProgressIndicator(color: Colors.white)),
              error: (e, _) => Center(
                child: Text('Error: $e', style: const TextStyle(color: Colors.redAccent)),
              ),
              data: (sessions) => sessions.isEmpty
                  ? const Center(
                      child: Text('No sessions yet.', style: TextStyle(color: Colors.white38)),
                    )
                  : ListView.builder(
                      itemCount: sessions.length,
                      itemBuilder: (context, index) {
                        final s = sessions[index];
                        final date = DateFormat('EEE, MMM d – HH:mm').format(s.startedAtDate);
                        return ListTile(
                          title: Text(date, style: const TextStyle(color: Colors.white)),
                          subtitle: s.notes != null
                              ? Text(s.notes!, style: const TextStyle(color: Colors.white54))
                              : null,
                          trailing: const Icon(Icons.chevron_right, color: Colors.white24),
                          onTap: () => context.push('/history/${s.id}'),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _startSession(BuildContext context, WidgetRef ref) async {
    final client = ref.read(apiClientProvider);
    if (client == null) return;
    try {
      final session = await client.startSession();
      ref.read(activeSessionProvider.notifier).state = session;
      if (context.mounted) context.push('/log/${session.id}');
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to start session: $e')),
        );
      }
    }
  }
}

class _ActiveSessionBanner extends ConsumerWidget {
  final session;
  const _ActiveSessionBanner({required this.session});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      color: const Color(0xFF1A2A1A),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          const Icon(Icons.fitness_center, color: Color(0xFF00FF88)),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Workout in progress',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ),
          TextButton(
            onPressed: () => context.push('/log/${session.id}'),
            child: const Text('Resume', style: TextStyle(color: Color(0xFF00FF88))),
          ),
        ],
      ),
    );
  }
}
