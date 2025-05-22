import React from 'react';

const SubscriptionPlanList = ({ plans, onViewDetails, onToggleStatus }) => {
  // Función para determinar el color del badge de estado
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {plans.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          No hay planes de suscripción disponibles.
        </div>
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuarios / Dominios
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Precio
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {plans.map((plan) => (
              <tr key={plan._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {plan.metadata?.isRecommended && (
                      <span className="mr-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        Recomendado
                      </span>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">{plan.name}</div>
                      <div className="text-sm text-gray-500">{plan.description}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {plan.limits.isUnlimitedUsers ? (
                      <span>Usuarios: Ilimitados</span>
                    ) : (
                      <span>Usuarios: {plan.limits.maxUsers}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {plan.limits.isUnlimitedDomains ? (
                      <span>Dominios: Ilimitados</span>
                    ) : (
                      <span>Dominios: {plan.limits.maxDomains}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {plan.pricing.enabled ? (
                    <div className="text-sm text-gray-900">
                      {plan.pricing.amount} {plan.pricing.currency}
                      <div className="text-xs text-gray-500">
                        {plan.pricing.interval === 'monthly' && 'Mensual'}
                        {plan.pricing.interval === 'quarterly' && 'Trimestral'}
                        {plan.pricing.interval === 'annually' && 'Anual'}
                        {plan.pricing.interval === 'custom' && 'Personalizado'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Consultar</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(plan.status)}`}>
                    {plan.status === 'active' && 'Activo'}
                    {plan.status === 'inactive' && 'Inactivo'}
                    {plan.status === 'archived' && 'Archivado'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => onViewDetails(plan)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Detalles
                  </button>
                  {plan.status === 'active' ? (
                    <button
                      onClick={() => onToggleStatus(plan._id, 'inactive')}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      Desactivar
                    </button>
                  ) : (
                    <button
                      onClick={() => onToggleStatus(plan._id, 'active')}
                      className="text-green-600 hover:text-green-900"
                    >
                      Activar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SubscriptionPlanList;