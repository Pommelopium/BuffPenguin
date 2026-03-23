class MuscleGroup {
  final int id;
  final String name;
  final String slug;

  const MuscleGroup({required this.id, required this.name, required this.slug});

  factory MuscleGroup.fromJson(Map<String, dynamic> json) => MuscleGroup(
        id: json['id'] as int,
        name: json['name'] as String,
        slug: json['slug'] as String,
      );
}
