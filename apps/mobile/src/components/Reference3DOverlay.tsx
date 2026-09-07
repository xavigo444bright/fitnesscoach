/**
 * 身上 3D 参考骨（FR-082 / T8）
 * 对齐用户画幅的关节胶囊；视口等原生缓冲就绪后锁定一次。
 */
import {
  type Pose,
  type TrajectoryExerciseId,
} from '@fitness-coach/core';
import {
  buildRig3d,
  poseToOrthoWorld,
  type CameraHint,
  type Rig3dScene,
} from '@fitness-coach/render';
import { colors, layout } from '@fitness-coach/ui';
import { type ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import * as THREE from 'three';
import {
  canvasShim,
  expectedBackingSize,
  waitAndFreezeViewport,
} from './expoGlThree';

type Props = {
  pose: Pose | null;
  width: number;
  height: number;
  cameraHint?: CameraHint;
  exerciseId?: TrajectoryExerciseId;
  onError?: (reason: string) => void;
  onReady?: () => void;
};

const REF_COLOR = parseInt(colors.ref3d.replace('#', ''), 16);
const REF_OPACITY = layout.ref3dOpacity;
const Y_UP = new THREE.Vector3(0, 1, 0);
const TMP_A = new THREE.Vector3();
const TMP_B = new THREE.Vector3();
const TMP_DIR = new THREE.Vector3();

function toThree(
  x: number,
  y: number,
  z: number,
  aspect: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const p = poseToOrthoWorld(x, y, z, aspect);
  return out.set(p.x, p.y, p.z);
}

function placeCapsule(
  mesh: THREE.Mesh,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  radiusFrom: number,
  radiusTo: number,
  aspect: number,
): void {
  toThree(ax, ay, az, aspect, TMP_A);
  toThree(bx, by, bz, aspect, TMP_B);
  TMP_DIR.subVectors(TMP_B, TMP_A);
  const len = TMP_DIR.length();
  const radius = (radiusFrom + radiusTo) / 2;
  if (len < 1e-4) {
    mesh.visible = false;
    return;
  }
  mesh.visible = true;
  const shaft = Math.max(len * 0.12, len - radius);
  mesh.scale.set(radius, shaft, radius);
  mesh.position.copy(TMP_A).add(TMP_B).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(Y_UP, TMP_DIR.normalize());
}

type GlRuntime = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  bones: Map<string, THREE.Mesh>;
  joints: Map<number, THREE.Mesh>;
  boneGeo: THREE.CylinderGeometry;
  jointGeo: THREE.SphereGeometry;
  material: THREE.MeshPhongMaterial;
  raf: number;
  gl: ExpoWebGLRenderingContext;
  aspect: number;
  viewportLocked: boolean;
  readyAnnounced: boolean;
};

function applyRig(rt: GlRuntime, rig: Rig3dScene | null): boolean {
  const seenBones = new Set<string>();
  const seenJoints = new Set<number>();
  if (rig) {
    const byIndex = new Map(rig.joints.map((j) => [j.index, j]));
    for (const bone of rig.bones) {
      const a = byIndex.get(bone.from);
      const b = byIndex.get(bone.to);
      if (!a || !b) continue;
      const key = `${bone.from}-${bone.to}`;
      seenBones.add(key);
      let mesh = rt.bones.get(key);
      if (!mesh) {
        mesh = new THREE.Mesh(rt.boneGeo, rt.material);
        mesh.frustumCulled = false;
        rt.scene.add(mesh);
        rt.bones.set(key, mesh);
      }
      placeCapsule(
        mesh,
        a.x,
        a.y,
        a.z,
        b.x,
        b.y,
        b.z,
        bone.radiusFrom,
        bone.radiusTo,
        rt.aspect,
      );
    }
    for (const j of rig.joints) {
      seenJoints.add(j.index);
      let mesh = rt.joints.get(j.index);
      if (!mesh) {
        mesh = new THREE.Mesh(rt.jointGeo, rt.material);
        mesh.frustumCulled = false;
        rt.scene.add(mesh);
        rt.joints.set(j.index, mesh);
      }
      mesh.visible = true;
      toThree(j.x, j.y, j.z, rt.aspect, mesh.position);
      mesh.scale.setScalar(0.016);
    }
  }
  for (const [key, mesh] of rt.bones) {
    if (!seenBones.has(key)) mesh.visible = false;
  }
  for (const [idx, mesh] of rt.joints) {
    if (!seenJoints.has(idx)) mesh.visible = false;
  }
  return Boolean(rig && seenJoints.size >= 4);
}

function tearDownRuntime(rt: GlRuntime): void {
  cancelAnimationFrame(rt.raf);
  try {
    rt.renderer.setClearColor(0x000000, 0);
    rt.renderer.clear();
    rt.gl.endFrameEXP();
  } catch {
    /* native GL 可能已拆 */
  }
  rt.boneGeo.dispose();
  rt.jointGeo.dispose();
  rt.material.dispose();
  rt.renderer.dispose();
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message.slice(0, 48);
  return 'gl-init';
}

export default function Reference3DOverlay({
  pose,
  width,
  height,
  cameraHint = 'side',
  exerciseId = 'squat',
  onError,
  onReady,
}: Props) {
  const poseRef = useRef(pose);
  poseRef.current = pose;
  const hintRef = useRef(cameraHint);
  hintRef.current = cameraHint;
  const exerciseRef = useRef(exerciseId);
  exerciseRef.current = exerciseId;
  const errorRef = useRef(onError);
  errorRef.current = onError;
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const rtRef = useRef<GlRuntime | null>(null);
  const cancelWaitRef = useRef<(() => void) | null>(null);
  const layoutW = Math.max(1, width);
  const layoutH = Math.max(1, height);

  const onContextCreate = useCallback((gl: ExpoWebGLRenderingContext) => {
    if (rtRef.current) {
      tearDownRuntime(rtRef.current);
      rtRef.current = null;
    }
    cancelWaitRef.current?.();
    try {
      const aspect = layoutW / layoutH;
      const { w: ew, h: eh } = expectedBackingSize(layoutW, layoutH);
      const renderer = new THREE.WebGLRenderer({
        canvas: canvasShim(gl, ew, eh),
        context: gl as unknown as WebGLRenderingContext,
        alpha: true,
        antialias: true,
      });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      scene.add(new THREE.AmbientLight(0xffffff, 0.75));
      const dir = new THREE.DirectionalLight(0xffffff, 0.85);
      dir.position.set(0.3, 0.9, 2.2);
      scene.add(dir);

      const camera = new THREE.OrthographicCamera(0, aspect, 1, 0, 0.05, 8);
      camera.position.set(aspect / 2, 0.5, 2);
      camera.lookAt(aspect / 2, 0.5, 0);

      const material = new THREE.MeshPhongMaterial({
        color: REF_COLOR,
        transparent: true,
        opacity: REF_OPACITY,
        depthWrite: false,
        shininess: 28,
        specular: 0x335566,
      });
      const rt: GlRuntime = {
        renderer,
        scene,
        camera,
        bones: new Map(),
        joints: new Map(),
        boneGeo: new THREE.CylinderGeometry(1, 1, 1, 10),
        jointGeo: new THREE.SphereGeometry(1, 12, 8),
        material,
        raf: 0,
        gl,
        aspect,
        viewportLocked: false,
        readyAnnounced: false,
      };
      rtRef.current = rt;
      cancelWaitRef.current = waitAndFreezeViewport(
        gl,
        renderer,
        layoutW,
        layoutH,
        () => {
          if (rtRef.current === rt) rt.viewportLocked = true;
        },
      );

      const tick = () => {
        const current = rtRef.current;
        if (!current) return;
        current.raf = requestAnimationFrame(tick);
        if (!current.viewportLocked) {
          current.gl.endFrameEXP();
          return;
        }
        const ok = applyRig(
          current,
          poseRef.current
            ? buildRig3d(poseRef.current, {
                cameraHint: hintRef.current,
                exerciseId: exerciseRef.current,
              })
            : null,
        );
        current.renderer.render(current.scene, current.camera);
        current.gl.endFrameEXP();
        if (ok && !current.readyAnnounced) {
          current.readyAnnounced = true;
          readyRef.current?.();
        }
      };
      tick();
    } catch (err) {
      errorRef.current?.(errorMessage(err));
    }
  }, [layoutW, layoutH]);

  useEffect(() => {
    return () => {
      cancelWaitRef.current?.();
      const rt = rtRef.current;
      if (!rt) return;
      tearDownRuntime(rt);
      rtRef.current = null;
    };
  }, []);

  if (width <= 0 || height <= 0) return null;

  return (
    <View
      style={[styles.root, { width, height }]}
      pointerEvents="none"
      collapsable={false}
    >
      <GLView
        key="t8bones"
        style={{ width, height, backgroundColor: 'transparent' }}
        onContextCreate={onContextCreate}
        msaaSamples={2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
});
