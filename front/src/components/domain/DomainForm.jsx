/* /src/components/domain/DomainForm.jsx */
import React from 'react';
import { useForm } from 'react-hook-form';
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
 */
const DomainForm = ({ initialData, onSuccess, onCancel }) => {
  // Usamos react-hook-form para gestionar el formulario
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: initialData || {
      domain: '',
      settings: {
        design: {
          theme: {
            primary: '#235C88',
            secondary: '#F0F0F0',
            background: '#F0F0F0',
            text: '#181818',
          },
          position: 'bottom',
          layout: 'bar',
        },
        scanning: {
          autoDetect: true,
          interval: 24,
        },
      },
    },
  });

  const onSubmit = async (data) => {
    try {
      // Aquí puedes adaptar la llamada al endpoint correspondiente.
      // Por ejemplo, si no hay initialData, se crea el dominio.
      // Suponiendo que tienes un servicio API llamado createDomain.
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
            <label className="block text-gray-700">Posición</label>
            <select
              {...register('settings.design.position')}
              className="mt-1 block w-full px-3 py-2 border rounded"
            >
              <option value="top">Arriba</option>
              <option value="bottom">Abajo</option>
              <option value="center">Centro</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-700">Layout</label>
            <select
              {...register('settings.design.layout')}
              className="mt-1 block w-full px-3 py-2 border rounded"
            >
              <option value="bar">Barra</option>
              <option value="box">Caja</option>
              <option value="modal">Modal</option>
            </select>
          </div>
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
};

export default DomainForm;
