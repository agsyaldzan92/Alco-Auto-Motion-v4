import fs from 'fs';
import path from 'path';

/**
 * Server-only helper to verify if a hook font TTF file is present on disk.
 * Kept separate from browser-imported configs to prevent bundler 'fs/path' externalization warnings.
 */
export function checkHookFontResolved(fontFileName: string): boolean {
  try {
    const localFontPath = path.join(process.cwd(), 'public', 'fonts', fontFileName);
    const systemFontPath = path.join('/usr/share/fonts/truetype/custom', fontFileName);
    return fs.existsSync(localFontPath) || fs.existsSync(systemFontPath);
  } catch (e) {
    return false;
  }
}
