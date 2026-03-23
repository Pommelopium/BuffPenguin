import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/exercise.dart';
import 'server_provider.dart';

final exerciseListProvider = FutureProvider<List<Exercise>>((ref) async {
  final client = ref.watch(apiClientProvider);
  if (client == null) return [];
  return client.getExercises();
});
