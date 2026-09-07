/**
 * 程序化参考人（T9-2）。
 * 几何直接铺在 Pose 正交世界里（与胶囊同一套 buildRig3d），带 index。
 * 禁止 bind 缩放 + 无 index 合并：真机会变成左下角碎三角形。
 */
import {
  buildRig3d,
  humanoidTargetsFromPose,
  poseToOrthoWorld,
  RIG_HEAD,
  RIG_MID_HIP,
  RIG_MID_SHOULDER,
  type CameraHint,
  type Rig3dScene,
  type Rig3dVolume,
} from '@fitness-coach/render';
import type { Pose, TrajectoryExerciseId } from '@fitness-coach/core';
import * as THREE from 'three';

const Y_UP = new THREE.Vector3(0, 1, 0);
const _from = new THREE.Vector3();
const _to = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _p = new THREE.Vector3();
const _n = new THREE.Vector3();

function isMidTorsoBone(from: number, to: number): boolean {
  return (
    (from === RIG_MID_SHOULDER && to === RIG_MID_HIP) ||
    (from === RIG_MID_HIP && to === RIG_MID_SHOULDER)
  );
}

function isHeadBone(from: number, to: number): boolean {
  return from === RIG_HEAD || to === RIG_HEAD;
}

function toWorld(
  x: number,
  y: number,
  z: number,
  aspect: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const p = poseToOrthoWorld(x, y, z, aspect);
  return out.set(p.x, p.y, p.z);
}

function limbGeometry(
  from: THREE.Vector3,
  to: THREE.Vector3,
  radiusFrom: number,
  radiusTo: number,
): THREE.BufferGeometry {
  const len = from.distanceTo(to);
  const geo = new THREE.CylinderGeometry(
    Math.max(0.012, radiusTo),
    Math.max(0.012, radiusFrom),
    Math.max(0.03, len),
    12,
    1,
  );
  if (len > 1e-6) {
    _dir.copy(to).sub(from).normalize();
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y_UP, _dir));
  }
  geo.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
  return geo;
}

function jointSphere(at: THREE.Vector3, radius: number): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(Math.max(0.014, radius), 12, 10);
  geo.translate(at.x, at.y, at.z);
  return geo;
}

function volumeGeometry(
  vol: Rig3dVolume,
  aspect: number,
): THREE.BufferGeometry {
  toWorld(vol.x, vol.y, vol.z, aspect, _from);
  toWorld(vol.x + vol.dirX, vol.y + vol.dirY, vol.z + vol.dirZ, aspect, _to);
  _dir.copy(_to).sub(_from);
  const geo = new THREE.SphereGeometry(1, 14, 12);
  geo.scale(vol.rx, vol.ry, vol.rz);
  if (_dir.lengthSq() > 1e-8) {
    geo.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(Y_UP, _dir.normalize()),
    );
  }
  geo.translate(_from.x, _from.y, _from.z);
  return geo;
}

function mergeIndexed(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const nrm: number[] = [];
  const idx: number[] = [];
  let base = 0;
  for (const geo of geos) {
    if (!geo.getAttribute('normal')) geo.computeVertexNormals();
    const pa = geo.getAttribute('position');
    const na = geo.getAttribute('normal');
    if (!pa || !na) throw new Error('figure geo missing attributes');
    for (let i = 0; i < pa.count; i += 1) {
      _p.fromBufferAttribute(pa, i);
      _n.fromBufferAttribute(na, i);
      pos.push(_p.x, _p.y, _p.z);
      nrm.push(_n.x, _n.y, _n.z);
    }
    const index = geo.getIndex();
    if (index) {
      for (let i = 0; i < index.count; i += 1) {
        idx.push(index.getX(i) + base);
      }
    } else {
      for (let i = 0; i < pa.count; i += 1) idx.push(base + i);
    }
    base += pa.count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  merged.setIndex(idx);
  return merged;
}

export function buildFigureGeometry(
  rig: Rig3dScene,
  aspect: number,
): THREE.BufferGeometry {
  const geos: THREE.BufferGeometry[] = [];
  const byIndex = new Map(rig.joints.map((j) => [j.index, j]));
  const hasTorso = rig.volumes.some((v) => v.kind === 'torso');

  for (const bone of rig.bones) {
    if (hasTorso && isMidTorsoBone(bone.from, bone.to)) continue;
    const a = byIndex.get(bone.from);
    const b = byIndex.get(bone.to);
    if (!a || !b) continue;
    toWorld(a.x, a.y, a.z, aspect, _from);
    toWorld(b.x, b.y, b.z, aspect, _to);
    if (_from.distanceTo(_to) < 1e-4) continue;
    geos.push(
      limbGeometry(_from.clone(), _to.clone(), bone.radiusFrom, bone.radiusTo),
    );
    if (!isHeadBone(bone.from, bone.to)) {
      geos.push(jointSphere(_from.clone(), bone.radiusFrom * 0.92));
    }
  }

  for (const vol of rig.volumes) {
    geos.push(volumeGeometry(vol, aspect));
  }

  if (geos.length < 4) {
    for (const g of geos) g.dispose();
    throw new Error('figure geo too few parts');
  }
  const merged = mergeIndexed(geos);
  for (const g of geos) g.dispose();
  const index = merged.getIndex();
  if (!index || index.count < 300) {
    merged.dispose();
    throw new Error('figure mesh missing index (would render as triangle soup)');
  }
  return merged;
}

export type FigureAlignment = {
  ok: boolean;
  reason?: string;
  hipsX: number;
  hipsY: number;
  centerX: number;
  centerY: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export function measureFigureAlignment(
  root: THREE.Object3D,
  pose: Pose,
  aspect: number,
  cameraHint: CameraHint,
  exerciseId: TrajectoryExerciseId,
): FigureAlignment {
  const targets = humanoidTargetsFromPose(pose, { cameraHint, exerciseId });
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const empty: FigureAlignment = {
    ok: false,
    reason: 'no-targets-or-box',
    hipsX: 0,
    hipsY: 0,
    centerX: 0,
    centerY: 0,
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0,
  };
  if (!targets || box.isEmpty()) return { ...empty, reason: 'empty' };
  const hips = poseToOrthoWorld(targets.hips.x, targets.hips.y, targets.hips.z, aspect);
  const head = poseToOrthoWorld(targets.head.x, targets.head.y, targets.head.z, aspect);
  const ankle = poseToOrthoWorld(
    targets.leftAnkle.x,
    targets.leftAnkle.y,
    targets.leftAnkle.z,
    aspect,
  );
  const cx = (box.min.x + box.max.x) / 2;
  const cy = (box.min.y + box.max.y) / 2;
  const result: FigureAlignment = {
    ok: true,
    hipsX: hips.x,
    hipsY: hips.y,
    centerX: cx,
    centerY: cy,
    minX: box.min.x,
    minY: box.min.y,
    maxX: box.max.x,
    maxY: box.max.y,
  };
  if (box.max.x < 0 || box.min.x > aspect || box.max.y < 0 || box.min.y > 1) {
    return { ...result, ok: false, reason: 'miss-camera' };
  }
  const h = box.max.y - box.min.y;
  if (h < 0.18 || h > 1.05) {
    return { ...result, ok: false, reason: `height ${h.toFixed(3)}` };
  }
  const inside = (
    x: number,
    y: number,
    pad: number,
    label: string,
  ): FigureAlignment | null => {
    if (
      x < box.min.x - pad ||
      x > box.max.x + pad ||
      y < box.min.y - pad ||
      y > box.max.y + pad
    ) {
      return { ...result, ok: false, reason: `${label} outside bbox` };
    }
    return null;
  };
  const hipsMiss = inside(hips.x, hips.y, 0.04, 'hips');
  if (hipsMiss) return hipsMiss;
  const headMiss = inside(head.x, head.y, 0.08, 'head');
  if (headMiss) return headMiss;
  if (Math.abs(cx - hips.x) > 0.16) {
    return { ...result, ok: false, reason: `centerX ${cx.toFixed(3)} vs hips ${hips.x.toFixed(3)}` };
  }
  if (box.max.y < head.y - 0.12) {
    return { ...result, ok: false, reason: 'top below head' };
  }
  if (box.min.y > ankle.y + 0.16) {
    return { ...result, ok: false, reason: 'feet not near ankles' };
  }
  return result;
}

export type ProceduralFigure = {
  root: THREE.Group;
  mesh: THREE.Mesh;
};

export function createProceduralFigure(
  material: THREE.Material,
): ProceduralFigure {
  const root = new THREE.Group();
  root.name = 'proceduralHumanoid';
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
  mesh.name = 'proceduralSurface';
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.visible = false;
  root.add(mesh);
  return { root, mesh };
}

export function applyPoseFigure(
  figure: ProceduralFigure,
  pose: Pose,
  aspect: number,
  cameraHint: CameraHint,
  exerciseId: TrajectoryExerciseId,
): boolean {
  const rig = buildRig3d(pose, { cameraHint, exerciseId });
  if (!rig) return false;
  let geo: THREE.BufferGeometry;
  try {
    geo = buildFigureGeometry(rig, aspect);
  } catch {
    return false;
  }
  const prev = figure.mesh.geometry;
  figure.mesh.geometry = geo;
  prev.dispose();
  figure.root.position.set(0, 0, 0);
  figure.root.scale.set(1, 1, 1);
  figure.root.rotation.set(0, 0, 0);
  const align = measureFigureAlignment(
    figure.root,
    pose,
    aspect,
    cameraHint,
    exerciseId,
  );
  if (!align.ok) {
    figure.mesh.visible = false;
    figure.root.visible = false;
    return false;
  }
  figure.mesh.visible = true;
  figure.root.visible = true;
  return true;
}
