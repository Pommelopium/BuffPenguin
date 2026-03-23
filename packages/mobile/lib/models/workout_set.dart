class WorkoutSet {
  final int id;
  final int sessionId;
  final int exerciseId;
  final int setNumber;
  final int? reps;
  final double? weightKg;
  final bool bodyweight;
  final int loggedAt;

  const WorkoutSet({
    required this.id,
    required this.sessionId,
    required this.exerciseId,
    required this.setNumber,
    this.reps,
    this.weightKg,
    this.bodyweight = false,
    required this.loggedAt,
  });

  factory WorkoutSet.fromJson(Map<String, dynamic> json) => WorkoutSet(
        id: json['id'] as int,
        sessionId: json['session_id'] as int,
        exerciseId: json['exercise_id'] as int,
        setNumber: json['set_number'] as int,
        reps: json['reps'] as int?,
        weightKg: (json['weight_kg'] as num?)?.toDouble(),
        bodyweight: (json['bodyweight'] as int?) == 1,
        loggedAt: json['logged_at'] as int,
      );
}
