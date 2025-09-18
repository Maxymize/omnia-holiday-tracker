// Utility functions for handling company logo in reports

export async function getCompanyLogo(systemSettings: Record<string, any> = {}): Promise<string | null> {
  try {
    // First check if logo is in system settings
    const logoFromSettings = systemSettings['company.logo'] ||
                            systemSettings['company_logo'] ||
                            systemSettings['branding.logo'] ||
                            systemSettings['customization.logo'];

    if (logoFromSettings) {
      // If it's already a base64 string, return it
      if (logoFromSettings.startsWith('data:image/')) {
        return logoFromSettings;
      }

      // If it's a filename only, prepend uploads path
      if (!logoFromSettings.startsWith('http') && !logoFromSettings.startsWith('/')) {
        const logoPath = `/uploads/${logoFromSettings}`;
        return await fetchImageAsBase64(logoPath);
      }

      // If it's a URL or path, fetch it and convert to base64
      if (logoFromSettings.startsWith('http') || logoFromSettings.startsWith('/')) {
        return await fetchImageAsBase64(logoFromSettings);
      }
    }

    // Fallback: try to fetch from uploads directory and common logo locations
    const commonLogoPaths = [
      '/uploads/company-logo.png',
      '/uploads/logo.png',
      '/uploads/company-logo.jpg',
      '/uploads/logo.jpg',
      '/uploads/company-logo.jpeg',
      '/uploads/logo.jpeg',
      '/uploads/company-logo.svg',
      '/uploads/logo.svg',
      '/.netlify/blobs/company-logo.png',
      '/.netlify/blobs/logo.png'
    ];

    for (const path of commonLogoPaths) {
      try {
        const logoBase64 = await fetchImageAsBase64(path);
        if (logoBase64) {
          return logoBase64;
        }
      } catch (error) {
        // Continue to next path if this one fails
        continue;
      }
    }

    return null;
  } catch (error) {
    console.warn('Failed to load company logo:', error);
    return null;
  }
}

// Convert image URL/path to base64, handling SVG conversion for PDF compatibility
async function fetchImageAsBase64(imagePath: string): Promise<string | null> {
  try {
    // Ensure we have a full URL for fetch in server environment
    let fullUrl = imagePath;
    if (imagePath.startsWith('/') && !imagePath.startsWith('//')) {
      // Relative path - convert to absolute URL
      // Try multiple environment variables for base URL
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.SITE_URL ||
        process.env.URL ||
        process.env.NETLIFY_URL ||
        (typeof window !== 'undefined' ? window.location.origin : null) ||
        'http://localhost:3001';

      console.log(`🔧 LOGO UTILS: Converting relative path "${imagePath}" to absolute URL using base: ${baseUrl}`);
      fullUrl = `${baseUrl}${imagePath}`;
    }

    console.log(`🔧 LOGO UTILS: Fetching image from: ${fullUrl}`);
    const response = await fetch(fullUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob = await response.blob();

    // Check if it's an SVG file
    if (blob.type === 'image/svg+xml' || imagePath.toLowerCase().endsWith('.svg')) {
      console.log('SVG logo detected, converting to PNG for PDF compatibility');
      return await convertSvgToPng(blob);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn(`Failed to convert image to base64: ${imagePath}`, error);
    return null;
  }
}

// Convert SVG blob to PNG base64 for PDF compatibility
async function convertSvgToPng(svgBlob: Blob): Promise<string | null> {
  try {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const svgText = reader.result as string;

          // Create an image element from SVG
          const img = new Image();
          img.onload = () => {
            try {
              // Create canvas to draw the image
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');

              if (!ctx) {
                console.warn('Canvas context not available, skipping SVG conversion');
                resolve(null);
                return;
              }

              // Set canvas dimensions (with reasonable defaults for logos)
              canvas.width = img.width || 200;
              canvas.height = img.height || 80;

              // Draw SVG image to canvas
              ctx.drawImage(img, 0, 0);

              // Convert canvas to PNG base64
              const pngBase64 = canvas.toDataURL('image/png');
              resolve(pngBase64);
            } catch (error) {
              console.warn('Failed to convert SVG to PNG:', error);
              resolve(null);
            }
          };

          img.onerror = () => {
            console.warn('Failed to load SVG as image');
            resolve(null);
          };

          // Convert SVG text to data URL
          const svgBase64 = btoa(unescape(encodeURIComponent(svgText)));
          img.src = `data:image/svg+xml;base64,${svgBase64}`;
        } catch (error) {
          console.warn('Error processing SVG:', error);
          resolve(null);
        }
      };

      reader.onerror = () => {
        console.warn('Failed to read SVG blob');
        resolve(null);
      };

      reader.readAsText(svgBlob);
    });
  } catch (error) {
    console.warn('SVG to PNG conversion failed:', error);
    return null;
  }
}

// Get default OmniaGroup logo as fallback
export function getDefaultLogo(): string {
  // Return a simple SVG logo as base64 if no custom logo is found
  const defaultLogoSVG = `
    <svg width="120" height="40" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" fill="#3B82F6" rx="8"/>
      <text x="60" y="25" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">
        OMNIA
      </text>
    </svg>
  `;

  // Convert SVG to base64
  const base64SVG = btoa(unescape(encodeURIComponent(defaultLogoSVG)));
  return `data:image/svg+xml;base64,${base64SVG}`;
}

// Validate if a base64 string is a valid image
export function isValidImageBase64(base64String: string): boolean {
  if (!base64String) return false;

  // Check if it starts with valid image data URL prefix
  const validPrefixes = [
    'data:image/png;base64,',
    'data:image/jpg;base64,',
    'data:image/jpeg;base64,',
    'data:image/gif;base64,',
    'data:image/svg+xml;base64,',
    'data:image/webp;base64,'
  ];

  return validPrefixes.some(prefix => base64String.startsWith(prefix));
}

// Get logo dimensions for proper sizing in reports
export function getLogoMaxDimensions(format: 'pdf' | 'excel'): { maxWidth: number; maxHeight: number } {
  if (format === 'pdf') {
    return {
      maxWidth: 100, // PDF points
      maxHeight: 40   // PDF points
    };
  } else {
    return {
      maxWidth: 200, // Excel pixels
      maxHeight: 80   // Excel pixels
    };
  }
}

// Optimize logo for report usage (resize if needed)
export async function optimizeLogoForReport(
  logoBase64: string,
  format: 'pdf' | 'excel'
): Promise<string> {
  try {
    // Create an image element to get dimensions
    const img = new Image();

    return new Promise((resolve, reject) => {
      img.onload = () => {
        const { maxWidth, maxHeight } = getLogoMaxDimensions(format);

        // If image is within size limits, return as is
        if (img.width <= maxWidth && img.height <= maxHeight) {
          resolve(logoBase64);
          return;
        }

        // Create canvas to resize image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(logoBase64); // Fallback to original if canvas not supported
          return;
        }

        // Calculate new dimensions maintaining aspect ratio
        const aspectRatio = img.width / img.height;
        let newWidth = maxWidth;
        let newHeight = maxWidth / aspectRatio;

        if (newHeight > maxHeight) {
          newHeight = maxHeight;
          newWidth = maxHeight * aspectRatio;
        }

        canvas.width = newWidth;
        canvas.height = newHeight;

        // Draw resized image
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Convert back to base64
        const optimizedBase64 = canvas.toDataURL('image/png');
        resolve(optimizedBase64);
      };

      img.onerror = () => {
        resolve(logoBase64); // Fallback to original if loading fails
      };

      img.src = logoBase64;
    });
  } catch (error) {
    console.warn('Failed to optimize logo:', error);
    return logoBase64; // Return original if optimization fails
  }
}