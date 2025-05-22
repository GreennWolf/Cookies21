/**
 * Utility function to handle floating margin changes
 * This function ensures that margin values are properly validated and propagated
 * to the banner configuration
 */

const handleFloatingMarginChange = (value, deviceView, handleUpdateLayoutForDevice) => {
  // Convert to a number for validation
  let numValue = parseFloat(value);
  
  // Validate: must be a number and >= 0
  if (isNaN(numValue) || numValue < 0) {
    numValue = 20; // Default margin
  }
  
  // Cap max margin to a reasonable value
  if (numValue > 100) {
    numValue = 100;
  }
  
  // Round to integer
  numValue = Math.round(numValue);
  
  // Update the layout with the validated value
  handleUpdateLayoutForDevice(deviceView, 'floatingMargin', numValue.toString());
  
  // Also set the data-floating-margin attribute to ensure it's available to the script
  handleUpdateLayoutForDevice(deviceView, 'data-floating-margin', numValue.toString());
  
  // Ensure the current corner is also set as the position for compatibility
  // Get the current floating corner if available
  const layout = handleUpdateLayoutForDevice.arguments[0]?.layout;
  const currentCorner = layout?.[deviceView]?.floatingCorner || 'bottom-right';
  
  // Set position to match the current corner for consistency
  handleUpdateLayoutForDevice(deviceView, 'position', currentCorner);
  
  return numValue.toString();
};

export default handleFloatingMarginChange;