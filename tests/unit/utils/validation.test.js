const {
  validatePrimaryKeyword,
  validateCanonicalUrl,
  validateHreflangUrls,
  validateSecondaryKeywords,
  validateFocusAreas,
  validateBrandName,
  validateApiKey,
  validateGenerationParams,
  sanitizeHtml
} = require('../../../src/utils/validation');

const { ValidationError } = require('../../../src/utils/errors');

describe('Validation Utils', () => {
  beforeEach(() => {
    mockConsole();
  });

  afterEach(() => {
    restoreConsole();
  });

  describe('validatePrimaryKeyword', () => {
    it('should validate correct primary keyword', () => {
      const result = validatePrimaryKeyword('Paribahis');
      expect(result).toBe('Paribahis');
    });

    it('should throw error for empty keyword', () => {
      expect(() => validatePrimaryKeyword('')).toThrow(ValidationError);
      expect(() => validatePrimaryKeyword(null)).toThrow(ValidationError);
    });

    it('should throw error for too short keyword', () => {
      expect(() => validatePrimaryKeyword('a')).toThrow(ValidationError);
    });

    it('should throw error for too long keyword', () => {
      const longKeyword = 'a'.repeat(101);
      expect(() => validatePrimaryKeyword(longKeyword)).toThrow(ValidationError);
    });

    it('should sanitize and validate keyword with special characters', () => {
      const result = validatePrimaryKeyword('Paribahis & Casino');
      expect(result).toBe('Paribahis &amp; Casino');
    });

    it('should throw error for potentially harmful content', () => {
      expect(() => validatePrimaryKeyword('<script>alert("xss")</script>')).toThrow(ValidationError);
    });
  });

  describe('validateCanonicalUrl', () => {
    it('should validate correct URL', () => {
      const result = validateCanonicalUrl('https://example.com');
      expect(result).toBe('https://example.com');
    });

    it('should throw error for invalid URL', () => {
      expect(() => validateCanonicalUrl('not-a-url')).toThrow(ValidationError);
      expect(() => validateCanonicalUrl('')).toThrow(ValidationError);
      expect(() => validateCanonicalUrl(null)).toThrow(ValidationError);
    });

    it('should throw error for dangerous protocols', () => {
      expect(() => validateCanonicalUrl('javascript:alert("xss")')).toThrow(ValidationError);
      expect(() => validateCanonicalUrl('data:text/html,<script>alert("xss")</script>')).toThrow(ValidationError);
    });

    it('should accept both http and https', () => {
      expect(validateCanonicalUrl('http://example.com')).toBe('http://example.com');
      expect(validateCanonicalUrl('https://example.com')).toBe('https://example.com');
    });
  });

  describe('validateHreflangUrls', () => {
    it('should validate correct hreflang object', () => {
      const input = {
        'tr': 'https://tr.example.com',
        'en': 'https://en.example.com'
      };
      const result = validateHreflangUrls(input);
      expect(result).toEqual(input);
    });

    it('should parse JSON string', () => {
      const jsonString = '{"tr":"https://tr.example.com","en":"https://en.example.com"}';
      const result = validateHreflangUrls(jsonString);
      expect(result).toEqual({
        'tr': 'https://tr.example.com',
        'en': 'https://en.example.com'
      });
    });

    it('should return empty object for null/undefined', () => {
      expect(validateHreflangUrls(null)).toEqual({});
      expect(validateHreflangUrls(undefined)).toEqual({});
    });

    it('should throw error for invalid language codes', () => {
      const input = { 'invalid-lang': 'https://example.com' };
      expect(() => validateHreflangUrls(input)).toThrow(ValidationError);
    });

    it('should throw error for invalid URLs', () => {
      const input = { 'tr': 'not-a-url' };
      expect(() => validateHreflangUrls(input)).toThrow(ValidationError);
    });
  });

  describe('validateSecondaryKeywords', () => {
    it('should validate array of keywords', () => {
      const result = validateSecondaryKeywords(['casino', 'betting', 'sports']);
      expect(result).toEqual(['casino', 'betting', 'sports']);
    });

    it('should parse comma-separated string', () => {
      const result = validateSecondaryKeywords('casino, betting, sports');
      expect(result).toEqual(['casino', 'betting', 'sports']);
    });

    it('should return empty array for null/undefined', () => {
      expect(validateSecondaryKeywords(null)).toEqual([]);
      expect(validateSecondaryKeywords(undefined)).toEqual([]);
    });

    it('should throw error for too many keywords', () => {
      const manyKeywords = new Array(21).fill('keyword');
      expect(() => validateSecondaryKeywords(manyKeywords)).toThrow(ValidationError);
    });

    it('should filter out empty keywords', () => {
      const result = validateSecondaryKeywords(['casino', '', 'betting', '   ']);
      expect(result).toEqual(['casino', 'betting']);
    });
  });

  describe('validateFocusAreas', () => {
    it('should validate array of areas', () => {
      const result = validateFocusAreas(['security', 'mobile', 'bonus']);
      expect(result).toEqual(['security', 'mobile', 'bonus']);
    });

    it('should parse comma-separated string', () => {
      const result = validateFocusAreas('security, mobile, bonus');
      expect(result).toEqual(['security', 'mobile', 'bonus']);
    });

    it('should return empty array for null/undefined', () => {
      expect(validateFocusAreas(null)).toEqual([]);
      expect(validateFocusAreas(undefined)).toEqual([]);
    });

    it('should throw error for too many areas', () => {
      const manyAreas = new Array(11).fill('area');
      expect(() => validateFocusAreas(manyAreas)).toThrow(ValidationError);
    });
  });

  describe('validateBrandName', () => {
    it('should validate correct brand name', () => {
      const result = validateBrandName('Paribahis Resmi');
      expect(result).toBe('Paribahis Resmi');
    });

    it('should throw error for empty brand name', () => {
      expect(() => validateBrandName('')).toThrow(ValidationError);
      expect(() => validateBrandName(null)).toThrow(ValidationError);
    });

    it('should throw error for too short brand name', () => {
      expect(() => validateBrandName('a')).toThrow(ValidationError);
    });

    it('should sanitize brand name', () => {
      const result = validateBrandName('Brand & Company');
      expect(result).toBe('Brand &amp; Company');
    });
  });

  describe('validateApiKey', () => {
    it('should validate correct API key', () => {
      const result = validateApiKey('sk-proj-1234567890abcdef');
      expect(result).toBe('sk-proj-1234567890abcdef');
    });

    it('should throw error for invalid API key format', () => {
      expect(() => validateApiKey('invalid-key')).toThrow(ValidationError);
      expect(() => validateApiKey('sk-')).toThrow(ValidationError);
      expect(() => validateApiKey('')).toThrow(ValidationError);
      expect(() => validateApiKey(null)).toThrow(ValidationError);
    });
  });

  describe('validateGenerationParams', () => {
    const validParams = {
      primaryKeyword: 'Paribahis',
      canonicalUrl: 'https://example.com',
      brandName: 'Paribahis Resmi'
    };

    it('should validate complete params object', () => {
      const result = validateGenerationParams(validParams);
      expect(result.primaryKeyword).toBe('Paribahis');
      expect(result.canonicalUrl).toBe('https://example.com');
      expect(result.brandName).toBe('Paribahis Resmi');
    });

    it('should handle optional parameters', () => {
      const paramsWithOptional = {
        ...validParams,
        hreflangUrls: { 'tr': 'https://tr.example.com' },
        secondaryKeywords: 'casino,betting',
        focusAreas: 'security,mobile'
      };

      const result = validateGenerationParams(paramsWithOptional);
      expect(result.hreflangUrls).toEqual({ 'tr': 'https://tr.example.com' });
      expect(result.secondaryKeywords).toEqual(['casino', 'betting']);
      expect(result.focusAreas).toEqual(['security', 'mobile']);
    });

    it('should throw error for missing required params', () => {
      expect(() => validateGenerationParams({})).toThrow(ValidationError);
      expect(() => validateGenerationParams({ primaryKeyword: 'test' })).toThrow(ValidationError);
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const html = '<div>Content</div><script>alert("xss")</script>';
      const result = sanitizeHtml(html);
      expect(result).toBe('<div>Content</div>');
    });

    it('should remove event handlers', () => {
      const html = '<div onclick="alert(\'xss\')">Content</div>';
      const result = sanitizeHtml(html);
      expect(result).toBe('<div>Content</div>');
    });

    it('should remove dangerous protocols', () => {
      const html = '<a href="javascript:alert(\'xss\')">Link</a>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('javascript:');
      expect(result).toContain('Link');
    });

    it('should return empty string for invalid input', () => {
      expect(sanitizeHtml(null)).toBe('');
      expect(sanitizeHtml(undefined)).toBe('');
      expect(sanitizeHtml('')).toBe('');
    });

    it('should preserve safe HTML', () => {
      const html = '<div class="content"><p>Safe content</p></div>';
      const result = sanitizeHtml(html);
      expect(result).toBe(html);
    });
  });
});
