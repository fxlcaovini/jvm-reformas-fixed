import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';

export function PrimaryButton({ label, onPress, variant = 'solid' }: { label: string; onPress: () => void; variant?: 'solid' | 'ghost' | 'danger'; }) {
  const backgroundColor = variant === 'solid' ? colors.primary : variant === 'danger' ? colors.danger : 'transparent';
  const borderColor = variant === 'ghost' ? colors.border : 'transparent';
  const textColor = variant === 'ghost' ? colors.text : 'white';

  return (
    <Pressable onPress={onPress} style={[styles.button, { backgroundColor, borderColor }]}> 
      <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    minWidth: 110,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  label: { fontSize: 14, fontWeight: '700' }
});
