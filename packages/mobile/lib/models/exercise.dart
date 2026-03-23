import 'muscle_group.dart';

class ExerciseMuscleGroup {
  final int id;
  final String name;
  final String slug;
  final String role; // 'primary' | 'secondary'

  const ExerciseMuscleGroup({
    required this.id,
    required this.name,
    required this.slug,
    required this.role,
  });

  factory ExerciseMuscleGroup.fromJson(Map<String, dynamic> json) =>
      ExerciseMuscleGroup(
        id: json['id'] as int,
        name: json['name'] as String,
        slug: json['slug'] as String,
        role: json['role'] as String,
      );
}

class Exercise {
  final int id;
  final String name;
  final List<ExerciseMuscleGroup> muscleGroups;

  const Exercise({
    required this.id,
    required this.name,
    required this.muscleGroups,
  });

  factory Exercise.fromJson(Map<String, dynamic> json) => Exercise(
        id: json['id'] as int,
        name: json['name'] as String,
        muscleGroups: (json['muscleGroups'] as List<dynamic>)
            .map((e) => ExerciseMuscleGroup.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
