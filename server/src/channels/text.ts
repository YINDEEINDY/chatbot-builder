/**
 * Button labels: LINE quick reply and Messenger cap at 20 characters.
 * Cut at Thai word boundaries (never between a consonant and its tone mark, never right after
 * a leading vowel เ แ โ ใ ไ), falling back to whole graphemes for one over-long word.
 */
const seg = (s: string, granularity: 'word' | 'grapheme') =>
  [...new Intl.Segmenter('th', { granularity }).segment(s)].map((x) => x.segment);

export const clipLabel = (s: string, max = 20) => {
  if ([...s].length <= max) return s;
  const room = max - 1; // leave space for "…"; counted in code points, which is what the platforms limit
  let out = '';
  for (const w of seg(s, 'word')) {
    if ([...out + w].length > room) break;
    out += w;
  }
  if (!out.trim()) {
    for (const g of seg(s, 'grapheme')) {
      if ([...out + g].length > room) break;
      out += g;
    }
  }
  return out.trimEnd() + '…';
};

/**
 * Options written into the question as a numbered list. Shown where buttons are not:
 * Instagram/LINE on desktop, Messenger on some desktop surfaces, and after quick replies
 * vanish (they disappear once tapped or when the next message arrives). The bot accepts
 * a typed number. Keep in sync with client/src/components/flow-builder/platformMock.tsx.
 */
export const withNumbers = (text: string, labels: string[]) =>
  labels.length ? `${text}\n\n${labels.map((l, i) => `${i + 1}. ${l}`).join('\n')}` : text;
