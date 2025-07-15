/* /src/components/domain/DomainFormSimplified.jsx */
import React from 'react';
import { useForm } from 'react-hook-form';
import PropTypes from 'prop-types';
import { createDomain, updateDomain } from '../../api/domain';
import { toast } from 'react-hot-toast';

/**
 * DomainFormSimplified
 * Formulario simplificado para crear un dominio con configuración de escaneo
 */
const DomainFormSimplified = ({ 
  onSuccess, 
  onCancel, 
  isOwner = false, 
  clients = [], 
  selectedClientId = '',
  editingDomain = null
}) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: editingDomain ? {
      domain: editingDomain.domain,
      clientId: editingDomain.clientId?._id || editingDomain.clientId || selectedClientId,
      scanConfig: {
        autoScanEnabled: editingDomain.scanConfig?.autoScanEnabled ?? true,
        scanInterval: editingDomain.scanConfig?.scanInterval || 'daily',
        analysisMode: editingDomain.scanConfig?.analysisMode || 'smart',
        smartAnalysisFrequency: editingDomain.scanConfig?.smartAnalysisFrequency || 'weekly',
        cookieCleanupAction: editingDomain.scanConfig?.cookieCleanupAction || 'mark_inactive',
        cookieCleanupEnabled: editingDomain.scanConfig?.cookieCleanupEnabled ?? true
      }
    } : {
      domain: '',
      clientId: selectedClientId,
      scanConfig: {
        autoScanEnabled: true,
        scanInterval: 'daily',
        analysisMode: 'smart',
        smartAnalysisFrequency: 'weekly',
        cookieCleanupAction: 'mark_inactive',
        cookieCleanupEnabled: true
      }
    },
  });

  // Watch para mostrar opciones condicionales
  const autoScanEnabled = watch('scanConfig.autoScanEnabled');

  const onSubmit = async (data) => {
    try {
      if (editingDomain) {
        // Modo edición
        const payload = {
          domain: data.domain,
          clientId: data.clientId || undefined,
          scanConfig: data.scanConfig,
          // Mantener el status actual si está editando
          status: editingDomain.status
        };

        const response = await updateDomain(editingDomain._id, payload);
        toast.success('Dominio actualizado correctamente');
        if (onSuccess) onSuccess(response.data.domain);
      } else {
        // Modo creación
        const payload = {
          domain: data.domain,
          clientId: data.clientId || undefined,
          // Configuración mínima - el resto se maneja en el backend
          settings: {
            defaultTemplateId: null // Se asignará un template por defecto en el backend
          },
          scanConfig: data.scanConfig,
          status: 'active' // Dominio activo por defecto
        };

        const response = await createDomain(payload);
        toast.success('Dominio creado correctamente');
        if (onSuccess) onSuccess(response.data.domain);
      }
    } catch (error) {
      toast.error(error.message || (editingDomain ? 'Error al actualizar el dominio' : 'Error al crear el dominio'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Campo para dominio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dominio <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="ejemplo.com"
          {...register('domain', { 
            required: 'El dominio es requerido',
            pattern: {
              value: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
              message: 'Formato de dominio inválido'
            }
          })}
          disabled={!!editingDomain}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${editingDomain ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        {errors.domain && <p className="text-red-500 text-sm mt-1">{errors.domain.message}</p>}
      </div>
      
      {/* Campo para seleccionar cliente (solo para owners) */}
      {isOwner && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cliente <span className="text-red-500">*</span>
          </label>
          <select
            {...register('clientId', { required: 'El cliente es requerido' })}
            disabled={!!editingDomain}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${editingDomain ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          >
            <option value="">Seleccionar cliente</option>
            {clients.map(client => (
              <option key={client._id} value={client._id}>
                {client.name}
              </option>
            ))}
          </select>
          {errors.clientId && <p className="text-red-500 text-sm mt-1">{errors.clientId.message}</p>}
        </div>
      )}

      {/* Configuración de Escaneo Automático */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Configuración de Escaneo Automático
        </h3>
        
        {/* Activar escaneo automático */}
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('scanConfig.autoScanEnabled')}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Activar escaneo automático
            </span>
          </label>
          <p className="text-sm text-gray-500 ml-6 mt-1">
            El sistema escaneará automáticamente el dominio según el intervalo configurado
          </p>
        </div>

        {autoScanEnabled && (
          <>
            {/* Intervalo de escaneo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Intervalo de Escaneo
                </label>
                <select
                  {...register('scanConfig.scanInterval')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="hourly">Cada hora</option>
                  <option value="every-2-hours">Cada 2 horas</option>
                  <option value="every-6-hours">Cada 6 horas</option>
                  <option value="every-12-hours">Cada 12 horas</option>
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>

              {/* Modo de análisis - FIJO EN SMART */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modo de Análisis
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                  <span className="text-gray-700">🧠 Inteligente (Optimizado)</span>
                </div>
                <input 
                  type="hidden" 
                  {...register('scanConfig.analysisMode')} 
                  value="smart" 
                />
                <p className="text-xs text-gray-500 mt-1">
                  Detecta cambios y realiza análisis completo según la frecuencia configurada
                </p>
              </div>
            </div>

            {/* Frecuencia de análisis inteligente - Siempre visible porque siempre es smart */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frecuencia de Análisis Completo
              </label>
              <select
                {...register('scanConfig.smartAnalysisFrequency')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Diario</option>
                <option value="weekly">Semanal (Recomendado)</option>
                <option value="monthly">Mensual</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                El sistema realizará un análisis completo según esta frecuencia
              </p>
            </div>

            {/* Acción de limpieza */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Acción para Cookies Inactivas
                </label>
                <select
                  {...register('scanConfig.cookieCleanupAction')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="mark_inactive">Marcar como inactivas</option>
                  <option value="delete">Eliminar</option>
                  <option value="ignore">No hacer nada</option>
                </select>
              </div>

              {/* Habilitar limpieza */}
              <div className="flex items-center mt-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('scanConfig.cookieCleanupEnabled')}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Activar limpieza automática
                  </span>
                </label>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mensaje informativo para modo edición */}
      {editingDomain && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800">
            <strong>Nota:</strong> El dominio y el cliente no se pueden modificar después de la creación.
          </p>
        </div>
      )}

      {/* Información sobre el modo inteligente */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">
          ℹ️ Sobre el Modo Inteligente
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Detecta cookies en cada escaneo programado</li>
          <li>• Realiza análisis completo según la frecuencia configurada</li>
          <li>• Optimiza el rendimiento al evitar análisis innecesarios</li>
          <li>• Ideal para la mayoría de sitios web</li>
        </ul>
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end space-x-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (editingDomain ? 'Actualizando...' : 'Creando...') : (editingDomain ? 'Actualizar Dominio' : 'Crear Dominio')}
        </button>
      </div>
    </form>
  );
};

DomainFormSimplified.propTypes = {
  onSuccess: PropTypes.func,
  onCancel: PropTypes.func,
  isOwner: PropTypes.bool,
  clients: PropTypes.array,
  selectedClientId: PropTypes.string,
  editingDomain: PropTypes.object
};

export default DomainFormSimplified;