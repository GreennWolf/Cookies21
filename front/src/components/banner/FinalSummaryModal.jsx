import React from 'react';
import { ArrowLeft, Send, Users, Globe, Mail, CheckCircle } from 'lucide-react';

function FinalSummaryModal({ clientsWithUsers, domainConfigurations, banner, onSend, onBack }) {
  
  // Preparar datos para el envío
  const handleSend = () => {
    const recipients = [];
    const domainData = {};

    // Recopilar todos los usuarios y sus dominios
    clientsWithUsers.forEach(client => {
      const domainConfig = domainConfigurations[client.id];
      if (domainConfig) {
        // Agregar usuarios a la lista de destinatarios
        client.users.forEach(user => {
          recipients.push({
            email: user.email,
            name: user.name,
            clientId: client.id === 'no-client' ? null : client.id,
            domainId: domainConfig.domain._id
          });
        });

        // Guardar configuración del dominio usando domainId como key
        domainData[domainConfig.domain._id] = {
          domainId: domainConfig.domain._id,
          domain: domainConfig.domain.domain,
          needsUpdate: domainConfig.needsUpdate
        };
      }
    });

    const finalData = {
      recipients,
      domainData
    };

    onSend(finalData);
  };

  // Calcular totales
  const totalUsers = clientsWithUsers.reduce((total, client) => total + client.users.length, 0);
  const totalClients = clientsWithUsers.length;

  return (
    <>
      <div className="p-4">
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-2">Resumen del envío:</h4>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="font-medium text-green-900">
              Todo listo para enviar el script
            </div>
            <div className="text-sm text-green-700">
              {totalUsers} usuario(s) en {totalClients} cliente(s) recibirán el script
            </div>
          </div>
        </div>

        {/* Información del banner */}
        <div className="mb-6">
          <h5 className="text-sm font-medium text-gray-700 mb-3">Banner a enviar:</h5>
          <div className="p-3 bg-gray-50 rounded-lg border">
            <div className="font-medium">{banner?.name}</div>
            <div className="text-sm text-gray-600">
              Tipo: {banner?.type === 'system' ? 'Sistema' : 'Personalizado'}
              {banner?.clientName && (
                <span className="ml-2">• Cliente: {banner.clientName}</span>
              )}
            </div>
          </div>
        </div>

        {/* Desglose por cliente */}
        <div className="mb-6">
          <h5 className="text-sm font-medium text-gray-700 mb-3">Desglose por cliente:</h5>
          <div className="space-y-3">
            {clientsWithUsers.map((client) => {
              const domainConfig = domainConfigurations[client.id];
              return (
                <div key={client.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h6 className="font-medium text-gray-900">{client.name}</h6>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <div className="flex items-center gap-1">
                          <Users size={14} />
                          <span>{client.users.length} usuario(s)</span>
                        </div>
                        {domainConfig && (
                          <div className="flex items-center gap-1">
                            <Globe size={14} />
                            <span>{domainConfig.domain.domain}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle size={16} />
                      <span className="text-sm font-medium">Configurado</span>
                    </div>
                  </div>

                  {/* Lista de usuarios */}
                  <div className="space-y-2">
                    {client.users.map((user) => (
                      <div key={user._id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                        <Mail size={14} className="text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-500 truncate">{user.email}</div>
                        </div>
                        {user.role === 'owner' && (
                          <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded font-medium">
                            OWNER
                          </span>
                        )}
                        {user.role === 'admin' && (
                          <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded font-medium">
                            ADMIN
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Información del dominio */}
                  {domainConfig && (
                    <div className="mt-3 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                      <div className="text-sm">
                        <span className="font-medium text-blue-900">Dominio:</span>
                        <span className="text-blue-700 ml-1">{domainConfig.domain.domain}</span>
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        {domainConfig.needsUpdate 
                          ? 'Se asignará como banner predeterminado'
                          : 'Ya configurado como banner predeterminado'
                        }
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumen final */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h5 className="font-medium text-blue-900 mb-2">¿Qué sucederá al enviar?</h5>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Se generarán los scripts personalizados para cada dominio</li>
            <li>• Se asignarán los banners como predeterminados en los dominios</li>
            <li>• Se enviarán los emails con los scripts a todos los usuarios</li>
            <li>• Los usuarios recibirán instrucciones de implementación</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-50 border-t flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Volver
        </button>
        <button
          onClick={handleSend}
          className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
        >
          <Send size={16} />
          Enviar Scripts ({totalUsers})
        </button>
      </div>
    </>
  );
}

export default FinalSummaryModal;