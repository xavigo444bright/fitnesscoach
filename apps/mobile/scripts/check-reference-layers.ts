/**
 * T9-2/T9-3 自检：脚点能画；小窗人跟人；AABB 居中且髋对齐；肌群体积可分色。
 *   pnpm --filter @fitness-coach/mobile check:reference
 */
import {
  LandmarkIndex,
  buildSquatPose,
  getDemoTrajectory,
  type Pose,
} from '@fitness-coach/core';
import {
  DRAW_VISIBILITY_THRESHOLD,
  filterByVisibility,
} from '@fitness-coach/pose-native';
import {
  aabbFromRig,
  buildRig3d,
  buildSkeletonScene,
  canonicalPoseFromTrajectory,
  canonicalPoseFromUser,
  fitAabbToPixelRect,
  mapSkeletonToPip,
  mapToPipPx,
  muscleEmphasisFor,
  pipVolumesToPaint,
} from '@fitness-coach/render';
import { muscleFill } from '@fitness-coach/ui';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const fail = (msg: string): never => {
  console.error('[check-reference] FAIL', msg);
  process.exit(1);
  throw new Error(msg);
};

const PIP_W = 132;
const PIP_H = 220;

function assertSampleClips(): void {
  const labels = (
    [
      ['squat', 'side'],
      ['squat', 'front'],
      ['pushup', 'side'],
      ['pushup', 'front'],
    ] as const
  ).map(([exerciseId, camera]) => {
    const label = getDemoTrajectory(exerciseId, camera).source.label;
    if (!label) fail(`trajectory source.label missing ${exerciseId}/${camera}`);
    return label;
  });
  const dirs = [
    join(process.cwd(), 'assets/samples'),
    join(process.cwd(), 'apps/mobile/assets/samples'),
  ];
  const dir = dirs.find((d) => existsSync(join(d, labels[0]!)));
  if (!dir) fail(`sample clips missing (${labels[0]})`);
  for (const name of labels) {
    const p = join(dir, name);
    if (!existsSync(p)) fail(`reference original clip missing ${p}`);
    const bytes = statSync(p).size;
    if (bytes < 50_000) fail(`sample clip too small ${name} ${bytes}`);
  }
}

function hipOf(pose: Pose) {
  return pose[LandmarkIndex.LeftHip] ?? pose[LandmarkIndex.RightHip];
}

function kneeOf(pose: Pose) {
  return pose[LandmarkIndex.LeftKnee] ?? pose[LandmarkIndex.RightKnee];
}

function ankleOf(pose: Pose) {
  return pose[LandmarkIndex.LeftAnkle] ?? pose[LandmarkIndex.RightAnkle];
}

function compactness(pose: Pose): number {
  const hip = hipOf(pose);
  const knee = kneeOf(pose);
  const ankle = ankleOf(pose);
  if (!hip || !knee || !ankle) fail('compactness missing hip/knee/ankle');
  return Math.abs(knee.x - hip.x) / Math.max(1e-6, ankle.y - hip.y);
}

function assertFeetDrawable(): void {
  const pose: Pose = [];
  pose[LandmarkIndex.LeftKnee] = { x: 0.4, y: 0.7, visibility: 0.95 };
  pose[LandmarkIndex.RightKnee] = { x: 0.6, y: 0.7, visibility: 0.95 };
  pose[LandmarkIndex.LeftAnkle] = { x: 0.41, y: 0.88, visibility: 0.3 };
  pose[LandmarkIndex.RightAnkle] = { x: 0.59, y: 0.88, visibility: 0.3 };
  pose[LandmarkIndex.LeftHeel] = { x: 0.4, y: 0.92, visibility: 0.28 };
  pose[LandmarkIndex.RightHeel] = { x: 0.6, y: 0.92, visibility: 0.28 };
  pose[LandmarkIndex.LeftFootIndex] = { x: 0.46, y: 0.9, visibility: 0.26 };
  pose[LandmarkIndex.RightFootIndex] = { x: 0.54, y: 0.9, visibility: 0.26 };

  const forRules = filterByVisibility(pose);
  const forDraw = filterByVisibility(pose, DRAW_VISIBILITY_THRESHOLD);
  if (forRules[LandmarkIndex.LeftAnkle]) {
    fail('validate should drop vis 0.3 ankle');
  }
  if (!forDraw[LandmarkIndex.LeftAnkle] || !forDraw[LandmarkIndex.LeftFootIndex]) {
    fail('draw should keep vis 0.3 ankle/toe');
  }

  const scene = buildSkeletonScene(forDraw);
  const ankle = scene.joints.find((j) => j.index === LandmarkIndex.LeftAnkle);
  if (!ankle) fail('draw scene missing ankle joint');
  if (ankle.x !== 0.41 || ankle.y !== 0.88) {
    fail(`ankle not aligned to pose ${ankle.x},${ankle.y}`);
  }
  if (
    !scene.bones.some(
      (b) =>
        b.from === LandmarkIndex.LeftKnee &&
        b.to === LandmarkIndex.LeftAnkle,
    )
  ) {
    fail('missing shin bone');
  }
  if (
    !scene.bones.some(
      (b) =>
        b.from === LandmarkIndex.LeftAnkle &&
        b.to === LandmarkIndex.LeftFootIndex,
    )
  ) {
    fail('missing foot bone');
  }
}

function main(): void {
  assertSampleClips();
  assertFeetDrawable();

  const userStand = buildSquatPose({ kneeDeg: 170, torsoLeanDeg: 18 });
  const userBottom = buildSquatPose({ kneeDeg: 90, torsoLeanDeg: 28 });
  const stand = canonicalPoseFromUser(userStand, {
    cameraHint: 'side',
    exerciseId: 'squat',
  });
  const bottom = canonicalPoseFromUser(userBottom, {
    cameraHint: 'side',
    exerciseId: 'squat',
  });
  if (!stand || !bottom) fail('canonical user pose null');

  const sampleStand = canonicalPoseFromTrajectory(
    'squat',
    userBottom,
    'stand',
    175,
  );
  if (!sampleStand) fail('sample stand null');
  const userC = compactness(userBottom);
  const pipC = compactness(bottom);
  const sampleC = compactness(sampleStand);
  if (userC < 0.5) fail(`user squat fold too small ${userC}`);
  if (Math.abs(pipC - userC) > 0.08) {
    fail(`pip compactness ${pipC} != user ${userC}`);
  }
  if (Math.abs(sampleC - userC) < 0.4) {
    fail(`sample stand compactness ${sampleC} too close to user ${userC}`);
  }

  const standHip = hipOf(stand);
  const bottomHip = hipOf(bottom);
  if (!standHip || !bottomHip) fail('missing hip');

  const standRig = buildRig3d(stand, {
    cameraHint: 'side',
    exerciseId: 'squat',
  });
  if (!standRig) fail('stand rig null');
  const standKinds = new Set(standRig.volumes.map((v) => v.kind));
  if (!standKinds.has('chest') || !standKinds.has('pelvis') || !standKinds.has('thigh')) {
    fail(`missing muscle volumes ${[...standKinds].join(',')}`);
  }
  if (muscleEmphasisFor('pelvis', 'squat') !== 'active') fail('squat pelvis not active');
  if (muscleEmphasisFor('thigh', 'squat') !== 'active') fail('squat thigh not active');
  if (muscleEmphasisFor('chest', 'squat') !== 'rest') fail('squat chest should rest');
  if (muscleEmphasisFor('chest', 'pushup') !== 'active') fail('pushup chest not active');
  if (muscleEmphasisFor('thigh', 'pushup') !== 'rest') fail('pushup thigh should rest');
  const chestFill = muscleFill('chest', 'active');
  const pelvisFill = muscleFill('pelvis', 'active');
  const thighFill = muscleFill('thigh', 'active');
  if (chestFill === pelvisFill || pelvisFill === thighFill || thighFill === chestFill) {
    fail('muscle fills must differ for chest/pelvis/thigh');
  }
  if (muscleFill('chest', 'rest') !== muscleFill('head', 'rest')) {
    fail('rest volumes should share gray fill');
  }
  const painted = pipVolumesToPaint(standRig.volumes, {
    exerciseId: 'squat',
    cameraHint: 'side',
    pose: stand,
  });
  const paintedThighs = painted.filter((p) => p.volume.kind === 'thigh');
  if (paintedThighs.length > 1) {
    fail(`side view stacked thighs ${paintedThighs.length}`);
  }
  if (standRig.volumes.length < 3) fail(`volumes ${standRig.volumes.length}`);
  const box = aabbFromRig(standRig);
  if (!box) fail('aabb null');
  const fit = fitAabbToPixelRect(box, PIP_W, PIP_H);
  const a = mapToPipPx(box.minX, box.minY, fit);
  const b = mapToPipPx(box.maxX, box.maxY, fit);
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  if (cx < PIP_W / 2 - 6 || cx > PIP_W / 2 + 6) {
    fail(`pip center x ${cx}`);
  }
  if (cy < PIP_H / 2 - 6 || cy > PIP_H / 2 + 6) {
    fail(`pip center y ${cy}`);
  }
  if (minX < 2 || maxX > PIP_W - 2 || minY < 2 || maxY > PIP_H - 2) {
    fail(`pip clip ${minX},${minY} ${maxX},${maxY}`);
  }

  const hipPx = mapToPipPx(standHip.x, standHip.y, fit);
  const sh = stand[LandmarkIndex.LeftShoulder] ?? stand[LandmarkIndex.RightShoulder];
  if (!sh) fail('missing shoulder');
  const shPx = mapToPipPx(sh.x, sh.y, fit);
  if (Math.abs(hipPx.x - cx) > 14) {
    fail(`hip not aligned to pip center x hip=${hipPx.x} cx=${cx}`);
  }
  if (shPx.y >= hipPx.y) fail(`head/shoulder should be above hip ${shPx.y} ${hipPx.y}`);

  const bottomRig = buildRig3d(bottom, {
    cameraHint: 'side',
    exerciseId: 'squat',
  });
  if (!bottomRig) fail('bottom rig null');
  const standKnee = kneeOf(stand);
  const bottomKnee = kneeOf(bottom);
  if (!standKnee || !bottomKnee) fail('missing knee');
  const bottomFit = fitAabbToPixelRect(aabbFromRig(bottomRig)!, PIP_W, PIP_H);
  const standHipPx = mapToPipPx(standHip.x, standHip.y, fit);
  const bottomHipPx = mapToPipPx(bottomHip.x, bottomHip.y, bottomFit);
  const standKneePx = mapToPipPx(standKnee.x, standKnee.y, fit);
  const bottomKneePx = mapToPipPx(bottomKnee.x, bottomKnee.y, bottomFit);
  const legDelta = Math.hypot(
    standKneePx.x - standHipPx.x - (bottomKneePx.x - bottomHipPx.x),
    standKneePx.y - standHipPx.y - (bottomKneePx.y - bottomHipPx.y),
  );
  if (legDelta < 8) fail(`pip leg vector delta ${legDelta}`);

  const pipSkel = mapSkeletonToPip(buildSkeletonScene(stand), fit);
  if (pipSkel.bones.length < 8) fail(`pip skeleton bones ${pipSkel.bones.length}`);
  for (const j of pipSkel.joints) {
    if (j.x < 2 || j.x > PIP_W - 2 || j.y < 2 || j.y > PIP_H - 2) {
      fail(`pip skeleton joint out ${j.index} ${j.x},${j.y}`);
    }
  }

  console.log('[check-reference] OK', {
    pipCenter: { x: +cx.toFixed(1), y: +cy.toFixed(1) },
    hipPx: { x: +hipPx.x.toFixed(1), y: +hipPx.y.toFixed(1) },
    pipSkelBones: pipSkel.bones.length,
    legDelta: +legDelta.toFixed(1),
    compactness: { user: +userC.toFixed(3), pip: +pipC.toFixed(3) },
  });
}

main();
