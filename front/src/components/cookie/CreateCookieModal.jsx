import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const CreateCookieModal = ({ onClose, onCreated, domainId }) => {
  // Estado para cada campo que deseamos capturar
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [category, setCategory] = useState('necessary');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState({ id: '', name: '', description: '' });
  const [attributes, setAttributes] = useState({
    duration: '',
    type: '',
    path: '',
    domain: '',
    secure: false,
    httpOnly: false,
    sameSite: 'Lax'
  });
  const [script, setScript] = useState({
    content: '',
    url: '',
    async: false,
    defer: false,
    type: 'none',
    loadOrder: 0
  });
  const [loading, setLoading] = useState(false);

  // Manejar el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar que tenemos domainId
    if (!domainId) {
      console.error('❌ No se proporcionó domainId al CreateCookieModal');
      alert('Error: No se ha seleccionado un dominio');
      return;
    }
    
    setLoading(true);
    try {
      // Construir el objeto cookie según lo espera el endpoint
      const cookieData = {
        domainId, // Incluir el domainId
        name,
        provider,
        category,
        description,
        purpose,
        attributes,
        script
      };
      // Se asume que onCreated es una función que llama al endpoint createCookie
      await onCreated(cookieData);
      onClose();
    } catch (error) {
      console.error('Error creating cookie:', error);
      // Aquí podrías usar toast.error o similar para notificar el error
    } finally {
      setLoading(false);
    }
  };

  // Cerrar el modal con Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative max-h-[80vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-600 hover:text-gray-800">
          &#10005;
        </button>
        <h2 className="text-2xl font-bold mb-4 text-[#181818]">Crear Nueva Cookie</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
          </div>
          <div>
            <label className="block font-semibold">Proveedor (opcional)</label>
            <input
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block font-semibold">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border p-2 rounded"
              required
            >
              <option value="necessary">Necessary</option>
              <option value="analytics">Analytics</option>
              <option value="marketing">Marketing</option>
              <option value="personalization">Personalization</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
          </div>
          {/* Opcional: campos para propósito */}
          <div>
            <label className="block font-semibold">Propósito (ID, Nombre y Descripción)</label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                placeholder="ID"
                value={purpose.id}
                onChange={(e) => setPurpose({ ...purpose, id: e.target.value })}
                className="border p-2 rounded"
              />
              <input
                type="text"
                placeholder="Nombre"
                value={purpose.name}
                onChange={(e) => setPurpose({ ...purpose, name: e.target.value })}
                className="border p-2 rounded"
              />
              <input
                type="text"
                placeholder="Descripción"
                value={purpose.description}
                onChange={(e) => setPurpose({ ...purpose, description: e.target.value })}
                className="border p-2 rounded"
              />
            </div>
          </div>
          {/* Atributos */}
          <div>
            <label className="block font-semibold">Atributos</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Duration"
                value={attributes.duration}
                onChange={(e) => setAttributes({ ...attributes, duration: e.target.value })}
                className="border p-2 rounded"
              />
              <input
                type="text"
                placeholder="Type"
                value={attributes.type}
                onChange={(e) => setAttributes({ ...attributes, type: e.target.value })}
                className="border p-2 rounded"
              />
              <input
                type="text"
                placeholder="Path"
                value={attributes.path}
                onChange={(e) => setAttributes({ ...attributes, path: e.target.value })}
                className="border p-2 rounded"
              />
              <input
                type="text"
                placeholder="Domain"
                value={attributes.domain}
                onChange={(e) => setAttributes({ ...attributes, domain: e.target.value })}
                className="border p-2 rounded"
              />
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={attributes.secure}
                  onChange={(e) => setAttributes({ ...attributes, secure: e.target.checked })}
                />
                <label>Secure</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={attributes.httpOnly}
                  onChange={(e) => setAttributes({ ...attributes, httpOnly: e.target.checked })}
                />
                <label>HttpOnly</label>
              </div>
              <div className="col-span-2">
                <label className="block font-semibold">SameSite</label>
                <select
                  value={attributes.sameSite}
                  onChange={(e) => setAttributes({ ...attributes, sameSite: e.target.value })}
                  className="w-full border p-2 rounded"
                >
                  <option value="Strict">Strict</option>
                  <option value="Lax">Lax</option>
                  <option value="None">None</option>
                </select>
              </div>
            </div>
          </div>
          {/* Script (opcional) */}
          <div>
            <label className="block font-semibold">Script asociado (opcional)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="URL del script"
                value={script.url}
                onChange={(e) => setScript({ ...script, url: e.target.value })}
                className="border p-2 rounded col-span-2"
              />
              <select
                value={script.type}
                onChange={(e) => setScript({ ...script, type: e.target.value })}
                className="border p-2 rounded"
              >
                <option value="external">External</option>
                <option value="inline">Inline</option>
                <option value="none">None</option>
              </select>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={script.async}
                  onChange={(e) => setScript({ ...script, async: e.target.checked })}
                />
                <label>Async</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={script.defer}
                  onChange={(e) => setScript({ ...script, defer: e.target.checked })}
                />
                <label>Defer</label>
              </div>
              <input
                type="number"
                placeholder="Orden de carga"
                value={script.loadOrder}
                onChange={(e) => setScript({ ...script, loadOrder: parseInt(e.target.value, 10) || 0 })}
                className="border p-2 rounded col-span-2"
              />
              <textarea
                placeholder="Contenido del script (si es inline)"
                value={script.content}
                onChange={(e) => setScript({ ...script, content: e.target.value })}
                className="w-full border p-2 rounded col-span-2"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 m-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              disabled={loading}
            >
              {loading ? 'Creando...' : 'Crear Cookie'}
            </button>
            <button
              type=""
              onClick={onClose}
              className="px-4 py-2 m-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              disabled={loading}
            >
              {'Cancelar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

CreateCookieModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onCreated: PropTypes.func.isRequired,
  domainId: PropTypes.string.isRequired,
};

export default CreateCookieModal;
