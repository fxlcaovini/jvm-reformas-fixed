import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme/tokens';
import { money } from '@/utils/format';

export function SummaryChart({ entries }: { entries: Array<{ label: string; value: number; color?: string }> }) {
  const max = Math.max(...entries.map((item) => item.value), 1);

  return (
    <View style={styles.wrap}>
      {entries.map((entry) => (
        <View key={entry.label} style={styles.row}>
          <View style={styles.labels}>
            <Text style={styles.label}>{entry.label}</Text>
            <Text style={styles.value}>{money(entry.value)}</Text>
          </View>
          <View style={styles.barBg}>
            <View style={[styles.bar, { width: `${(entry.value / max) * 100}%`, backgroundColor: entry.color ?? colors.primary }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { gap: 6 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  label: { color: colors.text, fontWeight: '600' },
  value: { color: colors.muted },
  barBg: { height: 10, backgroundColor: colors.cardAlt, borderRadius: 999, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 999 }
});
