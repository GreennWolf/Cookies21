/**
 * Hook personalizado para LanguageButton Enhanced
 * Maneja todo el estado, lógica de traducciones y detección de idioma
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  defaultLanguageButtonConfig,
  createInitialState,
  LOADING_STATES,
  ERROR_STATES,
  LANGUAGE_MODES,
  TRANSLATION_TYPES,
  getLanguageConfig,
  getEnabledLanguages,
  detectBrowserLanguage,
  validateLanguageConfig,
  migrateLanguageConfig
} from '../types/languageButton.types';

/**
 * Hook principal para LanguageButton Enhanced
 * @param {Object} config - Configuración inicial del componente
 * @param {Function} onLanguageChange - Callback cuando cambia el idioma
 * @param {Function} onTranslationRequest - Callback para solicitar traducciones
 * @param {Object} translationService - Servicio de traducción inyectado
 * @param {Object} cacheManager - Manejador de cache inyectado
 * @returns {Object} Estado y funciones del LanguageButton
 */
export const useLanguageButton = ({
  config = {},
  onLanguageChange,
  onTranslationRequest,
  onLanguageDetected,
  onTranslationComplete,
  onTranslationError,
  translationService,
  cacheManager,
  analyticsTracker
}) => {
  // ============================================================================
  // CONFIGURACIÓN Y ESTADO INICIAL
  // ============================================================================
  
  // Migrar configuración si viene del formato antiguo
  const finalConfig = {
    ...defaultLanguageButtonConfig,
    ...migrateLanguageConfig(config)
  };

  // Validar configuración
  const configValidation = validateLanguageConfig(finalConfig);
  if (!configValidation.isValid) {
    console.warn('LanguageButton config validation failed:', configValidation.errors);
  }

  // Estado principal del componente
  const [state, setState] = useState(() => createInitialState(finalConfig));
  
  // Referencias para cleanup y debouncing
  const timeoutRef = useRef(null);
  const abortControllerRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  // ============================================================================
  // FUNCIONES DE UTILIDAD
  // ============================================================================

  /**
   * Actualiza el estado de manera segura
   */
  const updateState = useCallback((updates) => {
    setState(prevState => ({
      ...prevState,
      ...updates,
      ...(updates.translationState && {
        translationState: {
          ...prevState.translationState,
          ...updates.translationState
        }
      }),
      ...(updates.uiState && {
        uiState: {
          ...prevState.uiState,
          ...updates.uiState
        }
      }),
      ...(updates.userPreferences && {
        userPreferences: {
          ...prevState.userPreferences,
          ...updates.userPreferences
        }
      })
    }));
  }, []);

  /**
   * Obtiene los idiomas habilitados
   */
  const enabledLanguages = getEnabledLanguages(finalConfig.enabledLanguages);

  /**
   * Determina el idioma actual basado en el modo configurado
   */
  const determineCurrentLanguage = useCallback(() => {
    const { mode, fallbackLanguage, preferBrowserLanguage } = finalConfig;
    const { userSelectedLanguage } = state;
    
    // Si el usuario ha seleccionado un idioma manualmente, usarlo
    if (userSelectedLanguage) {
      return userSelectedLanguage;
    }

    // Modo manual: usar fallbackLanguage
    if (mode === LANGUAGE_MODES.MANUAL) {
      return fallbackLanguage;
    }

    // Modo auto-detect: detectar desde navegador
    if (mode === LANGUAGE_MODES.AUTO_DETECT && preferBrowserLanguage) {
      const browserLang = detectBrowserLanguage();
      // Verificar que el idioma detectado esté habilitado
      if (finalConfig.enabledLanguages.includes(browserLang)) {
        return browserLang;
      }
    }

    // Fallback por defecto
    return fallbackLanguage;
  }, [finalConfig, state.userSelectedLanguage]);

  // ============================================================================
  // FUNCIONES DE DETECCIÓN DE IDIOMA
  // ============================================================================

  /**
   * Detecta el idioma original del contenido de los componentes
   */
  const detectContentLanguage = useCallback(async (components = []) => {
    if (!translationService || !components.length) {
      return null;
    }

    try {
      updateState({
        translationState: { isDetectingLanguage: true },
        uiState: { loadingState: LOADING_STATES.DETECTING_LANGUAGE }
      });

      // Cancelar detección anterior si existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Preparar contenido para detección
      const textContent = components
        .filter(comp => comp.type === 'text' && comp.content)
        .map(comp => comp.content)
        .join(' ');

      if (!textContent.trim()) {
        return finalConfig.fallbackLanguage;
      }

      // Llamar al servicio de detección
      const detectedLanguage = await translationService.detectLanguage(
        textContent,
        { signal: abortControllerRef.current.signal }
      );

      // Validar que el idioma detectado esté en la lista de idiomas soportados
      const languageConfig = getLanguageConfig(detectedLanguage);
      const finalDetectedLanguage = languageConfig ? detectedLanguage : finalConfig.fallbackLanguage;

      updateState({
        detectedLanguage: finalDetectedLanguage,
        translationState: { isDetectingLanguage: false },
        uiState: { loadingState: LOADING_STATES.IDLE }
      });

      // Notificar detección completada
      if (onLanguageDetected) {
        onLanguageDetected({
          detected: finalDetectedLanguage,
          confidence: languageConfig?.translationQuality || 'medium',
          original: detectedLanguage
        });
      }

      // Tracking de analytics
      if (analyticsTracker) {
        analyticsTracker.track('language_detected', {
          detected_language: finalDetectedLanguage,
          original_detection: detectedLanguage,
          content_length: textContent.length
        });
      }

      return finalDetectedLanguage;

    } catch (error) {
      console.error('Error detecting language:', error);
      
      updateState({
        translationState: { isDetectingLanguage: false },
        uiState: {
          loadingState: LOADING_STATES.IDLE,
          hasError: true,
          errorMessage: 'Failed to detect language'
        }
      });

      if (onTranslationError) {
        onTranslationError(error, 'detection');
      }

      return finalConfig.fallbackLanguage;
    }
  }, [translationService, finalConfig.fallbackLanguage, onLanguageDetected, onTranslationError, analyticsTracker, updateState]);

  // ============================================================================
  // FUNCIONES DE TRADUCCIÓN
  // ============================================================================

  /**
   * Solicita traducciones para los componentes
   */
  const requestTranslations = useCallback(async (targetLanguage, components = []) => {
    if (!translationService || !components.length) {
      return {};
    }

    try {
      updateState({
        translationState: { 
          isTranslating: true,
          translationProgress: 0
        },
        uiState: { loadingState: LOADING_STATES.LOADING_TRANSLATIONS }
      });

      // Verificar cache primero si está habilitado
      let cachedTranslations = {};
      if (finalConfig.translationSettings.cacheTranslations && cacheManager) {
        cachedTranslations = await cacheManager.getTranslations(
          components.map(c => c.id),
          state.detectedLanguage || finalConfig.fallbackLanguage,
          targetLanguage
        );
      }

      // Filtrar componentes que necesitan traducción
      const componentsToTranslate = components.filter(comp => 
        !cachedTranslations[comp.id] && comp.type === 'text' && comp.content
      );

      let freshTranslations = {};
      
      if (componentsToTranslate.length > 0) {
        // Cancelar traducción anterior si existe
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        // Solicitar traducciones frescas
        freshTranslations = await translationService.translateComponents(
          componentsToTranslate,
          state.detectedLanguage || finalConfig.fallbackLanguage,
          targetLanguage,
          {
            signal: abortControllerRef.current.signal,
            onProgress: (progress) => {
              updateState({
                translationState: { translationProgress: progress }
              });
            }
          }
        );

        // Guardar en cache si está habilitado
        if (finalConfig.translationSettings.cacheTranslations && cacheManager) {
          await cacheManager.saveTranslations(freshTranslations, {
            fromLanguage: state.detectedLanguage || finalConfig.fallbackLanguage,
            toLanguage: targetLanguage,
            timestamp: Date.now()
          });
        }
      }

      // Combinar traducciones cacheadas y frescas
      const allTranslations = { ...cachedTranslations, ...freshTranslations };

      updateState({
        translationState: {
          isTranslating: false,
          translationProgress: 100,
          availableTranslations: [...state.translationState.availableTranslations, targetLanguage].filter((v, i, a) => a.indexOf(v) === i),
          cachedTranslations: Object.keys(cachedTranslations).length > 0 ? 
            [...state.translationState.cachedTranslations, targetLanguage].filter((v, i, a) => a.indexOf(v) === i) :
            state.translationState.cachedTranslations,
          lastTranslationTime: Date.now()
        },
        uiState: { loadingState: LOADING_STATES.IDLE }
      });

      // Notificar traducción completada
      if (onTranslationComplete) {
        onTranslationComplete({
          translations: allTranslations,
          language: targetLanguage,
          fromCache: Object.keys(cachedTranslations).length,
          fresh: Object.keys(freshTranslations).length,
          failed: componentsToTranslate.length - Object.keys(freshTranslations).length
        });
      }

      // Tracking de analytics
      if (analyticsTracker) {
        analyticsTracker.track('translation_completed', {
          target_language: targetLanguage,
          cached_count: Object.keys(cachedTranslations).length,
          fresh_count: Object.keys(freshTranslations).length,
          total_components: components.length
        });
      }

      return allTranslations;

    } catch (error) {
      console.error('Error requesting translations:', error);
      
      updateState({
        translationState: { 
          isTranslating: false,
          translationProgress: 0
        },
        uiState: {
          loadingState: LOADING_STATES.IDLE,
          hasError: true,
          errorMessage: 'Failed to load translations'
        }
      });

      if (onTranslationError) {
        onTranslationError(error, targetLanguage);
      }

      return {};
    }
  }, [
    translationService,
    cacheManager,
    finalConfig.translationSettings.cacheTranslations,
    finalConfig.fallbackLanguage,
    state.detectedLanguage,
    state.translationState.availableTranslations,
    state.translationState.cachedTranslations,
    onTranslationComplete,
    onTranslationError,
    analyticsTracker,
    updateState
  ]);

  // ============================================================================
  // FUNCIONES DE MANEJO DE EVENTOS
  // ============================================================================

  /**
   * Maneja el cambio de idioma por parte del usuario
   */
  const handleLanguageChange = useCallback(async (newLanguage, isUserTriggered = true) => {
    const previousLanguage = state.currentLanguage;
    
    // Evitar cambios redundantes
    if (newLanguage === previousLanguage) {
      return;
    }

    // Validar que el idioma esté habilitado
    if (!finalConfig.enabledLanguages.includes(newLanguage)) {
      console.warn(`Language ${newLanguage} is not enabled`);
      return;
    }

    // Limpiar timeout anterior
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce para evitar múltiples llamadas rápidas
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        // Actualizar estado del idioma
        updateState({
          currentLanguage: newLanguage,
          userSelectedLanguage: isUserTriggered ? newLanguage : state.userSelectedLanguage,
          uiState: { isOpen: false }
        });

        // Guardar preferencia del usuario si está habilitado
        if (finalConfig.saveUserChoice && isUserTriggered) {
          updateState({
            userPreferences: {
              lastUsedLanguage: newLanguage,
              hasCustomizedSettings: true
            }
          });

          // Guardar en localStorage
          try {
            localStorage.setItem('cmp_language_preference', JSON.stringify({
              language: newLanguage,
              mode: finalConfig.mode,
              timestamp: Date.now()
            }));
          } catch (e) {
            console.warn('Failed to save language preference to localStorage:', e);
          }
        }

        // Determinar tipo de traducción
        let translationType = TRANSLATION_TYPES.CACHED;
        if (!state.translationState.availableTranslations.includes(newLanguage)) {
          translationType = TRANSLATION_TYPES.FRESH;
        }

        // Solicitar traducciones si está habilitado
        if (finalConfig.translationSettings.enableAutoTranslation && onTranslationRequest) {
          await onTranslationRequest(newLanguage, translationType);
        }

        // Notificar cambio de idioma
        if (onLanguageChange) {
          onLanguageChange(newLanguage, {
            previousLanguage,
            mode: isUserTriggered ? 'manual' : finalConfig.mode,
            translationType,
            userTriggered: isUserTriggered,
            timestamp: Date.now()
          });
        }

        // Disparar evento personalizado para integración
        const event = new CustomEvent('languageChanged', {
          detail: {
            language: newLanguage,
            previousLanguage,
            mode: isUserTriggered ? 'manual' : finalConfig.mode,
            translationType,
            userTriggered: isUserTriggered,
            componentId: `language-button-${Date.now()}`
          }
        });
        window.dispatchEvent(event);

        // Tracking de analytics
        if (analyticsTracker) {
          analyticsTracker.track('language_changed', {
            new_language: newLanguage,
            previous_language: previousLanguage,
            user_triggered: isUserTriggered,
            translation_type: translationType
          });
        }

      } catch (error) {
        console.error('Error handling language change:', error);
        
        updateState({
          uiState: {
            hasError: true,
            errorMessage: 'Failed to change language'
          }
        });

        if (onTranslationError) {
          onTranslationError(error, newLanguage);
        }
      }
    }, finalConfig.debounceDelay);

  }, [
    state.currentLanguage,
    state.userSelectedLanguage,
    state.translationState.availableTranslations,
    finalConfig.enabledLanguages,
    finalConfig.saveUserChoice,
    finalConfig.mode,
    finalConfig.debounceDelay,
    finalConfig.translationSettings.enableAutoTranslation,
    onLanguageChange,
    onTranslationRequest,
    onTranslationError,
    analyticsTracker,
    updateState
  ]);

  /**
   * Maneja la apertura/cierre del dropdown
   */
  const handleDropdownToggle = useCallback(() => {
    // Solo permitir abrir si hay más de un idioma habilitado
    if (enabledLanguages.length <= 1) {
      return;
    }

    updateState({
      uiState: { isOpen: !state.uiState.isOpen }
    });
  }, [enabledLanguages.length, state.uiState.isOpen, updateState]);

  /**
   * Maneja el cierre del dropdown por click fuera
   */
  const handleClickOutside = useCallback(() => {
    updateState({
      uiState: { isOpen: false }
    });
  }, [updateState]);

  // ============================================================================
  // EFECTOS
  // ============================================================================

  /**
   * Efecto para cargar preferencias del usuario al montar
   */
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        // Cargar desde localStorage
        const stored = localStorage.getItem('cmp_language_preference');
        if (stored) {
          const preferences = JSON.parse(stored);
          const { language, timestamp } = preferences;
          
          // Verificar que no sea muy antiguo (7 días)
          const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
          if (timestamp > sevenDaysAgo && finalConfig.enabledLanguages.includes(language)) {
            updateState({
              userSelectedLanguage: language,
              currentLanguage: language,
              userPreferences: {
                lastUsedLanguage: language,
                hasCustomizedSettings: true
              }
            });
            return;
          }
        }

        // Si no hay preferencias guardadas, determinar idioma inicial
        const initialLanguage = determineCurrentLanguage();
        updateState({
          currentLanguage: initialLanguage
        });

      } catch (error) {
        console.warn('Failed to load user preferences:', error);
        const initialLanguage = determineCurrentLanguage();
        updateState({
          currentLanguage: initialLanguage
        });
      }
    };

    loadUserPreferences();
  }, [finalConfig.enabledLanguages, determineCurrentLanguage, updateState]);

  /**
   * Efecto para limpiar timeouts al desmontar
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ============================================================================
  // VALORES DE RETORNO
  // ============================================================================

  return {
    // Estado
    currentLanguage: state.currentLanguage,
    detectedLanguage: state.detectedLanguage,
    enabledLanguages,
    isOpen: state.uiState.isOpen,
    isLoading: state.uiState.isLoading || state.translationState.isTranslating || state.translationState.isDetectingLanguage,
    hasError: state.uiState.hasError,
    errorMessage: state.uiState.errorMessage,
    loadingState: state.uiState.loadingState,
    translationProgress: state.translationState.translationProgress,
    availableTranslations: state.translationState.availableTranslations,
    userPreferences: state.userPreferences,
    
    // Configuración
    config: finalConfig,
    configValidation,
    
    // Funciones
    handleLanguageChange,
    handleDropdownToggle,
    handleClickOutside,
    detectContentLanguage,
    requestTranslations,
    
    // Utilidades
    getCurrentLanguageConfig: () => getLanguageConfig(state.currentLanguage),
    isLanguageEnabled: (langCode) => finalConfig.enabledLanguages.includes(langCode),
    clearError: () => updateState({ uiState: { hasError: false, errorMessage: null } })
  };
};