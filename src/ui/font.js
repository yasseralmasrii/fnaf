// src/ui/font.js
// One place for the pixel font. Use sizes 8, 16, or 24 only, so the text stays sharp.
// Example: this.add.text(10, 10, 'Hello', textStyle(8, '#ffd27f'));

export const FONT = '"Press Start 2P"';

export function textStyle(size = 8, color = '#ffffff', extra = {}) {
  return { fontFamily: FONT, fontSize: `${size}px`, color, ...extra };
}
