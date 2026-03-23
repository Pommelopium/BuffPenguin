import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/workout_session.dart';
import 'server_provider.dart';

/// Active session (if a workout is in progress)
final activeSessionProvider = StateProvider<WorkoutSession?>((ref) => null);

/// Recent session history
final sessionHistoryProvider = FutureProvider<List<WorkoutSession>>((ref) async {
  final client = ref.watch(apiClientProvider);
  if (client == null) return [];
  return client.getSessions();
});
