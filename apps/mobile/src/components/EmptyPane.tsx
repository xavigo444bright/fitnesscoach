import { colors, fontSize, space } from '@fitness-coach/ui';
import { StyleSheet, Text, View } from 'react-native';
import { useTr } from '../i18n';

type Props = {
  title: string;
  body: string;
};

export default function EmptyPane({ title, body }: Props) {
  const tr = useTr();
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{tr(title)}</Text>
      <Text style={styles.body}>{tr(body)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.display,
    fontWeight: '700',
    marginBottom: space.sm,
  },
  body: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    lineHeight: 24,
  },
});
