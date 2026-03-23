import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../models/exercise.dart';
import '../models/workout_session.dart';
import '../providers/session_provider.dart';
import '../providers/server_provider.dart';
import '../providers/exercise_provider.dart';

class LogSetScreen extends ConsumerStatefulWidget {
  final int sessionId;
  const LogSetScreen({super.key, required this.sessionId});

  @override
  ConsumerState<LogSetScreen> createState() => _LogSetScreenState();
}

class _LogSetScreenState extends ConsumerState<LogSetScreen> {
  Exercise? _selectedExercise;
  final _repsController = TextEditingController();
  final _weightController = TextEditingController();
  bool _bodyweight = false;
  bool _isSaving = false;
  int _setCount = 0;
  final List<Map<String, dynamic>> _loggedSets = [];

  @override
  void dispose() {
    _repsController.dispose();
    _weightController.dispose();
    super.dispose();
  }

  Future<void> _logSet() async {
    if (_selectedExercise == null) return;
    final client = ref.read(apiClientProvider);
    if (client == null) return;

    setState(() => _isSaving = true);
    try {
      final set = await client.logSet(
        sessionId: widget.sessionId,
        exerciseId: _selectedExercise!.id,
        setNumber: _setCount + 1,
        reps: int.tryParse(_repsController.text),
        weightKg: double.tryParse(_weightController.text),
        bodyweight: _bodyweight,
      );
      setState(() {
        _setCount++;
        _loggedSets.add({
          'exercise': _selectedExercise!.name,
          'reps': set.reps,
          'weight': set.weightKg,
          'bodyweight': set.bodyweight,
        });
        _repsController.clear();
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to log set: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _finishSession() async {
    final client = ref.read(apiClientProvider);
    if (client == null) return;
    await client.endSession(widget.sessionId);
    ref.read(activeSessionProvider.notifier).state = null;
    ref.invalidate(sessionHistoryProvider);
    if (mounted) context.go('/home');
  }

  @override
  Widget build(BuildContext context) {
    final exercises = ref.watch(exerciseListProvider);

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: const Text('Log Sets', style: TextStyle(color: Colors.white)),
        actions: [
          TextButton(
            onPressed: _finishSession,
            child: const Text('Finish', style: TextStyle(color: Color(0xFF00FF88))),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Exercise picker
            exercises.when(
              loading: () => const CircularProgressIndicator(color: Colors.white),
              error: (e, _) => Text('$e', style: const TextStyle(color: Colors.redAccent)),
              data: (list) => DropdownButtonFormField<Exercise>(
                value: _selectedExercise,
                dropdownColor: Colors.grey[900],
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Exercise',
                  labelStyle: TextStyle(color: Colors.white54),
                  enabledBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: Colors.white24),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: Colors.white),
                  ),
                ),
                items: list.map((e) => DropdownMenuItem(
                  value: e,
                  child: Text(e.name),
                )).toList(),
                onChanged: (e) => setState(() => _selectedExercise = e),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _repsController,
                    keyboardType: TextInputType.number,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(
                      labelText: 'Reps',
                      labelStyle: TextStyle(color: Colors.white54),
                      enabledBorder: OutlineInputBorder(
                        borderSide: BorderSide(color: Colors.white24),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderSide: BorderSide(color: Colors.white),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _weightController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    style: const TextStyle(color: Colors.white),
                    enabled: !_bodyweight,
                    decoration: const InputDecoration(
                      labelText: 'Weight (kg)',
                      labelStyle: TextStyle(color: Colors.white54),
                      enabledBorder: OutlineInputBorder(
                        borderSide: BorderSide(color: Colors.white24),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderSide: BorderSide(color: Colors.white),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            Row(
              children: [
                Checkbox(
                  value: _bodyweight,
                  onChanged: (v) => setState(() {
                    _bodyweight = v ?? false;
                    if (_bodyweight) _weightController.clear();
                  }),
                  fillColor: WidgetStateProperty.all(Colors.white),
                  checkColor: Colors.black,
                ),
                const Text('Bodyweight', style: TextStyle(color: Colors.white)),
              ],
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: (_selectedExercise == null || _isSaving) ? null : _logSet,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00FF88),
                  foregroundColor: Colors.black,
                  textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                child: _isSaving
                    ? const CircularProgressIndicator(strokeWidth: 2)
                    : const Text('Log Set'),
              ),
            ),
            const SizedBox(height: 24),
            if (_loggedSets.isNotEmpty) ...[
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'This session',
                  style: TextStyle(color: Colors.white54, fontSize: 13),
                ),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: ListView.builder(
                  itemCount: _loggedSets.length,
                  itemBuilder: (context, i) {
                    final s = _loggedSets[_loggedSets.length - 1 - i];
                    final weight = s['bodyweight'] == true
                        ? 'BW'
                        : s['weight'] != null
                            ? '${s['weight']} kg'
                            : '—';
                    return ListTile(
                      dense: true,
                      title: Text(s['exercise'] as String,
                          style: const TextStyle(color: Colors.white)),
                      trailing: Text(
                        '${s['reps'] ?? '—'} reps × $weight',
                        style: const TextStyle(color: Colors.white54),
                      ),
                    );
                  },
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
