import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';

export function StatCard({ label, value, accent = colors.primary }: { label: string; value: string; accent?: string }) {
  return (
    <View style={[styles.card, { borderLeftColor: accent }]}> 
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: 150,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.md,
    gap: 4,
    minWidth: 140
  },
  label: { color: colors.muted, fontSize: 13 },
  value: { color: colors.text, fontWeight: '800', fontSize: 20 }
});
