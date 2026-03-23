// api_client.dart — HTTP client wrapper for the BuffPenguin backend API.
// All network calls to the backend go through this class. It uses Dio
// for HTTP with sensible timeouts suited to a local network environment.
// A fresh instance is created by apiClientProvider whenever the server URL
// changes (e.g. after mDNS discovery or manual IP entry).

import 'package:dio/dio.dart'; // external: Dio HTTP client package
import '../models/workout_session.dart';
import '../models/workout_set.dart';
import '../models/exercise.dart';
import '../models/muscle_group.dart';

class ApiClient {
  late final Dio _dio;

  // Creates a Dio instance pointed at the given server's /api/v1 base path.
  // All subsequent calls use relative paths, so the base URL is set once here.
  ApiClient(String baseUrl) {
    _dio = Dio(BaseOptions( // external: Dio configuration
      baseUrl: '$baseUrl/api/v1',
      connectTimeout: const Duration(seconds: 5),  // fail fast if Pi is unreachable
      receiveTimeout: const Duration(seconds: 10), // allow time for heavier queries
    ));
  }

  // Checks whether the given URL is a reachable BuffPenguin server.
  // Called by DiscoveryService to verify a resolved mDNS address, and by
  // SettingsScreen to validate a manually entered IP before saving it.
  // Uses a separate Dio instance (not _dio) so the base URL can differ.
  Future<bool> checkHealth(String baseUrl) async {
    try {
      // external: HTTP GET to /health on the given base URL
      final response = await Dio().get(
        '$baseUrl/health',
        options: Options(receiveTimeout: const Duration(seconds: 3)),
      );
      return response.data['status'] == 'ok';
    } catch (_) {
      return false; // any error (timeout, connection refused, wrong response) → not a valid server
    }
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  // Creates a new workout session on the backend.
  // Called when the user taps "Start Workout" on the home screen.
  // external: POST /api/v1/sessions
  Future<WorkoutSession> startSession() async {
    final response = await _dio.post('/sessions');
    return WorkoutSession.fromJson(response.data as Map<String, dynamic>);
  }

  // Marks a session as finished by setting its ended_at timestamp.
  // external: PATCH /api/v1/sessions/:id
  Future<WorkoutSession> endSession(int id, {String? notes}) async {
    final response = await _dio.patch(
      '/sessions/$id',
      data: {
        'ended_at': DateTime.now().millisecondsSinceEpoch ~/ 1000, // convert to Unix seconds
        if (notes != null) 'notes': notes,
      },
    );
    return WorkoutSession.fromJson(response.data as Map<String, dynamic>);
  }

  // Returns a paginated list of past sessions, newest first.
  // Used to populate the history list on the home screen.
  // external: GET /api/v1/sessions?limit=&offset=
  Future<List<WorkoutSession>> getSessions({int limit = 20, int offset = 0}) async {
    final response = await _dio.get(
      '/sessions',
      queryParameters: {'limit': limit, 'offset': offset},
    );
    return (response.data as List<dynamic>)
        .map((s) => WorkoutSession.fromJson(s as Map<String, dynamic>))
        .toList();
  }

  // Returns a single session including all its logged sets.
  // Used by the history detail screen.
  // external: GET /api/v1/sessions/:id
  Future<WorkoutSession> getSession(int id) async {
    final response = await _dio.get('/sessions/$id');
    return WorkoutSession.fromJson(response.data as Map<String, dynamic>);
  }

  // ── Sets ──────────────────────────────────────────────────────────────────

  // Logs a single set within an active session.
  // Called each time the user taps "Log Set" on the log set screen.
  // external: POST /api/v1/sessions/:sessionId/sets
  Future<WorkoutSet> logSet({
    required int sessionId,
    required int exerciseId,
    required int setNumber,
    int? reps,
    double? weightKg,
    bool bodyweight = false,
  }) async {
    final response = await _dio.post(
      '/sessions/$sessionId/sets',
      data: {
        'exercise_id': exerciseId,
        'set_number': setNumber,
        if (reps != null) 'reps': reps,
        if (weightKg != null) 'weight_kg': weightKg,
        'bodyweight': bodyweight,
      },
    );
    return WorkoutSet.fromJson(response.data as Map<String, dynamic>);
  }

  // Removes a mistakenly logged set.
  // external: DELETE /api/v1/sessions/:sessionId/sets/:setId
  Future<void> deleteSet(int sessionId, int setId) async {
    await _dio.delete('/sessions/$sessionId/sets/$setId');
  }

  // ── Exercises ─────────────────────────────────────────────────────────────

  // Returns all exercises with their muscle group mappings.
  // Used to populate the exercise picker on the log set screen.
  // external: GET /api/v1/exercises
  Future<List<Exercise>> getExercises() async {
    final response = await _dio.get('/exercises');
    return (response.data as List<dynamic>)
        .map((e) => Exercise.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // Creates a new custom exercise and links it to muscle groups.
  // muscleGroups should be a list of { id, role } maps.
  // external: POST /api/v1/exercises
  Future<Exercise> createExercise({
    required String name,
    required List<Map<String, dynamic>> muscleGroups,
  }) async {
    final response = await _dio.post(
      '/exercises',
      data: {'name': name, 'muscle_groups': muscleGroups},
    );
    return Exercise.fromJson(response.data as Map<String, dynamic>);
  }

  // ── Muscle Groups ─────────────────────────────────────────────────────────

  // Returns the full list of muscle groups.
  // Used when building the exercise creation form.
  // external: GET /api/v1/muscle-groups
  Future<List<MuscleGroup>> getMuscleGroups() async {
    final response = await _dio.get('/muscle-groups');
    return (response.data as List<dynamic>)
        .map((m) => MuscleGroup.fromJson(m as Map<String, dynamic>))
        .toList();
  }
}
