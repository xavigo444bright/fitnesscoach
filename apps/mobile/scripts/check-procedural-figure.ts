/**
 * T9-2 自检：T8 参考骨投影须与 2D 同像素，髋钉在 Pose 上。
 *   pnpm --filter @fitness-coach/mobile check:figure
 */
import { writeFileSync } from 'node:fs';
import {
  getDemoTrajectory,
  LandmarkIndex,
  poseFromFrame,
  sampleTrajectoryAt,
} from '@fitness-coach/core';
import {
  buildRig3d,
  poseToOrthoWorld,
  referencePoseFromTrajectory,
  RIG_HEAD,
  RIG_MID_HIP,
} from '@fitness-coach/render';
import * as THREE from 'three';
import { buildMannequinGeometry, mannequinAlignsToHips } from '../src/components/mannequin3d';

const fail = (msg: string): never => {
  console.error('[check-figure] FAIL', msg);
  process.exit(1);
  throw new Error(msg);
};

const W = 230;
const H = 500;
const ASPECT = W / H;

function assertPixelIdentity(): void {
  const px = 0.52;
  const py = 0.4;
  const worldX = px * W;
  const worldY = (1 - py) * H;
  const screenX = worldX;
  const screenY = H - worldY;
  if (Math.abs(screenX - px * W) > 1e-6) fail(`pixel x ${screenX}`);
  if (Math.abs(screenY - py * H) > 1e-6) fail(`pixel y ${screenY}`);
}

function assertProjectionIdentity(): void {
  const px = 0.52;
  const py = 0.4;
  const w = poseToOrthoWorld(px, py, 0, ASPECT);
  const screenX2d = px * W;
  const screenY2d = py * H;
  const screenX3d = (w.x / ASPECT) * W;
  const screenY3d = (1 - w.y) * H;
  if (Math.abs(screenX3d - screenX2d) > 1e-6) {
    fail(`2D/3D x mismatch ${screenX2d} vs ${screenX3d}`);
  }
  if (Math.abs(screenY3d - screenY2d) > 1e-6) {
    fail(`2D/3D y mismatch ${screenY2d} vs ${screenY3d}`);
  }
}

function raster(geo: THREE.BufferGeometry): {
  pix: Uint8Array;
  filled: number;
  cx: number;
  cy: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  const pix = new Uint8Array(W * H * 3);
  pix.fill(16);
  const pos = geo.getAttribute('position');
  const index = geo.getIndex();
  if (!index) fail('mannequin missing index');
  if (!(index.array instanceof Uint16Array)) fail('index must be Uint16');
  const plot = (ix: number, iy: number) => {
    if (ix < 0 || iy < 0 || ix >= W || iy >= H) return;
    const o = (iy * W + ix) * 3;
    pix[o] = 56;
    pix[o + 1] = 189;
    pix[o + 2] = 248;
  };
  const fillTri = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
  ) => {
    const minx = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const maxx = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
    const miny = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const maxy = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
    const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
    if (Math.abs(area) < 1e-6) return;
    for (let y = miny; y <= maxy; y += 1) {
      for (let x = minx; x <= maxx; x += 1) {
        const w0 = ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / area;
        const w1 = ((cx - bx) * (y - by) - (cy - by) * (x - bx)) / area;
        const w2 = ((ax - cx) * (y - cy) - (ay - cy) * (x - cx)) / area;
        if (w0 >= -0.01 && w1 >= -0.01 && w2 >= -0.01) plot(x, y);
      }
    }
  };
  for (let t = 0; t < index.count; t += 3) {
    const ia = index.getX(t);
    const ib = index.getX(t + 1);
    const ic = index.getX(t + 2);
    fillTri(
      pos.getX(ia),
      H - pos.getY(ia),
      pos.getX(ib),
      H - pos.getY(ib),
      pos.getX(ic),
      H - pos.getY(ic),
    );
  }
  let filled = 0;
  let sx = 0;
  let sy = 0;
  let minX = W;
  let maxX = 0;
  let minY = H;
  let maxY = 0;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const o = (y * W + x) * 3;
      if (pix[o] === 16) continue;
      filled += 1;
      sx += x;
      sy += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (filled < 80) fail(`too few projected verts ${filled}`);
  return {
    pix,
    filled,
    cx: sx / filled,
    cy: sy / filled,
    minX,
    maxX,
    minY,
    maxY,
  };
}

assertPixelIdentity();
assertProjectionIdentity();

const stand = poseFromFrame(
  sampleTrajectoryAt(getDemoTrajectory('squat', 'side'), 0),
);
const squat = poseFromFrame(
  sampleTrajectoryAt(getDemoTrajectory('squat', 'side'), 0.45),
);
const standRig = buildRig3d(stand, { cameraHint: 'side', exerciseId: 'squat' });
if (!standRig) fail('no stand rig');
const VIEW = { width: W, height: H };
const geo = buildMannequinGeometry(standRig, VIEW);
const r = raster(geo);
const hips = standRig.joints.find((j) => j.index === RIG_MID_HIP);
const head = standRig.joints.find((j) => j.index === RIG_HEAD);
if (!hips || !head) fail('missing hips/head');
if (!mannequinAlignsToHips(geo, hips, VIEW)) fail('hips not inside mannequin bbox');
const hipsPx = {
  x: hips.x * W,
  y: hips.y * H,
};
const headPx = {
  y: head.y * H,
};
if (Math.abs(r.cx - hipsPx.x) > 0.16 * W) {
  fail(`silhouette cx ${r.cx.toFixed(1)} vs hips ${hipsPx.x.toFixed(1)}`);
}
if (headPx.y > hipsPx.y - 8) fail('head not above hips');
const cxN = r.cx / W;
const cyN = r.cy / H;
if (cxN < 0.28 || cxN > 0.72) fail(`centroid X ${cxN.toFixed(3)} off-center`);
if (cyN < 0.28 || cyN > 0.78) fail(`centroid Y ${cyN.toFixed(3)} on an edge`);
if (r.minX < 4 && r.maxY > H - 4 && r.maxX < W * 0.42) {
  fail('packed into bottom-left');
}

const squatRig = buildRig3d(squat, { cameraHint: 'side', exerciseId: 'squat' });
if (!squatRig) fail('no squat rig');
const squatHead = squatRig.joints.find((j) => j.index === RIG_HEAD)!;
const squatHeadY = squatHead.y * H;
if (squatHeadY <= headPx.y + 4) fail('squat head did not lower');

const userHip = stand[LandmarkIndex.LeftHip];
if (userHip) {
  const alignedHip = standRig.joints.find(
    (j) => j.index === LandmarkIndex.LeftHip,
  )!;
  if (Math.abs(alignedHip.x - userHip.x) > 0.08) {
    fail('rig hip not on pose hip');
  }
}

const user = poseFromFrame(
  sampleTrajectoryAt(getDemoTrajectory('squat', 'side'), 0),
);
const ul = user[LandmarkIndex.LeftHip];
const ur = user[LandmarkIndex.RightHip];
if (!ul || !ur) fail('user missing hips');
const shift = 0.5 - (ul.x + ur.x) / 2;
for (const p of user) {
  if (p) p.x += shift;
}
const aligned = referencePoseFromTrajectory('squat', user, 'stand', null, {
  cameraHint: 'side',
});
if (!aligned) fail('referencePoseFromTrajectory returned null');
const al = aligned[LandmarkIndex.LeftHip];
const ar = aligned[LandmarkIndex.RightHip];
if (!al || !ar) fail('aligned missing hips');
const aMid = (al.x + ar.x) / 2;
if (Math.abs(aMid - 0.5) > 0.08) {
  fail(`aligned ghost hips at ${aMid.toFixed(3)}, expected ~0.5 on centered user`);
}

writeFileSync(
  '/tmp/t92-figure-preview.ppm',
  Buffer.concat([
    Buffer.from(`P6\n${W} ${H}\n255\n`),
    Buffer.from(r.pix),
  ]),
);

console.log('[check-figure] OK', {
  verts: geo.getAttribute('position').count,
  index: geo.getIndex()?.count,
  cx: +cxN.toFixed(3),
  cy: +cyN.toFixed(3),
  hipsX: +(hipsPx.x / W).toFixed(3),
  filled: r.filled,
});
