// Función para manejar cambios en el valor del ancho del banner
const handleWidthValueChange = function(e) {
  const value = e.target.value;
  this.setWidthValue(value);
  
  // Obtener el tipo de banner actual
  const bannerType = this.bannerConfig.layout[this.deviceView]?.type || 'banner';
  
  if (this.widthUnit !== 'auto') {
    // Manejar valores porcentuales
    if (this.widthUnit === '%') {
      const numValue = parseInt(value);
      
      if (bannerType === 'modal') {
        // Limitar entre 40% y 90%
        const limitedValue = Math.max(40, Math.min(90, numValue || 60));
        this.setWidthValue(limitedValue.toString());
        this.handleUpdateLayoutForDevice(this.deviceView, 'width', `${limitedValue}%`);
        this.handleUpdateLayoutForDevice(this.deviceView, 'data-width', limitedValue.toString());
      } else if (bannerType === 'floating') {
        // Limitar entre 40% y 70%
        const limitedValue = Math.max(40, Math.min(70, numValue || 50));
        this.setWidthValue(limitedValue.toString());
        this.handleUpdateLayoutForDevice(this.deviceView, 'width', `${limitedValue}%`);
        this.handleUpdateLayoutForDevice(this.deviceView, 'data-width', limitedValue.toString());
      } else { // banner estándar
        // Para banners normales, siempre 100%
        this.handleUpdateLayoutForDevice(this.deviceView, 'width', '100%');
        this.setWidthValue('100');
      }
    } else {
      // Para píxeles, permitir valores personalizados
      this.handleUpdateLayoutForDevice(this.deviceView, 'width', value ? `${value}${this.widthUnit}` : '');
    }
  }
};

export default handleWidthValueChange;