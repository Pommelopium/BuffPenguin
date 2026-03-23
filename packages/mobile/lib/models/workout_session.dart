import 'workout_set.dart';

class WorkoutSession {
  final int id;
  final int startedAt;
  final int? endedAt;
  final String? notes;
  final List<WorkoutSet> sets;

  const WorkoutSession({
    required this.id,
    required this.startedAt,
    this.endedAt,
    this.notes,
    this.sets = const [],
  });

  factory WorkoutSession.fromJson(Map<String, dynamic> json) => WorkoutSession(
        id: json['id'] as int,
        startedAt: json['started_at'] as int,
        endedAt: json['ended_at'] as int?,
        notes: json['notes'] as String?,
        sets: (json['sets'] as List<dynamic>?)
                ?.map((s) => WorkoutSet.fromJson(s as Map<String, dynamic>))
                .toList() ??
            [],
      );

  DateTime get startedAtDate =>
      DateTime.fromMillisecondsSinceEpoch(startedAt * 1000);

  bool get isActive => endedAt == null;
}
