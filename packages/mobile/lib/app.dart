import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'screens/discovery_screen.dart';
import 'screens/home_screen.dart';
import 'screens/log_set_screen.dart';
import 'screens/history_screen.dart';
import 'screens/settings_screen.dart';

final _router = GoRouter(
  initialLocation: '/discover',
  routes: [
    GoRoute(
      path: '/discover',
      builder: (_, __) => const DiscoveryScreen(),
    ),
    GoRoute(
      path: '/home',
      builder: (_, __) => const HomeScreen(),
    ),
    GoRoute(
      path: '/log/:sessionId',
      builder: (_, state) => LogSetScreen(
        sessionId: int.parse(state.pathParameters['sessionId']!),
      ),
    ),
    GoRoute(
      path: '/history/:sessionId',
      builder: (_, state) => HistoryScreen(
        sessionId: int.parse(state.pathParameters['sessionId']!),
      ),
    ),
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
    return MaterialApp.router(
      title: 'BuffPenguin',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: Colors.black,
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF00FF88),
          surface: Color(0xFF111111),
        ),
      ),
      routerConfig: _router,
    );
  }
}
