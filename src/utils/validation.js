const validator = require('validator');
const { ValidationError } = require('./errors');

/**
 * Input validation utilities
 */

/**
 * Validate and sanitize primary keyword
 */
const validatePrimaryKeyword = (keyword) => {
  if (!keyword || typeof keyword !== 'string') {
    throw new ValidationError('Primary keyword is required and must be a string', 'primaryKeyword');
  }
  
  const sanitized = validator.escape(keyword.trim());
  
  if (sanitized.length < 2) {
    throw new ValidationError('Primary keyword must be at least 2 characters long', 'primaryKeyword');
  }
  
  if (sanitized.length > 100) {
    throw new ValidationError('Primary keyword must be less than 100 characters', 'primaryKeyword');
  }
  
  // Check for potentially harmful content
  if (validator.contains(sanitized.toLowerCase(), 'script') || 
      validator.contains(sanitized.toLowerCase(), '<') ||
      validator.contains(sanitized.toLowerCase(), '>')) {
    throw new ValidationError('Primary keyword contains invalid characters', 'primaryKeyword');
  }
  
  return sanitized;
};

/**
 * Validate canonical URL
 */
const validateCanonicalUrl = (url) => {
  if (!url || typeof url !== 'string') {
    throw new ValidationError('Canonical URL is required and must be a string', 'canonicalUrl');
  }
  
  const trimmedUrl = url.trim();
  
  if (!validator.isURL(trimmedUrl, { 
    protocols: ['http', 'https'],
    require_protocol: true 
  })) {
    throw new ValidationError('Invalid canonical URL format', 'canonicalUrl');
  }
  
  // Check for common security issues
  if (trimmedUrl.includes('javascript:') || 
      trimmedUrl.includes('data:') ||
      trimmedUrl.includes('vbscript:')) {
    throw new ValidationError('Canonical URL contains invalid protocol', 'canonicalUrl');
  }
  
  return trimmedUrl;
};

/**
 * Validate hreflang URLs
 */
const validateHreflangUrls = (hreflangUrls) => {
  if (!hreflangUrls) {
    return {};
  }
  
  if (typeof hreflangUrls === 'string') {
    try {
      hreflangUrls = JSON.parse(hreflangUrls);
    } catch (error) {
      throw new ValidationError('Invalid hreflang URLs JSON format', 'hreflangUrls');
    }
  }
  
  if (typeof hreflangUrls !== 'object' || Array.isArray(hreflangUrls)) {
    throw new ValidationError('Hreflang URLs must be an object', 'hreflangUrls');
  }
  
  const validatedUrls = {};
  const validLanguageCodes = /^[a-z]{2}(-[A-Z]{2})?$/; // ISO 639-1 format
  
  Object.entries(hreflangUrls).forEach(([lang, url]) => {
    // Validate language code
    if (!validLanguageCodes.test(lang)) {
      throw new ValidationError(`Invalid language code: ${lang}`, 'hreflangUrls');
    }
    
    // Validate URL
    if (!validator.isURL(url, { 
      protocols: ['http', 'https'],
      require_protocol: true 
    })) {
      throw new ValidationError(`Invalid URL for language ${lang}: ${url}`, 'hreflangUrls');
    }
    
    validatedUrls[lang] = url;
  });
  
  return validatedUrls;
};

/**
 * Validate secondary keywords
 */
const validateSecondaryKeywords = (keywords) => {
  if (!keywords) {
    return [];
  }
  
  let keywordArray;
  
  if (typeof keywords === 'string') {
    keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
  } else if (Array.isArray(keywords)) {
    keywordArray = keywords.filter(k => typeof k === 'string' && k.trim().length > 0);
  } else {
    throw new ValidationError('Secondary keywords must be a string or array', 'secondaryKeywords');
  }
  
  if (keywordArray.length > 20) {
    throw new ValidationError('Maximum 20 secondary keywords allowed', 'secondaryKeywords');
  }
  
  return keywordArray.map(keyword => {
    const sanitized = validator.escape(keyword.trim());
    
    if (sanitized.length > 50) {
      throw new ValidationError(`Secondary keyword too long: ${keyword}`, 'secondaryKeywords');
    }
    
    return sanitized;
  });
};

/**
 * Validate focus areas
 */
const validateFocusAreas = (areas) => {
  if (!areas) {
    return [];
  }
  
  let areaArray;
  
  if (typeof areas === 'string') {
    areaArray = areas.split(',').map(a => a.trim()).filter(a => a.length > 0);
  } else if (Array.isArray(areas)) {
    areaArray = areas.filter(a => typeof a === 'string' && a.trim().length > 0);
  } else {
    throw new ValidationError('Focus areas must be a string or array', 'focusAreas');
  }
  
  if (areaArray.length > 10) {
    throw new ValidationError('Maximum 10 focus areas allowed', 'focusAreas');
  }
  
  return areaArray.map(area => {
    const sanitized = validator.escape(area.trim());
    
    if (sanitized.length > 30) {
      throw new ValidationError(`Focus area too long: ${area}`, 'focusAreas');
    }
    
    return sanitized;
  });
};

/**
 * Validate brand name
 */
const validateBrandName = (brandName) => {
  if (!brandName || typeof brandName !== 'string') {
    throw new ValidationError('Brand name is required and must be a string', 'brandName');
  }
  
  const sanitized = validator.escape(brandName.trim());
  
  if (sanitized.length < 2) {
    throw new ValidationError('Brand name must be at least 2 characters long', 'brandName');
  }
  
  if (sanitized.length > 100) {
    throw new ValidationError('Brand name must be less than 100 characters', 'brandName');
  }
  
  return sanitized;
};

/**
 * Validate API key format
 */
const validateApiKey = (apiKey) => {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new ValidationError('API key is required', 'apiKey');
  }
  
  const trimmed = apiKey.trim();
  
  // OpenAI API key format validation
  if (!trimmed.startsWith('sk-') || trimmed.length < 20) {
    throw new ValidationError('Invalid API key format', 'apiKey');
  }
  
  return trimmed;
};

/**
 * Comprehensive input validation
 */
const validateGenerationParams = (params) => {
  const validated = {
    primaryKeyword: validatePrimaryKeyword(params.primaryKeyword),
    canonicalUrl: validateCanonicalUrl(params.canonicalUrl),
    hreflangUrls: validateHreflangUrls(params.hreflangUrls),
    secondaryKeywords: validateSecondaryKeywords(params.secondaryKeywords),
    focusAreas: validateFocusAreas(params.focusAreas),
    brandName: validateBrandName(params.brandName)
  };
  
  // Optional parameters
  if (params.outputDir) {
    validated.outputDir = params.outputDir.trim();
  }
  
  return validated;
};

/**
 * Sanitize HTML content to prevent XSS
 */
const sanitizeHtml = (html) => {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  // Basic HTML sanitization - remove script tags and dangerous attributes
  let sanitized = html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '') // Remove event handlers with double quotes
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '') // Remove event handlers with single quotes
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '') // Remove unquoted event handlers
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href=""') // Remove javascript: in href
    .replace(/href\s*=\s*["']vbscript:[^"']*["']/gi, 'href=""') // Remove vbscript: in href
    .replace(/href\s*=\s*["']data:[^"']*["']/gi, 'href=""') // Remove data: in href
    .replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""') // Remove javascript: in src
    .replace(/src\s*=\s*["']data:[^"']*["']/gi, 'src=""') // Remove data: in src
    .replace(/javascript:/gi, '') // Remove any remaining javascript: references
    .replace(/vbscript:/gi, '') // Remove any remaining vbscript: references
    .replace(/data:/gi, ''); // Remove any remaining data: references
  
  return sanitized;
};

module.exports = {
  validatePrimaryKeyword,
  validateCanonicalUrl,
  validateHreflangUrls,
  validateSecondaryKeywords,
  validateFocusAreas,
  validateBrandName,
  validateApiKey,
  validateGenerationParams,
  sanitizeHtml
};
