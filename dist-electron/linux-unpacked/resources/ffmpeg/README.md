# Bundled FFmpeg Binaries for ALCO Auto Motion Desktop

Place your native FFmpeg binaries in this directory for standalone desktop distribution:

- Windows:
  - `resources/ffmpeg/ffmpeg.exe`
  - `resources/ffmpeg/ffprobe.exe`
- macOS:
  - `resources/ffmpeg/ffmpeg`
  - `resources/ffmpeg/ffprobe`
- Linux:
  - `resources/ffmpeg/ffmpeg`
  - `resources/ffmpeg/ffprobe`

## Automatic Detection Architecture

When the Electron application boots:
1. `electron/main.cjs` checks if `ffmpeg.exe` / `ffprobe.exe` exist in this `resources/ffmpeg/` directory (or in `process.resourcesPath/ffmpeg`).
2. If found, Electron sets `process.env.FFMPEG_PATH` and `process.env.FFPROBE_PATH` for the child server process.
3. `src/server/mp4Renderer.ts` resolves these environment variables with highest priority.
4. If not bundled, the server falls back to:
   - System PATH (`ffmpeg`, `ffprobe`)
   - Standard OS installation paths (`/usr/bin/ffmpeg`, `C:\ffmpeg\bin\ffmpeg.exe`, etc.)
   - FFmpeg.wasm browser fallback (`public/ffmpeg/ffmpeg-core.*`)
