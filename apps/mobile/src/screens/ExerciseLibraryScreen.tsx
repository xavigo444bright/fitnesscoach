/**
 * PG-001 动作库：按部位分区；coachable / catalog 分层（FR-001）
 */
import {
  BODY_PART_LABEL,
  BODY_PART_ORDER,
  catalogByBodyPart,
  EQUIPMENT_LABEL,
  type ExerciseCatalogEntry,
} from '@fitness-coach/core';
import { colors, fontSize, space } from '@fitness-coach/ui';
import { StatusBar } from 'expo-status-bar';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ExerciseCard from '../components/ExerciseCard';

type Props = {
  onSelectExercise: (id: string) => void;
  onOpenDevPose?: () => void;
  /** 嵌在首页「动作」段时藏掉重复大标题 */
  embedded?: boolean;
  contentBottomInset?: number;
};

const CAMERA_HINT_LABEL: Record<string, string> = {
  side: '侧面机位',
  front: '正面机位',
};

function cardSubtitle(e: ExerciseCatalogEntry): string {
  const cam = CAMERA_HINT_LABEL[e.cameraHint] ?? e.cameraHint;
  const eq = EQUIPMENT_LABEL[e.equipment];
  if (e.tier === 'catalog') return `${eq} · ${cam} · 即将支持`;
  return `${eq} · ${cam}`;
}

export default function ExerciseLibraryScreen({
  onSelectExercise,
  onOpenDevPose,
  embedded = false,
  contentBottomInset,
}: Props) {
  const byPart = catalogByBodyPart();

  return (
    <View
      style={[
        styles.root,
        embedded && styles.rootEmbedded,
        contentBottomInset != null && { paddingBottom: contentBottomInset },
      ]}
    >
      {embedded ? null : (
        <>
          <Text style={styles.title}>健身教练</Text>
          <Text style={styles.sub}>自用 Dev Client · 语音默认开</Text>
        </>
      )}
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {BODY_PART_ORDER.map((part) => {
          const items = byPart[part];
          if (!items.length) return null;
          return (
            <View key={part} style={styles.section}>
              <Text style={styles.sectionTitle}>{BODY_PART_LABEL[part]}</Text>
              {items.map((e) => (
                <ExerciseCard
                  key={e.id}
                  name={e.name}
                  bodyPart={BODY_PART_LABEL[e.bodyPart]}
                  cameraHint={cardSubtitle(e)}
                  onPress={() => onSelectExercise(e.id)}
                />
              ))}
            </View>
          );
        })}
        <Text style={styles.privacy}>
          姿态在本机分析，视频不上传（详见隐私说明）
        </Text>
      </ScrollView>
      {onOpenDevPose ? (
        <Pressable style={styles.devLink} onPress={onOpenDevPose}>
          <Text style={styles.devLinkText}>调试姿态（DevPose）</Text>
        </Pressable>
      ) : null}
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.md,
    paddingTop: 56,
    paddingBottom: 24,
  },
  rootEmbedded: {
    paddingHorizontal: 0,
    paddingTop: space.sm,
    paddingBottom: 0,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.title,
    fontWeight: '800',
    marginBottom: 4,
  },
  sub: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    marginBottom: space.md,
  },
  list: {
    paddingBottom: space.lg,
    gap: space.sm,
  },
  section: {
    marginBottom: space.md,
    gap: space.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: '700',
    marginBottom: 4,
  },
  privacy: {
    color: colors.textSecondary,
    fontSize: fontSize.caption,
    marginTop: space.md,
    lineHeight: 18,
  },
  devLink: {
    paddingVertical: space.sm,
    alignItems: 'center',
  },
  devLinkText: {
    color: colors.primary,
    fontSize: fontSize.caption,
  },
});
