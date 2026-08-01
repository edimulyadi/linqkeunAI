import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Base URL of the linqkeunAI backend (the Next.js app). Override at build
/// time with:
///   flutter run --dart-define=API_BASE_URL=https://api.linqkeun.ai
const String _defaultBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://localhost:3000',
);

/// Android emulators can't reach the host machine via `localhost` — they
/// need the special alias `10.0.2.2`. iOS simulators and real devices (with
/// an explicit API_BASE_URL) don't need this rewrite.
String _resolveBaseUrl() {
  if (_defaultBaseUrl.contains('localhost') &&
      !kIsWeb &&
      defaultTargetPlatform == TargetPlatform.android) {
    return _defaultBaseUrl.replaceFirst('localhost', '10.0.2.2');
  }
  return _defaultBaseUrl;
}

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);

  @override
  String toString() => message;
}

/// Thin REST client for the linqkeunAI API. Holds the auth token in secure
/// storage and attaches it as a Bearer header on every request.
class ApiClient {
  ApiClient._internal();
  static final ApiClient instance = ApiClient._internal();

  final String baseUrl = _resolveBaseUrl();
  final _storage = const FlutterSecureStorage();
  static const _tokenKey = 'linqkeun_token';

  String? _cachedToken;

  Future<String?> get token async {
    _cachedToken ??= await _storage.read(key: _tokenKey);
    return _cachedToken;
  }

  Future<void> setToken(String token) async {
    _cachedToken = token;
    await _storage.write(key: _tokenKey, value: token);
  }

  Future<void> clearToken() async {
    _cachedToken = null;
    await _storage.delete(key: _tokenKey);
  }

  Future<Map<String, String>> _headers({bool json = true}) async {
    final t = await token;
    return {
      if (json) 'Content-Type': 'application/json',
      if (t != null) 'Authorization': 'Bearer $t',
    };
  }

  Uri _uri(String path) => Uri.parse('$baseUrl$path');

  Future<dynamic> get(String path) async {
    final res = await http.get(_uri(path), headers: await _headers());
    return _decode(res);
  }

  Future<dynamic> post(String path, Map<String, dynamic> body) async {
    final res = await http.post(
      _uri(path),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    return _decode(res);
  }

  Future<dynamic> patch(String path, Map<String, dynamic> body) async {
    final res = await http.patch(
      _uri(path),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    return _decode(res);
  }

  dynamic _decode(http.Response res) {
    final isJson =
        res.headers['content-type']?.contains('application/json') ?? false;
    final decoded = isJson && res.body.isNotEmpty ? jsonDecode(res.body) : null;
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return decoded;
    }
    final message = (decoded is Map && decoded['error'] is String)
        ? decoded['error'] as String
        : 'Permintaan gagal (${res.statusCode})';
    throw ApiException(res.statusCode, message);
  }
}
