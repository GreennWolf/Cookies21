import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Globe, X, Search } from 'lucide-react';
import './LanguageButton.css';

// Configuración de idiomas disponibles
const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧', initials: 'EN' },
  { code: 'es', name: 'Español', flag: '🇪🇸', initials: 'ES' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', initials: 'FR' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', initials: 'DE' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', initials: 'IT' },
  { code: 'pt', name: 'Português', flag: '🇵🇹', initials: 'PT' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱', initials: 'NL' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', initials: 'RU' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', initials: 'JA' },
  { code: 'zh', name: '中文', flag: '🇨🇳', initials: 'ZH' }
];

const LanguageButton = ({ 
  config = {},
  isPreview = false,
  isSelected = false,
  style = {},
  onStyleChange,
  onConfigChange,
  deviceView = 'desktop'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('es');
  const [searchTerm, setSearchTerm] = useState('');

  // Configuración por defecto según el plan
  const defaultConfig = {
    displayMode: 'flag-dropdown', // 'flag-dropdown', 'text-only', 'flag-only'
    languages: ['es', 'en', 'fr', 'de', 'it', 'pt'],
    defaultLanguageMode: 'auto', // 'auto' o 'manual'
    defaultLanguage: 'es', // Solo si mode es 'manual'
    showLabel: true,
    labelText: 'Idioma:',
    size: 'medium', // 'small', 'medium', 'large'
    style: 'modern', // 'modern', 'classic', 'minimal'
    position: 'inline', // 'inline', 'floating'
    required: true,
    // Nuevos campos para traducción
    autoDetectBrowserLanguage: true,
    fallbackLanguage: 'en',
    saveUserPreference: true
  };

  const finalConfig = { ...defaultConfig, ...config };
  const currentLang = AVAILABLE_LANGUAGES.find(lang => lang.code === currentLanguage) || AVAILABLE_LANGUAGES[0];
  const enabledLanguages = AVAILABLE_LANGUAGES.filter(lang => finalConfig.languages.includes(lang.code));

  // Función de detección de idioma del navegador
  const detectBrowserLanguage = () => {
    // 1. Atributo lang del HTML
    const htmlLang = document.documentElement.lang;
    if (htmlLang) {
      const shortLang = htmlLang.split('-')[0];
      if (finalConfig.languages.includes(shortLang)) return shortLang;
    }
    
    // 2. Meta tag content-language
    const metaLang = document.querySelector('meta[http-equiv="content-language"]');
    if (metaLang) {
      const shortLang = metaLang.content.split('-')[0];
      if (finalConfig.languages.includes(shortLang)) return shortLang;
    }
    
    // 3. Parámetro URL (ej: ?lang=es)
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang && finalConfig.languages.includes(urlLang)) return urlLang;
    
    // 4. Cookie de idioma
    const cookieLang = localStorage.getItem('cmp_language');
    if (cookieLang && finalConfig.languages.includes(cookieLang)) return cookieLang;
    
    // 5. Idioma del navegador
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang) {
      const shortLang = browserLang.split('-')[0];
      if (finalConfig.languages.includes(shortLang)) return shortLang;
    }
    
    // 6. Fallback
    return finalConfig.fallbackLanguage;
  };

  // Establecer idioma inicial según el modo configurado
  useEffect(() => {
    let initialLanguage;
    
    if (finalConfig.defaultLanguageMode === 'auto' && finalConfig.autoDetectBrowserLanguage) {
      // Modo automático: detectar idioma del navegador
      initialLanguage = detectBrowserLanguage();
    } else {
      // Modo manual: usar idioma por defecto
      initialLanguage = finalConfig.defaultLanguage && finalConfig.languages.includes(finalConfig.defaultLanguage) 
        ? finalConfig.defaultLanguage 
        : finalConfig.fallbackLanguage;
    }
    
    setCurrentLanguage(initialLanguage);
  }, [finalConfig.defaultLanguageMode, finalConfig.defaultLanguage, finalConfig.autoDetectBrowserLanguage]);

  // Cerrar modal al hacer clic fuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.cmp-language-modal-content')) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen]);

  // Estilos por defecto según el modo
  const getDefaultStyles = () => {
    const baseStyles = {
      fontSize: finalConfig.size === 'small' ? '12px' : finalConfig.size === 'large' ? '16px' : '14px',
      fontWeight: '600',
      padding: finalConfig.size === 'small' ? '6px 10px' : finalConfig.size === 'large' ? '10px 16px' : '8px 12px',
      borderRadius: finalConfig.style === 'minimal' ? '4px' : finalConfig.style === 'classic' ? '0px' : '8px',
      border: '1px solid #e5e7eb',
      backgroundColor: '#ffffff',
      color: '#374151',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      position: 'relative',
      boxShadow: finalConfig.style === 'modern' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
      transition: 'all 0.2s ease',
      minWidth: finalConfig.size === 'small' ? '60px' : finalConfig.size === 'large' ? '80px' : '70px',
      outline: 'none',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none'
    };

    return baseStyles;
  };

  const buttonStyles = isPreview ? {
    ...getDefaultStyles(),
    ...(style[deviceView] || {}),
    // Asegurar que no haya conflictos de posicionamiento en preview
    position: 'relative',
    width: style[deviceView]?.width || 'auto',
    height: style[deviceView]?.height || 'auto'
  } : {
    ...getDefaultStyles(),
    ...style[deviceView]
  };

  // Manejo de clicks en preview - IMPLEMENTADO SEGÚN EL PLAN
  const handleLanguageChange = (langCode) => {
    const previousLanguage = currentLanguage;
    setCurrentLanguage(langCode);
    setIsOpen(false);
    
    // Guardar preferencia del usuario si está habilitado
    if (finalConfig.saveUserPreference) {
      localStorage.setItem('cmp_language', langCode);
      localStorage.setItem('cmp_language_timestamp', Date.now().toString());
    }
    
    // En preview real, esto cambiaría el idioma del banner
    if (isPreview && window.CMP && window.CMP.changeLanguage) {
      window.CMP.changeLanguage(langCode);
    }
    
    // Disparar evento personalizado para notificar el cambio de idioma - MEJORADO
    if (isPreview) {
      const event = new CustomEvent('cmp:language:changed', { 
        detail: { 
          language: langCode,
          previousLanguage: previousLanguage,
          mode: finalConfig.defaultLanguageMode,
          timestamp: Date.now(),
          source: 'user_selection'
        } 
      });
      window.dispatchEvent(event);
      
      // Mantener compatibilidad con evento anterior
      const legacyEvent = new CustomEvent('languageChanged', { 
        detail: { language: langCode } 
      });
      window.dispatchEvent(legacyEvent);
    }
  };

  // Vista en el editor
  if (isPreview !== true) {
    return (
      <div 
        style={buttonStyles}
        className={`language-button-editor ${isSelected ? 'selected' : ''}`}
        title="Selector de Idioma (Obligatorio)"
        data-preview="false"
      >
        <Globe size={14} />
        <span>Language Selector</span>
        <div className="language-button-badge">Required</div>
      </div>
    );
  }

  // Filtrar idiomas según búsqueda
  const filteredLanguages = enabledLanguages.filter(lang => 
    lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Vista en preview/producción - Ahora siempre muestra la bandera
  const renderContent = () => {
    return (
      <>
        <span style={{ fontSize: '1.4em', marginRight: '6px' }}>{currentLang.flag}</span>
        <span style={{ fontWeight: '600' }}>{currentLang.initials}</span>
      </>
    );
  };

  return (
    <div 
      style={{ 
        position: 'relative', 
        display: 'inline-block',
        width: '100%',
        height: '100%',
        zIndex: isOpen ? 1001 : 'auto'
      }} 
      data-preview="true"
    >
      <button
        style={{
          ...buttonStyles,
          ...(isOpen ? { 
            borderColor: '#3b82f6',
            boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
          } : {}),
          width: '100%',
          height: '100%',
          position: 'relative',
          zIndex: 1
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (enabledLanguages.length > 1) {
            console.log('🌐 LanguageButton: Opening modal, current state:', isOpen);
            setIsOpen(!isOpen);
          }
        }}
        disabled={enabledLanguages.length <= 1}
        className="cmp-language-button"
        aria-label="Select language"
        data-preview="true"
        onMouseEnter={(e) => {
          e.target.style.borderColor = '#9ca3af';
          e.target.style.backgroundColor = '#f9fafb';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.target.style.borderColor = '#e5e7eb';
            e.target.style.backgroundColor = '#ffffff';
          }
        }}
      >
        {renderContent()}
      </button>

      {isOpen && enabledLanguages.length > 1 && (
        console.log('🌐 LanguageButton: Rendering modal portal'),
        ReactDOM.createPortal(
          <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: window.innerWidth > 768 ? '20px' : '10px'
          }}
          className="cmp-language-modal"
          onClick={(e) => {
            if (e.target.className === 'cmp-language-modal') {
              setIsOpen(false);
              setSearchTerm('');
            }
          }}
        >
          <div
            className="cmp-language-modal-content"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              maxWidth: '480px',
              width: '100%',
              maxHeight: '90vh',
              height: 'auto',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              margin: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: '18px', 
                fontWeight: '600',
                color: '#111827'
              }}>
                Seleccionar idioma
              </h3>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <X size={20} color="#6b7280" />
              </button>
            </div>

            {/* Buscador */}
            <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Search 
                  size={20} 
                  color="#9ca3af" 
                  style={{
                    position: 'absolute',
                    left: '12px',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type="text"
                  placeholder="Buscar idioma..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 40px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  autoFocus
                />
              </div>
            </div>

            {/* Lista de idiomas */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px'
            }}>
              {filteredLanguages.length === 0 ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#9ca3af'
                }}>
                  No se encontraron idiomas
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: window.innerWidth > 768 ? 'repeat(auto-fill, minmax(200px, 1fr))' : '1fr',
                  gap: window.innerWidth > 768 ? '8px' : '6px',
                  padding: '4px'
                }}>
                  {filteredLanguages.map(lang => (
                    <button
                      key={lang.code}
                      style={{
                        padding: '12px 16px',
                        border: '1px solid',
                        borderColor: lang.code === currentLanguage ? '#3b82f6' : '#e5e7eb',
                        backgroundColor: lang.code === currentLanguage ? '#eff6ff' : '#ffffff',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '14px',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onClick={() => {
                        handleLanguageChange(lang.code);
                        setSearchTerm('');
                      }}
                      onMouseEnter={(e) => {
                        if (lang.code !== currentLanguage) {
                          e.target.style.backgroundColor = '#f9fafb';
                          e.target.style.borderColor = '#9ca3af';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (lang.code !== currentLanguage) {
                          e.target.style.backgroundColor = '#ffffff';
                          e.target.style.borderColor = '#e5e7eb';
                        }
                      }}
                    >
                      <span style={{ fontSize: '1.5em' }}>{lang.flag}</span>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={{ 
                          fontWeight: lang.code === currentLanguage ? '600' : '500',
                          color: lang.code === currentLanguage ? '#2563eb' : '#111827'
                        }}>
                          {lang.name}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#6b7280',
                          marginTop: '2px'
                        }}>
                          {lang.initials}
                        </div>
                      </div>
                      {lang.code === currentLanguage && (
                        <div style={{
                          width: '20px',
                          height: '20px',
                          backgroundColor: '#3b82f6',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <span style={{ color: 'white', fontSize: '12px' }}>✓</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>,
          document.body
        )
      )}
    </div>
  );
};

// Configuración del componente para el editor
LanguageButton.componentType = 'language-button';
LanguageButton.displayName = 'Language Selector';
LanguageButton.category = 'interactive';
LanguageButton.required = true; // Componente obligatorio
LanguageButton.icon = Globe;
LanguageButton.description = 'Allows users to change the banner language';

// Propiedades configurables según el plan
LanguageButton.configProperties = [
  {
    key: 'displayMode',
    label: 'Display Mode',
    type: 'select',
    options: [
      { value: 'flag-dropdown', label: 'Flag + Dropdown' },
      { value: 'text-only', label: 'Text Only' },
      { value: 'flag-only', label: 'Flag Only' }
    ],
    default: 'flag-dropdown'
  },
  {
    key: 'languages',
    label: 'Enabled Languages',
    type: 'multi-select',
    options: AVAILABLE_LANGUAGES.map(lang => ({ value: lang.code, label: `${lang.flag} ${lang.name}` })),
    default: ['es', 'en', 'fr', 'de', 'it', 'pt']
  },
  {
    key: 'defaultLanguageMode',
    label: 'Language Mode',
    type: 'select',
    options: [
      { value: 'auto', label: 'Auto-detect Browser Language' },
      { value: 'manual', label: 'Manual Default Language' }
    ],
    default: 'auto'
  },
  {
    key: 'defaultLanguage',
    label: 'Default Language',
    type: 'select',
    options: AVAILABLE_LANGUAGES.map(lang => ({ value: lang.code, label: `${lang.flag} ${lang.name}` })),
    default: 'es',
    condition: (config) => config.defaultLanguageMode === 'manual'
  },
  {
    key: 'showLabel',
    label: 'Show Label',
    type: 'toggle',
    default: true
  },
  {
    key: 'labelText',
    label: 'Label Text',
    type: 'text',
    default: 'Idioma:',
    condition: (config) => config.showLabel
  },
  {
    key: 'size',
    label: 'Size',
    type: 'select',
    options: [
      { value: 'small', label: 'Small' },
      { value: 'medium', label: 'Medium' },
      { value: 'large', label: 'Large' }
    ],
    default: 'medium'
  },
  {
    key: 'style',
    label: 'Style',
    type: 'select',
    options: [
      { value: 'modern', label: 'Modern' },
      { value: 'classic', label: 'Classic' },
      { value: 'minimal', label: 'Minimal' }
    ],
    default: 'modern'
  },
  {
    key: 'position',
    label: 'Position',
    type: 'select',
    options: [
      { value: 'inline', label: 'Inline' },
      { value: 'floating', label: 'Floating' }
    ],
    default: 'inline'
  },
  {
    key: 'autoDetectBrowserLanguage',
    label: 'Auto-detect Browser Language',
    type: 'toggle',
    default: true
  },
  {
    key: 'fallbackLanguage',
    label: 'Fallback Language',
    type: 'select',
    options: AVAILABLE_LANGUAGES.map(lang => ({ value: lang.code, label: `${lang.flag} ${lang.name}` })),
    default: 'en'
  },
  {
    key: 'saveUserPreference',
    label: 'Save User Preference',
    type: 'toggle',
    default: true
  }
];

export default LanguageButton;