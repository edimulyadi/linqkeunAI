import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/models.dart';

/// Runner UI for single-shot generation tools (CONTENT_GENERATION,
/// LANDING_PAGE, IMAGE_PROMPT) — a brief input on one side, streamed output
/// on the other.
class ToolRunnerScreen extends StatefulWidget {
  final AiTool tool;
  const ToolRunnerScreen({super.key, required this.tool});

  @override
  State<ToolRunnerScreen> createState() => _ToolRunnerScreenState();
}

class _ToolRunnerScreenState extends State<ToolRunnerScreen> {
  final _inputController = TextEditingController();
  String _output = '';
  bool _busy = false;
  String? _error;

  Future<void> _generate() async {
    if (_inputController.text.trim().isEmpty || _busy) return;
    setState(() {
      _busy = true;
      _output = '';
      _error = null;
    });
    try {
      await ApiClient.instance.streamPost(
        '/api/ai/generate',
        {'toolSlug': widget.tool.slug, 'input': _inputController.text.trim()},
        onChunk: (chunk) => setState(() => _output += chunk),
      );
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.tool.title)),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.tool.description,
                style: TextStyle(color: Colors.white.withValues(alpha: 0.6)),
              ),
              const SizedBox(height: 16),
              Text('Brief / masukan Anda',
                  style: Theme.of(context).textTheme.labelLarge),
              const SizedBox(height: 8),
              TextField(
                controller: _inputController,
                maxLines: 5,
                decoration: const InputDecoration(
                  hintText:
                      'Jelaskan produk, target audiens, dan tujuan Anda...',
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _busy ? null : _generate,
                  child: Text(_busy ? 'Membuat...' : 'Buat Sekarang'),
                ),
              ),
              const SizedBox(height: 20),
              Text('Hasil', style: Theme.of(context).textTheme.labelLarge),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                constraints: const BoxConstraints(minHeight: 160),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF0B0B0C),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white12),
                ),
                child: SelectableText(
                  _error != null
                      ? 'Terjadi kesalahan: $_error'
                      : (_output.isEmpty
                          ? 'Hasil akan muncul di sini.'
                          : _output),
                  style: TextStyle(
                    color: _error != null ? Colors.redAccent : Colors.white70,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
