/**
 * T9-2：按对齐后 Pose 铺程序化人体网格（与胶囊同一套 rig）。
 * 不加载 xbot.glb，不用骨骼 aim / CPU 蒙皮。
 */
import type { CameraHint } from '@fitness-coach/render';
import type { Pose, TrajectoryExerciseId } from '@fitness-coach/core';
import * as THREE from 'three';
import {
  applyPoseFigure,
  createProceduralFigure,
  type ProceduralFigure,
} from './proceduralFigure3d';

export type FigureHandle = ProceduralFigure & {
  apply: (
    pose: Pose | null,
    aspect: number,
    cameraHint: CameraHint,
    exerciseId: TrajectoryExerciseId,
  ) => boolean;
  dispose: () => void;
};

export async function loadReferenceFigure(
  scene: THREE.Scene,
  material: THREE.MeshPhongMaterial,
): Promise<FigureHandle> {
  const built = createProceduralFigure(material);
  built.root.visible = false;
  scene.add(built.root);
  const handle: FigureHandle = {
    ...built,
    apply: (pose, aspect, cameraHint, exerciseId) => {
      if (!pose) {
        handle.root.visible = false;
        handle.mesh.visible = false;
        return false;
      }
      return applyPoseFigure(handle, pose, aspect, cameraHint, exerciseId);
    },
    dispose: () => {
      handle.root.removeFromParent();
      handle.mesh.geometry.dispose();
    },
  };
  return handle;
}
