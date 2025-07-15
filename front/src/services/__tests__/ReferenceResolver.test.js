/**
 * @fileoverview Tests para ReferenceResolver
 */

import { ReferenceResolver } from '../ReferenceResolver.js';

// Mock del DOM para testing
const mockDOM = () => {
  // Canvas principal
  const canvas = document.createElement('div');
  canvas.className = 'banner-container';
  canvas.style.width = '800px';
  canvas.style.height = '600px';
  Object.defineProperty(canvas, 'clientWidth', { value: 800 });
  Object.defineProperty(canvas, 'clientHeight', { value: 600 });
  
  // Contenedor padre
  const container = document.createElement('div');
  container.setAttribute('data-component-type', 'container');
  container.style.width = '400px';
  container.style.height = '300px';
  Object.defineProperty(container, 'clientWidth', { value: 400 });
  Object.defineProperty(container, 'clientHeight', { value: 300 });
  
  // Componente hijo
  const childComponent = document.createElement('div');
  childComponent.setAttribute('data-id', 'child-123');
  
  // Componente raíz
  const rootComponent = document.createElement('div');
  rootComponent.setAttribute('data-id', 'root-456');
  
  // Estructurar DOM
  container.appendChild(childComponent);
  canvas.appendChild(container);
  canvas.appendChild(rootComponent);
  document.body.appendChild(canvas);
  
  return { canvas, container, childComponent, rootComponent };
};

describe('ReferenceResolver', () => {
  let resolver;
  let domElements;

  beforeEach(() => {
    resolver = new ReferenceResolver();
    domElements = mockDOM();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('getMainCanvas', () => {
    test('debería encontrar canvas principal', () => {
      const canvas = resolver.getMainCanvas();
      expect(canvas).toBe(domElements.canvas);
      expect(canvas.className).toBe('banner-container');
    });

    test('debería retornar null si no encuentra canvas', () => {
      document.body.innerHTML = '';
      const canvas = resolver.getMainCanvas();
      expect(canvas).toBeNull();
    });
  });

  describe('getParentContainer', () => {
    test('debería encontrar contenedor padre para componente hijo', () => {
      const parent = resolver.getParentContainer('child-123');
      expect(parent).toBe(domElements.container);
    });

    test('debería retornar null para componente raíz', () => {
      const parent = resolver.getParentContainer('root-456');
      expect(parent).toBeNull();
    });

    test('debería retornar null para componentId inválido', () => {
      const parent = resolver.getParentContainer('invalid-id');
      expect(parent).toBeNull();
    });
  });

  describe('getReference', () => {
    test('debería usar contenedor padre para componente hijo', () => {
      const ref = resolver.getReference('child-123', 'width');
      expect(ref).toEqual({
        element: domElements.container,
        size: 400,
        type: 'container',
        isValid: true
      });
    });

    test('debería usar canvas para componente raíz', () => {
      const ref = resolver.getReference('root-456', 'width');
      expect(ref).toEqual({
        element: domElements.canvas,
        size: 800,
        type: 'canvas',
        isValid: true
      });
    });

    test('debería manejar propiedades de height', () => {
      const ref = resolver.getReference('child-123', 'height');
      expect(ref.size).toBe(300); // altura del contenedor
    });

    test('debería retornar null para parámetros inválidos', () => {
      expect(resolver.getReference('', 'width')).toBeNull();
      expect(resolver.getReference('test', '')).toBeNull();
      expect(resolver.getReference(null, 'width')).toBeNull();
    });
  });
});