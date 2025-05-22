import React from 'react';

const SubscriptionPlanCards = ({ plans, selectedPlanId, onSelectPlan }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {plans.map((plan) => (
        <div 
          key={plan._id}
          className={`border rounded-lg overflow-hidden transition-shadow hover:shadow-md cursor-pointer ${
            selectedPlanId === plan._id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
          }`}
          onClick={() => onSelectPlan(plan._id)}
        >
          <div 
            className="h-2" 
            style={{ backgroundColor: plan.metadata?.color || '#3498db' }}
          ></div>
          <div className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-800">{plan.name}</h3>
              {plan.metadata?.isRecommended && (
                <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                  Recomendado
                </span>
              )}
            </div>
            
            {plan.description && (
              <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
            )}
            
            {plan.pricing?.enabled ? (
              <div className="mb-4">
                <span className="text-2xl font-bold text-gray-900">
                  {plan.pricing.amount} {plan.pricing.currency}
                </span>
                <span className="text-gray-500 text-sm ml-1">
                  /{plan.pricing.interval === 'monthly' && 'mes'}
                  {plan.pricing.interval === 'quarterly' && 'trimestre'}
                  {plan.pricing.interval === 'annually' && 'año'}
                  {plan.pricing.interval === 'custom' && 'período'}
                </span>
              </div>
            ) : (
              <div className="mb-4 text-sm italic text-gray-500">Precio a consultar</div>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">
                  {plan.limits?.isUnlimitedUsers 
                    ? 'Usuarios ilimitados' 
                    : `Hasta ${plan.limits?.maxUsers || 5} usuarios`}
                </span>
              </div>
              
              <div className="flex items-center">
                <svg className="w-4 h-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">
                  {plan.limits?.isUnlimitedDomains 
                    ? 'Dominios ilimitados' 
                    : `Hasta ${plan.limits?.maxDomains || 1} dominios`}
                </span>
              </div>

              {plan.features?.autoTranslate && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">Traducción automática</span>
                </div>
              )}
              
              {plan.features?.customization && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">Personalización</span>
                </div>
              )}
              
              {plan.features?.prioritySupport && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">Soporte prioritario</span>
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t text-center">
              <button 
                className={`px-4 py-2 rounded text-sm font-medium ${
                  selectedPlanId === plan._id
                    ? 'bg-blue-600 text-white'
                    : 'border border-blue-500 text-blue-600 hover:bg-blue-50'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPlan(plan._id);
                }}
              >
                {selectedPlanId === plan._id ? 'Seleccionado' : 'Seleccionar'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SubscriptionPlanCards;