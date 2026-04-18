import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';

export function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 }
});
