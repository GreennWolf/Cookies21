/* /src/components/domain/DomainForm.jsx */
import React, { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import PropTypes from 'prop-types';
import { createDomain } from '../../api/domain'; // O usa createDomain/upsertDomain según corresponda
import { toast } from 'react-hot-toast';

/**
 * DomainForm
 * Formulario para crear (o editar) un dominio.
 * 
 * Props:
 * - initialData: objeto con datos iniciales (para edición); si es null, se asume creación.
 * - onSuccess: función callback que se llama al completarse el envío exitoso.
 * - onCancel: función callback para cerrar el formulario (en caso de usar modal).
 * - isOwner: booleano que indica si el usuario es owner.
 * - clients: array de clientes disponibles (solo para owners).
 * - selectedClientId: ID del cliente seleccionado por defecto (solo para owners).
 */
const DomainForm = ({ 
  initialData, 
  onSuccess, 
  onCancel, 
  isOwner = false, 
  clients = [], 
  selectedClientId = '' 
}) => {
  // Usamos react-hook-form para gestionar el formulario
  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: initialData || {
      domain: '',
      clientId: selectedClientId, // Valor por defecto para el cliente seleccionado
      settings: {
        design: {
          layout: 'bar',
          position: 'bottom'
        },
        scanning: {
          autoDetect: true,
          interval: 24,
        },
      },
    },
  });
  
  // Watch the layout value to show appropriate position options
  const layoutType = useWatch({
    control,
    name: 'settings.design.layout',
    defaultValue: initialData?.settings?.design?.layout || 'bar'
  });
  
  // Effect to set correct position value when layout changes
  const [prevLayoutType, setPrevLayoutType] = useState(layoutType);
  
  useEffect(() => {
    // If layout type changed
    if (layoutType !== prevLayoutType) {
      // Update the previous value for next comparison
      setPrevLayoutType(layoutType);
      
      // Get current position value from form
      const currentPosition = getValues('settings.design.position');
      
      // Update width based on layout type
      if (layoutType === 'bar' || layoutType === 'box') {
        setValue('settings.design.width', 100);
      } else if (layoutType === 'modal') {
        // Choose a value within the modal constraints
        const currentWidth = getValues('settings.design.width') || 0;
        if (currentWidth < 40 || currentWidth > 90) {
          setValue('settings.design.width', 90);
        }
      } else if (layoutType === 'floating') {
        // Choose a value within the floating constraints
        const currentWidth = getValues('settings.design.width') || 0;
        if (currentWidth < 40 || currentWidth > 70) {
          setValue('settings.design.width', 40);
        }
      }
      
      // If switching to floating type
      if (layoutType === 'floating') {
        // Check if current position isn't a valid corner position
        if (!['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(currentPosition)) {
          // Set a default corner position
          setValue('settings.design.position', 'bottom-right');
          // También establecer floatingCorner para compatibilidad completa
          setValue('settings.design.floatingCorner', 'bottom-right');
          setValue('settings.design.dataFloatingCorner', 'bottom-right');
        } else {
          // Si ya es una posición de esquina válida, actualizar también los otros campos
          setValue('settings.design.floatingCorner', currentPosition);
          setValue('settings.design.dataFloatingCorner', currentPosition);
        }
        
        // Establecer el margen flotante por defecto
        if (!getValues('settings.design.floatingMargin')) {
          setValue('settings.design.floatingMargin', '20');
          setValue('settings.design.dataFloatingMargin', '20');
        }
      } 
      // If switching from floating to other type
      else if (prevLayoutType === 'floating') {
        // Check if current position is a corner position
        if (['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(currentPosition)) {
          // Set a default standard position
          setValue('settings.design.position', 'bottom');
        }
      }
    }
  }, [layoutType, prevLayoutType, setValue, getValues]);

  const onSubmit = async (data) => {
    try {
      // Validar y establecer restricciones de ancho según el tipo de layout
      if (data.settings.design.layout === 'bar' || data.settings.design.layout === 'box') {
        data.settings.design.width = 100;
      } else if (data.settings.design.layout === 'modal') {
        // Asegurarse de que el ancho está entre 40% y 90%
        const width = data.settings.design.width || 0;
        if (width < 40) data.settings.design.width = 40;
        if (width > 90) data.settings.design.width = 90;
      } else if (data.settings.design.layout === 'floating') {
        // Asegurarse de que el ancho está entre 40% y 70%
        const width = data.settings.design.width || 0;
        if (width < 40) data.settings.design.width = 40;
        if (width > 70) data.settings.design.width = 70;
      }
      
      // Si es un banner flotante, asegurarnos de que se envía la información correcta
      if (data.settings.design.layout === 'floating') {
        // Verificar que la posición es una esquina válida
        if (!['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(data.settings.design.position)) {
          data.settings.design.position = 'bottom-right'; // Valor por defecto
        }
        
        // Asegurar que el valor de margen es válido
        if (!data.settings.design.floatingMargin) {
          data.settings.design.floatingMargin = 20; // Valor por defecto
        }
        
        // Añadir data attributes necesarios para el script
        data.settings.design.dataFloatingCorner = data.settings.design.position;
        data.settings.design.dataFloatingMargin = data.settings.design.floatingMargin.toString();
      }
      
      // Añadir data-width attribute para todos los tipos de banner
      data.settings.design.dataWidth = data.settings.design.width.toString() + '%';
      
      // Aquí puedes adaptar la llamada al endpoint correspondiente.
      // Por ejemplo, si no hay initialData, se crea el dominio.
      const response = await createDomain(data);
      toast.success('Dominio creado correctamente');
      if (onSuccess) onSuccess(response.data.domain);
    } catch (error) {
      toast.error(error.message || 'Error al crear el dominio');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Campo para dominio */}
      <div>
        <label className="block text-gray-700">Dominio</label>
        <input
          type="text"
          placeholder="ejemplo.com"
          {...register('domain', { required: 'El dominio es requerido' })}
          className="mt-1 block w-full px-3 py-2 border rounded"
        />
        {errors.domain && <p className="text-red-500 text-sm">{errors.domain.message}</p>}
      </div>
      
      {/* Campo para seleccionar cliente (solo para owners) */}
      {isOwner && (
        <div>
          <label className="block text-gray-700">Cliente</label>
          <select
            {...register('clientId', { required: 'El cliente es requerido' })}
            className="mt-1 block w-full px-3 py-2 border rounded"
          >
            <option value="">Seleccionar cliente</option>
            {clients.map(client => (
              <option key={client._id} value={client._id}>
                {client.name}
              </option>
            ))}
          </select>
          {errors.clientId && <p className="text-red-500 text-sm">{errors.clientId.message}</p>}
        </div>
      )}

      {/* Sección de Diseño */}
      <div className="border p-4 rounded">
        <h3 className="text-lg font-semibold text-[#235C88] mb-2">Configuración de Diseño</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700">Color Primario</label>
            <input
              type="color"
              {...register('settings.design.theme.primary')}
              className="mt-1 block w-full h-10"
            />
          </div>
          <div>
            <label className="block text-gray-700">Color Secundario</label>
            <input
              type="color"
              {...register('settings.design.theme.secondary')}
              className="mt-1 block w-full h-10"
            />
          </div>
          <div>
            <label className="block text-gray-700">Color Fondo</label>
            <input
              type="color"
              {...register('settings.design.theme.background')}
              className="mt-1 block w-full h-10"
            />
          </div>
          <div>
            <label className="block text-gray-700">Color de Texto</label>
            <input
              type="color"
              {...register('settings.design.theme.text')}
              className="mt-1 block w-full h-10"
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700">Layout</label>
            <select
              {...register('settings.design.layout')}
              className="mt-1 block w-full px-3 py-2 border rounded"
            >
              <option value="bar">Barra</option>
              <option value="box">Caja</option>
              <option value="modal">Modal</option>
              <option value="floating">Flotante</option>
            </select>
          </div>
          
          {/* Campo de ancho según tipo de layout */}
          <div>
            <label className="block text-gray-700">Ancho (%)</label>
            <input
              type="number"
              {...register('settings.design.width', {
                valueAsNumber: true,
                validate: {
                  withinConstraints: value => {
                    if (layoutType === 'modal') {
                      return (value >= 40 && value <= 90) || 'Modal: El ancho debe estar entre 40% y 90%';
                    } else if (layoutType === 'floating') {
                      return (value >= 40 && value <= 70) || 'Flotante: El ancho debe estar entre 40% y 70%';
                    } else if (layoutType === 'bar' || layoutType === 'box') {
                      return value === 100 || 'Barra/Caja: El ancho debe ser 100%';
                    }
                    return true;
                  }
                }
              })}
              defaultValue={layoutType === 'bar' || layoutType === 'box' ? 100 : 
                           layoutType === 'modal' ? 90 : 
                           layoutType === 'floating' ? 40 : 100}
              min={layoutType === 'modal' || layoutType === 'floating' ? 40 : 100}
              max={layoutType === 'modal' ? 90 : 
                  layoutType === 'floating' ? 70 : 100}
              disabled={layoutType === 'bar' || layoutType === 'box'}
              className={`mt-1 block w-full px-3 py-2 border rounded ${layoutType === 'bar' || layoutType === 'box' ? 'bg-gray-100' : ''}`}
            />
            {errors.settings?.design?.width && (
              <p className="text-red-500 text-sm">
                {errors.settings.design.width.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-gray-700">Posición</label>
            {/* Condicionalmente mostramos opciones según el tipo de layout */}
            {layoutType === 'floating' ? (
              <select
                {...register('settings.design.position')}
                className="mt-1 block w-full px-3 py-2 border rounded"
              >
                <option value="top-left">Superior izquierda</option>
                <option value="top-right">Superior derecha</option>
                <option value="bottom-left">Inferior izquierda</option>
                <option value="bottom-right">Inferior derecha</option>
              </select>
            ) : (
              <select
                {...register('settings.design.position')}
                className="mt-1 block w-full px-3 py-2 border rounded"
              >
                <option value="top">Arriba</option>
                <option value="bottom">Abajo</option>
                <option value="center">Centro</option>
              </select>
            )}
          </div>
          
          {/* Campo de margen para banners flotantes */}
          {layoutType === 'floating' && (
            <div className="col-span-1 sm:col-span-2 mt-4">
              <label className="block text-gray-700">Margen (px)</label>
              <input
                type="number"
                {...register('settings.design.floatingMargin', {
                  valueAsNumber: true,
                  min: { value: 0, message: 'El margen debe ser al menos 0px' },
                  max: { value: 100, message: 'El margen máximo es 100px' }
                })}
                defaultValue={20}
                min={0}
                max={100}
                className="mt-1 block w-full px-3 py-2 border rounded"
              />
              {errors.settings?.design?.floatingMargin && (
                <p className="text-red-500 text-sm">
                  {errors.settings.design.floatingMargin.message}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sección de Escaneo */}
      <div className="border p-4 rounded">
        <h3 className="text-lg font-semibold text-[#235C88] mb-2">Configuración de Escaneo</h3>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('settings.scanning.autoDetect')}
              className="mr-2"
            />
            Auto-detectar
          </label>
          <div>
            <label className="block text-gray-700">Intervalo (horas)</label>
            <input
              type="number"
              {...register('settings.scanning.interval', {
                required: 'El intervalo es requerido',
                valueAsNumber: true,
                min: { value: 1, message: 'El intervalo debe ser al menos 1 hora' },
              })}
              className="mt-1 block w-full px-3 py-2 border rounded"
            />
            {errors.settings?.scanning?.interval && (
              <p className="text-red-500 text-sm">
                {errors.settings.scanning.interval.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end space-x-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-[#235C88] text-white rounded hover:bg-[#1e4a6b] transition"
        >
          {isSubmitting ? 'Procesando...' : initialData ? 'Actualizar Dominio' : 'Crear Dominio'}
        </button>
      </div>
    </form>
  );
};

DomainForm.propTypes = {
  initialData: PropTypes.object,
  onSuccess: PropTypes.func,
  onCancel: PropTypes.func,
  isOwner: PropTypes.bool,
  clients: PropTypes.array,
  selectedClientId: PropTypes.string
};

export default DomainForm;
