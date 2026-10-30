const COLOURS = ['#ff3d81', '#ffb42e', '#27d3c3', '#ffe14d', '#ff7a1a', '#c08bff'];

/** CSS string lights that hang under the sticky header. */
export function StringLights() {
  const bulbs = Array.from({ length: 40 }, (_, i) => i);
  return (
    <div aria-hidden="true" className="pointer-events-none relative h-4 overflow-hidden">
      <svg className="absolute inset-x-0 top-0 h-3 w-full" preserveAspectRatio="none" viewBox="0 0 400 12">
        <path d="M0 2 Q 10 10 20 2 T 40 2 T 60 2 T 80 2 T 100 2 T 120 2 T 140 2 T 160 2 T 180 2 T 200 2 T 220 2 T 240 2 T 260 2 T 280 2 T 300 2 T 320 2 T 340 2 T 360 2 T 380 2 T 400 2" fill="none" stroke="#3d2a5a" strokeWidth="1" />
      </svg>
      <div className="absolute inset-x-0 top-0 flex justify-between px-1">
        {bulbs.map((i) => {
          const c = COLOURS[i % COLOURS.length]!;
          return (
            <span
              key={i}
              className="mt-1 block h-2 w-1.5 animate-twinkle rounded-b-full"
              style={{ background: c, boxShadow: `0 0 6px 1px ${c}`, animationDelay: `${(i % 7) * 0.33}s` }}
            />
          );
        })}
      </div>
    </div>
  );
}
