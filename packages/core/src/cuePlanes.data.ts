/**
 * 从 docs/exercises/camera-planes/specs.json 抽出的纠错机位。
 * 运行时只用来决定某条纠错开不开。祖父动作不在此表，只按关键点是否看得见过滤。
 * 重新生成：node 读 specs.json 的 cuePlanes，不要手改。
 */

export type CuePlane = "front" | "side" | "three_quarter";

export interface CuePlaneRow {
  ruleId: string;
  planes: readonly CuePlane[];
}

export const CUE_PLANES_BY_EXERCISE = {
  "db-fly": [
    {
      "ruleId": "fly-depth",
      "planes": [
        "front",
        "three_quarter"
      ]
    }
  ],
  "dip": [
    {
      "ruleId": "dip-depth",
      "planes": [
        "front",
        "three_quarter"
      ]
    },
    {
      "ruleId": "torso-lean",
      "planes": [
        "three_quarter"
      ]
    }
  ],
  "incline-pushup": [
    {
      "ruleId": "body-line",
      "planes": [
        "side"
      ]
    },
    {
      "ruleId": "pushup-depth",
      "planes": [
        "side"
      ]
    },
    {
      "ruleId": "elbow-flare",
      "planes": [
        "front"
      ]
    }
  ],
  "cable-crossover": [
    {
      "ruleId": "crossover-depth",
      "planes": [
        "front"
      ]
    }
  ],
  "chest-press-machine": [
    {
      "ruleId": "press-depth",
      "planes": [
        "side",
        "three_quarter"
      ]
    }
  ],
  "lateral-raise": [
    {
      "ruleId": "raise-height",
      "planes": [
        "front"
      ]
    }
  ],
  "front-raise": [
    {
      "ruleId": "raise-height",
      "planes": [
        "side"
      ]
    }
  ],
  "rear-delt-fly": [
    {
      "ruleId": "fly-depth",
      "planes": [
        "three_quarter",
        "side"
      ]
    }
  ],
  "face-pull": [
    {
      "ruleId": "pull-height",
      "planes": [
        "three_quarter",
        "front"
      ]
    }
  ],
  "pike-pushup": [
    {
      "ruleId": "elbow-depth",
      "planes": [
        "side"
      ]
    },
    {
      "ruleId": "pike-line",
      "planes": [
        "side"
      ]
    }
  ],
  "lat-pulldown": [
    {
      "ruleId": "pull-depth",
      "planes": [
        "front",
        "side",
        "three_quarter"
      ]
    }
  ],
  "seated-row": [
    {
      "ruleId": "row-depth",
      "planes": [
        "side"
      ]
    }
  ],
  "superman": [
    {
      "ruleId": "lift-height",
      "planes": [
        "side"
      ]
    }
  ],
  "band-row": [
    {
      "ruleId": "row-depth",
      "planes": [
        "side"
      ]
    }
  ],
  "leg-press": [
    {
      "ruleId": "knee-depth",
      "planes": [
        "side",
        "three_quarter"
      ]
    }
  ],
  "calf-raise": [
    {
      "ruleId": "ankle-rom",
      "planes": [
        "side"
      ]
    }
  ],
  "goblet-squat": [
    {
      "ruleId": "squat-depth",
      "planes": [
        "side"
      ]
    },
    {
      "ruleId": "torso-lean",
      "planes": [
        "side"
      ]
    }
  ],
  "dead-bug": [
    {
      "ruleId": "lumbar-contact",
      "planes": [
        "side"
      ]
    }
  ],
  "bird-dog": [
    {
      "ruleId": "hip-level",
      "planes": [
        "side",
        "three_quarter"
      ]
    }
  ],
  "crunch": [
    {
      "ruleId": "crunch-height",
      "planes": [
        "side"
      ]
    }
  ],
  "side-plank": [
    {
      "ruleId": "side-line",
      "planes": [
        "front"
      ]
    }
  ],
  "hanging-knee-raise": [
    {
      "ruleId": "knee-height",
      "planes": [
        "side"
      ]
    }
  ],
  "incline-bench-press": [
    {
      "ruleId": "press-depth",
      "planes": [
        "side"
      ]
    }
  ],
  "decline-bench-press": [
    {
      "ruleId": "press-depth",
      "planes": [
        "side"
      ]
    }
  ],
  "db-bench-press": [
    {
      "ruleId": "press-depth",
      "planes": [
        "side",
        "three_quarter"
      ]
    }
  ],
  "close-grip-bench": [
    {
      "ruleId": "press-depth",
      "planes": [
        "side"
      ]
    }
  ],
  "pec-deck": [
    {
      "ruleId": "fly-depth",
      "planes": [
        "front"
      ]
    }
  ],
  "decline-pushup": [
    {
      "ruleId": "body-line",
      "planes": [
        "side"
      ]
    },
    {
      "ruleId": "pushup-depth",
      "planes": [
        "side"
      ]
    }
  ],
  "floor-press": [
    {
      "ruleId": "press-depth",
      "planes": [
        "side"
      ]
    }
  ],
  "landmine-press": [
    {
      "ruleId": "press-lockout",
      "planes": [
        "three_quarter",
        "side"
      ]
    }
  ],
  "squeeze-press": [
    {
      "ruleId": "press-depth",
      "planes": [
        "three_quarter"
      ]
    }
  ],
  "kneeling-pushup": [
    {
      "ruleId": "body-line",
      "planes": [
        "side"
      ]
    },
    {
      "ruleId": "pushup-depth",
      "planes": [
        "side"
      ]
    }
  ],
  "diamond-pushup": [
    {
      "ruleId": "pushup-depth",
      "planes": [
        "side"
      ]
    }
  ],
  "seated-db-press": [
    {
      "ruleId": "press-lockout",
      "planes": [
        "side"
      ]
    }
  ],
  "arnold-press": [
    {
      "ruleId": "press-rotation",
      "planes": [
        "three_quarter",
        "front"
      ]
    }
  ],
  "shrug": [
    {
      "ruleId": "shrug-height",
      "planes": [
        "front"
      ]
    }
  ],
  "reverse-pec-deck": [
    {
      "ruleId": "fly-depth",
      "planes": [
        "front"
      ]
    }
  ],
  "machine-shoulder-press": [
    {
      "ruleId": "press-lockout",
      "planes": [
        "side"
      ]
    }
  ],
  "push-press": [
    {
      "ruleId": "dip-drive",
      "planes": [
        "side"
      ]
    }
  ],
  "barbell-row": [
    {
      "ruleId": "row-depth",
      "planes": [
        "side"
      ]
    },
    {
      "ruleId": "torso-angle",
      "planes": [
        "side"
      ]
    }
  ],
  "t-bar-row": [
    {
      "ruleId": "row-depth",
      "planes": [
        "side"
      ]
    }
  ],
  "chest-supported-row": [
    {
      "ruleId": "row-depth",
      "planes": [
        "side"
      ]
    }
  ],
  "inverted-row": [
    {
      "ruleId": "body-line",
      "planes": [
        "side"
      ]
    },
    {
      "ruleId": "row-depth",
      "planes": [
        "side"
      ]
    }
  ],
  "straight-arm-pulldown": [
    {
      "ruleId": "arc-depth",
      "planes": [
        "side"
      ]
    }
  ],
  "db-pullover": [
    {
      "ruleId": "pullover-rom",
      "planes": [
        "side"
      ]
    }
  ],
  "good-morning": [
    {
      "ruleId": "hinge",
      "planes": [
        "side"
      ]
    }
  ],
  "back-extension": [
    {
      "ruleId": "extension-height",
      "planes": [
        "side"
      ]
    }
  ],
  "renegade-row": [
    {
      "ruleId": "hip-square",
      "planes": [
        "three_quarter",
        "front"
      ]
    }
  ],
  "band-pull-apart": [
    {
      "ruleId": "open-width",
      "planes": [
        "front"
      ]
    }
  ],
  "machine-high-row": [
    {
      "ruleId": "row-depth",
      "planes": [
        "three_quarter"
      ]
    }
  ],
  "prone-y-raise": [
    {
      "ruleId": "raise-height",
      "planes": [
        "three_quarter"
      ]
    }
  ],
  "barbell-curl": [
    {
      "ruleId": "curl-rom",
      "planes": [
        "side"
      ]
    }
  ],
  "db-curl": [
    {
      "ruleId": "curl-rom",
      "planes": [
        "side"
      ]
    }
  ],
  "hammer-curl": [
    {
      "ruleId": "curl-rom",
      "planes": [
        "side"
      ]
    }
  ],
  "preacher-curl": [
    {
      "ruleId": "curl-rom",
      "planes": [
        "side"
      ]
    }
  ],
  "incline-db-curl": [
    {
      "ruleId": "curl-rom",
      "planes": [
        "side"
      ]
    }
  ],
  "concentration-curl": [
    {
      "ruleId": "curl-rom",
      "planes": [
        "side"
      ]
    }
  ],
  "cable-curl": [
    {
      "ruleId": "curl-rom",
      "planes": [
        "side"
      ]
    }
  ],
  "reverse-curl": [
    {
      "ruleId": "curl-rom",
      "planes": [
        "side"
      ]
    }
  ],
  "skull-crusher": [
    {
      "ruleId": "elbow-rom",
      "planes": [
        "side"
      ]
    }
  ],
  "tricep-pushdown": [
    {
      "ruleId": "elbow-rom",
      "planes": [
        "side"
      ]
    }
  ],
  "overhead-tricep-extension": [
    {
      "ruleId": "elbow-rom",
      "planes": [
        "side"
      ]
    }
  ],
  "tricep-kickback": [
    {
      "ruleId": "elbow-rom",
      "planes": [
        "side"
      ]
    }
  ],
  "bench-dip": [
    {
      "ruleId": "dip-depth",
      "planes": [
        "side"
      ]
    }
  ],
  "machine-tricep-extension": [
    {
      "ruleId": "elbow-rom",
      "planes": [
        "side"
      ]
    }
  ],
  "deadlift": [
    {
      "ruleId": "bar-path",
      "planes": [
        "side"
      ]
    },
    {
      "ruleId": "lockout",
      "planes": [
        "side"
      ]
    }
  ],
  "trap-bar-deadlift": [
    {
      "ruleId": "lockout",
      "planes": [
        "side"
      ]
    }
  ],
  "hip-thrust": [
    {
      "ruleId": "hip-lockout",
      "planes": [
        "side"
      ]
    }
  ],
  "bulgarian-split-squat": [
    {
      "ruleId": "front-knee",
      "planes": [
        "side"
      ]
    }
  ],
  "split-squat": [
    {
      "ruleId": "front-knee",
      "planes": [
        "side"
      ]
    }
  ],
  "step-up": [
    {
      "ruleId": "drive-leg",
      "planes": [
        "side"
      ]
    }
  ],
  "leg-extension": [
    {
      "ruleId": "knee-rom",
      "planes": [
        "side"
      ]
    }
  ],
  "lying-leg-curl": [
    {
      "ruleId": "knee-rom",
      "planes": [
        "side"
      ]
    }
  ],
  "seated-leg-curl": [
    {
      "ruleId": "knee-rom",
      "planes": [
        "side"
      ]
    }
  ],
  "hack-squat": [
    {
      "ruleId": "squat-depth",
      "planes": [
        "side"
      ]
    }
  ],
  "front-squat": [
    {
      "ruleId": "squat-depth",
      "planes": [
        "side"
      ]
    },
    {
      "ruleId": "torso-upright",
      "planes": [
        "side"
      ]
    }
  ],
  "seated-calf-raise": [
    {
      "ruleId": "ankle-rom",
      "planes": [
        "side"
      ]
    }
  ],
  "hip-abduction": [
    {
      "ruleId": "abduction-width",
      "planes": [
        "front"
      ]
    }
  ],
  "hip-adduction": [
    {
      "ruleId": "adduction-close",
      "planes": [
        "front"
      ]
    }
  ],
  "nordic-curl": [
    {
      "ruleId": "torso-line",
      "planes": [
        "side"
      ]
    }
  ],
  "kettlebell-swing": [
    {
      "ruleId": "hinge-snap",
      "planes": [
        "side"
      ]
    }
  ],
  "glute-kickback": [
    {
      "ruleId": "hip-extension",
      "planes": [
        "side"
      ]
    }
  ],
  "cable-pull-through": [
    {
      "ruleId": "hinge",
      "planes": [
        "side"
      ]
    }
  ],
  "single-leg-rdl": [
    {
      "ruleId": "hinge",
      "planes": [
        "side"
      ]
    }
  ],
  "pistol-squat": [
    {
      "ruleId": "squat-depth",
      "planes": [
        "side"
      ]
    }
  ],
  "cossack-squat": [
    {
      "ruleId": "side-depth",
      "planes": [
        "front"
      ]
    }
  ],
  "lateral-lunge": [
    {
      "ruleId": "side-depth",
      "planes": [
        "front"
      ]
    }
  ],
  "curtsy-lunge": [
    {
      "ruleId": "cross-depth",
      "planes": [
        "three_quarter"
      ]
    }
  ],
  "thruster": [
    {
      "ruleId": "squat-to-press",
      "planes": [
        "side"
      ]
    }
  ],
  "wall-sit": [
    {
      "ruleId": "knee-angle",
      "planes": [
        "side"
      ]
    }
  ],
  "single-leg-glute-bridge": [
    {
      "ruleId": "hip-lockout",
      "planes": [
        "side"
      ]
    }
  ],
  "frog-pump": [
    {
      "ruleId": "hip-lockout",
      "planes": [
        "side"
      ]
    }
  ],
  "sissy-squat": [
    {
      "ruleId": "knee-travel",
      "planes": [
        "side"
      ]
    }
  ],
  "rack-pull": [
    {
      "ruleId": "lockout",
      "planes": [
        "side"
      ]
    }
  ],
  "russian-twist": [
    {
      "ruleId": "rotation",
      "planes": [
        "front"
      ]
    }
  ],
  "hanging-leg-raise": [
    {
      "ruleId": "leg-height",
      "planes": [
        "side"
      ]
    }
  ],
  "ab-wheel": [
    {
      "ruleId": "rollout-line",
      "planes": [
        "side"
      ]
    }
  ],
  "cable-crunch": [
    {
      "ruleId": "crunch-flex",
      "planes": [
        "side"
      ]
    }
  ],
  "sit-up": [
    {
      "ruleId": "sit-height",
      "planes": [
        "side"
      ]
    }
  ],
  "v-up": [
    {
      "ruleId": "v-close",
      "planes": [
        "side"
      ]
    }
  ],
  "hollow-hold": [
    {
      "ruleId": "hollow-shape",
      "planes": [
        "side"
      ]
    }
  ],
  "mountain-climber": [
    {
      "ruleId": "knee-drive",
      "planes": [
        "side"
      ]
    }
  ],
  "bicycle-crunch": [
    {
      "ruleId": "elbow-knee",
      "planes": [
        "three_quarter",
        "front"
      ]
    }
  ],
  "woodchop": [
    {
      "ruleId": "chop-arc",
      "planes": [
        "three_quarter"
      ]
    }
  ],
  "pallof-press": [
    {
      "ruleId": "anti-rotation",
      "planes": [
        "front"
      ]
    }
  ],
  "reverse-crunch": [
    {
      "ruleId": "hip-curl",
      "planes": [
        "side"
      ]
    }
  ],
  "flutter-kick": [
    {
      "ruleId": "low-leg",
      "planes": [
        "side"
      ]
    }
  ],
  "toe-touch": [
    {
      "ruleId": "reach-height",
      "planes": [
        "side"
      ]
    }
  ],
  "side-crunch": [
    {
      "ruleId": "side-flex",
      "planes": [
        "front"
      ]
    }
  ],
  "machine-crunch": [
    {
      "ruleId": "crunch-flex",
      "planes": [
        "side"
      ]
    }
  ],
  "captain-chair-knee-raise": [
    {
      "ruleId": "knee-height",
      "planes": [
        "side"
      ]
    }
  ],
  "plank-shoulder-tap": [
    {
      "ruleId": "hip-square",
      "planes": [
        "front"
      ]
    }
  ],
  "plank-hip-dip": [
    {
      "ruleId": "hip-dip",
      "planes": [
        "front"
      ]
    }
  ],
  "dead-hang": [
    {
      "ruleId": "hang-still",
      "planes": [
        "front"
      ]
    }
  ],
  "l-sit": [
    {
      "ruleId": "l-shape",
      "planes": [
        "side"
      ]
    }
  ],
  "windshield-wiper": [
    {
      "ruleId": "wipe-arc",
      "planes": [
        "front"
      ]
    }
  ],
  "landmine-rotation": [
    {
      "ruleId": "rotation",
      "planes": [
        "front"
      ]
    }
  ],
  "heel-tap": [
    {
      "ruleId": "side-reach",
      "planes": [
        "front"
      ]
    }
  ],
  "decline-sit-up": [
    {
      "ruleId": "sit-height",
      "planes": [
        "side"
      ]
    }
  ],
  "copenhagen-plank": [
    {
      "ruleId": "side-line",
      "planes": [
        "front"
      ]
    }
  ],
  "scissor-kick": [
    {
      "ruleId": "scissor-amp",
      "planes": [
        "side"
      ]
    }
  ]
} as Readonly<Record<string, readonly CuePlaneRow[]>>;

export function cuePlanesFor(exerciseId: string): readonly CuePlaneRow[] | undefined {
  return CUE_PLANES_BY_EXERCISE[exerciseId];
}
