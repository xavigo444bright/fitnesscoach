#!/usr/bin/env python3
"""
视频 → PoseDump JSON（供 trajectory-extract from-dump 消费）

用法：
  .venv/bin/python scripts/video_to_pose_dump.py \\
    --video ../../media/trajectory-source/squat/squat-side-01.mp4 \\
    --exercise squat --camera side \\
    --out ../../media/trajectory-source/squat/squat-side-01.pose.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys

import cv2
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python import vision


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--exercise", required=True, help="catalog exercise id, e.g. squat / glute-bridge")
    ap.add_argument("--camera", default="side", choices=["side", "front"])
    ap.add_argument("--out", required=True)
    ap.add_argument(
        "--model",
        default=os.path.join(
            os.path.dirname(__file__), "..", "models", "pose_landmarker_lite.task"
        ),
    )
    ap.add_argument("--stride", type=int, default=1, help="每 N 帧取 1 帧")
    args = ap.parse_args()

    model = os.path.abspath(args.model)
    if not os.path.isfile(model):
        print(f"missing model: {model}", file=sys.stderr)
        return 1
    if not os.path.isfile(args.video):
        print(f"missing video: {args.video}", file=sys.stderr)
        return 1

    options = vision.PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model),
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    cap = cv2.VideoCapture(args.video)
    if not cap.isOpened():
        print("cannot open video", file=sys.stderr)
        return 1
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 30.0)
    frames_out = []
    idx = 0
    with vision.PoseLandmarker.create_from_options(options) as landmarker:
        while True:
            ok, bgr = cap.read()
            if not ok:
                break
            if idx % max(1, args.stride) != 0:
                idx += 1
                continue
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            t_ms = int(round((idx / fps) * 1000))
            result = landmarker.detect_for_video(mp_image, t_ms)
            landmarks = [None] * 33
            if result.pose_landmarks:
                pose = result.pose_landmarks[0]
                for i, lm in enumerate(pose):
                    landmarks[i] = {
                        "x": float(lm.x),
                        "y": float(lm.y),
                        "z": float(lm.z),
                        "visibility": float(getattr(lm, "visibility", 1.0) or 1.0),
                    }
            frames_out.append({"tMs": t_ms, "landmarks": landmarks})
            idx += 1
    cap.release()

    dump = {
        "exerciseId": args.exercise,
        "fps": fps,
        "cameraHint": args.camera,
        "label": os.path.basename(args.video),
        "frames": frames_out,
    }
    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(dump, f, ensure_ascii=False)
        f.write("\n")
    print(f"wrote {out} frames={len(frames_out)} fps={fps:.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
