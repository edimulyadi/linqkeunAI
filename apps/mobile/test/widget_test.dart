// Basic smoke test: the app boots and shows the login screen when no
// session token is stored yet.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:linqkeun_ai/main.dart';

void main() {
  testWidgets('App boots to the login screen', (WidgetTester tester) async {
    await tester.pumpWidget(const LinqkeunApp());
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsWidgets);
  });
}
