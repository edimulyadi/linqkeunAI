import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/models.dart';
import '../agents/agent_chat_screen.dart';

class AgentsListScreen extends StatefulWidget {
  const AgentsListScreen({super.key});

  @override
  State<AgentsListScreen> createState() => _AgentsListScreenState();
}

class _AgentsListScreenState extends State<AgentsListScreen> {
  late Future<List<Agent>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<Agent>> _load() async {
    final data = await ApiClient.instance.get('/api/agents');
    return (data['agents'] as List<dynamic>)
        .map((a) => Agent.fromJson(a as Map<String, dynamic>))
        .toList();
  }

  Future<void> _refresh() async {
    setState(() => _future = _load());
    await _future;
  }

  void _openAgent(Agent agent) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => AgentChatScreen(agent: agent)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: RichText(
          text: const TextSpan(
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
            children: [
              TextSpan(text: 'Linqkeun'),
              TextSpan(text: 'AI', style: TextStyle(color: Color(0xFFF0B429))),
            ],
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<Agent>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return ListView(
                children: [
                  const SizedBox(height: 120),
                  Center(child: Text('Gagal memuat: ${snapshot.error}')),
                ],
              );
            }
            final agents = snapshot.data ?? [];
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: agents.length,
              itemBuilder: (context, index) {
                final agent = agents[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: const Color(0x22F0B429),
                      child: Text(
                        agent.name.substring(0, 2).toUpperCase(),
                        style: const TextStyle(
                            fontSize: 12, color: Color(0xFFF0B429)),
                      ),
                    ),
                    title: Text(agent.title,
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(
                      agent.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    onTap: () => _openAgent(agent),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
