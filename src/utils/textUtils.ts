// Fix common corrupted ligatures and font artifacts
export function fixLigatures(text: string): string {
  return text
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/ﬀ/g, 'ff')
    .replace(/ﬃ/g, 'ffi')
    .replace(/ﬄ/g, 'ffl')
    .replace(/# ?t/g, 'fit')
    .replace(/# ?n/g, 'fin')
    .replace(/# ?ne/g, 'fine')
    .replace(/# ?rst/gi, 'first')
    .replace(/# ?ll/g, 'fill')
    .replace(/# ?eld/gi, 'field')
    .replace(/! ?aw/gi, 'flaw')
    .replace(/# ?nal/gi, 'final')
    .replace(/# ?exible/gi, 'flexible')
    .replace(/# ?cient/gi, 'ficient')
    .replace(/#/, 'fi')
    .replace(/!/, 'fl');
}

// Log non-standard glyphs for debugging
export function logSuspiciousGlyphs(text: string, seen = new Set<string>()) {
  const suspicious = text.match(/[^ -~\n\r\t]/g);
  if (!suspicious) return;

  for (const char of suspicious) {
    if (!seen.has(char)) {
      console.warn(`Unrecognized character: '${char}' (code ${char.charCodeAt(0)})`);
      seen.add(char);
    }
  }
}
