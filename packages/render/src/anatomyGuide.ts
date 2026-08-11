/**
 * 丰满 2D 解剖引导路径（FR-068 A 方案）
 * 由对齐后的 Pose 生成 spine / head / limb / hip，不依赖片源脸点。
 */

import { LandmarkIndex, type Pose, type ValidationStatus } from "@fitness-coach/core";
import { buildSkeletonScene } from "./buildSkeleton.js";
import type { GuidePath, GuidePoint, SkeletonScene } from "./types.js";

function mid(
  a: { x: number; y: number } | undefined,
  b: { x: number; y: number } | undefined,
): GuidePoint | null {
  if (a && b) return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  if (a) return { x: a.x, y: a.y };
  if (b) return { x: b.x, y: b.y };
  return null;
}

function dist(a: GuidePoint, b: GuidePoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** 二次贝塞尔离散 */
function quadBezier(
  p0: GuidePoint,
  p1: GuidePoint,
  p2: GuidePoint,
  segments = 8,
): GuidePoint[] {
  const out: GuidePoint[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const u = 1 - t;
    out.push({
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
    });
  }
  return out;
}

/** 椭圆轮廓（闭合折线） */
function ellipsePath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  segments = 16,
): GuidePoint[] {
  const out: GuidePoint[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * Math.PI * 2;
    out.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return out;
}

function chain(
  pose: Pose,
  indexes: number[],
): GuidePoint[] | null {
  const pts: GuidePoint[] = [];
  for (const i of indexes) {
    const lm = pose[i];
    if (!lm) return null;
    pts.push({ x: lm.x, y: lm.y });
  }
  return pts;
}

function buildSpine(pose: Pose): GuidePath | null {
  const sh = mid(
    pose[LandmarkIndex.LeftShoulder],
    pose[LandmarkIndex.RightShoulder],
  );
  const hip = mid(pose[LandmarkIndex.LeftHip], pose[LandmarkIndex.RightHip]);
  if (!sh || !hip) return null;
  const dx = hip.x - sh.x;
  const dy = hip.y - sh.y;
  const len = Math.hypot(dx, dy) || 1;
  // 垂直于肩→髋方向微弓（侧视像背弓，正视接近中线）
  const nx = -dy / len;
  const ny = dx / len;
  const bow = Math.min(0.04, len * 0.12);
  const ctrl: GuidePoint = {
    x: (sh.x + hip.x) / 2 + nx * bow,
    y: (sh.y + hip.y) / 2 + ny * bow,
  };
  return {
    id: "spine",
    kind: "spine",
    points: quadBezier(sh, ctrl, hip, 10),
    strokeWidth: 0.014,
  };
}

/**
 * 头轮廓：用肩宽在颈上方合成椭圆（不依赖鼻/耳，避免片源脸点噪声）。
 */
function buildHead(pose: Pose): GuidePath | null {
  const ls = pose[LandmarkIndex.LeftShoulder];
  const rs = pose[LandmarkIndex.RightShoulder];
  const sh = mid(ls, rs);
  const hip = mid(pose[LandmarkIndex.LeftHip], pose[LandmarkIndex.RightHip]);
  if (!sh || !ls || !rs) return null;
  const shW = Math.abs(ls.x - rs.x);
  const rx = Math.max(0.035, Math.min(0.09, shW * 0.42 + 0.02));
  const ry = rx * 1.15;
  // 头在「髋→肩」反向延伸（站立向上、俯卧撑朝脚反向）
  let ux = 0;
  let uy = -1;
  if (hip) {
    const dx = sh.x - hip.x;
    const dy = sh.y - hip.y;
    const L = Math.hypot(dx, dy) || 1;
    ux = dx / L;
    uy = dy / L;
  }
  const neck = ry * 0.35;
  const cx = sh.x + ux * (ry + neck);
  const cy = sh.y + uy * (ry + neck);
  return {
    id: "head",
    kind: "head",
    points: ellipsePath(cx, cy, rx, ry, 18),
    strokeWidth: 0.01,
  };
}

function buildHipArc(pose: Pose): GuidePath | null {
  const lh = pose[LandmarkIndex.LeftHip];
  const rh = pose[LandmarkIndex.RightHip];
  if (!lh || !rh) return null;
  const midH = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
  const sh = mid(
    pose[LandmarkIndex.LeftShoulder],
    pose[LandmarkIndex.RightShoulder],
  );
  // 弧略向「远离肩」侧鼓出（骨盆外轮廓感）
  let nx = 0;
  let ny = 1;
  if (sh) {
    const dx = midH.x - sh.x;
    const dy = midH.y - sh.y;
    const L = Math.hypot(dx, dy) || 1;
    nx = dx / L;
    ny = dy / L;
  }
  const span = dist({ x: lh.x, y: lh.y }, { x: rh.x, y: rh.y });
  const bulge = Math.min(0.035, span * 0.22);
  const ctrl = { x: midH.x + nx * bulge, y: midH.y + ny * bulge };
  return {
    id: "hip",
    kind: "hip",
    points: quadBezier(
      { x: lh.x, y: lh.y },
      ctrl,
      { x: rh.x, y: rh.y },
      8,
    ),
    strokeWidth: 0.011,
  };
}

function buildLimbs(pose: Pose): GuidePath[] {
  const specs: { id: string; idx: number[]; w: number }[] = [
    {
      id: "arm-L",
      idx: [
        LandmarkIndex.LeftShoulder,
        LandmarkIndex.LeftElbow,
        LandmarkIndex.LeftWrist,
      ],
      w: 0.016,
    },
    {
      id: "arm-R",
      idx: [
        LandmarkIndex.RightShoulder,
        LandmarkIndex.RightElbow,
        LandmarkIndex.RightWrist,
      ],
      w: 0.016,
    },
    {
      id: "leg-L",
      idx: [
        LandmarkIndex.LeftHip,
        LandmarkIndex.LeftKnee,
        LandmarkIndex.LeftAnkle,
      ],
      w: 0.015,
    },
    {
      id: "leg-R",
      idx: [
        LandmarkIndex.RightHip,
        LandmarkIndex.RightKnee,
        LandmarkIndex.RightAnkle,
      ],
      w: 0.015,
    },
  ];
  const out: GuidePath[] = [];
  for (const s of specs) {
    const pts = chain(pose, s.idx);
    if (!pts) continue;
    out.push({ id: s.id, kind: "limb", points: pts, strokeWidth: s.w });
  }
  // 侧面常见只出一侧臂：若仅一侧臂缺失但肩腕在，用肩–腕直线补一条
  if (!out.some((g) => g.id.startsWith("arm-"))) {
    const ls = pose[LandmarkIndex.LeftShoulder];
    const lw = pose[LandmarkIndex.LeftWrist];
    const rs = pose[LandmarkIndex.RightShoulder];
    const rw = pose[LandmarkIndex.RightWrist];
    if (ls && lw) {
      out.push({
        id: "arm-L",
        kind: "limb",
        points: [
          { x: ls.x, y: ls.y },
          { x: lw.x, y: lw.y },
        ],
        strokeWidth: 0.016,
      });
    } else if (rs && rw) {
      out.push({
        id: "arm-R",
        kind: "limb",
        points: [
          { x: rs.x, y: rs.y },
          { x: rw.x, y: rw.y },
        ],
        strokeWidth: 0.016,
      });
    }
  }
  return out;
}

/** 关键关节：肩/髋/腕（参考层点缀，避免满屏圆点） */
const GUIDE_JOINT_INDEXES: readonly number[] = [
  LandmarkIndex.LeftShoulder,
  LandmarkIndex.RightShoulder,
  LandmarkIndex.LeftHip,
  LandmarkIndex.RightHip,
  LandmarkIndex.LeftWrist,
  LandmarkIndex.RightWrist,
  LandmarkIndex.LeftAnkle,
  LandmarkIndex.RightAnkle,
];

export type BuildAnatomyGuideOptions = {
  width?: number;
  height?: number;
  defaultStatus?: ValidationStatus;
};

/**
 * Pose → 含 anatomy guides 的场景（参考骨专用）。
 * joints 仅关键点；bones 保留细连接作后备；guides 为主视觉。
 */
export function buildAnatomyGuideScene(
  pose: Pose,
  options: BuildAnatomyGuideOptions = {},
): SkeletonScene {
  const base = buildSkeletonScene(pose, options);
  const guides: GuidePath[] = [];
  const spine = buildSpine(pose);
  if (spine) guides.push(spine);
  const head = buildHead(pose);
  if (head) guides.push(head);
  const hip = buildHipArc(pose);
  if (hip) guides.push(hip);
  guides.push(...buildLimbs(pose));

  const keyJoints = base.joints.filter((j) =>
    GUIDE_JOINT_INDEXES.includes(j.index),
  );

  return {
    ...base,
    joints: keyJoints,
    guides,
  };
}
