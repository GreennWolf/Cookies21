/**
 * @fileoverview Contexto de React para el sistema de dimensiones
 * @module DimensionContext
 * @author Banner Editor Team
 * @version 1.0.0
 */

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { getDimensionManager } from '../services/DimensionManager.js';

/**
 * Contexto que proporciona acceso global al DimensionManager
 * 
 * @description
 * Este contexto permite que cualquier componente en el árbol de React
 * pueda acceder a la instancia del DimensionManager sin necesidad de
 * pasar props a través de múltiples niveles de componentes.
 * 
 * @example
 * // Uso del contexto
 * const dimensionManager = useDimensionManager();
 * dimensionManager.updateDimension('comp-123', 'width', '200px', 'desktop', 'input');
 */
const DimensionContext = createContext(null);

/**
 * Hook personalizado para acceder al DimensionManager desde cualquier componente
 * 
 * @returns {Object} Instancia del DimensionManager
 * @throws {Error} Si se usa fuera de un DimensionProvider
 * 
 * @example
 * function MyComponent() {
 *   const dimensionManager = useDimensionManager();
 *   
 *   const handleUpdateDimension = () => {
 *     dimensionManager.updateDimension('comp-123', 'width', '200px', 'desktop', 'button');
 *   };
 *   
 *   return <button onClick={handleUpdateDimension}>Update Width</button>;
 * }
 */
export function useDimensionManager() {
  const context = useContext(DimensionContext);
  
  if (context === undefined) {
    throw new Error(
      'useDimensionManager: Este hook debe usarse dentro de un DimensionProvider'
    );
  }
  
  // Permitir que context sea null durante la inicialización
  if (context === null) {
    console.debug(
      'useDimensionManager: DimensionManager aún en inicialización'
    );
  }
  
  return context;
}

/**
 * Proveedor del contexto de dimensiones
 * 
 * @param {Object} props - Props del componente
 * @param {React.ReactNode} props.children - Componentes hijos
 * @param {Object} props.options - Opciones de configuración del DimensionManager
 * @param {boolean} props.options.debug - Habilitar modo debug
 * @param {boolean} props.options.enableValidation - Habilitar validación
 * @param {boolean} props.options.enableLogging - Habilitar logging
 * 
 * @example
 * function App() {
 *   return (
 *     <DimensionProvider options={{ debug: true }}>
 *       <BannerEditor />
 *     </DimensionProvider>
 *   );
 * }
 */
export function DimensionProvider({ children, options = {} }) {
  const dimensionManagerRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Configuración por defecto
  const config = {
    debug: process.env.NODE_ENV === 'development',
    enableValidation: true,
    enableLogging: true,
    ...options
  };

  // Inicializar DimensionManager
  useEffect(() => {
    console.log('🔧 DimensionProvider: Intentando inicializar DimensionManager...', {
      currentManager: !!dimensionManagerRef.current,
      config
    });
    
    if (!dimensionManagerRef.current) {
      try {
        dimensionManagerRef.current = getDimensionManager(config);
        
        console.log('✅ DimensionProvider: DimensionManager inicializado exitosamente', {
          manager: !!dimensionManagerRef.current,
          config,
          stats: dimensionManagerRef.current?.getStats?.()
        });
        
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ DimensionProvider: Error al inicializar DimensionManager:', error);
        setIsInitialized(false);
      }
    } else {
      console.log('🔄 DimensionProvider: DimensionManager ya existe, marcando como inicializado');
      setIsInitialized(true);
    }
  }, [config.debug, config.enableValidation, config.enableLogging]);

  // Cleanup al desmontar (aunque el manager es singleton)
  useEffect(() => {
    return () => {
      if (config.debug) {
        console.log('🧹 DimensionProvider: Componente desmontado');
      }
    };
  }, [config.debug]);

  // Debug logging más detallado
  if (config.debug) {
    console.log('🔧 DimensionProvider: Estado actual', {
      isInitialized,
      hasManager: !!dimensionManagerRef.current,
      config
    });
  }

  // MEJORADO: Siempre proporcionar el manager si existe, independientemente del estado de inicialización
  return (
    <DimensionContext.Provider value={dimensionManagerRef.current}>
      {children}
    </DimensionContext.Provider>
  );
}

export { DimensionContext };
export default DimensionContext;