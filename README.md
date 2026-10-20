# Fitness Coach

On-device fitness coaching: the phone camera tracks your pose, counts reps, and cues form. **iOS / Android only.** The WeChat miniprogram was dropped in 2026-09-07 and is not in this tree.

## Docs

| Doc | What |
|-----|------|
| [docs/PRD.md](docs/PRD.md) | Product requirements |
| [docs/MODULES.md](docs/MODULES.md) | Modules and dependencies |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Roadmap |
| [docs/VERIFICATION.md](docs/VERIFICATION.md) | Verification (VT) |
| [docs/exercises/](docs/exercises/) | Per-exercise rules |

Business logic (validation, phases, counting) lives in `packages/core`, not in the UI layer.

## Repo layout

```
fitness-coach/
├── docs/
├── packages/       # core / pose-native / render / ui
├── apps/mobile/    # Expo app (the product)
├── apps/server/    # optional account API (phone stores data locally by default)
├── tools/          # trajectory extract / ingest
└── media/          # local clip sources (large videos are gitignored)
```

## Quick start

Need Node 24 (see `.nvmrc` if present) and [pnpm](https://pnpm.io) 9.

```bash
pnpm install
pnpm run build

# Metro for a Dev Client already on device
pnpm --filter @fitness-coach/mobile start
# Same Wi-Fi: http://<LAN_IP>:8081
```

Pose uses native MediaPipe. **Expo Go cannot run the training screen.** Use a Development Build or an EAS binary. After native module changes:

```bash
pnpm --filter @fitness-coach/mobile exec expo run:ios --device
# or: expo run:android --device
```

More in [apps/mobile/README.md](apps/mobile/README.md).

## Status

Coachable exercises run on device in the App. Counting rules and the stroke engine are separate (see PRD §5.2). Sample demo clips live under `apps/mobile/assets/samples/`.

## License

MIT. Demo clips and third-party models keep their own licenses where noted under `apps/mobile/assets/`.
