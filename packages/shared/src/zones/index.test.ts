import { describe, expect, it } from 'vitest';
import { FASTING_ZONES, getCurrentFastingZone, getCurrentZoneProgress } from './index';

describe('fasting zones', () => {
  it('returns expected zones by elapsed hours', () => {
    expect(getCurrentFastingZone(2 * 3600).name).toBe('Fed State');
    expect(getCurrentFastingZone(6 * 3600).name).toBe('Early Fasting');
    expect(getCurrentFastingZone(10 * 3600).name).toBe('Fat Burning');
    expect(getCurrentFastingZone(14 * 3600).name).toBe('Ketosis Beginning');
    expect(getCurrentFastingZone(20 * 3600).name).toBe('Deep Ketosis');
    expect(getCurrentFastingZone(30 * 3600).name).toBe('Autophagy Possible');
  });

  it('returns progress inside a bounded zone', () => {
    const progress = getCurrentZoneProgress(10 * 3600); // 8..12h zone
    expect(progress).toBeCloseTo(0.5, 2);
  });

  it('returns full progress for open-ended zone', () => {
    expect(getCurrentZoneProgress(30 * 3600)).toBe(1);
  });

  it('zones remain sorted by starting hour', () => {
    const starts = FASTING_ZONES.map((zone) => zone.startHour);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });
});
