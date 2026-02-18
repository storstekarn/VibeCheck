import { useMemo } from 'react';
import type { ReportSummary } from '../types';

interface CrawlingBugsProps {
  summary: ReportSummary;
  /** Ref to the container element so bugs crawl within content area */
  containerWidth?: number;
}

interface BugSprite {
  id: number;
  size: number;
  emoji: string;
  axis: 'horizontal' | 'vertical';
  duration: number;
  delay: number;
  yPercent: number;
  xSide: 'left' | 'right';
  opacity: number;
}

export function CrawlingBugs({ summary }: CrawlingBugsProps) {
  const sprites = useMemo(() => {
    const bugs: BugSprite[] = [];
    let id = 0;

    const criticalCount = Math.min(summary.critical, 3);
    const warningCount = Math.min(summary.warnings, 3);
    const infoCount = Math.min(summary.info, 2);

    // Critical — big bugs, crawl horizontally across content
    for (let i = 0; i < criticalCount; i++) {
      bugs.push({
        id: id++,
        size: 18,
        emoji: '🐛',
        axis: 'horizontal',
        duration: 14 + i * 5,
        delay: i * 3,
        yPercent: 8 + i * 30,
        xSide: i % 2 === 0 ? 'left' : 'right',
        opacity: 0.6,
      });
    }

    // Warning — medium ladybugs, mix of horizontal and vertical
    for (let i = 0; i < warningCount; i++) {
      bugs.push({
        id: id++,
        size: 14,
        emoji: '🐞',
        axis: i % 2 === 0 ? 'horizontal' : 'vertical',
        duration: 18 + i * 4,
        delay: 2 + i * 5,
        yPercent: 20 + i * 25,
        xSide: i % 2 === 0 ? 'right' : 'left',
        opacity: 0.5,
      });
    }

    // Info — tiny ants, crawl vertically along sides
    for (let i = 0; i < infoCount; i++) {
      bugs.push({
        id: id++,
        size: 10,
        emoji: '🐜',
        axis: 'vertical',
        duration: 22 + i * 3,
        delay: 4 + i * 7,
        yPercent: 15 + i * 40,
        xSide: i % 2 === 0 ? 'left' : 'right',
        opacity: 0.45,
      });
    }

    return bugs;
  }, [summary]);

  if (sprites.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {sprites.map((sprite) => (
        <div
          key={sprite.id}
          className="absolute bug-sprite"
          style={{
            fontSize: sprite.size,
            top: `${sprite.yPercent}%`,
            [sprite.xSide]: sprite.axis === 'horizontal' ? 0 : '2%',
            opacity: sprite.opacity,
            '--crawl-anim': sprite.axis === 'horizontal' ? 'crawl-horizontal' : 'crawl-vertical',
            '--duration': `${sprite.duration}s`,
            '--delay': `${sprite.delay}s`,
            '--start-x': '-20px',
            '--end-x': 'calc(100% - 30px)',
            '--start-y': '-10px',
            '--end-y': '300px',
          } as React.CSSProperties}
        >
          {sprite.emoji}
        </div>
      ))}
    </div>
  );
}
