import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Alert, AlertTitle, AlertDescription } from '../../ui/alert';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

const GettingStarted = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Primeros pasos</h1>

      <section id="introduction" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Introducción</h2>
        <p className="mb-4 text-gray-600">
          Cookie21 es una plataforma completa para la gestión de cookies y el cumplimiento de normativas como RGPD, 
          LOPD-GDD y ePrivacy. Nuestra solución facilita la implementación de banners de consentimiento personalizables, 
          el escaneo de cookies, y la gestión eficiente del consentimiento de los usuarios.
        </p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Características principales</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li><strong>Banner de consentimiento personalizable</strong> - Personaliza completamente el aspecto y comportamiento del banner de cookies.</li>
              <li><strong>Escaneo automático de cookies</strong> - Identifica todas las cookies de tu sitio web y clasifícalas automáticamente.</li>
              <li><strong>Gestión del consentimiento</strong> - Almacena y gestiona el consentimiento del usuario de forma segura y conforme a las normativas.</li>
              <li><strong>Dashboard analítico</strong> - Obtén métricas sobre el comportamiento de los usuarios respecto al consentimiento.</li>
              <li><strong>Soporte para TCF 2.2</strong> - Compatible con el marco de transparencia y consentimiento de IAB.</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <section id="quick-start" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Inicio rápido</h2>
        <p className="mb-4 text-gray-600">Implementar Cookie21 en tu sitio web es un proceso sencillo que consta de tres pasos básicos:</p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">1. Registra tu dominio</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Añade tu dominio desde el panel de control de Cookie21, proporcionando la URL de tu sitio web.</p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">2. Integra el script</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Copia el script de Cookie21 y añádelo a todas las páginas de tu sitio web, justo antes de la etiqueta <code className="bg-gray-100 px-1 py-0.5 rounded">&lt;/head&gt;</code>.</p>
            <SyntaxHighlighter language="html" style={tomorrow}>
{`<script>
  (function(w,d,s,l,i){
    w[l]=w[l]||[];
    var f=d.getElementsByTagName(s)[0],j=d.createElement(s);
    j.async=true;j.src=i;
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','cmp','https://api.cookie21.com/api/v1/consent/script/YOUR_CLIENT_ID/embed.js');
</script>`}
            </SyntaxHighlighter>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">3. Personaliza tu banner</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Utiliza nuestro editor visual para personalizar el aspecto y el contenido del banner de consentimiento según la identidad visual de tu marca.</p>
          </CardContent>
        </Card>
      </section>

      <section id="key-concepts" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Conceptos clave</h2>
        
        <h4 className="text-lg font-medium mt-6 mb-3">Categorías de cookies</h4>
        <p className="mb-3 text-gray-600">Las cookies se clasifican en diferentes categorías según su propósito:</p>
        <ul className="space-y-2 mb-6">
          <li><strong>Necesarias</strong>: Esenciales para el funcionamiento básico del sitio web.</li>
          <li><strong>Analíticas</strong>: Utilizadas para analizar el comportamiento de los usuarios y mejorar el sitio web.</li>
          <li><strong>Marketing</strong>: Utilizadas para mostrar publicidad personalizada.</li>
          <li><strong>Preferencias</strong>: Guardan configuraciones del usuario para mejorar su experiencia.</li>
        </ul>

        <h4 className="text-lg font-medium mb-3">Consentimiento explícito</h4>
        <p className="mb-4 text-gray-600">
          El RGPD y otras normativas requieren que los usuarios den su consentimiento explícito antes de que se utilicen cookies 
          no esenciales. Cookie21 proporciona un sistema para gestionar este consentimiento y asegurar el cumplimiento normativo.
        </p>

        <Alert className="border-blue-200 bg-blue-50">
          <AlertTitle className="text-blue-800">Consejo profesional</AlertTitle>
          <AlertDescription className="text-blue-700">
            Para maximizar las tasas de consentimiento, crea banners atractivos y claros que expliquen el valor que aportan las cookies 
            al usuario, sin comprometer la transparencia y el cumplimiento normativo.
          </AlertDescription>
        </Alert>
      </section>
    </div>
  );
};

export default GettingStarted;