import 'package:flutter/foundation.dart';
import 'models.dart';
import 'api_client.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

/// App-wide auth state, exposed via Provider so any screen can read the
/// current user or trigger login/register/logout.
class AuthController extends ChangeNotifier {
  AppUser? user;
  AuthStatus status = AuthStatus.unknown;
  String? error;

  Future<void> bootstrap() async {
    final token = await ApiClient.instance.token;
    if (token == null) {
      status = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }
    try {
      final data = await ApiClient.instance.get('/api/auth/me');
      user = AppUser.fromJson(data['user'] as Map<String, dynamic>);
      status = AuthStatus.authenticated;
    } catch (_) {
      await ApiClient.instance.clearToken();
      status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    error = null;
    try {
      final data = await ApiClient.instance.post('/api/auth/login', {
        'email': email,
        'password': password,
      });
      await ApiClient.instance.setToken(data['token'] as String);
      user = AppUser.fromJson(data['user'] as Map<String, dynamic>);
      status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      error = e.message;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register(String name, String email, String password) async {
    error = null;
    try {
      final data = await ApiClient.instance.post('/api/auth/register', {
        'name': name,
        'email': email,
        'password': password,
      });
      await ApiClient.instance.setToken(data['token'] as String);
      user = AppUser.fromJson(data['user'] as Map<String, dynamic>);
      status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      error = e.message;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await ApiClient.instance.clearToken();
    user = null;
    status = AuthStatus.unauthenticated;
    notifyListeners();
  }
}
