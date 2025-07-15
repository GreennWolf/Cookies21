/**
 * @fileoverview Setup para tests del sistema de dimensiones
 */

// Importar jest-dom para matchers adicionales
import '@testing-library/jest-dom';

// Mock de funciones globales del navegador
global.console = {
  ...console,
  // Silenciar logs de debug en tests a menos que esté en modo verbose
  debug: process.env.JEST_VERBOSE ? console.debug : jest.fn(),
  log: process.env.JEST_VERBOSE ? console.log : jest.fn(),
  warn: console.warn,
  error: console.error
};

// Mock de getBoundingClientRect para elementos DOM
Element.prototype.getBoundingClientRect = jest.fn(() => ({
  width: 800,
  height: 600,
  top: 0,
  left: 0,
  bottom: 600,
  right: 800,
  x: 0,
  y: 0,
  toJSON: jest.fn()
}));

// Mock de closest para navegación DOM
Element.prototype.closest = jest.fn(function(selector) {
  let element = this;
  while (element) {
    if (element.matches && element.matches(selector)) {
      return element;
    }
    element = element.parentElement;
  }
  return null;
});

// Mock de matches para selección CSS
Element.prototype.matches = jest.fn(function(selector) {
  // Implementación básica para selectores comunes en tests
  if (selector === '.banner-container') {
    return this.className && this.className.includes('banner-container');
  }
  if (selector === '[data-component-type="container"]') {
    return this.getAttribute('data-component-type') === 'container';
  }
  return false;
});

// Mock de clientWidth y clientHeight para elementos
Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
  get() {
    return parseInt(this.style.width) || 800;
  },
  configurable: true
});

Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
  get() {
    return parseInt(this.style.height) || 600;
  },
  configurable: true
});

// Mock de querySelector y querySelectorAll
const originalQuerySelector = document.querySelector;
const originalQuerySelectorAll = document.querySelectorAll;

document.querySelector = jest.fn(function(selector) {
  return originalQuerySelector.call(this, selector);
});

document.querySelectorAll = jest.fn(function(selector) {
  return originalQuerySelectorAll.call(this, selector);
});

// Helper para limpiar DOM después de cada test
afterEach(() => {
  document.body.innerHTML = '';
  jest.clearAllMocks();
});

// Helper para detectar errores no capturados
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

// Configuración global para tests
global.testConfig = {
  defaultTimeout: 5000,
  mockCanvas: {
    width: 800,
    height: 600
  },
  mockContainer: {
    width: 400,
    height: 300
  }
};