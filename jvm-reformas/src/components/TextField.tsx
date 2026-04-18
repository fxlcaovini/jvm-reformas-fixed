import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';

export function TextField({ label, multiline, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        multiline={multiline}
        style={[styles.input, multiline ? styles.multiline : null]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { color: colors.text, fontWeight: '600' },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardAlt,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' }
});
