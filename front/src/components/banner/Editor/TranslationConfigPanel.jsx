import React, { useState, useEffect } from 'react';
import { Globe, Settings, ChevronDown, Check } from 'lucide-react';

const AVAILABLE_LANGUAGES = {
  'en': { name: 'English', flag: '🇺🇸' },
  'es': { name: 'Español', flag: '🇪🇸' },
  'fr': { name: 'Français', flag: '🇫🇷' },
  'de': { name: 'Deutsch', flag: '🇩🇪' },
  'it': { name: 'Italiano', flag: '🇮🇹' },
  'pt': { name: 'Português', flag: '🇵🇹' },
  'nl': { name: 'Nederlands', flag: '🇳🇱' },
  'pl': { name: 'Polski', flag: '🇵🇱' },
  'ru': { name: 'Русский', flag: '🇷🇺' },
  'ja': { name: '日本語', flag: '🇯🇵' },
  'ko': { name: '한국어', flag: '🇰🇷' },
  'zh': { name: '中文', flag: '🇨🇳' },
  'ar': { name: 'العربية', flag: '🇸🇦' }
};

function TranslationConfigPanel({ 
  translationConfig, 
  updateTranslationConfig,
  setSourceLanguage,
  setTargetLanguages,
  toggleAutoTranslate,
  isAutoTranslating 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Log para depuración
  console.log('🔍 TranslationConfigPanel renderizado con:', {
    translationConfig,
    autoTranslateOnSave: translationConfig?.autoTranslateOnSave,
    isAutoTranslating
  });

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsAnimating(false);
        setTimeout(() => setIsOpen(false), 200);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSourceLanguageChange = (langCode) => {
    console.log('🔄 handleSourceLanguageChange:', langCode);
    setSourceLanguage(langCode);
    setShowSourceDropdown(false);
  };

  const handleTargetLanguageToggle = (langCode) => {
    console.log('🔄 handleTargetLanguageToggle:', langCode);
    const currentTargets = translationConfig.targetLanguages;
    let newTargets;
    
    if (currentTargets.includes(langCode)) {
      // Remover idioma
      newTargets = currentTargets.filter(lang => lang !== langCode);
    } else {
      // Agregar idioma
      newTargets = [...currentTargets, langCode];
    }
    
    console.log('🔄 handleTargetLanguageToggle - nuevos targets:', newTargets);
    setTargetLanguages(newTargets);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
        title="Configurar Auto-traducción"
      >
        <Globe size={16} />
        <span>Traducción</span>
      </button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black z-50 flex items-center justify-center transition-opacity duration-200 ${
          isAnimating ? 'bg-black/50' : 'bg-black/0'
        }`}
        onClick={() => {
          setIsAnimating(false);
          setTimeout(() => setIsOpen(false), 200);
        }}
      >
        {/* Modal */}
        <div 
          className={`bg-white rounded-xl shadow-2xl p-6 w-[450px] max-w-[90vw] max-h-[85vh] overflow-y-auto transform transition-all duration-200 ${
            isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Globe size={20} className="text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Configuración de Traducción</h3>
            </div>
            <button
              onClick={() => {
                setIsAnimating(false);
                setTimeout(() => setIsOpen(false), 200);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <span className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</span>
            </button>
          </div>

      {/* Auto-traducir al guardar */}
      <div className="mb-6">
        <div className="p-3 rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
            console.log('🔄 DIV auto-translate clicked, current value:', translationConfig.autoTranslateOnSave);
            console.log('🔄 toggleAutoTranslate function:', toggleAutoTranslate);
            console.log('🔄 typeof toggleAutoTranslate:', typeof toggleAutoTranslate);
            try {
              toggleAutoTranslate();
              console.log('✅ toggleAutoTranslate ejecutado');
            } catch (error) {
              console.error('❌ Error ejecutando toggleAutoTranslate:', error);
            }
          }}>
            <input
              type="checkbox"
              checked={translationConfig.autoTranslateOnSave}
              onChange={() => {
                console.log('🔄 Checkbox auto-translate onChange, current value:', translationConfig.autoTranslateOnSave);
                // No hacer nada aquí, el div se encarga
              }}
              className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              disabled={isAutoTranslating}
              readOnly
            />
            <div>
              <span className="text-sm font-medium text-gray-700">
                Auto-traducir al guardar
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                Traduce automáticamente el contenido al guardar el banner
              </p>
            </div>
          </div>
          <div className="mt-2 text-xs">
            <strong>Estado actual:</strong> {translationConfig.autoTranslateOnSave ? 'ACTIVADO' : 'DESACTIVADO'}
          </div>
          
          {/* Botones de prueba manual */}
          <div className="mt-2 flex gap-2">
            <button 
              onClick={() => {
                console.log('🔴 Forzando autoTranslateOnSave = true');
                updateTranslationConfig({ autoTranslateOnSave: true });
              }}
              className="px-2 py-1 text-xs bg-green-500 text-white rounded"
            >
              Activar Manualmente
            </button>
            <button 
              onClick={() => {
                console.log('🔴 Forzando autoTranslateOnSave = false');
                updateTranslationConfig({ autoTranslateOnSave: false });
              }}
              className="px-2 py-1 text-xs bg-red-500 text-white rounded"
            >
              Desactivar Manualmente
            </button>
          </div>
        </div>
      </div>

      {/* Idioma origen */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Idioma de origen
        </label>
        <div className="relative">
          <button
            onClick={() => setShowSourceDropdown(!showSourceDropdown)}
            className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-white hover:border-purple-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            disabled={isAutoTranslating}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{AVAILABLE_LANGUAGES[translationConfig.sourceLanguage]?.flag}</span>
              <span className="text-sm font-medium">
                {AVAILABLE_LANGUAGES[translationConfig.sourceLanguage]?.name}
              </span>
            </div>
            <ChevronDown size={16} className={`transition-transform ${showSourceDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showSourceDropdown && (
            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {Object.entries(AVAILABLE_LANGUAGES).map(([code, lang]) => (
                <button
                  key={code}
                  onClick={() => handleSourceLanguageChange(code)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-purple-50 text-left transition-colors"
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className="text-sm font-medium">{lang.name}</span>
                  {code === translationConfig.sourceLanguage && (
                    <Check size={16} className="ml-auto text-purple-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Idiomas destino */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Idiomas de destino
          <span className="ml-2 text-xs font-normal text-gray-500">
            ({translationConfig.targetLanguages.length} seleccionados)
          </span>
        </label>
        <div className="relative">
          <button
            onClick={() => setShowTargetDropdown(!showTargetDropdown)}
            className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-white hover:border-purple-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            disabled={isAutoTranslating}
          >
            <div className="flex items-center gap-2">
              {translationConfig.targetLanguages.length === 0 ? (
                <span className="text-sm text-gray-500">Seleccionar idiomas...</span>
              ) : (
                <>
                  {translationConfig.targetLanguages.slice(0, 4).map(lang => (
                    <span key={lang} className="text-xl">{AVAILABLE_LANGUAGES[lang]?.flag}</span>
                  ))}
                  {translationConfig.targetLanguages.length > 4 && (
                    <span className="text-sm font-medium text-gray-600">
                      +{translationConfig.targetLanguages.length - 4}
                    </span>
                  )}
                </>
              )}
            </div>
            <ChevronDown size={16} className={`transition-transform ${showTargetDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showTargetDropdown && (
            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {Object.entries(AVAILABLE_LANGUAGES)
                .filter(([code]) => code !== translationConfig.sourceLanguage) // No mostrar idioma origen
                .map(([code, lang]) => (
                <label
                  key={code}
                  className="w-full flex items-center gap-3 p-3 hover:bg-purple-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={translationConfig.targetLanguages.includes(code)}
                    onChange={() => handleTargetLanguageToggle(code)}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xl">{lang.flag}</span>
                  <span className="text-sm font-medium">{lang.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Estado actual */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${translationConfig.autoTranslateOnSave ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          <span className="text-sm font-medium text-gray-700">
            Estado de traducción
          </span>
        </div>
        <p className="text-sm text-gray-600">
          {translationConfig.autoTranslateOnSave 
            ? `Se traducirá de ${AVAILABLE_LANGUAGES[translationConfig.sourceLanguage]?.flag} ${AVAILABLE_LANGUAGES[translationConfig.sourceLanguage]?.name} a ${translationConfig.targetLanguages.length} idioma${translationConfig.targetLanguages.length !== 1 ? 's' : ''}`
            : 'La traducción automática está desactivada'
          }
        </p>
        {translationConfig.autoTranslateOnSave && translationConfig.targetLanguages.length === 0 && (
          <p className="text-xs text-amber-600 mt-2">
            ⚠️ No hay idiomas de destino seleccionados
          </p>
        )}
        {isAutoTranslating && (
          <div className="flex items-center gap-2 mt-3 text-purple-600">
            <Globe size={16} className="animate-spin" />
            <span className="text-sm font-medium">Traduciendo contenido...</span>
          </div>
        )}
      </div>

      {/* Botón de cerrar */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => {
            setIsAnimating(false);
            setTimeout(() => setIsOpen(false), 200);
          }}
          className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          Cerrar
        </button>
      </div>
        </div>
      </div>
    </>
  );
}

export default TranslationConfigPanel;