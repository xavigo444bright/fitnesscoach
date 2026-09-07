/**
 * expo-gl + three：等 CAEAGLLayer 缓冲就绪后锁定视口。
 * drawingBufferWidth 是 context 创建时的 GL_VIEWPORT 快照（常为 300×150），
 * 按它 setSize 会把内容画在缓冲左下角（小窗小人贴底、身上骨变巨物）。
 */
import { type ExpoWebGLRenderingContext } from 'expo-gl';
import { PixelRatio } from 'react-native';
import * as THREE from 'three';

export function canvasShim(
  gl: ExpoWebGLRenderingContext,
  w: number,
  h: number,
): HTMLCanvasElement {
  return {
    width: w,
    height: h,
    clientWidth: w,
    clientHeight: h,
    style: { width: `${w}px`, height: `${h}px` },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    getContext: () => gl,
  } as unknown as HTMLCanvasElement;
}

export function expectedBackingSize(
  layoutW: number,
  layoutH: number,
): { w: number; h: number } {
  const dpr = PixelRatio.get();
  return {
    w: Math.max(1, Math.round(Math.max(1, layoutW) * dpr)),
    h: Math.max(1, Math.round(Math.max(1, layoutH) * dpr)),
  };
}

function queryColorBufferSize(
  gl: ExpoWebGLRenderingContext,
): { w: number; h: number } | null {
  try {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const type = gl.getFramebufferAttachmentParameter(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE,
    );
    if (type !== gl.RENDERBUFFER) return null;
    const rb = gl.getFramebufferAttachmentParameter(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME,
    );
    const prev = gl.getParameter(gl.RENDERBUFFER_BINDING);
    gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
    const w = gl.getRenderbufferParameter(
      gl.RENDERBUFFER,
      gl.RENDERBUFFER_WIDTH,
    ) as number;
    const h = gl.getRenderbufferParameter(
      gl.RENDERBUFFER,
      gl.RENDERBUFFER_HEIGHT,
    ) as number;
    gl.bindRenderbuffer(gl.RENDERBUFFER, prev);
    if (w >= 32 && h >= 32) return { w, h };
  } catch {
    return null;
  }
  return null;
}

function isStaleDefault(w: number, h: number): boolean {
  return (w === 300 && h === 150) || (w === 150 && h === 300);
}

export function freezeRendererToBuffer(
  gl: ExpoWebGLRenderingContext,
  renderer: THREE.WebGLRenderer,
  w: number,
  h: number,
): void {
  const apply = () => {
    gl.viewport(0, 0, w, h);
    gl.disable(gl.SCISSOR_TEST);
  };
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  apply();
  const state = renderer.state as {
    viewport: (v: THREE.Vector4) => void;
    scissor: (v: THREE.Vector4) => void;
  };
  state.viewport = () => apply();
  state.scissor = () => undefined;
}

/**
 * 等到原生层缓冲接近 layout×dpr，再冻结 three 视口。
 * 最多等 ~30 帧；超时则用 layout×dpr。
 */
export function waitAndFreezeViewport(
  gl: ExpoWebGLRenderingContext,
  renderer: THREE.WebGLRenderer,
  layoutW: number,
  layoutH: number,
  onLocked: () => void,
): () => void {
  const expected = expectedBackingSize(layoutW, layoutH);
  let cancelled = false;
  let tries = 0;
  const tick = () => {
    if (cancelled) return;
    tries += 1;
    const measured = queryColorBufferSize(gl);
    const stale =
      measured != null && isStaleDefault(measured.w, measured.h);
    const ready =
      measured != null &&
      !stale &&
      Math.abs(measured.w - expected.w) / expected.w < 0.12 &&
      Math.abs(measured.h - expected.h) / expected.h < 0.12;
    if (ready && measured) {
      freezeRendererToBuffer(gl, renderer, measured.w, measured.h);
      onLocked();
      return;
    }
    if (tries >= 20) {
      freezeRendererToBuffer(gl, renderer, expected.w, expected.h);
      onLocked();
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return () => {
    cancelled = true;
  };
}
