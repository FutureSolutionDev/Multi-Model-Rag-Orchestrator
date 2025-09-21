export async function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  label = "op"
): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error(`Timeout: ${label} (${ms}ms)`)), ms)
    ),
  ]);
}

export function cosineSim(a?: number[] | null, b?: number[] | null): number {
  try {
    if (!Array.isArray(a) || !Array.isArray(b)) return Number.NEGATIVE_INFINITY;
    const n = Math.min(a.length, b.length);
    if (n === 0) return Number.NEGATIVE_INFINITY;
    let dot = 0,
      na = 0,
      nb = 0;
    for (let i = 0; i < n; i++) {
      const ai = a[i] ?? 0;
      const bi = b[i] ?? 0;
      dot += ai * bi;
      na += ai * ai;
      nb += bi * bi;
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb) + 1e-9;
    return dot / denom;
  } catch (error) {
    console.log(error);
    return 0;
  }
}
