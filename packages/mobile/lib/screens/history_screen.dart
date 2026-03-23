import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../providers/server_provider.dart';
import '../models/workout_session.dart';

final _sessionDetailProvider = FutureProvider.family<WorkoutSession, int>(
  (ref, id) async {
    final client = ref.read(apiClientProvider);
    if (client == null) throw Exception('No server connected');
    return client.getSession(id);
  },
);

class HistoryScreen extends ConsumerWidget {
  final int sessionId;
  const HistoryScreen({super.key, required this.sessionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(_sessionDetailProvider(sessionId));

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: const Text('Session Detail', style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: session.when(
        loading: () => const Center(child: CircularProgressIndicator(color: Colors.white)),
        error: (e, _) => Center(
          child: Text('Error: $e', style: const TextStyle(color: Colors.redAccent)),
        ),
        data: (s) {
          final date = DateFormat('EEEE, MMMM d y – HH:mm').format(s.startedAtDate);
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(date, style: const TextStyle(color: Colors.white, fontSize: 18)),
              if (s.notes != null) ...[
                const SizedBox(height: 8),
                Text(s.notes!, style: const TextStyle(color: Colors.white54)),
              ],
              const SizedBox(height: 24),
              if (s.sets.isEmpty)
                const Text('No sets recorded.', style: TextStyle(color: Colors.white38))
              else
                ...s.sets.map((set) {
                  final weight = set.bodyweight
                      ? 'BW'
                      : set.weightKg != null
                          ? '${set.weightKg} kg'
                          : '—';
                  return ListTile(
                    dense: true,
                    leading: Text(
                      '#${set.setNumber}',
                      style: const TextStyle(color: Colors.white38),
                    ),
                    title: Text(
                      'Exercise #${set.exerciseId}',
                      style: const TextStyle(color: Colors.white),
                    ),
                    trailing: Text(
                      '${set.reps ?? '—'} × $weight',
                      style: const TextStyle(color: Colors.white54),
                    ),
                  );
                }),
            ],
          );
        },
      ),
    );
  }
}
