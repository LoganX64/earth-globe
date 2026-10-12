import { describe, it, expect } from 'vitest';
import { formatLat, formatLng, formatLatLng } from './coordinates';

describe('formatLat', () => {
  it('labels northern latitudes N', () => {
    expect(formatLat(19.076)).toBe('19.0760° N');
    expect(formatLat(34.1526)).toBe('34.1526° N');
  });

  // The defect this replaces rendered -33.8688 as "33.8688° N".
  it('labels southern latitudes S', () => {
    expect(formatLat(-33.8688)).toBe('33.8688° S');
    expect(formatLat(-1)).toBe('1.0000° S');
  });

  it('treats zero as positive, matching the rest of the app', () => {
    expect(formatLat(0)).toBe('0.0000° N');
  });

  it('always uses the absolute value', () => {
    expect(formatLat(-90)).toBe('90.0000° S');
    expect(formatLat(90)).toBe('90.0000° N');
  });

  it('pads to four decimals', () => {
    expect(formatLat(1.5)).toBe('1.5000° N');
  });
});

describe('formatLng', () => {
  it('labels eastern longitudes E and western W', () => {
    expect(formatLng(72.8777)).toBe('72.8777° E');
    // -122 used to render as "122.0000° E".
    expect(formatLng(-122.4194)).toBe('122.4194° W');
    expect(formatLng(-0.1278)).toBe('0.1278° W');
  });

  it('treats zero as positive', () => {
    expect(formatLng(0)).toBe('0.0000° E');
  });
});

describe('formatLatLng', () => {
  it('joins both halves', () => {
    expect(formatLatLng(19.076, 72.8777)).toBe('19.0760° N, 72.8777° E');
  });

  it('handles a mixed-sign pair', () => {
    expect(formatLatLng(-33.8688, 151.2093)).toBe('33.8688° S, 151.2093° E');
  });

  it('handles a both-negative pair', () => {
    expect(formatLatLng(-33.8688, -70.6693)).toBe('33.8688° S, 70.6693° W');
  });
});