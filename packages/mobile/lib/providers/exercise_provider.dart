// exercise_provider.dart — Riverpod provider for the exercise catalogue.

import 'package:flutter_riverpod/flutter_riverpod.dart'; // external: Riverpod provider library
import '../models/exercise.dart';
import 'server_provider.dart';

/// Fetches all exercises from the backend including their muscle group mappings.
/// Consumed by LogSetScreen to populate the exercise picker dropdown.
/// Returns an empty list if no server is connected yet.
/// The list is loaded once and cached by Riverpod until explicitly invalidated.
final exerciseListProvider = FutureProvider<List<Exercise>>((ref) async {
  final client = ref.watch(apiClientProvider); // rebuilds when server URL changes
  if (client == null) return [];
  // external: GET /api/v1/exercises — fetches exercise catalogue from the backend
  return client.getExercises();
});
