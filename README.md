# Dunning-Kruger 3D

62-second vertical (1080×1920, 30fps, 1860 frames) 3D explainer of the
Dunning-Kruger Effect, built with Remotion + Three.js. English narration.

A robot walks the Dunning-Kruger curve in 6 cinematic camera shots: hook,
Mount Stupid, crane pull-back over the chasm, drop into the Valley of
Despair, climb up the Slope of Enlightenment, and a wide panoramic outro
with the end card *"So, where on the curve are you right now?"*

## Structure

```
public/
  character.glb      <- NOT committed; downloaded by the workflow (see below)
  voiceover-dk.mp3   <- NOT committed; reassembled from audio-parts/ by the workflow
src/
  Root.tsx               Composition DunningKruger3D (1860 frames, 30fps, 1080x1920)
  DunningKrugerScene.tsx Multi-shot camera director + scene
  curveMath.ts           Curve coordinates (Mount Stupid / Valley / Slope)
  CharacterModel.tsx     .glb loader + frame-accurate animation sync
  EnvironmentProps.tsx   Track, sign posts, rain, books, mastery pillars
scripts/
  render-chunk.mjs       Chunked render (GitHub Actions), software ANGLE
audio-parts/
  voiceover-dk.mp3.b64.part-00   Base64 of the English voiceover (1 part)
```

## Assets

- **Character:** `RobotExpressive.glb` — © Google, CC-BY 4.0. Khronos removed
  it from glTF-Sample-Assets, so the workflow downloads it from the three.js
  examples mirror:
  `https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb`
  Animation mapping (verified against the file's 14 clips):
  Idle_Smug→Idle, Run→Running, Victory→Dance, Fall→Death, Walk→Walking,
  Idle_Happy→Wave.
- **Voiceover:** English, 58.1s. The last ~4s of the video are a silent outro
  (wide pan + end card); the audio is intentionally not stretched.

## Render

Rendering runs on GitHub Actions (chunked, 8 chunks, then concat + audio
mux). The workflow file `.github/workflows/render.yml` is added via the
GitHub web UI — see `render.yml` in this folder for the exact content.
Trigger it with **Actions → Render Dunning-Kruger 3D → Run workflow**.
The final mp4 is the `DunningKruger3D` artifact.

Local render is intentionally not used for this project.
