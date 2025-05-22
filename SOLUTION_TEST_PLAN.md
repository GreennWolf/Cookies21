# Test Plan: Floating Banner Positioning Solution

## 1. Solution Overview

Our solution for the floating banner positioning problem implements a wrapper-based approach that ensures consistent positioning across different browsers and environments. The key components of this implementation are:

### Key Files:
- **ensureFloatingPosition.js**: Creates a wrapper with fixed positioning that correctly positions the banner in the specified corner with the desired margin.
- **bannerGenerator.service.js**: Generates the HTML with the necessary attributes (data-floating-corner, data-floating-margin) for the positioning wrapper.
- **BannerEditor.jsx**: Manages the UI for setting and saving the corner position and margin values.
- **handleFloatingMarginChange.js**: Ensures proper validation and propagation of margin values.

### Solution Architecture:
1. The banner is given data attributes that store positioning information
2. A wrapper element is dynamically created with correct fixed positioning
3. The banner is placed inside this wrapper with static positioning
4. This approach prevents positioning conflicts with parent elements

## 2. Test Scenarios

### 2.1 Corner Positioning Tests

| Test ID | Description | Test Steps | Expected Result |
|---------|-------------|------------|-----------------|
| CP-1 | Top-Left Corner | 1. Create a banner with floating type<br>2. Set corner to top-left<br>3. Set margin to 20px<br>4. Save and preview | Banner appears in top-left corner with 20px margin from top and left edges |
| CP-2 | Top-Right Corner | 1. Create a banner with floating type<br>2. Set corner to top-right<br>3. Set margin to 20px<br>4. Save and preview | Banner appears in top-right corner with 20px margin from top and right edges |
| CP-3 | Bottom-Left Corner | 1. Create a banner with floating type<br>2. Set corner to bottom-left<br>3. Set margin to 20px<br>4. Save and preview | Banner appears in bottom-left corner with 20px margin from bottom and left edges |
| CP-4 | Bottom-Right Corner | 1. Create a banner with floating type<br>2. Set corner to bottom-right<br>3. Set margin to 20px<br>4. Save and preview | Banner appears in bottom-right corner with 20px margin from bottom and right edges |

### 2.2 Margin Value Tests

| Test ID | Description | Test Steps | Expected Result |
|---------|-------------|------------|-----------------|
| MV-1 | Zero Margin | 1. Create a floating banner<br>2. Set margin to 0px<br>3. Save and preview | Banner appears flush with the screen edges |
| MV-2 | Standard Margin (20px) | 1. Create a floating banner<br>2. Set margin to 20px<br>3. Save and preview | Banner appears with 20px margin from edges |
| MV-3 | Large Margin (50px) | 1. Create a floating banner<br>2. Set margin to 50px<br>3. Save and preview | Banner appears with 50px margin from edges |
| MV-4 | Invalid Margin (negative) | 1. Create a floating banner<br>2. Try to set margin to -10px<br>3. Save and preview | Margin should be clamped to a positive value (20px default) |
| MV-5 | Excessive Margin (>100px) | 1. Create a floating banner<br>2. Try to set margin to 150px<br>3. Save and preview | Margin should be clamped to max value (100px) |

### 2.3 Responsive Tests

| Test ID | Description | Test Steps | Expected Result |
|---------|-------------|------------|-----------------|
| RT-1 | Desktop View | 1. Create a floating banner<br>2. Configure for desktop view<br>3. Save and preview on desktop | Banner appears correctly positioned as specified |
| RT-2 | Tablet View | 1. Switch to tablet view<br>2. Configure floating position<br>3. Save and preview on tablet | Banner appears correctly positioned for tablet size |
| RT-3 | Mobile View | 1. Switch to mobile view<br>2. Configure floating position<br>3. Save and preview on mobile | Banner appears correctly positioned for mobile size |
| RT-4 | Window Resize | 1. Create a floating banner<br>2. Open preview and resize browser window<br>3. Observe banner behavior | Banner maintains correct positioning during and after resize |

### 2.4 Browser Compatibility Tests

| Test ID | Description | Test Steps | Expected Result |
|---------|-------------|------------|-----------------|
| BC-1 | Chrome | Test all corner positions in latest Chrome | Banner appears correctly positioned in all corners |
| BC-2 | Firefox | Test all corner positions in latest Firefox | Banner appears correctly positioned in all corners |
| BC-3 | Safari | Test all corner positions in latest Safari | Banner appears correctly positioned in all corners |
| BC-4 | Edge | Test all corner positions in latest Edge | Banner appears correctly positioned in all corners |
| BC-5 | IE11 Compatibility | Test floating banner in IE11 (if applicable) | Banner appears correctly positioned despite legacy browser limitations |

### 2.5 Integration Tests

| Test ID | Description | Test Steps | Expected Result |
|---------|-------------|------------|-----------------|
| IT-1 | Saved Position Persistence | 1. Create floating banner<br>2. Set position and margin<br>3. Save banner<br>4. Close editor and reopen | Position and margin settings are preserved |
| IT-2 | Script Generation | 1. Create floating banner<br>2. Save banner<br>3. Export script and check code | Generated script includes ensureFloatingPosition function |
| IT-3 | HTML Attributes | 1. Create floating banner<br>2. Save banner<br>3. Check generated HTML | HTML includes all necessary data attributes |
| IT-4 | Layout Type Change | 1. Create standard banner<br>2. Switch to floating type<br>3. Configure corner and margin<br>4. Preview | Banner correctly transitions to floating type with specified position |

### 2.6 Edge Case Tests

| Test ID | Description | Test Steps | Expected Result |
|---------|-------------|------------|-----------------|
| EC-1 | Z-Index Conflicts | 1. Create floating banner<br>2. Preview in page with high z-index elements | Banner appears above other page elements |
| EC-2 | Page with Fixed Elements | 1. Create floating banner<br>2. Preview in page with fixed headers/sidebars | Banner doesn't overlap or get hidden by other fixed elements |
| EC-3 | Page with Transformed Elements | 1. Create floating banner<br>2. Preview in page with CSS transform | Banner position is unaffected by parent transforms |
| EC-4 | Multiple Banners | 1. Create multiple floating banners<br>2. Preview together | Each banner maintains its correct position |

## 3. Debugging Tools

Our solution includes several debugging tools to help troubleshoot positioning issues:

### 3.1 test-modal-visibility.html
This file provides an interactive way to test different modal/floating banner implementations and compare their behavior across browsers.

### 3.2 Debug Attributes in HTML
The generated HTML includes multiple data attributes (data-floating-corner, data-floating-margin, data-position) to aid in debugging and ensure backward compatibility.

### 3.3 Console Logging
The solution includes strategic console logging to track position and margin values during banner generation and initialization.

## 4. Test Execution

### Environment Setup
1. Start the development server:
   ```
   cd server
   yarn dev
   ```
2. Launch the frontend:
   ```
   cd front
   yarn dev
   ```

### Test Tools
- Browser DevTools for inspecting element positions
- Browser resizing for responsive tests
- BrowserStack or similar for cross-browser testing
- test-modal-visibility.html for interactive debugging

## 5. Validation Criteria

The solution will be considered successful if:

1. Banners maintain correct positioning in all four corners
2. Margins are correctly applied in all scenarios
3. No positioning issues occur when resizing or using different devices
4. The solution works across all major browsers
5. The banner position is unaffected by parent element styles or transformations

This comprehensive test plan should verify that our wrapper-based floating banner positioning solution resolves the previously identified issues and provides a robust implementation for all use cases.