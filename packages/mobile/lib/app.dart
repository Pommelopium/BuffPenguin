// app.dart — Root application widget and route configuration.
// Defines the URL-based navigation structure using GoRouter and applies
// the global dark theme optimised for gym use (high contrast, large targets).

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart'; // external: GoRouter declarative routing package
import 'screens/discovery_screen.dart';
import 'screens/home_screen.dart';
import 'screens/log_set_screen.dart';
import 'screens/history_screen.dart';
import 'screens/settings_screen.dart';

// Route table. The app always starts at /discover so server lookup runs
// before any data-dependent screen is shown.
final _router = GoRouter(
  initialLocation: '/discover',
  routes: [
    // /discover — shown until the backend is located on the local network
    GoRoute(
      path: '/discover',
      builder: (_, __) => const DiscoveryScreen(),
    ),
    // /home — session start button and recent session history list
    GoRoute(
      path: '/home',
      builder: (_, __) => const HomeScreen(),
    ),
    // /log/:sessionId — active workout logging screen for a specific session
    GoRoute(
      path: '/log/:sessionId',
      builder: (_, state) => LogSetScreen(
        sessionId: int.parse(state.pathParameters['sessionId']!),
      ),
    ),
    // /history/:sessionId — read-only detail view of a completed session
    GoRoute(
      path: '/history/:sessionId',
      builder: (_, state) => HistoryScreen(
        sessionId: int.parse(state.pathParameters['sessionId']!),
      ),
    ),
    // /settings — manual server URL override and connection status
    GoRoute(
      path: '/settings',
      builder: (_, __) => const SettingsScreen(),
    ),
  ],
);

class BuffPenguinApp extends StatelessWidget {
  const BuffPenguinApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router( // external: Flutter MaterialApp with GoRouter integration
      title: 'BuffPenguin',
      debugShowCheckedModeBanner: false,
      // Dark theme with a bright green primary accent — mirrors the "today"
      // freshness colour and provides strong contrast for gym lighting.
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: Colors.black,
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF00FF88),  // bright green — matches .muscle-region.today
          surface: Color(0xFF111111),
        ),
      ),
      routerConfig: _router,
    );
  }
}
