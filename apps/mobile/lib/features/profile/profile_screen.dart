import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/auth_controller.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(title: const Text('Profil')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 32,
                backgroundColor: const Color(0x22F0B429),
                child: Text(
                  (user?.name.isNotEmpty == true ? user!.name[0] : '?')
                      .toUpperCase(),
                  style: const TextStyle(
                    fontSize: 24,
                    color: Color(0xFFF0B429),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(user?.name ?? '-',
                  style: Theme.of(context).textTheme.titleLarge),
              Text(user?.email ?? '-',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.6))),
              if (user?.role == 'ADMIN')
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0x22F0B429),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text('Admin',
                        style: TextStyle(
                            color: Color(0xFFF0B429), fontSize: 12)),
                  ),
                ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => context.read<AuthController>().logout(),
                  icon: const Icon(Icons.logout),
                  label: const Text('Keluar'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
