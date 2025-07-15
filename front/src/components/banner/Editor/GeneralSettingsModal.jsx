import React, { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';

const GeneralSettingsModal = ({ isOpen, onClose, bannerConfig, onUpdateSettings, isOwner = false }) => {
  const [showBranding, setShowBranding] = useState(true);

  useEffect(() => {
    if (bannerConfig?.showBranding !== undefined) {
      setShowBranding(bannerConfig.showBranding);
    }
  }, [bannerConfig]);

  const handleSave = () => {
    onUpdateSettings(null, showBranding);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 ">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Configuración General del Banner</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Configuración del Branding - Solo para owners */}
          {isOwner && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium text-gray-900">Branding</h3>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="show-branding"
                  checked={!showBranding}
                  onChange={(e) => setShowBranding(!e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="show-branding" className="text-sm text-gray-700">
                  Ocultar "Desarrollado por Cookie21"
                </label>
              </div>
              
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <Info size={16} className="flex-shrink-0 mt-0.5" />
                <p>
                  Esta opción solo está disponible para owners. El texto "Desarrollado por Cookie21" aparecerá
                  al final del banner con un enlace hacia cookie21.com
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettingsModal;