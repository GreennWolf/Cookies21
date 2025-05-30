// /src/components/banner/Editor/PreferencesEditor.jsx
import React from 'react';

function PreferencesEditor({ bannerConfig, selectedComponent, setSelectedComponent  }) {
  const { preferencesView } = bannerConfig;
  

  return (
    <div style={{ flex: 1, minHeight: '400px', border: '1px solid #ccc', padding: '1rem' }}>
      <h4>Editor de Preferencias</h4>
      <div>
        <h5>Componentes en Preferencias:</h5>
        {preferencesView.components.map((comp) => (
          <div
            key={comp.id}
            onClick={() => setSelectedComponent(comp)}
            style={{
              border: comp.id === selectedComponent?.id ? '2px solid blue' : '1px dashed #aaa',
              margin: '0.5rem',
              padding: '0.5rem',
              cursor: 'pointer',
            }}
          >
            <strong>{comp.type}</strong> - {comp.content}
            {comp.locked && <span style={{ marginLeft: '1rem', color: 'red' }}>(obligatorio)</span>}
          </div>
        ))}
      </div>
      <div style={{ marginTop: '1rem' }}>
        <h5>Categorías de Cookies:</h5>
        <ul>
          {preferencesView.categories.map((cat) => (
            <li key={cat.name}>
              {cat.name} - {cat.allowed ? 'Permitido' : 'No permitido'}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default PreferencesEditor;
