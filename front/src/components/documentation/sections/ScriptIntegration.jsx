import React from 'react';
import { Card, Alert } from 'react-bootstrap';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ScriptIntegration = () => {
  const scriptCode = `<script>
  (function(w,d,s,l,i){
    w[l]=w[l]||[];
    var f=d.getElementsByTagName(s)[0],j=d.createElement(s);
    j.async=true;j.src=i;
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','cmp','https://app.cookie21.com/api/v1/consent/script/YOUR_CLIENT_ID/embed.js');
</script>`;

  const configCode = `<script>
  // Configuración personalizada
  window.cookie21Config = {
    autoShow: true,              // Mostrar banner automáticamente
    autoAcceptNonGDPR: true,     // Aceptar automáticamente para usuarios fuera de la UE
    cookieExpiry: 180,           // Días de validez del consentimiento
    language: 'auto',            // Detección automática del idioma
    defaultLang: 'es'            // Idioma por defecto
  };
  
  // Script de carga
  (function(w,d,s,l,i){
    w[l]=w[l]||[];
    var f=d.getElementsByTagName(s)[0],j=d.createElement(s);
    j.async=true;j.src=i;
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','cmp','https://app.cookie21.com/api/v1/consent/script/YOUR_CLIENT_ID/embed.js');
</script>`;

  const blockingCode = `<!-- Este script solo se ejecutará si el usuario acepta cookies de análisis -->
<script type="text/plain" class="cmp-analytics">
  // Tu código de analytics aquí
  gtag('config', 'UA-XXXXX-Y');
</script>

<!-- Este script solo se cargará si el usuario acepta cookies de marketing -->
<script type="text/plain" class="cmp-marketing" src="https://example.com/marketing-script.js"></script>`;

  const apiCode = `// Añadir un botón para mostrar las preferencias de cookies
document.getElementById('cookiePrefsButton').addEventListener('click', function() {
  window.CMP.showPreferences();
});

// Comprobar si el usuario ha aceptado cookies analíticas
if (window.CMP.getConsentState().purposes[2]) {
  // El usuario ha aceptado cookies analíticas (propósito 2)
  initAnalytics();
}

// Escuchar cambios en el consentimiento
window.addEventListener('CMP_EVENT', function(event) {
  if (event.detail.event === 'consent-updated') {
    console.log('El usuario ha actualizado sus preferencias de cookies');
    // Actualizar los scripts según las nuevas preferencias
  }
});`;

  return (
    <div>
      <h1 className="mb-4">Integración del Script</h1>

      <section id="basic-integration" className="mb-5">
        <h2 className="mb-3">Integración básica</h2>
        <p>
          El primer paso para implementar Cookie21 en tu sitio web es añadir el script de configuración. 
          Este script debe colocarse en <span className="bg-warning bg-opacity-25 px-1 rounded">todas las páginas de tu sitio web</span>, 
          justo antes del cierre de la etiqueta <code>&lt;/head&gt;</code>.
        </p>

        <Card className="mb-4">
          <Card.Body>
            <SyntaxHighlighter language="html" style={tomorrow}>
              {scriptCode}
            </SyntaxHighlighter>
          </Card.Body>
        </Card>

        <Alert variant="info">
          <Alert.Heading>Nota importante</Alert.Heading>
          <p className="mb-0">
            Reemplaza <code>YOUR_CLIENT_ID</code> con el ID de cliente único proporcionado en tu panel de Cookie21.
            Este ID es específico para tu cuenta y asegura que la configuración correcta se aplique a tu sitio web.
          </p>
        </Alert>

        <p>
          Este script carga de forma asíncrona el código necesario para mostrar el banner de consentimiento
          y gestionar las cookies en tu sitio web. Al cargarse de forma asíncrona, no bloquea la renderización
          de la página y tiene un impacto mínimo en el rendimiento.
        </p>

        <Card className="mt-4">
          <Card.Header as="h5">Verificación de la instalación</Card.Header>
          <Card.Body>
            <p>Una vez que hayas añadido el script a tu sitio web, puedes verificar que está funcionando correctamente de la siguiente manera:</p>
            <ol>
              <li>Abre tu sitio web en una ventana de navegación privada o borra las cookies de tu navegador.</li>
              <li>Deberías ver el banner de consentimiento aparecer automáticamente.</li>
              <li>Abre la consola de desarrollador (F12 en la mayoría de navegadores) y busca mensajes que comiencen con "CMP:" para confirmar que el script se está ejecutando.</li>
            </ol>
          </Card.Body>
        </Card>
      </section>

      <section id="cms-integration" className="mb-5">
        <h2 className="mb-3">Integración en CMS</h2>
        <p>A continuación se detallan las instrucciones específicas para integrar el script de Cookie21 en los CMS más populares:</p>

        <Card className="mb-4">
          <Card.Header as="h5">WordPress</Card.Header>
          <Card.Body>
            <p>Para WordPress, tienes varias opciones:</p>
            <ol>
              <li><strong>Editar el tema</strong>: Añade el script en el archivo <code>header.php</code> de tu tema, justo antes de <code>&lt;/head&gt;</code>.</li>
              <li><strong>Usar un plugin</strong>: Puedes utilizar plugins como "Header and Footer Scripts" o "Insert Headers and Footers" para añadir el script sin editar archivos de tema.</li>
              <li><strong>Tema Personalizado</strong>: Si utilizas temas como Divi, Elementor, o similar, busca la opción para añadir código en el &lt;head&gt; en la configuración del tema.</li>
            </ol>
          </Card.Body>
        </Card>

        <Card className="mb-4">
          <Card.Header as="h5">Shopify</Card.Header>
          <Card.Body>
            <ol>
              <li>Ve a Tienda online > Temas.</li>
              <li>Haz clic en "Acciones" > "Editar código".</li>
              <li>Abre el archivo <code>theme.liquid</code>.</li>
              <li>Añade el script justo antes de <code>&lt;/head&gt;</code>.</li>
              <li>Guarda los cambios.</li>
            </ol>
          </Card.Body>
        </Card>

        <Card className="mb-4">
          <Card.Header as="h5">Google Tag Manager</Card.Header>
          <Card.Body>
            <ol>
              <li>Inicia sesión en tu cuenta de Google Tag Manager.</li>
              <li>Selecciona tu contenedor y ve a "Etiquetas" > "Nueva".</li>
              <li>Elige "Etiqueta HTML personalizada".</li>
              <li>Pega el script de Cookie21 en el campo de HTML.</li>
              <li>En "Activación", selecciona "All Pages" o crea un activador específico.</li>
              <li>Guarda la etiqueta y publica los cambios.</li>
            </ol>
            <Alert variant="warning" className="mt-3">
              <strong>Importante:</strong> Al usar Google Tag Manager, asegúrate de que el script de Cookie21 se cargue <em>antes</em> que cualquier otra etiqueta que establezca cookies.
            </Alert>
          </Card.Body>
        </Card>
      </section>

      <section id="script-blocking" className="mb-5">
        <h2 className="mb-3">Bloqueo de scripts</h2>
        <p>
          Una de las características más importantes de Cookie21 es la capacidad de bloquear scripts hasta que el usuario dé su consentimiento.
          Esto es esencial para cumplir con las normativas de privacidad.
        </p>

        <Card className="mb-4">
          <Card.Body>
            <SyntaxHighlighter language="html" style={tomorrow}>
              {blockingCode}
            </SyntaxHighlighter>
          </Card.Body>
        </Card>

        <h4 className="mt-4">Categorías disponibles</h4>
        <p>Cookie21 soporta las siguientes categorías por defecto:</p>
        <ul>
          <li><code>cmp-necessary</code> - Cookies necesarias (siempre activadas)</li>
          <li><code>cmp-analytics</code> - Cookies de analítica</li>
          <li><code>cmp-marketing</code> - Cookies de marketing y publicidad</li>
          <li><code>cmp-preferences</code> - Cookies de preferencias</li>
          <li><code>cmp-unclassified</code> - Cookies sin clasificar</li>
        </ul>
      </section>

      <section id="advanced-options" className="mb-5">
        <h2 className="mb-3">Opciones avanzadas</h2>
        <p>
          El script de Cookie21 permite configurar varias opciones avanzadas para adaptarse a tus necesidades específicas.
        </p>

        <Card className="mb-4">
          <Card.Body>
            <SyntaxHighlighter language="html" style={tomorrow}>
              {configCode}
            </SyntaxHighlighter>
          </Card.Body>
        </Card>

        <h4 className="mt-4">Opciones disponibles</h4>
        <div className="table-responsive">
          <table className="table table-bordered">
            <thead className="table-light">
              <tr>
                <th>Opción</th>
                <th>Tipo</th>
                <th>Defecto</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>autoShow</code></td>
                <td>Boolean</td>
                <td>true</td>
                <td>Mostrar el banner automáticamente cuando no se ha dado consentimiento</td>
              </tr>
              <tr>
                <td><code>autoAcceptNonGDPR</code></td>
                <td>Boolean</td>
                <td>false</td>
                <td>Aceptar automáticamente todas las cookies para usuarios fuera de la UE</td>
              </tr>
              <tr>
                <td><code>cookieExpiry</code></td>
                <td>Number</td>
                <td>365</td>
                <td>Días de validez del consentimiento</td>
              </tr>
              <tr>
                <td><code>language</code></td>
                <td>String</td>
                <td>"auto"</td>
                <td>Idioma del banner ("auto", "es", "en", "fr", etc.)</td>
              </tr>
              <tr>
                <td><code>defaultLang</code></td>
                <td>String</td>
                <td>"es"</td>
                <td>Idioma por defecto si no se puede detectar</td>
              </tr>
              <tr>
                <td><code>enableTCF</code></td>
                <td>Boolean</td>
                <td>false</td>
                <td>Habilitar soporte para IAB TCF 2.2</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="javascript-api" className="mb-5">
        <h2 className="mb-3">API JavaScript</h2>
        <p>
          Cookie21 proporciona una API JavaScript completa que te permite interactuar con el sistema de consentimiento desde tu propio código.
        </p>

        <Card className="mb-4">
          <Card.Body>
            <SyntaxHighlighter language="javascript" style={tomorrow}>
              {apiCode}
            </SyntaxHighlighter>
          </Card.Body>
        </Card>

        <h4 className="mt-4">Métodos disponibles</h4>
        <div className="table-responsive">
          <table className="table table-bordered">
            <thead className="table-light">
              <tr>
                <th>Método</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>window.CMP.showBanner()</code></td>
                <td>Muestra el banner de consentimiento</td>
              </tr>
              <tr>
                <td><code>window.CMP.hideBanner()</code></td>
                <td>Oculta el banner de consentimiento</td>
              </tr>
              <tr>
                <td><code>window.CMP.showPreferences()</code></td>
                <td>Muestra el panel de preferencias</td>
              </tr>
              <tr>
                <td><code>window.CMP.acceptAll()</code></td>
                <td>Acepta todas las categorías de cookies</td>
              </tr>
              <tr>
                <td><code>window.CMP.rejectAll()</code></td>
                <td>Rechaza todas las categorías de cookies opcionales</td>
              </tr>
              <tr>
                <td><code>window.CMP.getConsentState()</code></td>
                <td>Obtiene el estado actual del consentimiento</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ScriptIntegration;