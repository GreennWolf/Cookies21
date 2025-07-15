import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Alert, AlertTitle, AlertDescription } from '../../ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../ui/accordion';

const Faq = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Preguntas Frecuentes</h1>
      
      <section id="general" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Preguntas generales</h2>
        
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-0">
            <AccordionTrigger>¿Cómo afecta Cookie21 al rendimiento de mi sitio web?</AccordionTrigger>
            <AccordionContent>
              Cookie21 está diseñado para tener un impacto mínimo en el rendimiento. El script se carga de forma asíncrona, 
              lo que significa que no bloquea la carga del resto de la página. Además, utiliza técnicas de carga diferida 
              para minimizar el impacto en los tiempos de carga.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-1">
            <AccordionTrigger>¿Funciona Cookie21 con cualquier tipo de sitio web?</AccordionTrigger>
            <AccordionContent>
              Sí, Cookie21 es compatible con cualquier tipo de sitio web, independientemente de la tecnología utilizada. 
              Funciona con sitios desarrollados en WordPress, Drupal, Joomla, Shopify, Wix, y con sitios personalizados 
              desarrollados con cualquier framework o lenguaje.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-2">
            <AccordionTrigger>¿Es Cookie21 gratuito?</AccordionTrigger>
            <AccordionContent>
              Cookie21 ofrece diferentes planes para adaptarse a las necesidades de cada proyecto. Contamos con opciones 
              desde planes básicos hasta planes empresariales con funcionalidades avanzadas. Contacta con nuestro equipo 
              comercial para obtener información detallada sobre precios y funcionalidades de cada plan.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-3">
            <AccordionTrigger>¿Qué idiomas soporta Cookie21?</AccordionTrigger>
            <AccordionContent>
              Cookie21 soporta múltiples idiomas incluyendo español, inglés, francés, alemán, italiano, portugués y muchos más. 
              El sistema de traducciones es completamente personalizable, permitiendo adaptar todos los textos del banner 
              de cookies a tu idioma específico o audiencia local.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-4">
            <AccordionTrigger>¿Cómo se actualiza Cookie21?</AccordionTrigger>
            <AccordionContent>
              Las actualizaciones de Cookie21 se despliegan automáticamente en la nube, sin necesidad de intervención manual. 
              Esto garantiza que siempre tengas acceso a las últimas funcionalidades, mejoras de seguridad y actualizaciones 
              de cumplimiento normativo sin interrupciones en tu servicio.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <section id="technical" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Preguntas técnicas</h2>
        
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-5">
            <AccordionTrigger>¿Cómo instalo Cookie21 en mi sitio web?</AccordionTrigger>
            <AccordionContent>
              <p className="mb-2">La instalación es muy sencilla. Solo necesitas seguir estos pasos:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Registra tu dominio en el panel de administración de Cookie21</li>
                <li>Configura tu banner de cookies usando nuestro editor visual</li>
                <li>Copia el código de integración generado</li>
                <li>Pega el código en el &lt;head&gt; de tu sitio web</li>
              </ol>
              <p className="mt-2">Para instalaciones más avanzadas, también ofrecemos integración vía Google Tag Manager, 
              plugins para WordPress y APIs para desarrolladores.</p>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-6">
            <AccordionTrigger>¿Cookie21 funciona con Single Page Applications (SPA)?</AccordionTrigger>
            <AccordionContent>
              Sí, Cookie21 es totalmente compatible con SPAs desarrolladas con React, Vue.js, Angular y otros frameworks. 
              Nuestro script detecta automáticamente los cambios de ruta y se adapta al comportamiento de las aplicaciones 
              de una sola página, manteniendo el estado del consentimiento durante toda la sesión del usuario.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-7">
            <AccordionTrigger>¿Cómo gestiona Cookie21 las cookies de terceros?</AccordionTrigger>
            <AccordionContent>
              Cookie21 incluye un sistema avanzado de detección y categorización automática de cookies. Escanea tu sitio web 
              regularmente para identificar nuevas cookies de terceros, las clasifica según su propósito (técnicas, analíticas, 
              publicitarias) y permite a los usuarios dar o retirar el consentimiento de forma granular para cada categoría.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-8">
            <AccordionTrigger>¿Qué sucede si mi sitio web cambia o añado nuevas cookies?</AccordionTrigger>
            <AccordionContent>
              Cookie21 realiza escaneos automáticos periódicos de tu sitio web para detectar nuevas cookies. Cuando se 
              detectan cambios, recibes notificaciones automáticas y puedes revisar y categorizar las nuevas cookies desde 
              el panel de administración. También puedes configurar escaneos manuales cuando realices cambios importantes.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-9">
            <AccordionTrigger>¿Cookie21 bloquea las cookies antes del consentimiento?</AccordionTrigger>
            <AccordionContent>
              Sí, Cookie21 implementa un sistema de bloqueo preventivo que impide la carga de cookies no esenciales hasta 
              que el usuario otorga su consentimiento. Esto se hace mediante técnicas avanzadas de interceptación de scripts 
              y cookies, garantizando el cumplimiento desde el primer momento de la visita.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <section id="compliance" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Cumplimiento y privacidad</h2>
        
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-10">
            <AccordionTrigger>¿Cookie21 cumple con el RGPD?</AccordionTrigger>
            <AccordionContent>
              Sí, Cookie21 está diseñado específicamente para cumplir con el Reglamento General de Protección de Datos (RGPD). 
              Implementa todos los requisitos necesarios incluyendo consentimiento explícito, derecho de acceso, rectificación, 
              supresión, portabilidad de datos y más. Además, se actualiza automáticamente para mantenerse al día con 
              cualquier cambio normativo.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-11">
            <AccordionTrigger>¿Es compatible con la LOPD-GDD española?</AccordionTrigger>
            <AccordionContent>
              Absolutamente. Cookie21 cumple con la Ley Orgánica de Protección de Datos y Garantía de los Derechos Digitales 
              (LOPD-GDD) de España. Incluye todas las adaptaciones específicas para el marco legal español y sigue las 
              directrices de la Agencia Española de Protección de Datos (AEPD).
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-12">
            <AccordionTrigger>¿Qué es el Transparency and Consent Framework (TCF)?</AccordionTrigger>
            <AccordionContent>
              El TCF es un estándar de la industria desarrollado por la IAB Europe para la gestión transparente del 
              consentimiento en publicidad digital. Cookie21 es compatible con TCF v2.2, lo que permite una integración 
              perfecta con plataformas publicitarias, redes de afiliados y otros servicios que requieren este estándar.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-13">
            <AccordionTrigger>¿Dónde se almacenan los datos de consentimiento?</AccordionTrigger>
            <AccordionContent>
              Los datos de consentimiento se almacenan de forma segura en servidores ubicados en la Unión Europea, 
              cumpliendo con todas las regulaciones de transferencia de datos. Utilizamos cifrado avanzado y medidas 
              de seguridad de nivel empresarial para proteger la información. Los datos se conservan durante el tiempo 
              legalmente requerido y se eliminan automáticamente al finalizar este período.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-14">
            <AccordionTrigger>¿Cómo gestiona Cookie21 el derecho al olvido?</AccordionTrigger>
            <AccordionContent>
              Cookie21 incluye herramientas automáticas para gestionar el derecho al olvido. Los usuarios pueden solicitar 
              la eliminación de sus datos directamente desde el banner de cookies o el centro de preferencias. Cuando se 
              procesa una solicitud, todos los datos asociados se eliminan permanentemente de nuestros sistemas y se 
              notifica automáticamente a los procesadores de datos integrados.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <section id="troubleshooting" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Resolución de problemas</h2>
        
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-15">
            <AccordionTrigger>El banner de cookies no aparece en mi sitio web</AccordionTrigger>
            <AccordionContent>
              <p className="mb-2">Si el banner no aparece, verifica los siguientes puntos:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Código de integración:</strong> Asegúrate de que el script esté correctamente instalado en el &lt;head&gt; de tu sitio</li>
                <li><strong>Dominio registrado:</strong> Verifica que el dominio esté correctamente registrado en tu panel de Cookie21</li>
                <li><strong>Banner activado:</strong> Confirma que el banner esté publicado y activo desde el panel de administración</li>
                <li><strong>Cache:</strong> Limpia la caché del navegador y del sitio web si usas sistemas de caché</li>
                <li><strong>Consentimiento previo:</strong> Si ya diste consentimiento, el banner no se mostrará hasta que expire o lo revoque</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-16">
            <AccordionTrigger>El banner aparece pero las cookies no se bloquean</AccordionTrigger>
            <AccordionContent>
              <p className="mb-2">Este problema suele estar relacionado con la configuración del bloqueo de cookies:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Modo de bloqueo:</strong> Verifica que el modo de bloqueo automático esté activado en la configuración</li>
                <li><strong>Lista de cookies:</strong> Asegúrate de que las cookies que deseas bloquear estén correctamente categorizadas</li>
                <li><strong>Scripts de terceros:</strong> Algunos scripts pueden cargar antes que Cookie21; ajusta el orden de carga</li>
                <li><strong>Cookies técnicas:</strong> Las cookies estrictamente necesarias no se bloquean por defecto</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-17">
            <AccordionTrigger>¿Cómo puedo personalizar el diseño del banner?</AccordionTrigger>
            <AccordionContent>
              Cookie21 incluye un editor visual completo que te permite personalizar todos los aspectos del banner:
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li><strong>Editor de arrastrar y soltar:</strong> Reorganiza elementos visualmente</li>
                <li><strong>Personalización de colores:</strong> Adapta la paleta de colores a tu marca</li>
                <li><strong>Tipografías:</strong> Selecciona y configura fuentes personalizadas</li>
                <li><strong>Posicionamiento:</strong> Elige donde aparece el banner (superior, inferior, lateral, modal)</li>
                <li><strong>Responsive:</strong> Optimiza la apariencia para móviles, tablets y escritorio</li>
                <li><strong>CSS personalizado:</strong> Añade estilos CSS avanzados si es necesario</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-18">
            <AccordionTrigger>¿Cómo accedo a los reportes de consentimiento?</AccordionTrigger>
            <AccordionContent>
              Los reportes de consentimiento están disponibles en tu panel de administración de Cookie21:
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li><strong>Dashboard principal:</strong> Vista general con métricas clave</li>
                <li><strong>Sección Analytics:</strong> Reportes detallados con filtros por fecha, dispositivo, ubicación</li>
                <li><strong>Exportación:</strong> Descarga reportes en formatos CSV, PDF o Excel</li>
                <li><strong>APIs:</strong> Accede programáticamente a los datos vía API REST</li>
                <li><strong>Webhooks:</strong> Recibe notificaciones automáticas de eventos de consentimiento</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-19">
            <AccordionTrigger>¿Qué hago si tengo problemas con Google Analytics?</AccordionTrigger>
            <AccordionContent>
              <p className="mb-2">Para problemas de integración con Google Analytics:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Configuración GA4:</strong> Asegúrate de que Cookie21 esté configurado para Google Analytics 4</li>
                <li><strong>Consent Mode:</strong> Activa el Consent Mode de Google en la configuración de Cookie21</li>
                <li><strong>Orden de carga:</strong> Cookie21 debe cargar antes que Google Analytics</li>
                <li><strong>Categorización:</strong> Verifica que Google Analytics esté categorizado como "Analíticas"</li>
                <li><strong>GTM:</strong> Si usas Google Tag Manager, configura los triggers basados en el consentimiento</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        <Alert className="mt-6 border-yellow-200 bg-yellow-50">
          <AlertTitle className="text-yellow-800">¿No encuentras la respuesta que buscas?</AlertTitle>
          <AlertDescription className="text-yellow-700">
            <p className="mb-2">
              Si tienes alguna pregunta específica que no está cubierta en esta sección, no dudes en contactar 
              con nuestro equipo de soporte técnico. Estamos aquí para ayudarte a implementar Cookie21 de la 
              manera más efectiva en tu proyecto.
            </p>
            <p className="mt-2">
              <strong>Soporte técnico:</strong> soporte@cookie21.com | 
              <strong> Documentación avanzada:</strong> <a href="/documentation" className="text-blue-600 hover:underline">Guías técnicas completas</a>
            </p>
          </AlertDescription>
        </Alert>
      </section>
    </div>
  );
};

export default Faq;