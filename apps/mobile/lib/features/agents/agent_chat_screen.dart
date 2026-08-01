import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/models.dart';

/// Chat UI for a single AI co-worker agent. Non-streaming: the agent may
/// call tools (business metrics, tasks, knowledge base) before answering,
/// so the full reply arrives in one response — see the web app's
/// src/lib/anthropic.ts for why this trades streaming for real tool use.
class AgentChatScreen extends StatefulWidget {
  final Agent agent;
  const AgentChatScreen({super.key, required this.agent});

  @override
  State<AgentChatScreen> createState() => _AgentChatScreenState();
}

class _AgentChatScreenState extends State<AgentChatScreen> {
  final _messages = <ChatMessage>[];
  final _inputController = TextEditingController();
  final _scrollController = ScrollController();
  String? _conversationId;
  bool _busy = false;

  Future<void> _send() async {
    final text = _inputController.text.trim();
    if (text.isEmpty || _busy) return;
    _inputController.clear();

    setState(() {
      _messages.add(ChatMessage(role: 'user', content: text));
      _busy = true;
    });
    _scrollToBottom();

    try {
      final data = await ApiClient.instance.post('/api/ai/chat', {
        'agentSlug': widget.agent.slug,
        if (_conversationId != null) 'conversationId': _conversationId,
        'message': text,
      });
      _conversationId = data['conversationId'] as String?;
      final reply = data['reply'] as Map<String, dynamic>;
      final toolCalls = (reply['toolCalls'] as List<dynamic>? ?? [])
          .map((t) => ToolCall.fromJson(t as Map<String, dynamic>))
          .toList();
      setState(() {
        _messages.add(ChatMessage(
          role: 'assistant',
          content: reply['content'] as String? ?? '',
          toolCalls: toolCalls,
        ));
      });
    } on ApiException catch (e) {
      setState(() {
        _messages.add(ChatMessage(
          role: 'assistant',
          content: 'Terjadi kesalahan: ${e.message}',
        ));
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.agent.title)),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: _messages.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(
                          'Mulai percakapan dengan ${widget.agent.title}.',
                          textAlign: TextAlign.center,
                          style:
                              TextStyle(color: Colors.white.withValues(alpha: 0.5)),
                        ),
                      ),
                    )
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(16),
                      itemCount: _messages.length + (_busy ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (index == _messages.length) {
                          return Align(
                            alignment: Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 10),
                              decoration: BoxDecoration(
                                color: Colors.white10,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Text(
                                '${widget.agent.title} sedang berpikir...',
                                style: TextStyle(
                                    color:
                                        Colors.white.withValues(alpha: 0.5)),
                              ),
                            ),
                          );
                        }
                        final m = _messages[index];
                        final isUser = m.role == 'user';
                        return Align(
                          alignment: isUser
                              ? Alignment.centerRight
                              : Alignment.centerLeft,
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 10),
                            constraints: BoxConstraints(
                              maxWidth:
                                  MediaQuery.of(context).size.width * 0.8,
                            ),
                            decoration: BoxDecoration(
                              color: isUser
                                  ? const Color(0xFFF0B429)
                                  : Colors.white10,
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  m.content,
                                  style: TextStyle(
                                    color: isUser ? Colors.black : Colors.white,
                                  ),
                                ),
                                if (m.toolCalls.isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 6),
                                    child: Wrap(
                                      spacing: 6,
                                      runSpacing: 4,
                                      children: m.toolCalls
                                          .map((tc) => Chip(
                                                label: Text('🔧 ${tc.name}',
                                                    style: const TextStyle(
                                                        fontSize: 10)),
                                                visualDensity:
                                                    VisualDensity.compact,
                                                materialTapTargetSize:
                                                    MaterialTapTargetSize
                                                        .shrinkWrap,
                                              ))
                                          .toList(),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _inputController,
                      decoration: InputDecoration(
                          hintText: 'Tanya ${widget.agent.title}...'),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _busy ? null : _send,
                    icon: const Icon(Icons.send),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
