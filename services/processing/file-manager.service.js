const BaseService = require('../base/base.service');
const fs = require('fs').promises;
const path = require('path');
const { FileSystemError } = require('../../src/utils/errors');

/**
 * File Manager Service
 * Handles file operations and additional file generation
 * Refactored with production-ready architecture and comprehensive logging
 */
class FileManagerService extends BaseService {
  constructor(config = {}) {
    super(config);
    
    this.config = {
      encoding: 'utf-8',
      backupEnabled: false,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedExtensions: ['.html', '.css', '.js', '.txt', '.xml', '.json'],
      ...config
    };

    this.operationStats = {
      filesCreated: 0,
      filesUpdated: 0,
      filesDeleted: 0,
      totalBytesWritten: 0,
      errors: 0
    };
  }

  /**
   * Generate additional files for the website
   * @param {string} outputDir - Output directory
   * @param {object} params - Generation parameters
   * @returns {Promise<Array>} - Array of created files
   */
  async generateAdditionalFiles(outputDir, params) {
    this.logOperation('generateAdditionalFiles', { 
      outputDir,
      brandName: params.brandName,
      primaryKeyword: params.primaryKeyword
    });

    const startTime = Date.now();
    const createdFiles = [];

    try {
      // Ensure output directory exists
      await this.ensureDirectory(outputDir);

      // Generate robots.txt
      const robotsFile = await this.generateRobotsTxt(outputDir, params);
      createdFiles.push(robotsFile);

      // Generate sitemap.xml
      const sitemapFile = await this.generateSitemap(outputDir, params);
      createdFiles.push(sitemapFile);

      // Generate manifest.json (PWA support)
      const manifestFile = await this.generateManifest(outputDir, params);
      createdFiles.push(manifestFile);

      // Generate .htaccess (if configured)
      if (this.config.generateHtaccess) {
        const htaccessFile = await this.generateHtaccess(outputDir, params);
        createdFiles.push(htaccessFile);
      }

      // Generate security.txt
      const securityFile = await this.generateSecurityTxt(outputDir, params);
      createdFiles.push(securityFile);

      const duration = Date.now() - startTime;

      this.logOperation('Additional files generation completed', { 
        duration,
        filesCreated: createdFiles.length,
        totalSize: createdFiles.reduce((sum, file) => sum + (file.size || 0), 0)
      });

      return createdFiles;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.operationStats.errors++;
      this.logError('generateAdditionalFiles', error, { outputDir, duration });
      
      throw new FileSystemError(
        `Additional files generation failed: ${error.message}`, 
        'generate', 
        outputDir
      );
    }
  }

  /**
   * Generate robots.txt file
   * @param {string} outputDir - Output directory
   * @param {object} params - Generation parameters
   * @returns {Promise<object>} - File creation result
   */
  async generateRobotsTxt(outputDir, params) {
    this.logOperation('Generating robots.txt');

    const siteUrl = params.siteUrl || 'https://example.com';
    const content = `# Robots.txt for ${params.brandName}
# Generated on ${new Date().toISOString()}

User-agent: *
Allow: /

# Sitemaps
Sitemap: ${siteUrl}/sitemap.xml

# Disallow admin and sensitive areas
Disallow: /admin/
Disallow: /private/
Disallow: /.git/
Disallow: /node_modules/

# Crawl delay (be respectful)
Crawl-delay: 1

# Host directive (preferred domain)
Host: ${new URL(siteUrl).hostname}`;

    return await this.writeFile(outputDir, 'robots.txt', content, {
      description: 'Search engine crawler instructions'
    });
  }

  /**
   * Generate sitemap.xml file
   * @param {string} outputDir - Output directory
   * @param {object} params - Generation parameters
   * @returns {Promise<object>} - File creation result
   */
  async generateSitemap(outputDir, params) {
    this.logOperation('Generating sitemap.xml');

    const siteUrl = params.siteUrl || 'https://example.com';
    const lastmod = new Date().toISOString().split('T')[0];
    
    const content = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  
  <!-- Homepage -->
  <url>
    <loc>${siteUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Main gambling pages -->
  <url>
    <loc>${siteUrl}/${params.primaryKeyword.toLowerCase().replace(/\s+/g, '-')}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Secondary keyword pages -->
  ${params.secondaryKeywords ? params.secondaryKeywords.map(keyword => `
  <url>
    <loc>${siteUrl}/${keyword.toLowerCase().replace(/\s+/g, '-')}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('') : ''}
  
  <!-- Legal pages -->
  <url>
    <loc>${siteUrl}/terms-and-conditions</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  
  <url>
    <loc>${siteUrl}/privacy-policy</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  
  <url>
    <loc>${siteUrl}/responsible-gambling</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

</urlset>`;

    return await this.writeFile(outputDir, 'sitemap.xml', content, {
      description: 'XML sitemap for search engines'
    });
  }

  /**
   * Generate manifest.json for PWA support
   * @param {string} outputDir - Output directory
   * @param {object} params - Generation parameters
   * @returns {Promise<object>} - File creation result
   */
  async generateManifest(outputDir, params) {
    this.logOperation('Generating manifest.json');

    const manifest = {
      name: `${params.brandName} - ${params.primaryKeyword}`,
      short_name: params.brandName,
      description: `Professional ${params.primaryKeyword} platform by ${params.brandName}`,
      start_url: "/",
      display: "standalone",
      background_color: "#1a1a1a",
      theme_color: "#ff6b35",
      orientation: "portrait-primary",
      categories: ["gambling", "entertainment", "sports"],
      lang: "tr",
      scope: "/",
      icons: [
        {
          src: "icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: "icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ]
    };

    const content = JSON.stringify(manifest, null, 2);

    return await this.writeFile(outputDir, 'manifest.json', content, {
      description: 'Progressive Web App manifest'
    });
  }

  /**
   * Generate .htaccess file for Apache servers
   * @param {string} outputDir - Output directory
   * @param {object} params - Generation parameters
   * @returns {Promise<object>} - File creation result
   */
  async generateHtaccess(outputDir, params) {
    this.logOperation('Generating .htaccess');

    const content = `# .htaccess for ${params.brandName}
# Generated on ${new Date().toISOString()}

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Set cache headers
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/webp "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"
</IfModule>

# Force HTTPS
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>

# Custom error pages
ErrorDocument 404 /404.html
ErrorDocument 500 /500.html`;

    return await this.writeFile(outputDir, '.htaccess', content, {
      description: 'Apache server configuration'
    });
  }

  /**
   * Generate security.txt file
   * @param {string} outputDir - Output directory
   * @param {object} params - Generation parameters
   * @returns {Promise<object>} - File creation result
   */
  async generateSecurityTxt(outputDir, params) {
    this.logOperation('Generating security.txt');

    const content = `# Security.txt for ${params.brandName}
# Generated on ${new Date().toISOString()}

Contact: security@${params.brandName.toLowerCase().replace(/\s+/g, '')}.com
Expires: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()}
Preferred-Languages: tr, en
Policy: https://${params.brandName.toLowerCase().replace(/\s+/g, '')}.com/security-policy
Acknowledgments: https://${params.brandName.toLowerCase().replace(/\s+/g, '')}.com/security-acknowledgments

# Encryption key
# Please use our PGP key for sensitive communications
Encryption: https://${params.brandName.toLowerCase().replace(/\s+/g, '')}.com/pgp-key.txt

# Responsible disclosure
# We follow a responsible disclosure policy
# Please allow 90 days for remediation before public disclosure`;

    // Create .well-known directory
    const wellKnownDir = path.join(outputDir, '.well-known');
    await this.ensureDirectory(wellKnownDir);

    return await this.writeFile(wellKnownDir, 'security.txt', content, {
      description: 'Security contact information'
    });
  }

  /**
   * Write file with error handling and statistics tracking
   * @param {string} directory - Directory path
   * @param {string} filename - File name
   * @param {string} content - File content
   * @param {object} metadata - Additional metadata
   * @returns {Promise<object>} - File creation result
   */
  async writeFile(directory, filename, content, metadata = {}) {
    const filepath = path.join(directory, filename);
    
    try {
      this.logOperation('Writing file', { filename, size: content.length });

      // Validate file extension if configured
      if (this.config.allowedExtensions.length > 0) {
        const ext = path.extname(filename).toLowerCase();
        if (ext && !this.config.allowedExtensions.includes(ext)) {
          throw new Error(`File extension '${ext}' not allowed`);
        }
      }

      // Check file size limits
      if (content.length > this.config.maxFileSize) {
        throw new Error(`File size exceeds limit (${this.config.maxFileSize} bytes)`);
      }

      // Create backup if enabled
      if (this.config.backupEnabled && await this.fileExists(filepath)) {
        await this.createBackup(filepath);
      }

      // Write file
      await fs.writeFile(filepath, content, this.config.encoding);

      // Get file stats
      const stats = await fs.stat(filepath);

      // Update statistics
      this.operationStats.filesCreated++;
      this.operationStats.totalBytesWritten += stats.size;

      const result = {
        filename,
        filepath,
        size: stats.size,
        formattedSize: this.formatBytes(stats.size),
        created: stats.birthtime,
        encoding: this.config.encoding,
        ...metadata
      };

      this.logOperation('File written successfully', result);
      return result;

    } catch (error) {
      this.operationStats.errors++;
      this.logError('File write failed', error, { filename, directory });
      throw new FileSystemError(`Failed to write file '${filename}': ${error.message}`, 'write', filepath);
    }
  }

  /**
   * Check if file exists
   * @param {string} filepath - File path
   * @returns {Promise<boolean>} - True if file exists
   */
  async fileExists(filepath) {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create backup of existing file
   * @param {string} filepath - Original file path
   * @returns {Promise<void>}
   */
  async createBackup(filepath) {
    const backupPath = `${filepath}.backup.${Date.now()}`;
    
    try {
      await fs.copyFile(filepath, backupPath);
      this.logOperation('Backup created', { original: filepath, backup: backupPath });
    } catch (error) {
      this.logError('Backup creation failed', error, { filepath });
      // Don't throw - backup failure shouldn't stop the main operation
    }
  }

  /**
   * Ensure directory exists
   * @param {string} directory - Directory path
   * @returns {Promise<void>}
   */
  async ensureDirectory(directory) {
    try {
      await fs.mkdir(directory, { recursive: true });
      this.logOperation('Directory ensured', { directory });
    } catch (error) {
      throw new FileSystemError(`Failed to create directory: ${error.message}`, 'create', directory);
    }
  }

  /**
   * Format bytes to human readable string
   * @param {number} bytes - Number of bytes
   * @returns {string} - Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get operation statistics
   * @returns {object} - Current operation statistics
   */
  getOperationStats() {
    return {
      ...this.operationStats,
      formattedTotalBytes: this.formatBytes(this.operationStats.totalBytesWritten),
      successRate: this.operationStats.filesCreated > 0 
        ? Math.round((this.operationStats.filesCreated / (this.operationStats.filesCreated + this.operationStats.errors)) * 100)
        : 0
    };
  }

  /**
   * Clean up old backup files
   * @param {string} directory - Directory to clean
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {Promise<number>} - Number of files cleaned
   */
  async cleanupBackups(directory, maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days default
    try {
      const files = await fs.readdir(directory);
      const backupFiles = files.filter(file => file.includes('.backup.'));
      let cleaned = 0;

      for (const file of backupFiles) {
        const filepath = path.join(directory, file);
        const stats = await fs.stat(filepath);
        
        if (Date.now() - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filepath);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logOperation('Backup cleanup completed', { cleaned, directory });
      }

      return cleaned;

    } catch (error) {
      this.logError('Backup cleanup failed', error, { directory });
      return 0;
    }
  }

  /**
   * Validate file content before writing
   * @param {string} content - Content to validate
   * @param {string} type - Content type (html, xml, json, etc.)
   * @returns {boolean} - True if valid
   */
  validateContent(content, type) {
    try {
      switch (type) {
        case 'json':
          JSON.parse(content);
          break;
        case 'xml':
          // Basic XML validation (in production, use a proper XML parser)
          if (!content.includes('<?xml') || !content.includes('>')) {
            return false;
          }
          break;
        case 'html':
          if (!content.includes('<') || !content.includes('>')) {
            return false;
          }
          break;
      }
      return true;
    } catch (error) {
      this.logError('Content validation failed', error, { type });
      return false;
    }
  }
}

module.exports = FileManagerService;
