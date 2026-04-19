import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme/tokens';

export function CollapsibleItemCard({
  title,
  subtitle,
  badge,
  expanded,
  onToggle,
  children
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
}>) {
  return (
    <View style={styles.card}>
      <Pressable onPress={onToggle} style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.rightWrap}>
          {badge}
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
        </View>
      </Pressable>
      {expanded ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.cardAlt,
    padding: spacing.md,
    gap: spacing.sm
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  headerTextWrap: {
    flex: 1,
    gap: 4
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800'
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  rightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0
  },
  content: {
    gap: spacing.sm,
    paddingTop: 4
  }
});
