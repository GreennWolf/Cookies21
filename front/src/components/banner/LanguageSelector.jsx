import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Globe, Check } from 'lucide-react';
import './LanguageSelector.css';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
  { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' }
];

const LanguageSelector = ({ 
  currentLanguage = 'en', 
  onLanguageChange, 
  availableLanguages = ['en'],
  isLoading = false,
  position = 'bottom-right',
  size = 'medium',
  showFlags = true,
  showNames = false,
  variant = 'dropdown' // dropdown | inline
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Obtener idioma actual
  const currentLang = LANGUAGES.find(lang => lang.code === currentLanguage) || LANGUAGES[0];

  // Filtrar idiomas disponibles y por búsqueda
  const filteredLanguages = LANGUAGES.filter(lang => {
    const isAvailable = availableLanguages.includes(lang.code);
    const matchesSearch = lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lang.code.toLowerCase().includes(searchTerm.toLowerCase());
    return isAvailable && matchesSearch;
  });

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageSelect = (langCode) => {
    if (langCode !== currentLanguage) {
      onLanguageChange(langCode);
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  // Detectar idioma del navegador
  const detectBrowserLanguage = () => {
    const browserLang = navigator.language.split('-')[0];
    if (availableLanguages.includes(browserLang)) {
      return browserLang;
    }
    return 'en';
  };

  // Renderizar selector inline (para editor)
  if (variant === 'inline') {
    return (
      <div className={`language-selector-inline size-${size}`}>
        <div className="language-selector-inline-header">
          <Globe size={16} />
          <span>Languages</span>
        </div>
        <div className="language-selector-inline-list">
          {filteredLanguages.map(lang => (
            <button
              key={lang.code}
              className={`language-selector-inline-item ${lang.code === currentLanguage ? 'active' : ''}`}
              onClick={() => handleLanguageSelect(lang.code)}
              disabled={isLoading}
            >
              {showFlags && <span className="language-flag">{lang.flag}</span>}
              <span className="language-name">{lang.name}</span>
              {lang.code === currentLanguage && <Check size={14} />}
            </button>
          ))}
        </div>
        {availableLanguages.length === 1 && (
          <div className="language-selector-hint">
            Translate to more languages in the editor
          </div>
        )}
      </div>
    );
  }

  // Renderizar selector dropdown (para banner)
  return (
    <div 
      ref={dropdownRef}
      className={`language-selector position-${position} size-${size} ${isOpen ? 'open' : ''}`}
    >
      <button
        className="language-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || availableLanguages.length <= 1}
        aria-label="Select language"
        title={currentLang.name}
      >
        {showFlags && <span className="language-flag">{currentLang.flag}</span>}
        {showNames && <span className="language-name">{currentLang.name}</span>}
        {availableLanguages.length > 1 && (
          <ChevronDown 
            size={size === 'small' ? 12 : 16} 
            className={`language-selector-arrow ${isOpen ? 'rotated' : ''}`}
          />
        )}
      </button>

      {isOpen && (
        <div className="language-selector-dropdown">
          {filteredLanguages.length > 10 && (
            <div className="language-selector-search">
              <input
                type="text"
                placeholder="Search languages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="language-selector-search-input"
                autoFocus
              />
            </div>
          )}
          
          <div className="language-selector-list">
            {filteredLanguages.map(lang => (
              <button
                key={lang.code}
                className={`language-selector-item ${lang.code === currentLanguage ? 'active' : ''}`}
                onClick={() => handleLanguageSelect(lang.code)}
              >
                {showFlags && <span className="language-flag">{lang.flag}</span>}
                <span className="language-name">{lang.name}</span>
                {lang.code === currentLanguage && <Check size={14} />}
              </button>
            ))}
          </div>

          {filteredLanguages.length === 0 && (
            <div className="language-selector-empty">
              No languages found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;