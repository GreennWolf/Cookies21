import { useState, useEffect, useCallback } from 'react';
import { 
  detectBannerLanguages, 
  translateBanner, 
  getBannerTranslations,
  updateComponentTranslation,
  getTranslationUsage 
} from '../api/bannerTemplate';
import toast from 'react-hot-toast';

export const useTranslations = (bannerId, bannerComponents) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [availableLanguages, setAvailableLanguages] = useState(['en']);
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState('en');
  const [translationStats, setTranslationStats] = useState(null);

  // Cargar traducciones existentes
  useEffect(() => {
    if (bannerId) {
      loadTranslations();
    }
  }, [bannerId]);

  // Cargar todas las traducciones del banner
  const loadTranslations = async () => {
    try {
      setIsLoading(true);
      const response = await getBannerTranslations(bannerId);
      
      if (response.data) {
        setAvailableLanguages(response.data.languages || ['en']);
        setTranslations(response.data.translations || {});
        setDetectedLanguage(response.data.stats?.autoDetectedLanguage || 'en');
      }
    } catch (error) {
      console.error('Error loading translations:', error);
      // No mostrar error si es la primera vez
      if (error.message && !error.message.includes('not found')) {
        toast.error('Error loading translations');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Detectar idioma del contenido
  const detectLanguage = async () => {
    try {
      setIsLoading(true);
      const response = await detectBannerLanguages(bannerId);
      
      if (response.data) {
        setDetectedLanguage(response.data.detectedLanguage);
        toast.success(`Language detected: ${response.data.detectedLanguage}`);
        return response.data.detectedLanguage;
      }
    } catch (error) {
      console.error('Error detecting language:', error);
      toast.error('Error detecting language');
    } finally {
      setIsLoading(false);
    }
  };

  // Traducir banner a un idioma
  const translateToLanguage = async (targetLanguage) => {
    if (availableLanguages.includes(targetLanguage) && targetLanguage !== 'en') {
      // Ya tenemos traducciones para este idioma
      setCurrentLanguage(targetLanguage);
      return true;
    }

    try {
      setIsTranslating(true);
      const response = await translateBanner(bannerId, targetLanguage);
      
      if (response.data) {
        toast.success(
          `Translated to ${targetLanguage}: ${response.data.componentsTranslated} components`
        );
        
        // Recargar traducciones
        await loadTranslations();
        setCurrentLanguage(targetLanguage);
        
        // Mostrar advertencia si se acerca al límite
        if (response.data.charactersUsed > 400000) {
          toast.warning('Approaching monthly translation limit');
        }
        
        return true;
      }
    } catch (error) {
      console.error('Error translating banner:', error);
      toast.error(error.message || 'Translation failed');
      return false;
    } finally {
      setIsTranslating(false);
    }
  };

  // Actualizar traducción manual de un componente
  const updateTranslation = async (componentId, language, text) => {
    try {
      await updateComponentTranslation(bannerId, language, componentId, text);
      
      // Actualizar estado local
      setTranslations(prev => ({
        ...prev,
        [language]: prev[language]?.map(t => 
          t.componentId === componentId ? { ...t, text } : t
        ) || []
      }));
      
      toast.success('Translation updated');
      return true;
    } catch (error) {
      console.error('Error updating translation:', error);
      toast.error('Failed to update translation');
      return false;
    }
  };

  // Obtener texto traducido de un componente
  const getTranslatedText = useCallback((componentId, language = currentLanguage) => {
    // Si es inglés, devolver el texto original
    if (language === 'en') {
      const component = findComponentById(bannerComponents, componentId);
      if (component?.content) {
        if (typeof component.content === 'string') {
          return component.content;
        } else if (component.content.texts?.en) {
          return component.content.texts.en;
        } else if (typeof component.content === 'object' && component.content.texts) {
          // Si tiene estructura de traducciones pero no inglés, tomar el primer idioma
          const firstLanguage = Object.keys(component.content.texts)[0];
          return component.content.texts[firstLanguage] || '';
        }
      }
      return '';
    }

    // Buscar en traducciones de la API
    const languageTranslations = translations[language] || [];
    const translation = languageTranslations.find(t => t.componentId === componentId);
    
    if (translation && translation.text) {
      return translation.text;
    }

    // Si no hay traducción, buscar en el componente mismo
    const component = findComponentById(bannerComponents, componentId);
    if (component?.content?.texts?.[language]) {
      return component.content.texts[language];
    }

    // Fallback al inglés (pero evitar bucle infinito)
    if (language !== 'en') {
      return getTranslatedText(componentId, 'en');
    }

    return '';
  }, [currentLanguage, translations, bannerComponents]);

  // Obtener componentes con textos traducidos
  const getTranslatedComponents = useCallback((language = currentLanguage) => {
    if (!bannerComponents) return [];

    const translateComponent = (component) => {
      const translatedComp = { ...component };
      
      // Si tiene contenido de texto, traducirlo
      if (component.content && (component.type === 'text' || component.type === 'button' || component.type === 'link')) {
        const translatedText = getTranslatedText(component.id, language);
        
        // SIEMPRE asegurar que content sea un string para evitar errores de renderizado
        if (translatedText && typeof translatedText === 'string') {
          translatedComp.content = translatedText;
        } else if (typeof component.content === 'string') {
          translatedComp.content = component.content;
        } else if (typeof component.content === 'object' && component.content.texts) {
          // Extraer texto del objeto de traducciones
          const extractedText = component.content.texts[language] || 
                               component.content.texts.en || 
                               Object.values(component.content.texts)[0] || 
                               '';
          translatedComp.content = extractedText;
        } else {
          // Fallback a string vacío
          translatedComp.content = '';
        }
      }
      
      // Traducir hijos recursivamente
      if (component.children && Array.isArray(component.children)) {
        translatedComp.children = component.children.map(translateComponent);
      }
      
      return translatedComp;
    };

    return bannerComponents.map(translateComponent);
  }, [bannerComponents, currentLanguage, getTranslatedText]);

  // Cargar estadísticas de uso
  const loadUsageStats = async () => {
    try {
      const response = await getTranslationUsage();
      if (response.data) {
        setTranslationStats(response.data);
      }
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  };

  // Detectar idioma del navegador
  const detectBrowserLanguage = () => {
    const browserLang = navigator.language.split('-')[0];
    return availableLanguages.includes(browserLang) ? browserLang : 'en';
  };

  return {
    // Estado
    currentLanguage,
    availableLanguages,
    translations,
    isLoading,
    isTranslating,
    detectedLanguage,
    translationStats,
    
    // Acciones
    setCurrentLanguage,
    detectLanguage,
    translateToLanguage,
    updateTranslation,
    loadTranslations,
    loadUsageStats,
    
    // Helpers
    getTranslatedText,
    getTranslatedComponents,
    detectBrowserLanguage
  };
};

// Función auxiliar para buscar componente por ID
function findComponentById(components, id) {
  for (const component of components) {
    if (component.id === id) {
      return component;
    }
    if (component.children) {
      const found = findComponentById(component.children, id);
      if (found) return found;
    }
  }
  return null;
}