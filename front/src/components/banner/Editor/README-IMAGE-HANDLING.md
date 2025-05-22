# Image Handling in Banner Editor Components

This document explains how images are handled throughout the banner editor components, to help with maintenance and troubleshooting.

## Overview 

The banner editor can handle multiple image formats and sources:

1. Blob URLs (`blob:http://...`) - In-memory images, typically from file uploads or canvas operations
2. Server images (`/templates/images/...`) - Stored template images 
3. Direct images (`/direct-image/...`) - Alternative path for the same server images
4. Data URLs (`data:image/...`) - Base64 encoded inline images
5. External URLs (`https://...`) - Images from external sources

## Key Components

### 1. BannerPreview.jsx

Provides a preview of how the banner will look on the website. The `getImageUrl` function handles:
- Special handling for blob URLs (no cache busting)
- Multiple fallback strategies when images fail to load
- Conversion between direct-image and templates/images paths
- ObjectURL management to prevent memory leaks

### 2. ComponentRenderer.jsx

Renders individual components within the editor canvas. Key features:
- The `getImageInfo` function categorizes image types (blob, server, etc.)
- Visual indicators show the image source type
- Special handling for blob URLs in the src attribute
- Auto-detection of image dimensions and aspect ratio preservation
- Error handling with fallback placeholders

### 3. BannerCanvas.jsx

The main editing canvas where components can be dragged, resized, etc. Features:
- Handles image file drops with automatic blob URL creation
- Manages global tracking of blob URLs for cleanup
- Memory management for created ObjectURLs
- Resource cleanup on component unmount

### 4. ImageUploader.jsx

Handles the upload and initial processing of images:
- Calculates and stores the aspect ratio of uploaded images
- Provides visual feedback about the detected aspect ratio
- Passes aspect ratio information to parent components
- Maintains cache consistency for image references

## Aspect Ratio Preservation System

The banner editor now includes a comprehensive aspect ratio preservation system:

1. **Detection**: When an image is loaded, its natural aspect ratio is automatically detected using the `naturalWidth` and `naturalHeight` properties.

2. **Global Cache**: A centralized `imageAspectRatioCache` Map stores all aspect ratios indexed by URL:
   ```javascript
   // From imageProcessing.js
   export const imageAspectRatioCache = new Map();
   ```

3. **Visual Indicators**: Images display their aspect ratio (e.g., "1.33:1") in the top-right corner for user awareness.

4. **Consistent Resize**: When resizing an image component:
   - Width changes automatically adjust height to maintain ratio
   - Height changes automatically adjust width to maintain ratio
   - Dragging the resize handle maintains proportions

5. **Data Persistence**: Aspect ratio data is:
   - Stored in the global cache
   - Passed between components via props
   - Attached to DOM elements for easy access
   - Added to style objects as `_aspectRatio`

6. **Utility Functions**:
   - `calculateImageAspectRatio()`: Gets ratio from an image element
   - `saveAspectRatioToCache()`: Stores ratio in global cache
   - `getAspectRatioFromCache()`: Retrieves ratio from cache
   - `calculateDimensionsWithAspectRatio()`: Maintains proportions during resize

## Common Issues and Solutions

### Image Not Showing in Preview

Troubleshooting steps:
1. Check browser console for image loading errors
2. Verify that blob URLs are not being modified with cache busting parameters
3. Check if fallback loading strategies are correctly configured
4. Verify CORS settings if loading from external domains

### Memory Leaks

Prevention measures:
1. All blob URLs are tracked in global storage (`window._blobUrls` and `window._objectUrls`)
2. Cleanup is performed on component unmount
3. Maximum limit of cached ObjectURLs to prevent excessive memory usage

### Image Dimension Issues

Solutions implemented:
1. Explicit dimension handling for all image types
2. Automatic preservation of aspect ratio when only one dimension is specified
3. Minimum dimensions enforced for visibility
4. Special handling for percentage dimensions
5. Visual indicators showing current aspect ratio and dimensions

## URL Resolution Priority

When determining which URL to use for an image, the components follow this priority:

1. `_previewUrl` from the component's device-specific style
2. Temporary file reference (`__IMAGE_REF__`) with ObjectURL creation
3. URL from component content (handling various formats)
4. Fallback placeholder for error cases

## Best Practices

When modifying these components:

1. Never add cache busting to blob URLs
2. Always provide fallback mechanisms for failed image loads
3. Include proper cleanup for any created ObjectURLs
4. Maintain special handling for different URL types
5. Keep console logging for easier debugging
6. Always preserve aspect ratio when resizing images
7. Use the global aspect ratio cache for consistency
8. Add appropriate visual indicators for aspect ratio