import { rngFor } from "@/lib/mock/rng";

// A deterministic, visually representative QR pattern generated from the
// target URL — not a scannable code, just a stand-in for a real QR asset.
export function QRCodeVisual({ value, size = 120 }: { value: string; size?: number }) {
  const grid = 21;
  const cell = size / grid;
  const rng = rngFor(value);
  const cells: boolean[][] = Array.from({ length: grid }, () => Array.from({ length: grid }, () => rng() > 0.55));

  const stampFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        cells[r0 + r][c0 + c] = isBorder || isCore;
      }
    }
  };
  stampFinder(0, 0);
  stampFinder(0, grid - 7);
  stampFinder(grid - 7, 0);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-[8px] bg-white p-1" role="img" aria-label="QR code">
      <rect width={size} height={size} fill="white" />
      {cells.map((row, r) =>
        row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#14403d" /> : null
        )
      )}
    </svg>
  );
}
