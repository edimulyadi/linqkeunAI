import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/models.dart';
import '../tools/tool_runner_screen.dart';
import '../tools/chat_tool_screen.dart';

class ToolsListScreen extends StatefulWidget {
  const ToolsListScreen({super.key});

  @override
  State<ToolsListScreen> createState() => _ToolsListScreenState();
}

class _ToolsListScreenState extends State<ToolsListScreen> {
  late Future<List<AiCategory>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<AiCategory>> _load() async {
    final data = await ApiClient.instance.get('/api/tools');
    final categories = (data['categories'] as List<dynamic>)
        .map((c) => AiCategory.fromJson(c as Map<String, dynamic>))
        .toList();
    return categories;
  }

  Future<void> _refresh() async {
    setState(() => _future = _load());
    await _future;
  }

  void _openTool(AiTool tool) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) =>
            tool.isChat ? ChatToolScreen(tool: tool) : ToolRunnerScreen(tool: tool),
      ),
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
              TextSpan(text: 'linqkeun'),
              TextSpan(text: 'AI', style: TextStyle(color: Color(0xFFF0B429))),
            ],
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<AiCategory>>(
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
            final categories = snapshot.data ?? [];
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: categories.length,
              itemBuilder: (context, index) {
                final cat = categories[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(cat.title,
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(
                                  color: const Color(0xFFF0B429),
                                  fontWeight: FontWeight.bold)),
                      if (cat.subtitle != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 2, bottom: 8),
                          child: Text(
                            cat.subtitle!,
                            style: TextStyle(color: Colors.white.withValues(alpha: 0.5)),
                          ),
                        ),
                      ...cat.tools.map(
                        (tool) => Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: const Color(0x22F0B429),
                              child: Text(
                                tool.code,
                                style: const TextStyle(
                                    fontSize: 11, color: Color(0xFFF0B429)),
                              ),
                            ),
                            title: Text(tool.title,
                                style:
                                    const TextStyle(fontWeight: FontWeight.w600)),
                            subtitle: Text(
                              tool.description,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            onTap: () => _openTool(tool),
                          ),
                        ),
                      ),
                    ],
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
