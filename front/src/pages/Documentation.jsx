import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

const Documentation = () => {
  const { section = 'getting-started' } = useParams();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(section);

  useEffect(() => {
    setActiveSection(section);
  }, [section]);

  const handleSectionChange = (sectionKey) => {
    setActiveSection(sectionKey);
    navigate(`/documentation/${sectionKey}`);
  };

  // Datos de las secciones
  const sections = {
    'getting-started': {
      title: 'Primeros pasos',
      content: (
        <>
          <h1 className="text-3xl font-bold mb-6">Primeros pasos con Cookie21</h1>
          <p className="mb-4">
            Cookie21 es una plataforma completa para la gestión de cookies y el cumplimiento de normativas
            como RGPD, LOPD-GDD y ePrivacy. Nuestra solución facilita la implementación de banners de 
            consentimiento personalizables, el escaneo de cookies, y la gestión eficiente del 
            consentimiento de los usuarios.
          </p>
          
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Características principales</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Banner de consentimiento personalizable</strong> - Personaliza completamente el aspecto y comportamiento del banner de cookies.</li>
              <li><strong>Escaneo automático de cookies</strong> - Identifica todas las cookies de tu sitio web y clasifícalas automáticamente.</li>
              <li><strong>Gestión del consentimiento</strong> - Almacena y gestiona el consentimiento del usuario de forma segura.</li>
              <li><strong>Dashboard analítico</strong> - Obtén métricas sobre el comportamiento de los usuarios respecto al consentimiento.</li>
              <li><strong>Soporte para TCF 2.2</strong> - Compatible con el marco de transparencia y consentimiento de IAB.</li>
            </ul>
          </div>
        </>
      )
    },
    'script-integration': {
      title: 'Integración del Script',
      content: (
        <>
          <h1 className="text-3xl font-bold mb-6">Integración del Script</h1>
          <p className="mb-4">
            El primer paso para implementar Cookie21 en tu sitio web es añadir el script de configuración.
            Este script debe colocarse en <span className="bg-yellow-100 px-1 rounded">todas las páginas de tu sitio web</span>, 
            justo antes del cierre de la etiqueta <code className="bg-gray-100 px-1 py-0.5 rounded">&lt;/head&gt;</code>.
          </p>

          <div className="bg-gray-800 text-white p-4 rounded-lg mb-6 overflow-x-auto">
            <SyntaxHighlighter language="html" style={tomorrow}>
{`<script>
  (function(w,d,s,l,i){
    w[l]=w[l]||[];
    var f=d.getElementsByTagName(s)[0],j=d.createElement(s);
    j.async=true;j.src=i;
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','cmp','https://app.cookie21.com/api/v1/consent/script/YOUR_CLIENT_ID/embed.js');
</script>`}
            </SyntaxHighlighter>
          </div>
          
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <p className="font-semibold">Nota importante:</p>
            <p>Reemplaza <code className="bg-gray-100 px-1 py-0.5 rounded">YOUR_CLIENT_ID</code> con el ID de cliente único proporcionado en tu panel de Cookie21.</p>
          </div>
          
          <h2 className="text-2xl font-semibold mb-4">Bloqueo de scripts</h2>
          <p className="mb-4">
            Una característica importante de Cookie21 es la capacidad de bloquear scripts hasta que el usuario dé su consentimiento.
            Para ello, utiliza el atributo <code className="bg-gray-100 px-1 py-0.5 rounded">type="text/plain"</code> junto con una clase específica:
          </p>
          
          <div className="bg-gray-800 text-white p-4 rounded-lg mb-6 overflow-x-auto">
            <SyntaxHighlighter language="html" style={tomorrow}>
{`<!-- Este script solo se ejecutará si el usuario acepta cookies de análisis -->
<script type="text/plain" class="cmp-analytics">
  // Tu código de analytics aquí
  gtag('config', 'UA-XXXXX-Y');
</script>

<!-- Este script solo se cargará si el usuario acepta cookies de marketing -->
<script type="text/plain" class="cmp-marketing" src="https://example.com/marketing-script.js"></script>`}
            </SyntaxHighlighter>
          </div>
          
          <h2 className="text-2xl font-semibold mb-4">Categorías disponibles</h2>
          <ul className="list-disc pl-6 space-y-2 mb-6">
            <li><code className="bg-gray-100 px-1 py-0.5 rounded">cmp-necessary</code> - Cookies necesarias (siempre activadas)</li>
            <li><code className="bg-gray-100 px-1 py-0.5 rounded">cmp-analytics</code> - Cookies de analítica</li>
            <li><code className="bg-gray-100 px-1 py-0.5 rounded">cmp-marketing</code> - Cookies de marketing y publicidad</li>
            <li><code className="bg-gray-100 px-1 py-0.5 rounded">cmp-preferences</code> - Cookies de preferencias</li>
          </ul>
        </>
      )
    },
    'banner-customization': {
      title: 'Personalización del Banner',
      content: (
        <>
          <h1 className="text-3xl font-bold mb-6">Personalización del Banner</h1>
          <p className="mb-4">
            Cookie21 proporciona un potente editor visual que te permite personalizar completamente 
            el aspecto y comportamiento de tu banner de consentimiento sin necesidad de conocimientos técnicos.
          </p>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
            <p>Esta sección está en desarrollo. Próximamente encontrarás aquí una guía completa sobre el editor visual.</p>
          </div>
        </>
      )
    },
    'compliance': {
      title: 'Cumplimiento Normativo',
      content: (
        <>
          <h1 className="text-3xl font-bold mb-6">Cumplimiento Normativo</h1>
          <p className="mb-4">
            Cookie21 está diseñado para ayudarte a cumplir con las principales normativas de privacidad y protección de datos,
            especialmente en lo relacionado con el uso de cookies y tecnologías similares en tu sitio web.
          </p>
          
          <section id="gdpr" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">RGPD / GDPR</h2>
            <p className="mb-3">
              El <strong>Reglamento General de Protección de Datos (RGPD)</strong> es el marco legal de la Unión Europea
              que establece las directrices para la recolección y el procesamiento de datos personales de las personas en la UE.
            </p>
            
            <div className="bg-white shadow-md rounded-lg p-5 mb-4">
              <h3 className="text-lg font-medium mb-2">Requisitos clave del RGPD para cookies:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Consentimiento explícito</strong> - El usuario debe dar un consentimiento afirmativo y específico antes de que se utilicen cookies no esenciales.</li>
                <li><strong>Información clara</strong> - Se debe proporcionar información clara y comprensible sobre qué cookies se utilizan y para qué.</li>
                <li><strong>Control granular</strong> - Los usuarios deben poder aceptar o rechazar categorías específicas de cookies.</li>
                <li><strong>Accesibilidad</strong> - La información y los controles deben ser fácilmente accesibles.</li>
                <li><strong>Sin consentimiento por defecto</strong> - Las casillas preseleccionadas o el desplazamiento por la página no constituyen consentimiento válido.</li>
                <li><strong>Facilidad de retirada</strong> - Debe ser tan fácil retirar el consentimiento como darlo.</li>
                <li><strong>Demostración de conformidad</strong> - Debes poder demostrar que has obtenido un consentimiento válido.</li>
              </ul>
            </div>
            
            <p className="mb-3">
              Cómo Cookie21 te ayuda a cumplir con el RGPD:
            </p>
            <ul className="list-disc pl-6 space-y-1 mb-4">
              <li>Banner de consentimiento configurable que requiere acción afirmativa</li>
              <li>Panel de preferencias detallado con controles granulares</li>
              <li>Registro de consentimiento con timestamps y detalles completos</li>
              <li>Bloqueo de scripts hasta obtener consentimiento</li>
              <li>Renovación periódica del consentimiento configurable</li>
            </ul>
          </section>
          
          <section id="lopd" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">LOPD-GDD (España)</h2>
            <p className="mb-3">
              La <strong>Ley Orgánica de Protección de Datos y Garantía de los Derechos Digitales (LOPD-GDD)</strong> es 
              la implementación española del RGPD, con requisitos adicionales específicos para España.
            </p>
            
            <div className="bg-white shadow-md rounded-lg p-5 mb-4">
              <h3 className="text-lg font-medium mb-2">Aspectos específicos de la LOPD-GDD:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Información en español</strong> - La información sobre cookies debe estar disponible en español.</li>
                <li><strong>Consentimiento explícito mejorado</strong> - La interpretación española del RGPD es particularmente estricta respecto al consentimiento.</li>
                <li><strong>Transparencia reforzada</strong> - Mayor detalle en la información sobre el uso de cookies.</li>
                <li><strong>DPO obligatorio</strong> - Para ciertas organizaciones que procesan datos a gran escala.</li>
              </ul>
            </div>
            
            <p className="mb-3">
              Cookie21 cumple con la LOPD-GDD a través de:
            </p>
            <ul className="list-disc pl-6 space-y-1 mb-4">
              <li>Traducción completa al español y otras lenguas oficiales de España</li>
              <li>Información detallada adaptada a los requisitos específicos españoles</li>
              <li>Cumplimiento con los criterios de la AEPD</li>
              <li>Políticas de privacidad y cookies adaptadas a la normativa española</li>
            </ul>
          </section>
          
          <section id="cookies-guide" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Guía de Cookies 2023 de la AEPD</h2>
            <p className="mb-3">
              La <strong>Agencia Española de Protección de Datos (AEPD)</strong> publicó en 2023 una nueva guía sobre el uso de cookies,
              estableciendo criterios más estrictos que deben ser implementados antes de enero de 2024.
            </p>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <p className="font-semibold">Nota importante:</p>
              <p>Los criterios de la Guía de Cookies 2023 de la AEPD deben implementarse antes de enero de 2024 para evitar posibles sanciones.</p>
            </div>
            
            <div className="bg-white shadow-md rounded-lg p-5 mb-4">
              <h3 className="text-lg font-medium mb-2">Nuevos requisitos de la Guía 2023:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Rechazo simplificado</strong> - Debe ser igual de fácil rechazar que aceptar todas las cookies.</li>
                <li><strong>Botón de rechazo visible</strong> - El botón de rechazo debe tener el mismo tamaño, formato y visibilidad que el de aceptación.</li>
                <li><strong>Sin "cookie walls"</strong> - No se puede condicionar el acceso al sitio a la aceptación de cookies no esenciales.</li>
                <li><strong>Sin manipulación por diseño</strong> - Prohibidas las interfaces que inducen al usuario a aceptar cookies.</li>
                <li><strong>Información concisa</strong> - La primera capa debe ser clara y concisa, evitando textos largos.</li>
                <li><strong>Gestión continua</strong> - Fácil acceso al panel de gestión de cookies en cualquier momento.</li>
                <li><strong>Renovación del consentimiento</strong> - Obligatorio renovar el consentimiento periódicamente.</li>
              </ul>
            </div>
            
            <p className="mb-3">
              Características de Cookie21 que cumplen con la Guía 2023:
            </p>
            <ul className="list-disc pl-6 space-y-1 mb-4">
              <li>Botones de "Aceptar" y "Rechazar" con la misma prominencia y accesibilidad</li>
              <li>Diseño no manipulativo que cumple con los estándares de "patrón oscuro"</li>
              <li>Información en capas que combina claridad con acceso a detalles completos</li>
              <li>Configuración para renovación de consentimiento automática</li>
              <li>Acceso permanente al panel de preferencias mediante botón flotante opcional</li>
            </ul>
            
            <div className="bg-gray-800 text-white p-4 rounded-lg mb-6 overflow-x-auto">
              <SyntaxHighlighter language="javascript" style={tomorrow}>
{`// Configuración para cumplir con la Guía de Cookies 2023
window.cookie21Config = {
  consentDuration: 180, // Duración del consentimiento en días (6 meses)
  showRejectButton: true, // Mostrar botón de rechazo con misma prominencia
  rejectButtonText: "Rechazar todo", // Texto claro para el botón de rechazo
  preferencesButtonText: "Personalizar", // Opción para personalizar
  persistentPrefsButton: true, // Botón flotante para acceder siempre a preferencias
  nonEssentialDefault: false, // Cookies no esenciales desactivadas por defecto
  respectDoNotTrack: true // Respetar señal DNT del navegador
};`}
              </SyntaxHighlighter>
            </div>
          </section>
          
          <section id="tcf" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Soporte para TCF 2.2</h2>
            <p className="mb-3">
              El <strong>Transparency & Consent Framework (TCF)</strong> de IAB Europe es un estándar de la industria que facilita
              el cumplimiento del RGPD y la Directiva ePrivacy en el ecosistema de publicidad digital.
            </p>
            
            <div className="bg-white shadow-md rounded-lg p-5 mb-4">
              <h3 className="text-lg font-medium mb-2">Ventajas del soporte TCF 2.2:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Interoperabilidad</strong> - Permite la comunicación de preferencias entre diferentes plataformas publicitarias.</li>
                <li><strong>Gestión centralizada</strong> - El usuario gestiona sus preferencias para múltiples empresas en una sola interfaz.</li>
                <li><strong>Cumplimiento verificable</strong> - Proporciona un registro estandarizado del consentimiento.</li>
                <li><strong>Aceptación en la industria</strong> - Reconocido por los principales actores del ecosistema publicitario.</li>
              </ul>
            </div>
            
            <p className="mb-3">
              Cookie21 ofrece soporte completo para TCF 2.2:
            </p>
            <ul className="list-disc pl-6 space-y-1 mb-4">
              <li>Implementación completa de la especificación TCF 2.2</li>
              <li>TC String generado y almacenado según el estándar</li>
              <li>Panel de preferencias compatible con GVL (Global Vendor List)</li>
              <li>Soporte para propósitos, características especiales y vendedores</li>
              <li>Integración con las principales plataformas publicitarias</li>
            </ul>
          </section>
          
          <section id="eprivacy" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Directiva ePrivacy</h2>
            <p className="mb-3">
              La <strong>Directiva ePrivacy</strong> (también conocida como "Directiva sobre cookies") establece reglas específicas
              sobre el uso de cookies y tecnologías similares en la UE, complementando al RGPD.
            </p>
            
            <div className="bg-white shadow-md rounded-lg p-5 mb-4">
              <h3 className="text-lg font-medium mb-2">Requisitos de la Directiva ePrivacy:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Información clara</strong> - Los usuarios deben ser informados claramente sobre el uso de cookies.</li>
                <li><strong>Finalidad específica</strong> - Información sobre el propósito exacto de cada cookie.</li>
                <li><strong>Consentimiento previo</strong> - El consentimiento debe obtenerse antes de instalar cookies no esenciales.</li>
                <li><strong>Excepción para cookies técnicas</strong> - Las cookies estrictamente necesarias están exentas del requisito de consentimiento.</li>
              </ul>
            </div>
            
            <p className="mb-3">
              Cookie21 implementa todos los requisitos de la Directiva ePrivacy y está preparado para el futuro Reglamento ePrivacy
              que reemplazará a la directiva actual.
            </p>
          </section>
          
          <div className="bg-white shadow-md rounded-lg p-5 mb-4">
            <h2 className="text-xl font-semibold mb-4">Resumen de características de cumplimiento</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 border-b text-left">Característica</th>
                    <th className="py-2 px-4 border-b text-left">RGPD</th>
                    <th className="py-2 px-4 border-b text-left">LOPD-GDD</th>
                    <th className="py-2 px-4 border-b text-left">Guía AEPD 2023</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 px-4 border-b">Consentimiento explícito</td>
                    <td className="py-2 px-4 border-b text-green-600">✓</td>
                    <td className="py-2 px-4 border-b text-green-600">✓</td>
                    <td className="py-2 px-4 border-b text-green-600">✓</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 border-b">Información en capas</td>
                    <td className="py-2 px-4 border-b text-green-600">✓</td>
                    <td className="py-2 px-4 border-b text-green-600">✓</td>
                    <td className="py-2 px-4 border-b text-green-600">✓</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 border-b">Rechazo simplificado</td>
                    <td className="py-2 px-4 border-b text-green-600">✓</td>
                    <td className="py-2 px-4 border-b text-green-600">✓</td>
                    <td className="py-2 px-4 border-b text-green-600">✓</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 border-b">Control granular</td>
                    <td className="py-2 px-4 border-b text-green-600">✓</td>
                    <td className="py-2 px-4 border-b text-green-600">✓</td>
                    <td className="py-2 px-4 border-b text-green-600">✓</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 border-b">Renovación de consentimiento</td>
                    <td className="py-2 px-4 border-b text-green-600">✓</td>
                    <td className="py-2 px-4 border-b text-green-600">✓</td>
                    <td className="py-2 px-4 border-b text-green-600">✓</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 border-b">Registro de consentimiento</td>
                    <td className="py-2 px-4 border-b text-green-600">✓</td>
                    <td className="py-2 px-4 border-b text-green-600">✓</td>
                    <td className="py-2 px-4 border-b text-green-600">✓</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 border-b">Múltiples idiomas</td>
                    <td className="py-2 px-4 border-b text-green-600">✓</td>
                    <td className="py-2 px-4 border-b text-green-600">✓</td>
                    <td className="py-2 px-4 border-b text-green-600">✓</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
            <p className="font-semibold">Aviso legal:</p>
            <p className="text-sm">
              Esta información se proporciona como guía y no constituye asesoramiento legal. Recomendamos consultar con un profesional
              legal para garantizar el cumplimiento total de todas las leyes y normativas aplicables en su jurisdicción específica.
            </p>
          </div>
        </>
      )
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Cookie21 Docs</h1>
            <nav>
              <ul className="flex space-x-6">
                <li><Link to="/documentation/getting-started" className="hover:underline">Primeros pasos</Link></li>
                <li><Link to="/documentation/script-integration" className="hover:underline">Integración del Script</Link></li>
                <li><Link to="/documentation/banner-customization" className="hover:underline">Personalización del Banner</Link></li>
                <li><Link to="/documentation/compliance" className="hover:underline">Cumplimiento Normativo</Link></li>
              </ul>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row">
          {/* Sidebar */}
          <div className="w-full md:w-1/4 pr-0 md:pr-8 mb-8 md:mb-0">
            <nav className="bg-white shadow-md rounded-lg p-4">
              <ul className="space-y-2">
                {Object.entries(sections).map(([key, section]) => (
                  <li key={key}>
                    <a
                      href={`/documentation/${key}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleSectionChange(key);
                      }}
                      className={`block px-4 py-2 rounded-md ${
                        activeSection === key
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Content */}
          <div className="w-full md:w-3/4">
            <div className="bg-white shadow-md rounded-lg p-6">
              {sections[activeSection]?.content || (
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold text-gray-700">Sección no encontrada</h2>
                  <p className="mt-2">La sección solicitada no existe o está en desarrollo.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;