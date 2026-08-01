class AppUser {
  final String id;
  final String name;
  final String email;
  final String role;

  AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as String,
        name: json['name'] as String,
        email: json['email'] as String,
        role: (json['role'] as String?) ?? 'USER',
      );
}

/// One AI co-worker (CEO, Finance, HR, Marketing, Operations, or a custom
/// role an admin defines).
class Agent {
  final String id;
  final String slug;
  final String name;
  final String roleType;
  final String title;
  final String description;
  final String avatarIcon;
  final String color;
  final List<String> skills;

  Agent({
    required this.id,
    required this.slug,
    required this.name,
    required this.roleType,
    required this.title,
    required this.description,
    required this.avatarIcon,
    required this.color,
    required this.skills,
  });

  bool get isCeo => roleType == 'CEO';

  factory Agent.fromJson(Map<String, dynamic> json) => Agent(
        id: json['id'] as String,
        slug: json['slug'] as String,
        name: json['name'] as String,
        roleType: (json['roleType'] as String?) ?? 'CUSTOM',
        title: json['title'] as String,
        description: (json['description'] as String?) ?? '',
        avatarIcon: (json['avatarIcon'] as String?) ?? 'bot',
        color: (json['color'] as String?) ?? '#F0B429',
        skills: (json['skills'] as List<dynamic>? ?? [])
            .map((s) => s.toString())
            .toList(),
      );
}

class ToolCall {
  final String name;
  final String result;

  ToolCall({required this.name, required this.result});

  factory ToolCall.fromJson(Map<String, dynamic> json) => ToolCall(
        name: json['name'] as String,
        result: (json['result'] as String?) ?? '',
      );
}

class ChatMessage {
  final String role; // "user" | "assistant"
  String content;
  List<ToolCall> toolCalls;
  bool pending;

  ChatMessage({
    required this.role,
    required this.content,
    this.toolCalls = const [],
    this.pending = false,
  });
}
