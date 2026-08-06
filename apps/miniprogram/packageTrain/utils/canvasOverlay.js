/**
 * 小程序 Canvas adapter（M5-T1）
 * 消费 @fitness-coach/render 的 SkeletonScene / PlacementGuideResult，不写业务规则。
 * 颜色对齐 design-tokens（与 @fitness-coach/ui 一致）。
 *
 * 坐标策略（MP-FPS 录屏定案）：
 * 不依赖 <camera> 预览与 onCameraFrame 缓冲是否同构图——把推理用的 snapshot
 * 按 cover+mirror 画进 canvas，骨骼用同一套 mapNormToView，保证像素级对齐。
 */

const COLORS = {
  correct: '#22C55E',
  warning: '#EAB308',
  error: '#EF4444',
  ghost: 'rgba(255, 255, 255, 0.4)',
  overlayText: '#FFFFFF',
};

const GHOST_OPACITY = 0.4;

function statusColor(status) {
  if (status === 'warning') return COLORS.warning;
  if (status === 'error') return COLORS.error;
  return COLORS.correct;
}

/**
 * cover 目标矩形：帧等比放大铺满 view，超出部分裁切。
 */
function coverDestRect(viewW, viewH, frameW, frameH) {
  if (!frameW || !frameH || frameW <= 0 || frameH <= 0 || !viewW || !viewH) {
    return { x: 0, y: 0, w: viewW, h: viewH };
  }
  const frameAspect = frameW / frameH;
  const viewAspect = viewW / viewH;
  let scale;
  let offsetX;
  let offsetY;
  if (frameAspect > viewAspect) {
    scale = viewH / frameH;
    offsetX = (viewW - frameW * scale) / 2;
    offsetY = 0;
  } else {
    scale = viewW / frameW;
    offsetX = 0;
    offsetY = (viewH - frameH * scale) / 2;
  }
  return {
    x: offsetX,
    y: offsetY,
    w: frameW * scale,
    h: frameH * scale,
  };
}

/**
 * 归一化帧坐标 → 预览 CSS 像素（cover + 可选水平镜像）。
 */
function mapNormToView(nx, ny, viewW, viewH, frameW, frameH, mirrorX) {
  let x = nx;
  let y = ny;
  if (mirrorX) x = 1 - x;

  if (!frameW || !frameH || frameW <= 0 || frameH <= 0 || !viewW || !viewH) {
    return { x: x * viewW, y: y * viewH };
  }

  const dest = coverDestRect(viewW, viewH, frameW, frameH);
  return {
    x: x * dest.w + dest.x,
    y: y * dest.h + dest.y,
  };
}

function toPx(scene, x, y, width, height, map) {
  if (scene.space === 'pixel') {
    if (map && map.frameW > 0) {
      return mapNormToView(
        x / map.frameW,
        y / map.frameH,
        width,
        height,
        map.frameW,
        map.frameH,
        map.mirrorX,
      );
    }
    return { x: x, y: y };
  }
  if (map) {
    return mapNormToView(
      x,
      y,
      width,
      height,
      map.frameW,
      map.frameH,
      map.mirrorX,
    );
  }
  return { x: x * width, y: y * height };
}

/**
 * 把 snapshot RGBA 画进主 canvas（与骨骼同一 cover+mirror）。
 * 复用 opts._frameBlit 缓存 offscreen，避免每帧 createOffscreenCanvas。
 */
function drawCameraFrame(ctx, snapshot, viewW, viewH, mirrorX, blitCache) {
  if (!ctx || !snapshot || !snapshot.data || !snapshot.width || !snapshot.height) {
    return null;
  }
  const fw = snapshot.width | 0;
  const fh = snapshot.height | 0;
  if (fw <= 0 || fh <= 0) return null;

  let cache = blitCache || {};
  let off = cache.off;
  let octx = cache.octx;
  if (!off || cache.fw !== fw || cache.fh !== fh) {
    if (typeof wx === 'undefined' || typeof wx.createOffscreenCanvas !== 'function') {
      return cache;
    }
    try {
      off = wx.createOffscreenCanvas({ type: '2d', width: fw, height: fh });
    } catch (e1) {
      try {
        off = wx.createOffscreenCanvas(fw, fh);
      } catch (e2) {
        return cache;
      }
    }
    if (!off || typeof off.getContext !== 'function') return cache;
    if (typeof off.width === 'number') {
      off.width = fw;
      off.height = fh;
    }
    octx = off.getContext('2d');
    if (!octx) return cache;
    cache = { off: off, octx: octx, fw: fw, fh: fh };
  }

  try {
    const img = octx.createImageData(fw, fh);
    const src = snapshot.data;
    const dst = img.data;
    const n = Math.min(dst.length, src.length);
    if (typeof dst.set === 'function' && src.subarray) {
      dst.set(src.subarray(0, n));
    } else {
      for (let i = 0; i < n; i += 1) dst[i] = src[i];
    }
    octx.putImageData(img, 0, 0);
  } catch (e) {
    return cache;
  }

  const dest = coverDestRect(viewW, viewH, fw, fh);
  ctx.save();
  // 先填黑，cover 裁切区外不透出底层 camera（避免「双重画面」错觉）
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, viewW, viewH);
  if (mirrorX) {
    ctx.translate(dest.x + dest.w, dest.y);
    ctx.scale(-1, 1);
    ctx.drawImage(off, 0, 0, fw, fh, 0, 0, dest.w, dest.h);
  } else {
    ctx.drawImage(off, 0, 0, fw, fh, dest.x, dest.y, dest.w, dest.h);
  }
  ctx.restore();
  return cache;
}

/**
 * 大框贴底（对齐 App PlacementGuide：~94% × 88%）。
 */
function drawPlacementFrame(ctx, width, height) {
  const fw = width * 0.94;
  const fh = height * 0.88;
  const left = (width - fw) / 2;
  const top = height - fh - height * 0.02;
  ctx.save();
  ctx.strokeStyle = COLORS.overlayText;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(left, top, fw, fh, 12);
    ctx.stroke();
  } else {
    ctx.strokeRect(left, top, fw, fh);
  }
  ctx.setLineDash([]);
  ctx.restore();
}

function drawSkeletonScene(ctx, scene, width, height, opts) {
  if (!scene || !scene.joints || !scene.joints.length) return;
  const colorFor = opts.colorFor || statusColor;
  const opacity = opts.opacity != null ? opts.opacity : 1;
  const map = opts.map || null;
  const byIndex = {};
  for (let i = 0; i < scene.joints.length; i += 1) {
    const j = scene.joints[i];
    byIndex[j.index] = j;
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  const bones = scene.bones || [];
  for (let i = 0; i < bones.length; i += 1) {
    const bone = bones[i];
    const a = byIndex[bone.from];
    const b = byIndex[bone.to];
    if (!a || !b) continue;
    const p1 = toPx(scene, a.x, a.y, width, height, map);
    const p2 = toPx(scene, b.x, b.y, width, height, map);
    ctx.strokeStyle = colorFor(bone.status);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  for (let i = 0; i < scene.joints.length; i += 1) {
    const j = scene.joints[i];
    const p = toPx(scene, j.x, j.y, width, height, map);
    ctx.fillStyle = colorFor(j.status);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.overlayText;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * CMP-005 BottomBar 画进 canvas（design-tokens）。
 * bar: { rep, safeBottom }
 */
function drawBottomBar(ctx, width, height, bar) {
  const safe = (bar && bar.safeBottom) || 0;
  const barH = 64 + safe;
  const top = height - barH;
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, top, width, barH);
  const cy = top + 32;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '400 12px sans-serif';
  ctx.fillText('Rep', 16, cy);
  ctx.fillStyle = COLORS.overlayText;
  ctx.font = '700 24px sans-serif';
  ctx.fillText(String((bar && bar.rep) || 0), 46, cy);
  ctx.font = '600 15px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('结束', width - 16, cy);
  ctx.restore();
}

/** 翻转 chip（原 cover-view 会吃触摸且 bindtap 不稳） */
function drawFlipChip(ctx, width, height, chip) {
  if (!chip) return;
  const x = chip.left != null ? chip.left : 16;
  const y = chip.top != null ? chip.top : 48;
  const w = chip.width != null ? chip.width : 64;
  const h = chip.height != null ? chip.height : 44;
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    ctx.fillRect(x, y, w, h);
  }
  ctx.fillStyle = COLORS.overlayText;
  ctx.font = '700 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('翻转', x + w / 2, y + h / 2);
  ctx.restore();
}

/** 性能条 + 常驻 mirror 状态（点此切换镜像） */
function drawPerfBar(ctx, width, height, perf) {
  if (!perf || !perf.line) return;
  const x = 16;
  const y = perf.top != null ? perf.top : 90;
  const w = Math.max(0, width - 32);
  const padY = 8;
  ctx.save();
  ctx.font = '12px sans-serif';
  const line2 = perf.subLine || '';
  const textH = line2 ? 36 : 20;
  const h = textH + padY * 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, w, h);
  }
  ctx.fillStyle = '#EAB308';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(perf.line, width / 2, y + padY, w - 16);
  if (line2) {
    ctx.fillStyle = '#f87171';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(line2, x + 12, y + padY + 18, w - 24);
  }
  ctx.restore();
}

function drawPlaceHint(ctx, width, height, hint, safeBottom) {
  if (!hint) return;
  const safe = safeBottom || 0;
  const boxH = 40;
  const bottom = 84 + safe;
  const y = height - bottom - boxH;
  const x = 16;
  const w = Math.max(0, width - 32);
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, boxH, 8);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, w, boxH);
  }
  ctx.fillStyle = COLORS.overlayText;
  ctx.font = '600 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(hint, width / 2, y + boxH / 2, w - 16);
  ctx.restore();
}

/**
 * 一帧完整绘制：相机帧 → Ghost → 用户骨骼 → 站位框 → 底栏/翻转/性能条。
 * opts.map: { frameW, frameH, mirrorX }
 * opts.cameraFrame: snapshot { width, height, data }
 * opts._frameBlit: 内部缓存（由调用方持有并回写）
 */
function paintOverlay(ctx, width, height, opts) {
  if (!ctx || width <= 0 || height <= 0) return opts && opts._frameBlit;

  const map = opts.map || null;
  let blit = opts._frameBlit || null;

  if (opts.cameraFrame) {
    const before = blit;
    blit = drawCameraFrame(
      ctx,
      opts.cameraFrame,
      width,
      height,
      map && map.mirrorX,
      blit,
    );
    // offscreen 不可用时退回透明叠加（仍依赖底层 camera）
    if (!blit || !blit.off) {
      ctx.clearRect(0, 0, width, height);
      blit = before || blit;
    }
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  if (opts.ghostScene) {
    drawSkeletonScene(ctx, opts.ghostScene, width, height, {
      colorFor: function () {
        return COLORS.ghost;
      },
      opacity: GHOST_OPACITY,
      map: map,
    });
  }

  if (opts.userScene) {
    drawSkeletonScene(ctx, opts.userScene, width, height, {
      colorFor: statusColor,
      opacity: 1,
      map: map,
    });
  }

  if (opts.placementVisible) {
    drawPlacementFrame(ctx, width, height);
  }

  if (opts.placeHint) {
    drawPlaceHint(
      ctx,
      width,
      height,
      opts.placeHint,
      opts.bottomBar && opts.bottomBar.safeBottom,
    );
  }

  if (opts.bottomBar) {
    drawBottomBar(ctx, width, height, opts.bottomBar);
  }

  if (opts.flipChip) {
    drawFlipChip(ctx, width, height, opts.flipChip);
  }

  if (opts.perf) {
    drawPerfBar(ctx, width, height, opts.perf);
  }

  return blit;
}

module.exports = {
  COLORS,
  coverDestRect,
  drawBottomBar,
  drawCameraFrame,
  drawFlipChip,
  drawPerfBar,
  drawPlaceHint,
  drawPlacementFrame,
  drawSkeletonScene,
  mapNormToView,
  paintOverlay,
  statusColor,
};
