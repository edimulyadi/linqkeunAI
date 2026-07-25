import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/models.dart';

/// Chat UI for CHAT_ASSISTANT tools (customer-service bot, prompting
/// assistant, division specialists, etc).
class ChatToolScreen extends StatefulWidget {
  final AiTool tool;
  const ChatToolScreen({super.key, required this.tool});

  @override
  State<ChatToolScreen> createState() => _ChatToolScreenState();
}

class _ChatToolScreenState extends State<ChatToolScreen> {
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
      _messages.add(ChatMessage(role: 'assistant', content: ''));
      _busy = true;
    });
    _scrollToBottom();

    try {
      final headers = await ApiClient.instance.streamPost(
        '/api/ai/chat',
        {
          'toolSlug': widget.tool.slug,
          if (_conversationId != null) 'conversationId': _conversationId,
          'message': text,
        },
        onChunk: (chunk) {
          setState(() {
            _messages.last.content += chunk;
          });
          _scrollToBottom();
        },
      );
      _conversationId ??= headers['x-conversation-id'];
    } on ApiException catch (e) {
      setState(() {
        _messages.last.content = 'Terjadi kesalahan: ${e.message}';
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
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
      appBar: AppBar(title: Text(widget.tool.title)),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: _messages.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(
                          'Mulai percakapan dengan ${widget.tool.title}.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.5)),
                        ),
                      ),
                    )
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(16),
                      itemCount: _messages.length,
                      itemBuilder: (context, index) {
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
                            child: Text(
                              m.content.isEmpty ? '...' : m.content,
                              style: TextStyle(
                                color: isUser ? Colors.black : Colors.white,
                              ),
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
                      decoration: const InputDecoration(hintText: 'Tulis pesan...'),
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
