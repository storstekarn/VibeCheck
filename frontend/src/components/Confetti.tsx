import { useMemo } from 'react';

const COLORS = ['#fcb900', '#32373c', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'];

interface ConfettiProps {
  count?: number;
}

export function Confetti({ count = 30 }: ConfettiProps) {
  const pieces = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: COLORS[i % COLORS.length],
      duration: 1 + Math.random() * 1.5,
      delay: Math.random() * 0.8,
      rotation: Math.random() * 360,
      size: 4 + Math.random() * 5,
    }));
  }, [count]);

  return (
    <div className="absolute inset-x-0 top-0 h-32 pointer-events-none overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            width: p.size,
            height: p.size * 0.6,
            '--fall-duration': `${p.duration}s`,
            '--fall-delay': `${p.delay}s`,
            transform: `rotate(${p.rotation}deg)`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
