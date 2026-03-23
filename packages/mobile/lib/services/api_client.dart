import 'package:dio/dio.dart';
import '../models/workout_session.dart';
import '../models/workout_set.dart';
import '../models/exercise.dart';
import '../models/muscle_group.dart';

class ApiClient {
  late final Dio _dio;

  ApiClient(String baseUrl) {
    _dio = Dio(BaseOptions(
      baseUrl: '$baseUrl/api/v1',
      connectTimeout: const Duration(seconds: 5),
      receiveTimeout: const Duration(seconds: 10),
    ));
  }

  Future<bool> checkHealth(String baseUrl) async {
    try {
      final response = await Dio().get(
        '$baseUrl/health',
        options: Options(receiveTimeout: const Duration(seconds: 3)),
      );
      return response.data['status'] == 'ok';
    } catch (_) {
      return false;
    }
  }

  // Sessions
  Future<WorkoutSession> startSession() async {
    final response = await _dio.post('/sessions');
    return WorkoutSession.fromJson(response.data as Map<String, dynamic>);
  }

  Future<WorkoutSession> endSession(int id, {String? notes}) async {
    final response = await _dio.patch(
      '/sessions/$id',
      data: {
        'ended_at': DateTime.now().millisecondsSinceEpoch ~/ 1000,
        if (notes != null) 'notes': notes,
      },
    );
    return WorkoutSession.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<WorkoutSession>> getSessions({int limit = 20, int offset = 0}) async {
    final response = await _dio.get(
      '/sessions',
      queryParameters: {'limit': limit, 'offset': offset},
    );
    return (response.data as List<dynamic>)
        .map((s) => WorkoutSession.fromJson(s as Map<String, dynamic>))
        .toList();
  }

  Future<WorkoutSession> getSession(int id) async {
    final response = await _dio.get('/sessions/$id');
    return WorkoutSession.fromJson(response.data as Map<String, dynamic>);
  }

  // Sets
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

  Future<void> deleteSet(int sessionId, int setId) async {
    await _dio.delete('/sessions/$sessionId/sets/$setId');
  }

  // Exercises
  Future<List<Exercise>> getExercises() async {
    final response = await _dio.get('/exercises');
    return (response.data as List<dynamic>)
        .map((e) => Exercise.fromJson(e as Map<String, dynamic>))
        .toList();
  }

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

  // Muscle groups
  Future<List<MuscleGroup>> getMuscleGroups() async {
    final response = await _dio.get('/muscle-groups');
    return (response.data as List<dynamic>)
        .map((m) => MuscleGroup.fromJson(m as Map<String, dynamic>))
        .toList();
  }
}
