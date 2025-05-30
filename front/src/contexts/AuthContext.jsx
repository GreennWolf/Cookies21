/* /src/contexts/AuthContext.jsx */
import React, { createContext, useState, useEffect, useContext } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authData, setAuthData] = useState({
    user: null,
    token: null,
    isLoading: true  // Añadido estado de carga
  });

  // Cargar datos de autenticación al inicio
  useEffect(() => {
    const loadAuthData = () => {
      try {
        const token = localStorage.getItem('token');
        const userJson = localStorage.getItem('user');
        
        if (token && userJson) {
          // Parsear el usuario desde localStorage
          const user = JSON.parse(userJson);
          
          // Verificar que el usuario tenga la información necesaria
          if (!user.clientId && user.role === 'admin') {
            console.warn('Usuario admin sin clientId:', user);
          }
          
          setAuthData({ 
            token, 
            user, 
            isLoading: false 
          });
        } else {
          setAuthData({
            user: null,
            token: null,
            isLoading: false
          });
        }
      } catch (error) {
        console.error('Error cargando datos de autenticación:', error);
        // Limpiar datos en caso de error
        setAuthData({
          user: null,
          token: null,
          isLoading: false
        });
      }
    };

    loadAuthData();
  }, []);

  // Función para actualizar los datos de autenticación (login)
  const login = (token, user) => {
    try {
      // Verificar que el usuario tenga la información necesaria
      if (!user.clientId && user.role === 'admin') {
        console.warn('Login: Usuario admin sin clientId:', user);
      }

      // Guardar en localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Actualizar el estado
      setAuthData({
        user,
        token,
        isLoading: false
      });
      
      return true;
    } catch (error) {
      console.error('Error durante login:', error);
      return false;
    }
  };

  // Función para actualizar los datos de autenticación parcialmente
  const updateAuthData = (newData) => {
    try {
      // Actualizar el estado
      setAuthData(prev => {
        const updated = { ...prev, ...newData };
        
        // Si se actualizó el user, guardarlo en localStorage
        if (newData.user) {
          localStorage.setItem('user', JSON.stringify(updated.user));
        }
        
        // Si se actualizó el token, guardarlo en localStorage
        if (newData.token) {
          localStorage.setItem('token', updated.token);
        }
        
        return updated;
      });
      
      return true;
    } catch (error) {
      console.error('Error actualizando datos de autenticación:', error);
      return false;
    }
  };

  // Función para cerrar sesión
  const logout = () => {
    try {
      // Limpiar localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Reiniciar estado
      setAuthData({
        user: null,
        token: null,
        isLoading: false
      });
      
      return true;
    } catch (error) {
      console.error('Error durante logout:', error);
      return false;
    }
  };

  // Verificar si el usuario está autenticado
  const isAuthenticated = () => {
    return !!authData.token && !!authData.user;
  };

  // Verificar si el usuario tiene un rol específico
  const hasRole = (role) => {
    return authData.user && authData.user.role === role;
  };

  return (
    <AuthContext.Provider value={{ 
      ...authData, 
      setAuthData: updateAuthData,
      login,
      logout,
      isAuthenticated,
      hasRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para acceder al contexto de autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};