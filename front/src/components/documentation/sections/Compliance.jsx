import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Alert, AlertTitle, AlertDescription } from '../../ui/alert';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

const Compliance = () => {
  const complianceConfigCode = `// Configuración para cumplir con la Guía de Cookies 2023
window.cookie21Config = {
  consentDuration: 180, // Duración del consentimiento en días (6 meses)
  showRejectButton: true, // Mostrar botón de rechazo con misma prominencia
  rejectButtonText: "Rechazar todo", // Texto claro para el botón de rechazo
  preferencesButtonText: "Personalizar", // Opción para personalizar
  persistentPrefsButton: true, // Botón flotante para acceder siempre a preferencias
  nonEssentialDefault: false, // Cookies no esenciales desactivadas por defecto
  respectDoNotTrack: true // Respetar señal DNT del navegador
};`;

  return (
    <div>
      <h1 className="mb-4">Cumplimiento Normativo</h1>
      <p className="mb-4">
        Cookie21 está diseñado para ayudarte a cumplir con las principales normativas de privacidad y protección de datos,
        especialmente en lo relacionado con el uso de cookies y tecnologías similares en tu sitio web.
      </p>
      
      <section id="gdpr" className="mb-5">
        <h2 className="mb-3">RGPD / GDPR</h2>
        <p className="mb-3">
          El <strong>Reglamento General de Protección de Datos (RGPD)</strong> es el marco legal de la Unión Europea
          que establece las directrices para la recolección y el procesamiento de datos personales de las personas en la UE.
        </p>
        
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-lg">Requisitos clave del RGPD para cookies:</CardTitle></CardHeader>
          <CardContent>
            <ul>
              <li><strong>Consentimiento explícito</strong> - El usuario debe dar un consentimiento afirmativo y específico antes de que se utilicen cookies no esenciales.</li>
              <li><strong>Información clara</strong> - Se debe proporcionar información clara y comprensible sobre qué cookies se utilizan y para qué.</li>
              <li><strong>Control granular</strong> - Los usuarios deben poder aceptar o rechazar categorías específicas de cookies.</li>
              <li><strong>Accesibilidad</strong> - La información y los controles deben ser fácilmente accesibles.</li>
              <li><strong>Sin consentimiento por defecto</strong> - Las casillas preseleccionadas o el desplazamiento por la página no constituyen consentimiento válido.</li>
              <li><strong>Facilidad de retirada</strong> - Debe ser tan fácil retirar el consentimiento como darlo.</li>
              <li><strong>Demostración de conformidad</strong> - Debes poder demostrar que has obtenido un consentimiento válido.</li>
            </ul>
          </CardContent>
        </Card>
        
        <p className="mb-3">
          Cómo Cookie21 te ayuda a cumplir con el RGPD:
        </p>
        <ul className="mb-4">
          <li>Banner de consentimiento configurable que requiere acción afirmativa</li>
          <li>Panel de preferencias detallado con controles granulares</li>
          <li>Registro de consentimiento con timestamps y detalles completos</li>
          <li>Bloqueo de scripts hasta obtener consentimiento</li>
          <li>Renovación periódica del consentimiento configurable</li>
        </ul>
      </section>
      
      <section id="lopd" className="mb-5">
        <h2 className="mb-3">LOPD-GDD (España)</h2>
        <p className="mb-3">
          La <strong>Ley Orgánica de Protección de Datos y Garantía de los Derechos Digitales (LOPD-GDD)</strong> es 
          la implementación española del RGPD, con requisitos adicionales específicos para España.
        </p>
        
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-lg">Aspectos específicos de la LOPD-GDD:</CardTitle></CardHeader>
          <CardContent>
            <ul>
              <li><strong>Información en español</strong> - La información sobre cookies debe estar disponible en español.</li>
              <li><strong>Consentimiento explícito mejorado</strong> - La interpretación española del RGPD es particularmente estricta respecto al consentimiento.</li>
              <li><strong>Transparencia reforzada</strong> - Mayor detalle en la información sobre el uso de cookies.</li>
              <li><strong>DPO obligatorio</strong> - Para ciertas organizaciones que procesan datos a gran escala.</li>
            </ul>
          </CardContent>
        </Card>
        
        <p className="mb-3">
          Cookie21 cumple con la LOPD-GDD a través de:
        </p>
        <ul className="mb-4">
          <li>Traducción completa al español y otras lenguas oficiales de España</li>
          <li>Información detallada adaptada a los requisitos específicos españoles</li>
          <li>Cumplimiento con los criterios de la AEPD</li>
          <li>Políticas de privacidad y cookies adaptadas a la normativa española</li>
        </ul>
      </section>
      
      <section id="cookies-guide" className="mb-5">
        <h2 className="mb-3">Guía de Cookies 2023 de la AEPD</h2>
        <p className="mb-3">
          La <strong>Agencia Española de Protección de Datos (AEPD)</strong> publicó en 2023 una nueva guía sobre el uso de cookies,
          estableciendo criterios más estrictos que deben ser implementados antes de enero de 2024.
        </p>
        
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <AlertTitle className="text-blue-800">Nota importante:</AlertTitle>
          <AlertDescription className="text-blue-700">Los criterios de la Guía de Cookies 2023 de la AEPD deben implementarse antes de enero de 2024 para evitar posibles sanciones.</AlertDescription>
        </Alert>
        
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-lg">Nuevos requisitos de la Guía 2023:</CardTitle></CardHeader>
          <CardContent>
            <ul>
              <li><strong>Rechazo simplificado</strong> - Debe ser igual de fácil rechazar que aceptar todas las cookies.</li>
              <li><strong>Botón de rechazo visible</strong> - El botón de rechazo debe tener el mismo tamaño, formato y visibilidad que el de aceptación.</li>
              <li><strong>Sin "cookie walls"</strong> - No se puede condicionar el acceso al sitio a la aceptación de cookies no esenciales.</li>
              <li><strong>Sin manipulación por diseño</strong> - Prohibidas las interfaces que inducen al usuario a aceptar cookies.</li>
              <li><strong>Información concisa</strong> - La primera capa debe ser clara y concisa, evitando textos largos.</li>
              <li><strong>Gestión continua</strong> - Fácil acceso al panel de gestión de cookies en cualquier momento.</li>
              <li><strong>Renovación del consentimiento</strong> - Obligatorio renovar el consentimiento periódicamente.</li>
            </ul>
          </CardContent>
        </Card>
        
        <p className="mb-3">
          Características de Cookie21 que cumplen con la Guía 2023:
        </p>
        <ul className="mb-4">
          <li>Botones de "Aceptar" y "Rechazar" con la misma prominencia y accesibilidad</li>
          <li>Diseño no manipulativo que cumple con los estándares de "patrón oscuro"</li>
          <li>Información en capas que combina claridad con acceso a detalles completos</li>
          <li>Configuración para renovación de consentimiento automática</li>
          <li>Acceso permanente al panel de preferencias mediante botón flotante opcional</li>
        </ul>
        
        <Card className="mb-6">
          <CardContent className="pt-6">
            <SyntaxHighlighter language="javascript" style={tomorrow}>
              {complianceConfigCode}
            </SyntaxHighlighter>
          </CardContent>
        </Card>
      </section>
      
      <section id="tcf" className="mb-5">
        <h2 className="mb-3">Soporte para TCF 2.2</h2>
        <p className="mb-3">
          El <strong>Transparency & Consent Framework (TCF)</strong> de IAB Europe es un estándar de la industria que facilita
          el cumplimiento del RGPD y la Directiva ePrivacy en el ecosistema de publicidad digital.
        </p>
        
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-lg">Ventajas del soporte TCF 2.2:</CardTitle></CardHeader>
          <CardContent>
            <ul>
              <li><strong>Interoperabilidad</strong> - Permite la comunicación de preferencias entre diferentes plataformas publicitarias.</li>
              <li><strong>Gestión centralizada</strong> - El usuario gestiona sus preferencias para múltiples empresas en una sola interfaz.</li>
              <li><strong>Cumplimiento verificable</strong> - Proporciona un registro estandarizado del consentimiento.</li>
              <li><strong>Aceptación en la industria</strong> - Reconocido por los principales actores del ecosistema publicitario.</li>
            </ul>
          </CardContent>
        </Card>
        
        <p className="mb-3">
          Cookie21 ofrece soporte completo para TCF 2.2:
        </p>
        <ul className="mb-4">
          <li>Implementación completa de la especificación TCF 2.2</li>
          <li>TC String generado y almacenado según el estándar</li>
          <li>Panel de preferencias compatible con GVL (Global Vendor List)</li>
          <li>Soporte para propósitos, características especiales y vendedores</li>
          <li>Integración con las principales plataformas publicitarias</li>
        </ul>
      </section>
      
      <section id="eprivacy" className="mb-5">
        <h2 className="mb-3">Directiva ePrivacy</h2>
        <p className="mb-3">
          La <strong>Directiva ePrivacy</strong> (también conocida como "Directiva sobre cookies") establece reglas específicas
          sobre el uso de cookies y tecnologías similares en la UE, complementando al RGPD.
        </p>
        
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-lg">Requisitos de la Directiva ePrivacy:</CardTitle></CardHeader>
          <CardContent>
            <ul>
              <li><strong>Información clara</strong> - Los usuarios deben ser informados claramente sobre el uso de cookies.</li>
              <li><strong>Finalidad específica</strong> - Información sobre el propósito exacto de cada cookie.</li>
              <li><strong>Consentimiento previo</strong> - El consentimiento debe obtenerse antes de instalar cookies no esenciales.</li>
              <li><strong>Excepción para cookies técnicas</strong> - Las cookies estrictamente necesarias están exentas del requisito de consentimiento.</li>
            </ul>
          </CardContent>
        </Card>
        
        <p className="mb-3">
          Cookie21 implementa todos los requisitos de la Directiva ePrivacy y está preparado para el futuro Reglamento ePrivacy
          que reemplazará a la directiva actual.
        </p>
      </section>
      
      <section id="compliance-summary" className="mb-5">
        <h2 className="mb-3">Resumen de Cumplimiento</h2>
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-lg">Tabla de características de cumplimiento</CardTitle></CardHeader>
          <CardContent>
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead className="table-light">
                  <tr>
                    <th>Característica</th>
                    <th>RGPD</th>
                    <th>LOPD-GDD</th>
                    <th>Guía AEPD 2023</th>
                    <th>TCF 2.2</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Consentimiento explícito</td>
                    <td className="text-success">✓</td>
                    <td className="text-success">✓</td>
                    <td className="text-success">✓</td>
                    <td className="text-success">✓</td>
                  </tr>
                  <tr>
                    <td>Información en capas</td>
                    <td className="text-success">✓</td>
                    <td className="text-success">✓</td>
                    <td className="text-success">✓</td>
                    <td className="text-success">✓</td>
                  </tr>
                  <tr>
                    <td>Rechazo simplificado</td>
                    <td className="text-success">✓</td>
                    <td className="text-success">✓</td>
                    <td className="text-success">✓</td>
                    <td className="text-success">✓</td>
                  </tr>
                  <tr>
                    <td>Control granular</td>
                    <td className="text-success">✓</td>
                    <td className="text-success">✓</td>
                    <td className="text-success">✓</td>
                    <td className="text-success">✓</td>
                  </tr>
                  <tr>
                    <td>Renovación de consentimiento</td>
                    <td className="text-success">✓</td>
                    <td className="text-success">✓</td>
                    <td className="text-success">✓</td>
                    <td className="text-success">✓</td>
                  </tr>
                  <tr>
                    <td>Registro de consentimiento</td>
                    <td className="text-success">✓</td>
                    <td className="text-success">✓</td>
                    <td className="text-success">✓</td>
                    <td className="text-success">✓</td>
                  </tr>
                  <tr>
                    <td>Múltiples idiomas</td>
                    <td className="text-success">✓</td>
                    <td className="text-success">✓</td>
                    <td className="text-success">✓</td>
                    <td className="text-success">✓</td>
                  </tr>
                  <tr>
                    <td>Integración IAB</td>
                    <td className="text-muted">N/A</td>
                    <td className="text-muted">N/A</td>
                    <td className="text-muted">N/A</td>
                    <td className="text-success">✓</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <AlertTitle className="text-blue-800">Aviso legal:</AlertTitle>
          <AlertDescription className="text-blue-700">
            Esta información se proporciona como guía y no constituye asesoramiento legal. Recomendamos consultar con un profesional
            legal para garantizar el cumplimiento total de todas las leyes y normativas aplicables en su jurisdicción específica.
          </AlertDescription>
        </Alert>
      </section>
    </div>
  );
};

export default Compliance;