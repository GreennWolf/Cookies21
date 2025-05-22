import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getDomains } from '../api/domain';
import { 
  getIntegrationStatus, 
  configureGoogleAnalytics, 
  configureGTM, 
  configureIAB, 
  configureWebhook,
  testWebhook 
} from '../api/integration';
import DomainSelector from '../components/domain/DomainSelector';
import IntegrationStatus from '../components/integration/IntegrationStatus';
import GoogleAnalyticsModal from '../components/integration/GoogleAnalyticsModal';
import GTMModal from '../components/integration/GTMModal';
import IABModal from '../components/integration/IABModal';
import WebhookModal from '../components/integration/WebhookModal';
import WebhookList from '../components/integration/WebhookList';
import TestWebhookModal from '../components/integration/TestWebhookModal';

const Integrations = () => {
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [integrationStatus, setIntegrationStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Estados para controlar la visibilidad de los modales
  const [isGAModalOpen, setIsGAModalOpen] = useState(false);
  const [isGTMModalOpen, setIsGTMModalOpen] = useState(false);
  const [isIABModalOpen, setIsIABModalOpen] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [isTestWebhookModalOpen, setIsTestWebhookModalOpen] = useState(false);
  
  // Obtener dominios asociados al usuario/cliente
  useEffect(() => {
    const fetchDomains = async () => {
      setLoading(true);
      try {
        const res = await getDomains();
        setDomains(res.data.domains);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDomains();
  }, []);

  // Obtener estado de las integraciones para el dominio seleccionado
  useEffect(() => {
    const fetchIntegrationStatus = async () => {
      if (selectedDomain) {
        setLoading(true);
        try {
          const res = await getIntegrationStatus(selectedDomain._id);
          setIntegrationStatus(res.data.status);
        } catch (error) {
          toast.error(error.message);
        } finally {
          setLoading(false);
        }
      }
    };
    if (selectedDomain) {
      fetchIntegrationStatus();
    }
  }, [selectedDomain]);

  // Función para configurar Google Analytics
  const handleConfigureGA = async (configData) => {
    if (!selectedDomain) return;
    setLoading(true);
    try {
      await configureGoogleAnalytics(selectedDomain._id, configData);
      toast.success('Configuración de Google Analytics actualizada');
      // Actualizar estado de las integraciones
      const res = await getIntegrationStatus(selectedDomain._id);
      setIntegrationStatus(res.data.status);
      setIsGAModalOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para configurar Google Tag Manager
  const handleConfigureGTM = async (configData) => {
    if (!selectedDomain) return;
    setLoading(true);
    try {
      await configureGTM(selectedDomain._id, configData);
      toast.success('Configuración de Google Tag Manager actualizada');
      // Actualizar estado de las integraciones
      const res = await getIntegrationStatus(selectedDomain._id);
      setIntegrationStatus(res.data.status);
      setIsGTMModalOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para configurar IAB
  const handleConfigureIAB = async (configData) => {
    setLoading(true);
    try {
      await configureIAB(configData);
      toast.success('Configuración IAB actualizada');
      // Actualizar estado de las integraciones
      if (selectedDomain) {
        const res = await getIntegrationStatus(selectedDomain._id);
        setIntegrationStatus(res.data.status);
      }
      setIsIABModalOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para configurar Webhook
  const handleConfigureWebhook = async (webhookData) => {
    if (!selectedDomain) return;
    setLoading(true);
    try {
      await configureWebhook(selectedDomain._id, webhookData);
      toast.success('Webhook configurado correctamente');
      // Actualizar estado de las integraciones
      const res = await getIntegrationStatus(selectedDomain._id);
      setIntegrationStatus(res.data.status);
      setIsWebhookModalOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para probar un webhook
  const handleTestWebhook = async (testData) => {
    setLoading(true);
    try {
      const result = await testWebhook(testData);
      return result.data;
    } catch (error) {
      toast.error(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-[#181818]">Gestión de Integraciones</h1>
      
      {/* Selector de dominios */}
      <DomainSelector 
        domains={domains} 
        selectedDomain={selectedDomain} 
        onSelect={setSelectedDomain} 
      />

      {/* Estado de integraciones */}
      {loading && !integrationStatus ? (
        <p className="mt-4">Cargando estado de integraciones...</p>
      ) : selectedDomain && integrationStatus ? (
        <IntegrationStatus 
          status={integrationStatus} 
          onConfigureGA={() => setIsGAModalOpen(true)}
          onConfigureGTM={() => setIsGTMModalOpen(true)}
          onConfigureIAB={() => setIsIABModalOpen(true)}
          onConfigureWebhook={() => setIsWebhookModalOpen(true)}
          onTestWebhook={() => setIsTestWebhookModalOpen(true)}
        />
      ) : (
        <p className="mt-4">Selecciona un dominio para ver sus integraciones</p>
      )}

      {/* Lista de webhooks configurados */}
      {selectedDomain && integrationStatus && integrationStatus.webhooks && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-2 text-[#181818]">Webhooks Configurados</h2>
          <WebhookList 
            webhooks={integrationStatus.webhooks} 
            onTestWebhook={handleTestWebhook}
          />
        </div>
      )}

      {/* Modales para cada tipo de integración */}
      {isGAModalOpen && (
        <GoogleAnalyticsModal 
          onClose={() => setIsGAModalOpen(false)}
          onSave={handleConfigureGA}
          currentConfig={integrationStatus?.googleAnalytics}
        />
      )}

      {isGTMModalOpen && (
        <GTMModal 
          onClose={() => setIsGTMModalOpen(false)}
          onSave={handleConfigureGTM}
          currentConfig={integrationStatus?.gtm}
        />
      )}

      {isIABModalOpen && (
        <IABModal 
          onClose={() => setIsIABModalOpen(false)}
          onSave={handleConfigureIAB}
          currentConfig={integrationStatus?.iab}
        />
      )}

      {isWebhookModalOpen && (
        <WebhookModal 
          onClose={() => setIsWebhookModalOpen(false)}
          onSave={handleConfigureWebhook}
          onTest={handleTestWebhook}
        />
      )}

      {isTestWebhookModalOpen && (
        <TestWebhookModal 
          onClose={() => setIsTestWebhookModalOpen(false)}
          onTest={handleTestWebhook}
        />
      )}
    </div>
  );
};

export default Integrations;