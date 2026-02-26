/**
 * CHM Service Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { chmService } from './chmService';

describe('chmService', () => {
  describe('isSupported', () => {
    it('should return false as CHM is not supported', () => {
      expect(chmService.isSupported()).toBe(false);
    });
  });

  describe('getUnsupportedReason', () => {
    it('should return a meaningful error message', () => {
      const reason = chmService.getUnsupportedReason();
      expect(reason).toContain('CHM format is not currently supported');
      expect(reason).toContain('convert');
    });
  });

  describe('extractChmMetadata', () => {
    it('should throw an error indicating CHM is not supported', () => {
      const arrayBuffer = new ArrayBuffer(10);
      expect(() => chmService.extractChmMetadata(arrayBuffer)).toThrow(
        'CHM format is not currently supported'
      );
    });
  });

  describe('extractChmContent', () => {
    it('should throw an error when trying to extract CHM content', async () => {
      const arrayBuffer = new ArrayBuffer(10);
      await expect(chmService.extractChmContent(arrayBuffer)).rejects.toThrow(
        'CHM format is not currently supported'
      );
    });
  });

  describe('isValidChm', () => {
    it('should return false for any input', () => {
      const arrayBuffer = new ArrayBuffer(10);
      expect(chmService.isValidChm(arrayBuffer)).toBe(false);
    });
  });

  describe('getConversionTools', () => {
    it('should return a list of conversion tools', () => {
      const tools = chmService.getConversionTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      tools.forEach((tool) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('url');
        expect(tool).toHaveProperty('description');
      });
    });

    it('should include Calibre in conversion tools', () => {
      const tools = chmService.getConversionTools();
      const calibre = tools.find((t) => t.name === 'Calibre');

      expect(calibre).toBeDefined();
      expect(calibre?.url).toContain('calibre');
    });

    it('should include Online-Convert in conversion tools', () => {
      const tools = chmService.getConversionTools();
      const onlineConvert = tools.find((t) => t.name === 'Online-Convert');

      expect(onlineConvert).toBeDefined();
      expect(onlineConvert?.url).toContain('online-convert');
    });
  });

  describe('parseChm', () => {
    it('should throw an error when trying to parse CHM', async () => {
      const arrayBuffer = new ArrayBuffer(10);
      await expect(chmService.parseChm(arrayBuffer)).rejects.toThrow(
        'CHM format is not currently supported'
      );
    });
  });
});
