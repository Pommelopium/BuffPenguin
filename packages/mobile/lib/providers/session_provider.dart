// session_provider.dart — Riverpod providers for workout session state.

import 'package:flutter_riverpod/flutter_riverpod.dart'; // external: Riverpod provider library
import '../models/workout_session.dart';
import 'server_provider.dart';

/// Holds the currently active (in-progress) workout session, or null when
/// no workout is running. Set by HomeScreen when a session is started,
/// and cleared by LogSetScreen when the user taps "Finish".
/// Screens check this to show the "Resume" banner on the home screen.
final activeSessionProvider = StateProvider<WorkoutSession?>((ref) => null);

/// Fetches the list of recent workout sessions from the backend.
/// Re-fetched when invalidated (e.g. after finishing a session) via
/// ref.invalidate(sessionHistoryProvider) in LogSetScreen.
/// Returns an empty list if no server is connected yet.
final sessionHistoryProvider = FutureProvider<List<WorkoutSession>>((ref) async {
  final client = ref.watch(apiClientProvider); // rebuilds when server URL changes
  if (client == null) return [];
  // external: GET /api/v1/sessions — fetches recent sessions from the backend
  return client.getSessions();
});
