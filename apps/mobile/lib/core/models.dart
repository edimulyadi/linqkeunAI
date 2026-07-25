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

class AiTool {
  final String id;
  final String code;
  final String slug;
  final String title;
  final String icon;
  final String description;
  final String kind;

  AiTool({
    required this.id,
    required this.code,
    required this.slug,
    required this.title,
    required this.icon,
    required this.description,
    required this.kind,
  });

  bool get isChat => kind == 'CHAT_ASSISTANT';
  bool get isLandingPage => kind == 'LANDING_PAGE';

  factory AiTool.fromJson(Map<String, dynamic> json) => AiTool(
        id: json['id'] as String,
        code: json['code'] as String,
        slug: json['slug'] as String,
        title: json['title'] as String,
        icon: (json['icon'] as String?) ?? 'bot',
        description: (json['description'] as String?) ?? '',
        kind: (json['kind'] as String?) ?? 'CONTENT_GENERATION',
      );
}

class AiCategory {
  final String id;
  final String title;
  final String? subtitle;
  final List<AiTool> tools;

  AiCategory({
    required this.id,
    required this.title,
    this.subtitle,
    required this.tools,
  });

  factory AiCategory.fromJson(Map<String, dynamic> json) => AiCategory(
        id: json['id'] as String,
        title: json['title'] as String,
        subtitle: json['subtitle'] as String?,
        tools: (json['tools'] as List<dynamic>? ?? [])
            .map((t) => AiTool.fromJson(t as Map<String, dynamic>))
            .toList(),
      );
}

class ChatMessage {
  final String role; // "user" | "assistant"
  String content;

  ChatMessage({required this.role, required this.content});
}
