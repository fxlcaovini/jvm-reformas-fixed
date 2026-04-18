import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, spacing } from '@/theme/tokens';

export function Screen({ title, subtitle, children, contentContainerStyle }: PropsWithChildren<{ title: string; subtitle?: string; contentContainerStyle?: StyleProp<ViewStyle>; }>) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, contentContainerStyle]}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.md, paddingBottom: 120, paddingTop: spacing.md, gap: spacing.md },
  header: { gap: 6 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 }
});
