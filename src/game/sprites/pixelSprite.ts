export type PixelPalette = Record<string, string>;

export interface CompiledSprite {
  width: number;
  height: number;
  right: HTMLCanvasElement;
  left: HTMLCanvasElement;
}

/**
 * Compiles an ASCII pixel-art matrix into cached 1x offscreen canvases
 * (both right-facing and mirrored left-facing) for crisp, zero-blur blitting.
 */
export function compilePixelSprite(
  rows: string[],
  palette: PixelPalette
): CompiledSprite {
  const height = rows.length;
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);

  const right = document.createElement('canvas');
  right.width = width;
  right.height = height;
  const rCtx = right.getContext('2d')!;
  rCtx.imageSmoothingEnabled = false;

  const left = document.createElement('canvas');
  left.width = width;
  left.height = height;
  const lCtx = left.getContext('2d')!;
  lCtx.imageSmoothingEnabled = false;

  for (let y = 0; y < height; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (!color) continue;

      rCtx.fillStyle = color;
      rCtx.fillRect(x, y, 1, 1);

      lCtx.fillStyle = color;
      lCtx.fillRect(width - 1 - x, y, 1, 1);
    }
  }

  return { width, height, right, left };
}
