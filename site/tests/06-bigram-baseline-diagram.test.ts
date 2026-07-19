import { describe, expect, it } from 'vitest';

describe('bigram baseline fixture', () => {
  it('documents the smoothed row values', () => {
    expect([0.2, 0.6, 0.2].reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
});
