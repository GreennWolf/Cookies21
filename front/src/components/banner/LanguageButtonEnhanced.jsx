/**
 * LanguageButtonEnhanced - Componente mejorado para selección de idioma
 * Incluye detección automática, traducciones, cache y modos avanzados
 */

import React, { useEffect, useRef } from 'react';
import { ChevronDown, Globe, Loader2, AlertCircle, CheckCircle2, Languages } from 'lucide-react';
import { useLanguageButton } from './hooks/useLanguageButton';
import { LOADING_STATES, LANGUAGE_MODES } from './types/languageButton.types';
import './LanguageButton.css';

const LanguageButtonEnhanced = ({ 
  config = {},
  bannerComponents = [],
  translationData = {},
  isPreview = false,
  isSelected = false,
  style = {},
  onStyleChange,
  onConfigChange,
  onLanguageChange,
  onLanguageDetected,
  onTranslationRequest,
  onTranslationComplete,
  onTranslationError,
  deviceView = 'desktop',
  translationService = null,
  cacheManager = null,
  analyticsTracker = null
}) => {
  // ============================================================================
  // HOOKS Y ESTADO
  // ============================================================================
  
  const {
    currentLanguage,
    detectedLanguage,
    enabledLanguages,
    isOpen,
    isLoading,
    hasError,
    errorMessage,
    loadingState,
    translationProgress,
    availableTranslations,
    userPreferences,
    config: finalConfig,
    configValidation,
    handleLanguageChange,
    handleDropdownToggle,
    handleClickOutside,
    detectContentLanguage,
    requestTranslations,
    getCurrentLanguageConfig,
    isLanguageEnabled,
    clearError
  } = useLanguageButton({
    config,
    onLanguageChange,
    onLanguageDetected,
    onTranslationRequest,
    onTranslationComplete,
    onTranslationError,
    translationService,
    cacheManager,
    analyticsTracker
  });

  // Referencias para manejo de eventos
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // ============================================================================
  // CONFIGURACIÓN VISUAL
  // ============================================================================

  const currentLangConfig = getCurrentLanguageConfig();
  const responsiveConfig = finalConfig.responsiveConfig?.[deviceView] || {};
  
  // Combinar configuración base con responsive
  const displayConfig = {
    ...finalConfig,
    ...responsiveConfig
  };

  // ============================================================================
  // EFECTOS
  // ============================================================================

  /**
   * Efecto para detectar idioma del contenido al cargar
   */
  useEffect(() => {
    if (bannerComponents.length > 0 && !detectedLanguage && finalConfig.translationSettings.enableAutoTranslation) {
      detectContentLanguage(bannerComponents);
    }
  }, [bannerComponents, detectedLanguage, finalConfig.translationSettings.enableAutoTranslation, detectContentLanguage]);

  /**
   * Efecto para manejo de click fuera del dropdown
   */
  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (isOpen && 
          dropdownRef.current && 
          !dropdownRef.current.contains(event.target) &&
          buttonRef.current &&
          !buttonRef.current.contains(event.target)) {
        handleClickOutside();
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleDocumentClick);
      return () => document.removeEventListener('click', handleDocumentClick);
    }
  }, [isOpen, handleClickOutside]);

  /**
   * Efecto para integración con CMP existente
   */
  useEffect(() => {
    // Notificar a sistemas externos del idioma actual
    if (isPreview && window.CMP && window.CMP.setLanguage) {
      window.CMP.setLanguage(currentLanguage);
    }
  }, [currentLanguage, isPreview]);

  // ============================================================================
  // FUNCIONES DE RENDERIZADO
  // ============================================================================

  /**
   * Obtiene los estilos por defecto según la configuración
   */
  const getBaseStyles = () => {
    const baseStyles = {
      fontSize: displayConfig.size === 'small' ? '12px' : displayConfig.size === 'large' ? '16px' : '14px',
      fontWeight: '600',
      padding: displayConfig.size === 'small' ? '6px 10px' : displayConfig.size === 'large' ? '10px 16px' : '8px 12px',
      borderRadius: displayConfig.style === 'minimal' ? '4px' : displayConfig.style === 'classic' ? '0px' : '8px',
      border: hasError ? '1px solid #ef4444' : '1px solid #e5e7eb',
      backgroundColor: hasError ? '#fef2f2' : '#ffffff',
      color: hasError ? '#dc2626' : '#374151',
      cursor: enabledLanguages.length > 1 ? 'pointer' : 'default',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      position: 'relative',
      boxShadow: displayConfig.style === 'modern' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
      transition: 'all 0.2s ease',
      minWidth: displayConfig.size === 'small' ? '60px' : displayConfig.size === 'large' ? '80px' : '70px',
      outline: 'none',
      userSelect: 'none',
      opacity: isLoading ? 0.7 : 1
    };

    return baseStyles;
  };

  const buttonStyles = {
    ...getBaseStyles(),
    ...style[deviceView]
  };

  /**
   * Renderiza el contenido principal del botón según el modo de visualización
   */
  const renderButtonContent = () => {
    // Mostrar loading state
    if (isLoading) {
      return (
        <>
          <Loader2 size={14} className="animate-spin" />
          {loadingState === LOADING_STATES.DETECTING_LANGUAGE && <span>Detecting...</span>}
          {loadingState === LOADING_STATES.LOADING_TRANSLATIONS && (
            <span>{Math.round(translationProgress)}%</span>
          )}
          {loadingState === LOADING_STATES.APPLYING_TRANSLATIONS && <span>Applying...</span>}
        </>
      );
    }

    // Mostrar error state
    if (hasError) {
      return (
        <>
          <AlertCircle size={14} />
          <span>Error</span>
        </>
      );
    }

    // Contenido normal según displayMode
    switch (displayConfig.displayMode) {
      case 'flag-only':
        return <span style={{ fontSize: '1.2em' }}>{currentLangConfig?.flag || '🌐'}</span>;
      
      case 'text-only':
        return <span style={{ fontWeight: '600' }}>{currentLangConfig?.initials || 'LG'}</span>;
      
      case 'icon-dropdown':
        return (
          <>
            <Globe size={16} />
            {enabledLanguages.length > 1 && <ChevronDown size={14} />}
          </>
        );
      
      case 'flag-dropdown':
      default:
        return (
          <>
            <span style={{ fontWeight: '700', letterSpacing: '0.5px' }}>
              {currentLangConfig?.initials || 'LG'}
            </span>
            {enabledLanguages.length > 1 && (
              <ChevronDown 
                size={14} 
                style={{ 
                  marginLeft: '2px', 
                  opacity: 0.6,
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}
              />
            )}
          </>
        );
    }
  };

  /**
   * Renderiza el indicador de traducción automática
   */
  const renderTranslationIndicator = () => {
    if (!finalConfig.translationSettings.showTranslationIndicator) {
      return null;
    }

    const isTranslated = availableTranslations.includes(currentLanguage) && 
                         currentLanguage !== detectedLanguage;
    
    if (!isTranslated) {
      return null;
    }

    return (
      <div
        style={{
          position: 'absolute',
          top: '-6px',
          right: '-6px',
          backgroundColor: '#3b82f6',
          color: 'white',
          borderRadius: '50%',
          width: '12px',
          height: '12px',
          fontSize: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }}
        title="Content translated automatically"
      >
        <Languages size={8} />
      </div>
    );
  };

  /**
   * Renderiza un item del dropdown
   */
  const renderLanguageItem = (langConfig) => {
    const isCurrentLanguage = langConfig.code === currentLanguage;
    const isTranslated = availableTranslations.includes(langConfig.code);
    const hasTranslation = isTranslated || langConfig.code === detectedLanguage;

    return (
      <button
        key={langConfig.code}
        style={{
          width: '100%',
          padding: '10px 16px',
          border: 'none',
          backgroundColor: isCurrentLanguage ? '#eff6ff' : 'transparent',
          color: isCurrentLanguage ? '#2563eb' : '#374151',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '14px',
          textAlign: 'left',
          transition: 'background-color 0.15s ease',
          outline: 'none'
        }}
        onClick={() => handleLanguageChange(langConfig.code, true)}
        onMouseEnter={(e) => {
          if (!isCurrentLanguage) {
            e.target.style.backgroundColor = '#f3f4f6';
          }
        }}
        onMouseLeave={(e) => {
          if (!isCurrentLanguage) {
            e.target.style.backgroundColor = 'transparent';
          }
        }}
      >
        {/* Iniciales del idioma */}
        <span style={{ 
          fontWeight: '600',
          fontSize: '13px',
          minWidth: '24px'
        }}>
          {langConfig.initials}
        </span>
        
        {/* Nombre del idioma */}
        <span style={{ flex: 1 }}>
          {displayConfig.showLabel ? langConfig.name : langConfig.nativeName}
        </span>
        
        {/* Indicadores de estado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Idioma original */}
          {langConfig.code === detectedLanguage && (
            <span
              style={{
                fontSize: '10px',
                backgroundColor: '#10b981',
                color: 'white',
                padding: '1px 4px',
                borderRadius: '2px',
                fontWeight: '600'
              }}
              title="Original language"
            >
              ORIG
            </span>
          )}
          
          {/* Traducción disponible */}
          {isTranslated && langConfig.code !== detectedLanguage && (
            <CheckCircle2 
              size={12} 
              style={{ color: '#10b981' }} 
              title="Translation available"
            />
          )}
          
          {/* Idioma actual */}
          {isCurrentLanguage && (
            <div
              style={{
                width: '6px',
                height: '6px',
                backgroundColor: '#2563eb',
                borderRadius: '50%'
              }}
            />
          )}
        </div>
      </button>
    );
  };

  /**
   * Renderiza el dropdown de idiomas
   */
  const renderDropdown = () => {
    if (!isOpen || enabledLanguages.length <= 1) {
      return null;
    }

    const dropdownStyle = {
      position: 'absolute',
      top: '100%',
      right: 0,
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      zIndex: 10000,
      minWidth: '200px',
      maxWidth: '280px',
      marginTop: '4px',
      overflow: 'hidden',
      maxHeight: deviceView === 'mobile' ? '50vh' : '300px',
      overflowY: 'auto'
    };

    // Responsive positioning for mobile
    if (deviceView === 'mobile') {
      dropdownStyle.position = 'fixed';
      dropdownStyle.top = 'auto';
      dropdownStyle.bottom = '0';
      dropdownStyle.left = '0';
      dropdownStyle.right = '0';
      dropdownStyle.borderRadius = '16px 16px 0 0';
      dropdownStyle.marginTop = '0';
      dropdownStyle.animation = 'slideUp 0.3s ease';
    }

    return (
      <div ref={dropdownRef} style={dropdownStyle} className="cmp-language-dropdown">
        {/* Header con modo actual */}
        <div style={{ 
          padding: '8px 16px', 
          borderBottom: '1px solid #f3f4f6',
          backgroundColor: '#f9fafb',
          fontSize: '12px',
          color: '#6b7280',
          fontWeight: '500'
        }}>
          {finalConfig.mode === LANGUAGE_MODES.AUTO_DETECT ? (
            <>🔍 Auto-detect mode</>
          ) : (
            <>⚙️ Manual mode</>
          )}
          {detectedLanguage && (
            <span style={{ marginLeft: '8px' }}>
              (Original: {enabledLanguages.find(l => l.code === detectedLanguage)?.initials})
            </span>
          )}
        </div>

        {/* Lista de idiomas */}
        {enabledLanguages.map(renderLanguageItem)}

        {/* Footer con información adicional */}
        {finalConfig.translationSettings.enableAutoTranslation && (
          <div style={{ 
            padding: '8px 16px', 
            borderTop: '1px solid #f3f4f6',
            backgroundColor: '#f9fafb',
            fontSize: '11px',
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Languages size={10} />
            <span>Auto-translation enabled</span>
          </div>
        )}
      </div>
    );
  };

  /**
   * Renderiza la vista del editor (no preview)
   */
  const renderEditorView = () => {
    return (
      <div 
        style={buttonStyles}
        className={`language-button-editor enhanced ${isSelected ? 'selected' : ''} ${hasError ? 'error' : ''}`}
        title={`Enhanced Language Selector - Mode: ${finalConfig.mode}`}
        onClick={onConfigChange ? () => onConfigChange('showConfig') : undefined}
      >
        <Globe size={14} />
        <span>Enhanced Language Selector</span>
        
        {/* Badge de modo */}
        <div className="language-button-badge" style={{ 
          backgroundColor: finalConfig.mode === LANGUAGE_MODES.AUTO_DETECT ? '#10b981' : '#3b82f6' 
        }}>
          {finalConfig.mode === LANGUAGE_MODES.AUTO_DETECT ? 'AUTO' : 'MANUAL'}
        </div>

        {/* Indicador de configuración */}
        {finalConfig.translationSettings.enableAutoTranslation && (
          <div
            style={{
              position: 'absolute',
              bottom: '-6px',
              right: '-6px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              borderRadius: '50%',
              width: '12px',
              height: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Auto-translation enabled"
          >
            <Languages size={8} />
          </div>
        )}

        {/* Mostrar errores de configuración */}
        {!configValidation.isValid && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            right: '0',
            marginTop: '4px',
            padding: '4px 8px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            fontSize: '10px',
            color: '#dc2626'
          }}>
            {configValidation.errors.join(', ')}
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // RENDERIZADO PRINCIPAL
  // ============================================================================

  // Vista en el editor
  if (!isPreview) {
    return renderEditorView();
  }

  // Vista en preview/producción
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Botón principal */}
      <button
        ref={buttonRef}
        style={{
          ...buttonStyles,
          ...(isOpen ? { 
            borderColor: '#3b82f6',
            boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
          } : {})
        }}
        onClick={handleDropdownToggle}
        disabled={enabledLanguages.length <= 1 || isLoading}
        className="cmp-language-button enhanced"
        aria-label={`Select language. Current: ${currentLangConfig?.name || 'Unknown'}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onMouseEnter={(e) => {
          if (!isLoading && !hasError) {
            e.target.style.borderColor = '#9ca3af';
            e.target.style.backgroundColor = '#f9fafb';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen && !hasError) {
            e.target.style.borderColor = '#e5e7eb';
            e.target.style.backgroundColor = '#ffffff';
          }
        }}
      >
        {renderButtonContent()}
      </button>

      {/* Indicador de traducción */}
      {renderTranslationIndicator()}

      {/* Dropdown de idiomas */}
      {renderDropdown()}

      {/* Tooltip de error */}
      {hasError && errorMessage && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#dc2626',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            marginBottom: '4px',
            zIndex: 10001,
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={clearError}
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CONFIGURACIÓN DEL COMPONENTE PARA EL EDITOR
// ============================================================================

LanguageButtonEnhanced.componentType = 'language-button';
LanguageButtonEnhanced.displayName = 'Enhanced Language Selector';
LanguageButtonEnhanced.category = 'interactive';
LanguageButtonEnhanced.required = true;
LanguageButtonEnhanced.icon = Languages;
LanguageButtonEnhanced.description = 'Advanced language selector with auto-detection and translations';

// Propiedades configurables (se importan desde types)
import { ENHANCED_CONFIG_PROPERTIES } from './types/languageButton.types';
LanguageButtonEnhanced.configProperties = ENHANCED_CONFIG_PROPERTIES;

export default LanguageButtonEnhanced;