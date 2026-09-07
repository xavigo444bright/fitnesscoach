/**
 * 风格化人体：沿 Pose 关节的变径圆管（连续表面，不是一节节柱体）。
 * 顶点铺在与 2D 叠加相同的像素空间：x = pose.x * width，y = (1 - pose.y) * height。
 */
import { LandmarkIndex } from '@fitness-coach/core';
import {
  RIG_HEAD,
  RIG_MID_HIP,
  RIG_MID_SHOULDER,
  type Rig3dJoint,
  type Rig3dScene,
} from '@fitness-coach/render';
import * as THREE from 'three';

export type MannequinView = {
  width: number;
  height: number;
};

const RADIAL = 14;
const _t = new THREE.Vector3();
const _n = new THREE.Vector3();
const _b = new THREE.Vector3();
const _p = new THREE.Vector3();
const _off = new THREE.Vector3();

function toWorld(
  j: { x: number; y: number; z: number },
  view: MannequinView,
): THREE.Vector3 {
  return new THREE.Vector3(
    j.x * view.width,
    (1 - j.y) * view.height,
    j.z * view.width,
  );
}

function joint(
  by: Map<number, Rig3dJoint>,
  index: number,
): Rig3dJoint | undefined {
  return by.get(index);
}

function perp(tangent: THREE.Vector3): THREE.Vector3 {
  const axis =
    Math.abs(tangent.y) < 0.9
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);
  return new THREE.Vector3().crossVectors(tangent, axis).normalize();
}

function lerp3(
  a: THREE.Vector3,
  b: THREE.Vector3,
  t: number,
): THREE.Vector3 {
  return new THREE.Vector3(
    a.x + (b.x - a.x) * t,
    a.y + (b.y - a.y) * t,
    a.z + (b.z - a.z) * t,
  );
}

/** 变径圆管。radii 与 points 等长，单位与正交世界 Y 相同。 */
export function taperedTube(
  points: THREE.Vector3[],
  radii: number[],
  radial = RADIAL,
): THREE.BufferGeometry {
  if (points.length < 2 || points.length !== radii.length) {
    throw new Error('taperedTube: points/radii mismatch');
  }
  const n = points.length;
  const tangents: THREE.Vector3[] = [];
  for (let i = 0; i < n; i += 1) {
    if (i === 0) _t.copy(points[1]!).sub(points[0]!);
    else if (i === n - 1) _t.copy(points[i]!).sub(points[i - 1]!);
    else _t.copy(points[i + 1]!).sub(points[i - 1]!);
    if (_t.lengthSq() < 1e-12) _t.set(0, 1, 0);
    tangents.push(_t.clone().normalize());
  }
  let normal = perp(tangents[0]!);
  const pos: number[] = [];
  const nrm: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const tan = tangents[i]!;
    _b.copy(tan).cross(normal);
    if (_b.lengthSq() < 1e-12) {
      normal = perp(tan);
      _b.copy(tan).cross(normal);
    }
    _b.normalize();
    normal = _n.copy(_b).cross(tan).normalize();
    const r = Math.max(0.008, radii[i]!);
    const p = points[i]!;
    for (let j = 0; j < radial; j += 1) {
      const a = (j / radial) * Math.PI * 2;
      _off
        .copy(normal)
        .multiplyScalar(Math.cos(a) * r)
        .addScaledVector(_b, Math.sin(a) * r);
      pos.push(p.x + _off.x, p.y + _off.y, p.z + _off.z);
      _off.normalize();
      nrm.push(_off.x, _off.y, _off.z);
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    for (let j = 0; j < radial; j += 1) {
      const a = i * radial + j;
      const b = i * radial + ((j + 1) % radial);
      const c = (i + 1) * radial + j;
      const d = (i + 1) * radial + ((j + 1) % radial);
      idx.push(a, c, b, b, c, d);
    }
  }
  const startCenter = pos.length / 3;
  pos.push(points[0]!.x, points[0]!.y, points[0]!.z);
  nrm.push(-tangents[0]!.x, -tangents[0]!.y, -tangents[0]!.z);
  const endCenter = pos.length / 3;
  pos.push(points[n - 1]!.x, points[n - 1]!.y, points[n - 1]!.z);
  nrm.push(tangents[n - 1]!.x, tangents[n - 1]!.y, tangents[n - 1]!.z);
  for (let j = 0; j < radial; j += 1) {
    const a = j;
    const b = (j + 1) % radial;
    idx.push(startCenter, b, a);
    const c = (n - 1) * radial + j;
    const d = (n - 1) * radial + ((j + 1) % radial);
    idx.push(endCenter, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  const max = idx.reduce((m, v) => (v > m ? v : m), 0);
  if (max > 65535) throw new Error('mannequin index exceeds uint16');
  geo.setIndex(new THREE.Uint16BufferAttribute(new Uint16Array(idx), 1));
  return geo;
}

function ellipsoidAt(
  center: THREE.Vector3,
  rx: number,
  ry: number,
  rz: number,
): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 18, 14);
  geo.scale(rx, ry, rz);
  geo.translate(center.x, center.y, center.z);
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
    const index = geo.getIndex();
    if (!pa || !na || !index) throw new Error('mannequin geo missing attrs');
    for (let i = 0; i < pa.count; i += 1) {
      _p.fromBufferAttribute(pa, i);
      pos.push(_p.x, _p.y, _p.z);
      _n.fromBufferAttribute(na, i);
      nrm.push(_n.x, _n.y, _n.z);
    }
    for (let i = 0; i < index.count; i += 1) {
      idx.push(index.getX(i) + base);
    }
    base += pa.count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  const max = idx.reduce((m, v) => (v > m ? v : m), 0);
  if (max > 65535) throw new Error('merged mannequin exceeds uint16');
  merged.setIndex(new THREE.Uint16BufferAttribute(new Uint16Array(idx), 1));
  return merged;
}

function sampleChain(
  joints: THREE.Vector3[],
  radii: number[],
  stepsPerSeg = 4,
): { points: THREE.Vector3[]; radii: number[] } {
  const points: THREE.Vector3[] = [];
  const outR: number[] = [];
  for (let i = 0; i < joints.length - 1; i += 1) {
    const a = joints[i]!;
    const b = joints[i + 1]!;
    const ra = radii[i]!;
    const rb = radii[i + 1]!;
    const steps = i === joints.length - 2 ? stepsPerSeg : stepsPerSeg - 1;
    for (let s = 0; s < steps; s += 1) {
      const t = s / stepsPerSeg;
      points.push(lerp3(a, b, t));
      outR.push(ra + (rb - ra) * t);
    }
  }
  points.push(joints[joints.length - 1]!.clone());
  outR.push(radii[radii.length - 1]!);
  return { points, radii: outR };
}

function thick(by: Map<number, Rig3dJoint>): number {
  const lh = joint(by, LandmarkIndex.LeftHip);
  if (!lh) return 0.04;
  return Math.max(0.022, Math.abs(lh.z));
}

/**
 * 从 rig 生成一份连续人体网格（Uint16 index）。
 * 半径与坐标都用预览像素，和 SkeletonOverlay 同一套。
 */
export function buildMannequinGeometry(
  rig: Rig3dScene,
  view: MannequinView,
): THREE.BufferGeometry {
  const by = new Map(rig.joints.map((j) => [j.index, j]));
  const t = thick(by) * view.height;
  const w = (j: Rig3dJoint | undefined) => {
    if (!j) throw new Error('missing joint');
    return toWorld(j, view);
  };
  const geos: THREE.BufferGeometry[] = [];
  const hip = joint(by, RIG_MID_HIP);
  const chest = joint(by, RIG_MID_SHOULDER);
  const head = joint(by, RIG_HEAD);
  if (hip && chest && head) {
    const hp = w(hip);
    const cp = w(chest);
    const hd = w(head);
    const waist = lerp3(hp, cp, 0.45);
    const neck = lerp3(cp, hd, 0.35);
    const spine = sampleChain(
      [hp, waist, cp, neck, hd],
      [t * 1.45, t * 1.15, t * 1.7, t * 0.58, t * 0.68],
      5,
    );
    geos.push(taperedTube(spine.points, spine.radii));
    geos.push(ellipsoidAt(hd, t * 1.15, t * 1.35, t * 1.1));
    geos.push(ellipsoidAt(hp, t * 1.7, t * 1.05, t * 1.45));
  }
  const lh = joint(by, LandmarkIndex.LeftHip);
  const rh = joint(by, LandmarkIndex.RightHip);
  if (lh && rh && hip) {
    const pelvic = sampleChain(
      [w(lh), w(hip), w(rh)],
      [t * 1.45, t * 1.7, t * 1.45],
      4,
    );
    geos.push(taperedTube(pelvic.points, pelvic.radii));
  }
  const ls = joint(by, LandmarkIndex.LeftShoulder);
  const rs = joint(by, LandmarkIndex.RightShoulder);
  if (ls && rs) {
    const girdle = sampleChain(
      [w(ls), w(rs)],
      [t * 0.85, t * 0.85],
      4,
    );
    geos.push(taperedTube(girdle.points, girdle.radii));
  }
  const limb = (
    indexes: number[],
    r: number[],
  ) => {
    const js = indexes.map((i) => joint(by, i));
    if (js.some((x) => !x)) return;
    const pts = js.map((j) => w(j!));
    const sampled = sampleChain(pts, r, 4);
    geos.push(taperedTube(sampled.points, sampled.radii));
  };
  limb(
    [LandmarkIndex.LeftShoulder, LandmarkIndex.LeftElbow, LandmarkIndex.LeftWrist],
    [t * 0.95, t * 0.78, t * 0.52],
  );
  limb(
    [
      LandmarkIndex.RightShoulder,
      LandmarkIndex.RightElbow,
      LandmarkIndex.RightWrist,
    ],
    [t * 0.95, t * 0.78, t * 0.52],
  );
  limb(
    [LandmarkIndex.LeftHip, LandmarkIndex.LeftKnee, LandmarkIndex.LeftAnkle],
    [t * 1.55, t * 1.2, t * 0.72],
  );
  limb(
    [LandmarkIndex.RightHip, LandmarkIndex.RightKnee, LandmarkIndex.RightAnkle],
    [t * 1.55, t * 1.2, t * 0.72],
  );
  const lw = joint(by, LandmarkIndex.LeftWrist);
  const rw = joint(by, LandmarkIndex.RightWrist);
  const la = joint(by, LandmarkIndex.LeftAnkle);
  const ra = joint(by, LandmarkIndex.RightAnkle);
  if (lw) geos.push(ellipsoidAt(w(lw), t * 0.7, t * 0.45, t * 0.55));
  if (rw) geos.push(ellipsoidAt(w(rw), t * 0.7, t * 0.45, t * 0.55));
  if (la) geos.push(ellipsoidAt(w(la), t * 0.85, t * 0.42, t * 0.55));
  if (ra) geos.push(ellipsoidAt(w(ra), t * 0.85, t * 0.42, t * 0.55));
  const marker = t * 0.48;
  for (const idx of [
    LandmarkIndex.LeftShoulder,
    LandmarkIndex.RightShoulder,
    LandmarkIndex.LeftElbow,
    LandmarkIndex.RightElbow,
    LandmarkIndex.LeftWrist,
    LandmarkIndex.RightWrist,
    LandmarkIndex.LeftHip,
    LandmarkIndex.RightHip,
    LandmarkIndex.LeftKnee,
    LandmarkIndex.RightKnee,
    LandmarkIndex.LeftAnkle,
    LandmarkIndex.RightAnkle,
  ]) {
    const j = joint(by, idx);
    if (j) geos.push(ellipsoidAt(w(j), marker, marker, marker));
  }

  if (geos.length < 4) {
    for (const g of geos) g.dispose();
    throw new Error('mannequin too few parts');
  }
  const merged = mergeIndexed(geos);
  for (const g of geos) g.dispose();
  const index = merged.getIndex();
  if (!index || index.array instanceof Uint32Array) {
    merged.dispose();
    throw new Error('mannequin must use uint16 index (WebGL1)');
  }
  return merged;
}

/** apply 后髋应落在网格 bbox 内；失败则不要标「参考·人」。 */
export function mannequinAlignsToHips(
  geo: THREE.BufferGeometry,
  hips: { x: number; y: number },
  view: MannequinView,
): boolean {
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  if (!box) return false;
  const cx = (box.min.x + box.max.x) / 2;
  const cy = (box.min.y + box.max.y) / 2;
  const expectedX = hips.x * view.width;
  const expectedY = (1 - hips.y) * view.height;
  return (
    Math.abs(cx - expectedX) < view.width * 0.22 &&
    Math.abs(cy - expectedY) < view.height * 0.28
  );
}
