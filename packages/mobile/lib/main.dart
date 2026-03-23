// main.dart — Flutter application entry point.
// Wraps the app in a ProviderScope so Riverpod providers are available
// to the entire widget tree.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart'; // external: Riverpod state management
import 'app.dart';

void main() {
  // ProviderScope is required by Riverpod — it initialises the provider
  // container that all widgets read from via ref.watch / ref.read.
  runApp(const ProviderScope(child: BuffPenguinApp()));
}
