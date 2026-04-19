import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';

export function SectionCard({ title, action, children }: PropsWithChildren<{ title?: string; action?: React.ReactNode }>) {
  return (
    <View style={styles.card}>
      {title ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {action ? <View style={styles.actionWrap}>{action}</View> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: 4
  },
  actionWrap: {
    minWidth: 150,
    flexGrow: 1
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', flexShrink: 1 }
});
