import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Alert, AlertTitle, AlertDescription } from '../../ui/alert';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ScriptIntegration = () => {
  const scriptCode = `<script>
  (function(w,d,s,l,i){
    w[l]=w[l]||[];
    var f=d.getElementsByTagName(s)[0],j=d.createElement(s);
    j.async=true;j.src=i;
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','cmp','https://api.cookie21.com/api/v1/consent/script/YOUR_CLIENT_ID/embed.js');
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
  })(window,document,'script','cmp','https://api.cookie21.com/api/v1/consent/script/YOUR_CLIENT_ID/embed.js');
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
      <h1 className="text-3xl font-bold mb-6">Integración del Script</h1>

      <section id="basic-integration" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Integración básica</h2>
        <p className="mb-4 text-gray-600">
          El primer paso para implementar Cookie21 en tu sitio web es añadir el script de configuración. 
          Este script debe colocarse en <span className="bg-yellow-100 px-2 py-1 rounded">todas las páginas de tu sitio web</span>, 
          justo antes del cierre de la etiqueta <code className="bg-gray-100 px-1 py-0.5 rounded">&lt;/head&gt;</code>.
        </p>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <SyntaxHighlighter language="html" style={tomorrow}>
              {scriptCode}
            </SyntaxHighlighter>
          </CardContent>
        </Card>

        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <AlertTitle className="text-blue-800">Nota importante</AlertTitle>
          <AlertDescription className="text-blue-700">
            Reemplaza <code className="bg-gray-100 px-1 py-0.5 rounded">YOUR_CLIENT_ID</code> con el ID de cliente único proporcionado en tu panel de Cookie21.
            Este ID es específico para tu cuenta y asegura que la configuración correcta se aplique a tu sitio web.
          </AlertDescription>
        </Alert>

        <p className="mb-6 text-gray-600">
          Este script carga de forma asíncrona el código necesario para mostrar el banner de consentimiento
          y gestionar las cookies en tu sitio web. Al cargarse de forma asíncrona, no bloquea la renderización
          de la página y tiene un impacto mínimo en el rendimiento.
        </p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Verificación de la instalación</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3">Una vez que hayas añadido el script a tu sitio web, puedes verificar que está funcionando correctamente de la siguiente manera:</p>
            <ol className="space-y-2">
              <li>1. Abre tu sitio web en una ventana de navegación privada o borra las cookies de tu navegador.</li>
              <li>2. Deberías ver el banner de consentimiento aparecer automáticamente.</li>
              <li>3. Abre la consola de desarrollador (F12 en la mayoría de navegadores) y busca mensajes que comiencen con "CMP:" para confirmar que el script se está ejecutando.</li>
            </ol>
          </CardContent>
        </Card>
      </section>

      <section id="cms-integration" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Integración en CMS</h2>
        <p className="mb-4 text-gray-600">A continuación se detallan las instrucciones específicas para integrar el script de Cookie21 en los CMS más populares:</p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">WordPress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3">Para WordPress, tienes varias opciones:</p>
            <ol className="space-y-2">
              <li><strong>Editar el tema</strong>: Añade el script en el archivo <code className="bg-gray-100 px-1 rounded">header.php</code> de tu tema, justo antes de <code className="bg-gray-100 px-1 rounded">&lt;/head&gt;</code>.</li>
              <li><strong>Usar un plugin</strong>: Puedes utilizar plugins como "Header and Footer Scripts" o "Insert Headers and Footers" para añadir el script sin editar archivos de tema.</li>
              <li><strong>Tema Personalizado</strong>: Si utilizas temas como Divi, Elementor, o similar, busca la opción para añadir código en el &lt;head&gt; en la configuración del tema.</li>
            </ol>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Shopify</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              <li>1. Ve a Tienda online &gt; Temas.</li>
              <li>2. Haz clic en "Acciones" &gt; "Editar código".</li>
              <li>3. Abre el archivo <code className="bg-gray-100 px-1 rounded">theme.liquid</code>.</li>
              <li>4. Añade el script justo antes de <code className="bg-gray-100 px-1 rounded">&lt;/head&gt;</code>.</li>
              <li>5. Guarda los cambios.</li>
            </ol>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Google Tag Manager</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 mb-4">
              <li>1. Inicia sesión en tu cuenta de Google Tag Manager.</li>
              <li>2. Selecciona tu contenedor y ve a "Etiquetas" &gt; "Nueva".</li>
              <li>3. Elige "Etiqueta HTML personalizada".</li>
              <li>4. Pega el script de Cookie21 en el campo de HTML.</li>
              <li>5. En "Activación", selecciona "All Pages" o crea un activador específico.</li>
              <li>6. Guarda la etiqueta y publica los cambios.</li>
            </ol>
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertDescription className="text-yellow-700">
                <strong>Importante:</strong> Al usar Google Tag Manager, asegúrate de que el script de Cookie21 se cargue <em>antes</em> que cualquier otra etiqueta que establezca cookies.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>

      <section id="script-blocking" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Bloqueo de scripts</h2>
        <p className="mb-4 text-gray-600">
          Una de las características más importantes de Cookie21 es la capacidad de bloquear scripts hasta que el usuario dé su consentimiento.
          Esto es esencial para cumplir con las normativas de privacidad.
        </p>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <SyntaxHighlighter language="html" style={tomorrow}>
              {blockingCode}
            </SyntaxHighlighter>
          </CardContent>
        </Card>

        <h4 className="text-lg font-medium mb-3">Categorías disponibles</h4>
        <p className="mb-3 text-gray-600">Cookie21 soporta las siguientes categorías por defecto:</p>
        <ul className="space-y-2 mb-6">
          <li><code className="bg-gray-100 px-1 rounded">cmp-necessary</code> - Cookies necesarias (siempre activadas)</li>
          <li><code className="bg-gray-100 px-1 rounded">cmp-analytics</code> - Cookies de analítica</li>
          <li><code className="bg-gray-100 px-1 rounded">cmp-marketing</code> - Cookies de marketing y publicidad</li>
          <li><code className="bg-gray-100 px-1 rounded">cmp-preferences</code> - Cookies de preferencias</li>
          <li><code className="bg-gray-100 px-1 rounded">cmp-unclassified</code> - Cookies sin clasificar</li>
        </ul>
      </section>

      <section id="advanced-options" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Opciones avanzadas</h2>
        <p className="mb-4 text-gray-600">
          El script de Cookie21 permite configurar varias opciones avanzadas para adaptarse a tus necesidades específicas.
        </p>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <SyntaxHighlighter language="html" style={tomorrow}>
              {configCode}
            </SyntaxHighlighter>
          </CardContent>
        </Card>

        <h4 className="text-lg font-medium mb-3">Opciones disponibles</h4>
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left font-medium">Opción</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-medium">Tipo</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-medium">Defecto</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-medium">Descripción</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2"><code className="bg-gray-100 px-1 rounded">autoShow</code></td>
                <td className="border border-gray-300 px-4 py-2">Boolean</td>
                <td className="border border-gray-300 px-4 py-2">true</td>
                <td className="border border-gray-300 px-4 py-2">Mostrar el banner automáticamente cuando no se ha dado consentimiento</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2"><code className="bg-gray-100 px-1 rounded">autoAcceptNonGDPR</code></td>
                <td className="border border-gray-300 px-4 py-2">Boolean</td>
                <td className="border border-gray-300 px-4 py-2">false</td>
                <td className="border border-gray-300 px-4 py-2">Aceptar automáticamente todas las cookies para usuarios fuera de la UE</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2"><code className="bg-gray-100 px-1 rounded">cookieExpiry</code></td>
                <td className="border border-gray-300 px-4 py-2">Number</td>
                <td className="border border-gray-300 px-4 py-2">365</td>
                <td className="border border-gray-300 px-4 py-2">Días de validez del consentimiento</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2"><code className="bg-gray-100 px-1 rounded">language</code></td>
                <td className="border border-gray-300 px-4 py-2">String</td>
                <td className="border border-gray-300 px-4 py-2">"auto"</td>
                <td className="border border-gray-300 px-4 py-2">Idioma del banner ("auto", "es", "en", "fr", etc.)</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2"><code className="bg-gray-100 px-1 rounded">defaultLang</code></td>
                <td className="border border-gray-300 px-4 py-2">String</td>
                <td className="border border-gray-300 px-4 py-2">"es"</td>
                <td className="border border-gray-300 px-4 py-2">Idioma por defecto si no se puede detectar</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2"><code className="bg-gray-100 px-1 rounded">enableTCF</code></td>
                <td className="border border-gray-300 px-4 py-2">Boolean</td>
                <td className="border border-gray-300 px-4 py-2">false</td>
                <td className="border border-gray-300 px-4 py-2">Habilitar soporte para IAB TCF 2.2</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="javascript-api" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">API JavaScript</h2>
        <p className="mb-4 text-gray-600">
          Cookie21 proporciona una API JavaScript completa que te permite interactuar con el sistema de consentimiento desde tu propio código.
        </p>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <SyntaxHighlighter language="javascript" style={tomorrow}>
              {apiCode}
            </SyntaxHighlighter>
          </CardContent>
        </Card>

        <h4 className="text-lg font-medium mb-3">Métodos disponibles</h4>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left font-medium">Método</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-medium">Descripción</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2"><code className="bg-gray-100 px-1 rounded">window.CMP.showBanner()</code></td>
                <td className="border border-gray-300 px-4 py-2">Muestra el banner de consentimiento</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2"><code className="bg-gray-100 px-1 rounded">window.CMP.hideBanner()</code></td>
                <td className="border border-gray-300 px-4 py-2">Oculta el banner de consentimiento</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2"><code className="bg-gray-100 px-1 rounded">window.CMP.showPreferences()</code></td>
                <td className="border border-gray-300 px-4 py-2">Muestra el panel de preferencias</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2"><code className="bg-gray-100 px-1 rounded">window.CMP.acceptAll()</code></td>
                <td className="border border-gray-300 px-4 py-2">Acepta todas las categorías de cookies</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2"><code className="bg-gray-100 px-1 rounded">window.CMP.rejectAll()</code></td>
                <td className="border border-gray-300 px-4 py-2">Rechaza todas las categorías de cookies opcionales</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2"><code className="bg-gray-100 px-1 rounded">window.CMP.getConsentState()</code></td>
                <td className="border border-gray-300 px-4 py-2">Obtiene el estado actual del consentimiento</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ScriptIntegration;