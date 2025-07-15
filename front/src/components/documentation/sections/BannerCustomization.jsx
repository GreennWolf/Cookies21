import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Alert, AlertTitle, AlertDescription } from '../../ui/alert';
import bannerList from '../../../assets/documentation/banner-list-view.png';
import BannerEditor from '../../../assets/documentation/editor-overview.png';
import ToolBar from '../../../assets/documentation/editor-toolbar.png';

const BannerCustomization = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Personalización del Banner</h1>

      <section id="banner-list" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Lista de Banners</h2>
        <p className="mb-4 text-gray-600">
          Desde la página principal de banners puedes gestionar todos tus banners de consentimiento. 
          Aquí verás una lista de todos los banners creados con opciones para editarlos, duplicarlos o eliminarlos.
        </p>

        {/* MOCKUP PLACEHOLDER */}
        <Card className="mb-6">
          <CardContent style={{ backgroundColor: '#f8f9fa', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={bannerList} alt="" />
          </CardContent>
        </Card>

        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <AlertTitle className="text-blue-800">Acceso al Editor</AlertTitle>
          <AlertDescription className="text-blue-700">
            Para personalizar un banner, haz clic en el botón <strong>"EDITAR"</strong> junto al banner que deseas modificar. 
            Esto te llevará directamente al editor visual donde podrás realizar todos los cambios necesarios.
          </AlertDescription>
        </Alert>
      </section>

      <section id="visual-editor" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Editor Visual</h2>
        <p className="mb-4 text-gray-600">
          Cookie21 incluye un potente editor visual que te permite crear y personalizar banners de consentimiento 
          de forma intuitiva, sin necesidad de conocimientos técnicos. El editor se abre automáticamente cuando 
          seleccionas "EDITAR" desde la lista de banners.
        </p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Características principales del editor</CardTitle>
          </CardHeader>
          <CardContent>
            <img src={BannerEditor} alt="" />
          </CardContent>
        </Card>

        {/* MOCKUP PLACEHOLDER */}
        <Card className="mb-6">
          <CardContent style={{ backgroundColor: '#f8f9fa', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="text-center">
              <h5 className="text-muted mb-3">📸 IMAGEN REQUERIDA</h5>
              <p className="text-muted mb-1"><strong>Archivo:</strong> editor-overview.png</p>
              <p className="text-muted mb-1"><strong>Tamaño:</strong> 1200x675px (16:9)</p>
              <p className="text-muted mb-1"><strong>Contenido:</strong> Captura del editor mostrando:</p>
              <ul className="text-muted text-start" style={{ maxWidth: '500px' }}>
                <li>Barra de herramientas superior</li>
                <li>Panel de componentes (izquierda)</li>
                <li>Canvas central con banner</li>
                <li>Panel de propiedades (derecha)</li>
                <li>Panel de capas</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <h3 className="text-xl font-medium mb-4">Barra de herramientas</h3>
        <p className="mb-3 text-gray-600">La barra superior contiene todas las herramientas principales:</p>
        <ul className="space-y-1 mb-6">
          <li><strong>Guardar</strong> - Guarda los cambios del banner</li>
          <li><strong>Vista Previa</strong> - Muestra cómo se verá el banner en el sitio web</li>
          <li><strong>Deshacer/Rehacer</strong> - Navega por el historial de cambios</li>
          <li><strong>Dispositivos</strong> - Cambia entre vista desktop, tablet y móvil</li>
          <li><strong>Configuración</strong> - Accede a todas las opciones de personalización</li>
          <li><strong>Salir</strong> - Vuelve al listado de banners</li>
        </ul>

        {/* MOCKUP PLACEHOLDER */}
        <Card className="mb-6">
          <CardContent style={{ backgroundColor: '#f8f9fa', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={ToolBar} alt="" />
          </CardContent>
        </Card>
      </section>

      <section id="components-overview" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Componentes Disponibles</h2>
        <p className="mb-4 text-gray-600">
          El editor incluye varios tipos de componentes que puedes combinar para crear el banner perfecto:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🏗️ Container</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Contenedor que puede alojar otros componentes y definir el layout del banner.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📝 Text</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Elementos de texto para títulos, párrafos y descripciones del banner.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🔘 Button</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Botones interactivos para aceptar, rechazar o gestionar preferencias.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🖼️ Image</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Imágenes y logos para personalizar la apariencia del banner.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">⚙️ Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Centro de preferencias para gestionar categorías de cookies.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="container-component" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Componente Container</h2>
        <p className="mb-4 text-gray-600">
          El Container es el componente base que actúa como contenedor para otros elementos. 
          Define la estructura y el layout principal de tu banner.
        </p>

        {/* MOCKUP PLACEHOLDER */}
        <Card className="mb-6">
          <CardContent style={{ backgroundColor: '#f8f9fa', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="text-center">
              <h5 className="text-muted mb-3">📸 IMAGEN REQUERIDA</h5>
              <p className="text-muted mb-1"><strong>Archivo:</strong> container-properties.png</p>
              <p className="text-muted mb-1"><strong>Tamaño:</strong> 800x600px (4:3)</p>
              <p className="text-muted mb-1"><strong>Contenido:</strong> Panel de propiedades del Container mostrando:</p>
              <ul className="text-muted text-start" style={{ maxWidth: '500px' }}>
                <li>Configuración de posición</li>
                <li>Opciones de tamaño y dimensiones</li>
                <li>Configuración de fondo y bordes</li>
                <li>Espaciado interno (padding)</li>
                <li>Opciones de diseño responsive</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <h3 className="text-xl font-medium mb-4">Propiedades del Container</h3>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Posicionamiento</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li><strong>Tipo de posición:</strong> Fixed, Floating, Modal</li>
                <li><strong>Ubicación:</strong> Superior, Inferior, Centro, Esquinas</li>
                <li><strong>Márgenes:</strong> Espaciado desde los bordes de la pantalla</li>
                <li><strong>Z-index:</strong> Nivel de superposición sobre otros elementos</li>
              </ul>
              <Alert className="mt-4 border-blue-200 bg-blue-50">
                <AlertDescription className="text-blue-700">
                  <strong>Recomendación:</strong> Usa posición "Fixed" en la parte inferior para una mejor experiencia de usuario.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dimensiones y Tamaño</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li><strong>Ancho:</strong> Píxeles, porcentaje o automático</li>
                <li><strong>Alto:</strong> Píxeles, porcentaje o automático</li>
                <li><strong>Ancho máximo/mínimo:</strong> Límites de redimensionamiento</li>
                <li><strong>Alto máximo/mínimo:</strong> Control de altura responsive</li>
              </ul>
              <Alert className="mt-4 border-green-200 bg-green-50">
                <AlertDescription className="text-green-700">
                  <strong>Buena práctica:</strong> Usa ancho en porcentaje (ej: 90%) para mejor adaptabilidad móvil.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Apariencia Visual</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li><strong>Color de fondo:</strong> Sólido, gradiente o transparente</li>
                <li><strong>Imagen de fondo:</strong> Texturas o patrones de marca</li>
                <li><strong>Bordes:</strong> Grosor, estilo y color</li>
                <li><strong>Esquinas redondeadas:</strong> Radio de border-radius</li>
                <li><strong>Sombra:</strong> Difuminado, posición y color</li>
                <li><strong>Opacidad:</strong> Transparencia del contenedor</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Espaciado y Layout</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li><strong>Padding:</strong> Espaciado interno en todos los lados</li>
                <li><strong>Flexbox:</strong> Dirección, justificación y alineación</li>
                <li><strong>Gap:</strong> Espacio entre elementos hijos</li>
                <li><strong>Overflow:</strong> Comportamiento cuando el contenido excede</li>
              </ul>
              <Alert className="mt-4 border-yellow-200 bg-yellow-50">
                <AlertDescription className="text-yellow-700">
                  <strong>Consejo:</strong> Un padding de 20-30px proporciona un espaciado visual equilibrado.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="text-component" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Componente Text</h2>
        <p className="mb-4 text-gray-600">
          Los componentes de texto te permiten añadir títulos, párrafos y cualquier contenido textual 
          a tu banner con control completo sobre la tipografía y formato.
        </p>

        {/* MOCKUP PLACEHOLDER */}
        <Card className="mb-6">
          <CardContent style={{ backgroundColor: '#f8f9fa', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="text-center">
              <h5 className="text-muted mb-3">📸 IMAGEN REQUERIDA</h5>
              <p className="text-muted mb-1"><strong>Archivo:</strong> text-properties.png</p>
              <p className="text-muted mb-1"><strong>Tamaño:</strong> 800x600px (4:3)</p>
              <p className="text-muted mb-1"><strong>Contenido:</strong> Panel de propiedades del Text mostrando:</p>
              <ul className="text-muted text-start" style={{ maxWidth: '500px' }}>
                <li>Editor de contenido de texto</li>
                <li>Opciones de tipografía</li>
                <li>Configuración de colores</li>
                <li>Alineación y espaciado</li>
                <li>Configuración responsive</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <h3 className="text-xl font-medium mb-4">Propiedades del Text</h3>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contenido y Edición</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li><strong>Texto:</strong> Editor WYSIWYG para escribir y formatear</li>
                <li><strong>HTML:</strong> Opción para editar código HTML directamente</li>
                <li><strong>Variables dinámicas:</strong> Insertar datos como dominio, fecha</li>
                <li><strong>Traducciones:</strong> Gestión de textos multiidioma</li>
              </ul>
              <Alert className="mt-4 border-blue-200 bg-blue-50">
                <AlertDescription className="text-blue-700">
                  <strong>Tip:</strong> Usa un lenguaje claro y directo. Evita jerga técnica para mejor comprensión.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tipografía</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li><strong>Familia de fuente:</strong> Selección entre fuentes web seguras</li>
                <li><strong>Tamaño:</strong> En píxeles, em o rem</li>
                <li><strong>Peso:</strong> Normal, bold, light, etc.</li>
                <li><strong>Estilo:</strong> Normal, cursiva, oblicua</li>
                <li><strong>Altura de línea:</strong> Espaciado entre líneas</li>
                <li><strong>Espaciado de letras:</strong> Tracking del texto</li>
                <li><strong>Transformación:</strong> Mayúsculas, minúsculas, capitalizar</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Colores y Efectos</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li><strong>Color del texto:</strong> Paleta de colores o selector personalizado</li>
                <li><strong>Color de fondo:</strong> Resaltado detrás del texto</li>
                <li><strong>Sombra de texto:</strong> Offset, difuminado y color</li>
                <li><strong>Decoración:</strong> Subrayado, tachado, sin decoración</li>
              </ul>
              <Alert className="mt-4 border-green-200 bg-green-50">
                <AlertDescription className="text-green-700">
                  <strong>Accesibilidad:</strong> Asegura un contraste mínimo de 4.5:1 entre texto y fondo.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Posicionamiento y Layout</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li><strong>Alineación:</strong> Izquierda, centro, derecha, justificado</li>
                <li><strong>Alineación vertical:</strong> Superior, centro, inferior</li>
                <li><strong>Márgenes:</strong> Espaciado externo del elemento</li>
                <li><strong>Padding:</strong> Espaciado interno del texto</li>
                <li><strong>Ancho:</strong> Control de líneas de texto</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <h3 className="text-xl font-medium mt-6 mb-4">Mejores Prácticas para Texto</h3>
        <div className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertTitle className="text-blue-800">Legibilidad</AlertTitle>
            <AlertDescription className="text-blue-700">
              <ul className="mt-2 space-y-1">
                <li>• Usa tamaños de fuente de al menos 14px para el texto principal</li>
                <li>• Mantén líneas de texto entre 45-75 caracteres para óptima lectura</li>
                <li>• Aplica altura de línea de 1.4-1.6 para mejor espaciado</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert className="border-green-200 bg-green-50">
            <AlertTitle className="text-green-800">Jerarquía Visual</AlertTitle>
            <AlertDescription className="text-green-700">
              <ul className="mt-2 space-y-1">
                <li>• Usa títulos más grandes (24-32px) para captar atención</li>
                <li>• Aplica diferentes pesos de fuente para crear contraste</li>
                <li>• Limita a 2-3 tamaños de fuente diferentes por banner</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </section>

      <section id="button-component" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Componente Button</h2>
        <p className="mb-4 text-gray-600">
          Los botones son elementos interactivos cruciales que permiten a los usuarios tomar decisiones 
          sobre el consentimiento. Cookie21 ofrece diferentes tipos de botones con funcionalidades específicas.
        </p>

        {/* MOCKUP PLACEHOLDER */}
        <Card className="mb-6">
          <CardContent style={{ backgroundColor: '#f8f9fa', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="text-center">
              <h5 className="text-muted mb-3">📸 IMAGEN REQUERIDA</h5>
              <p className="text-muted mb-1"><strong>Archivo:</strong> button-properties.png</p>
              <p className="text-muted mb-1"><strong>Tamaño:</strong> 800x600px (4:3)</p>
              <p className="text-muted mb-1"><strong>Contenido:</strong> Panel de propiedades del Button mostrando:</p>
              <ul className="text-muted text-start" style={{ maxWidth: '500px' }}>
                <li>Configuración de acción del botón</li>
                <li>Opciones de estilo y apariencia</li>
                <li>Estados hover y active</li>
                <li>Configuración de tamaño</li>
                <li>Opciones de iconos</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <h3 className="text-xl font-medium mb-4">Tipos de Botones</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">✅ Accept All</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">Acepta todas las categorías de cookies de una vez.</p>
              <p className="text-sm text-gray-500">Acción: Otorga consentimiento completo y cierra el banner.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">❌ Reject All</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">Rechaza todas las cookies no esenciales.</p>
              <p className="text-sm text-gray-500">Acción: Solo mantiene cookies técnicamente necesarias.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">⚙️ Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">Abre el centro de preferencias detallado.</p>
              <p className="text-sm text-gray-500">Acción: Muestra opciones granulares por categoría.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🔗 Custom Link</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">Enlace personalizable a políticas o información.</p>
              <p className="text-sm text-gray-500">Acción: Navega a URL especificada (nueva pestaña).</p>
            </CardContent>
          </Card>
        </div>

        <h3 className="text-xl font-medium mb-4">Propiedades del Button</h3>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Funcionalidad y Acción</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li><strong>Tipo de acción:</strong> Accept, Reject, Preferences, Custom Link</li>
                <li><strong>Texto del botón:</strong> Etiqueta personalizable</li>
                <li><strong>URL (si aplica):</strong> Enlace de destino para botones custom</li>
                <li><strong>Target:</strong> Misma ventana o nueva pestaña</li>
                <li><strong>Tracking:</strong> Eventos de analytics asociados</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Apariencia Visual</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li><strong>Estilo:</strong> Primary, Secondary, Outline, Ghost, Link</li>
                <li><strong>Colores:</strong> Fondo, texto, borde</li>
                <li><strong>Tipografía:</strong> Fuente, tamaño, peso</li>
                <li><strong>Bordes:</strong> Grosor, estilo, radio de esquinas</li>
                <li><strong>Sombra:</strong> Elevación y profundidad</li>
                <li><strong>Icono:</strong> Símbolo opcional antes o después del texto</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estados Interactivos</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li><strong>Estado normal:</strong> Apariencia por defecto</li>
                <li><strong>Hover:</strong> Cambios al pasar el mouse</li>
                <li><strong>Active:</strong> Aspecto durante el clic</li>
                <li><strong>Focus:</strong> Estilo para navegación por teclado</li>
                <li><strong>Disabled:</strong> Apariencia cuando está inactivo</li>
                <li><strong>Transiciones:</strong> Animaciones suaves entre estados</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dimensiones y Posición</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li><strong>Tamaño:</strong> Small, Medium, Large, Custom</li>
                <li><strong>Ancho:</strong> Auto, Full width, Custom pixels</li>
                <li><strong>Alto:</strong> Auto o píxeles específicos</li>
                <li><strong>Padding:</strong> Espaciado interno</li>
                <li><strong>Margin:</strong> Espaciado externo</li>
                <li><strong>Alineación:</strong> Posición dentro del contenedor</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <h3 className="text-xl font-medium mt-6 mb-4">Mejores Prácticas para Botones</h3>
        <div className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertTitle className="text-blue-800">Jerarquía Visual</AlertTitle>
            <AlertDescription className="text-blue-700">
              <ul className="mt-2 space-y-1">
                <li>• El botón "Aceptar" debe ser más prominente (Primary style)</li>
                <li>• "Rechazar" y "Preferencias" pueden usar estilos Secondary</li>
                <li>• Mantén al menos 8px de espacio entre botones</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert className="border-green-200 bg-green-50">
            <AlertTitle className="text-green-800">Usabilidad</AlertTitle>
            <AlertDescription className="text-green-700">
              <ul className="mt-2 space-y-1">
                <li>• Usa textos descriptivos: "Aceptar todas" mejor que solo "Aceptar"</li>
                <li>• Tamaño mínimo de 44px para dispositivos táctiles</li>
                <li>• Aplica estados hover claros para feedback visual</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTitle className="text-yellow-800">Cumplimiento Legal</AlertTitle>
            <AlertDescription className="text-yellow-700">
              <ul className="mt-2 space-y-1">
                <li>• "Aceptar" y "Rechazar" deben tener igual prominencia visual</li>
                <li>• No uses colores que influencien la decisión del usuario</li>
                <li>• Incluye siempre opción para gestionar preferencias</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </section>

      <section id="image-component" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Componente Image</h2>
        <p className="mb-4 text-gray-600">
          Las imágenes te permiten personalizar tu banner con logos, iconos o elementos gráficos 
          que refuercen tu identidad de marca y mejoren la experiencia visual.
        </p>

        {/* MOCKUP PLACEHOLDER */}
        <Card className="mb-6">
          <CardContent style={{ backgroundColor: '#f8f9fa', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="text-center">
              <h5 className="text-muted mb-3">📸 IMAGEN REQUERIDA</h5>
              <p className="text-muted mb-1"><strong>Archivo:</strong> image-properties.png</p>
              <p className="text-muted mb-1"><strong>Tamaño:</strong> 800x600px (4:3)</p>
              <p className="text-muted mb-1"><strong>Contenido:</strong> Panel de propiedades del Image mostrando:</p>
              <ul className="text-muted text-start" style={{ maxWidth: '500px' }}>
                <li>Uploader de imágenes</li>
                <li>Opciones de redimensionamiento</li>
                <li>Configuración de alineación</li>
                <li>Efectos y filtros</li>
                <li>Configuración de enlace</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <h3 className="text-xl font-medium mb-4">Propiedades del Image</h3>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gestión de Archivos</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li><strong>Subida de archivo:</strong> Drag & drop o selector de archivos</li>
                <li><strong>Formatos soportados:</strong> JPG, PNG, SVG, WebP, GIF</li>
                <li><strong>Tamaño máximo:</strong> 5MB por imagen</li>
                <li><strong>Optimización automática:</strong> Compresión inteligente</li>
                <li><strong>Galería:</strong> Acceso a imágenes previamente subidas</li>
                <li><strong>URL externa:</strong> Enlazar imagen desde URL</li>
              </ul>
              <Alert className="mt-4 border-blue-200 bg-blue-50">
                <AlertDescription className="text-blue-700">
                  <strong>Tip:</strong> Las imágenes SVG son ideales para logos por su escalabilidad perfecta.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dimensiones y Redimensionamiento</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li><strong>Ancho:</strong> Píxeles, porcentaje o automático</li>
                <li><strong>Alto:</strong> Píxeles, porcentaje o automático</li>
                <li><strong>Proporciones:</strong> Mantener ratio original o personalizar</li>
                <li><strong>Modo de ajuste:</strong> Cover, Contain, Fill, Scale-down</li>
                <li><strong>Recorte:</strong> Área visible de la imagen</li>
                <li><strong>Escala máxima:</strong> Límite de ampliación</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Posicionamiento y Alineación</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li><strong>Alineación horizontal:</strong> Izquierda, centro, derecha</li>
                <li><strong>Alineación vertical:</strong> Superior, centro, inferior</li>
                <li><strong>Posición de origen:</strong> Punto de referencia para recortes</li>
                <li><strong>Márgenes:</strong> Espaciado alrededor de la imagen</li>
                <li><strong>Float:</strong> Texto alrededor de la imagen</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Efectos y Estilo</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li><strong>Bordes:</strong> Grosor, color y estilo</li>
                <li><strong>Esquinas redondeadas:</strong> Radio de border-radius</li>
                <li><strong>Sombra:</strong> Offset, difuminado y opacidad</li>
                <li><strong>Opacidad:</strong> Transparencia de la imagen</li>
                <li><strong>Filtros:</strong> Brillo, contraste, saturación</li>
                <li><strong>Rotación:</strong> Ángulo de rotación en grados</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Interactividad</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li><strong>Enlace:</strong> URL de destino al hacer clic</li>
                <li><strong>Alt text:</strong> Texto alternativo para accesibilidad</li>
                <li><strong>Title:</strong> Tooltip al pasar el mouse</li>
                <li><strong>Target:</strong> Misma ventana o nueva pestaña</li>
                <li><strong>Hover effects:</strong> Cambios al pasar el mouse</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <h3 className="text-xl font-medium mt-6 mb-4">Mejores Prácticas para Imágenes</h3>
        <div className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertTitle className="text-blue-800">Optimización</AlertTitle>
            <AlertDescription className="text-blue-700">
              <ul className="mt-2 space-y-1">
                <li>• Usa WebP para mejor compresión y calidad</li>
                <li>• Mantén el tamaño de archivo bajo 500KB para carga rápida</li>
                <li>• Proporciona imágenes 2x para pantallas de alta densidad</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert className="border-green-200 bg-green-50">
            <AlertTitle className="text-green-800">Accesibilidad</AlertTitle>
            <AlertDescription className="text-green-700">
              <ul className="mt-2 space-y-1">
                <li>• Siempre incluye texto alternativo descriptivo</li>
                <li>• Asegura suficiente contraste si hay texto sobre la imagen</li>
                <li>• Evita transmitir información solo mediante imágenes</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert className="border-purple-200 bg-purple-50">
            <AlertTitle className="text-purple-800">Branding</AlertTitle>
            <AlertDescription className="text-purple-700">
              <ul className="mt-2 space-y-1">
                <li>• Usa tu logo en tamaño apropiado (no más del 20% del banner)</li>
                <li>• Mantén consistencia con tu identidad visual</li>
                <li>• Considera el contexto del banner para la elección de imágenes</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </section>

      <section id="preferences-component" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Componente Preferences</h2>
        <p className="mb-4 text-gray-600">
          El centro de preferencias permite a los usuarios gestionar sus opciones de consentimiento 
          de forma granular, cumpliendo con los requisitos de transparencia y control del RGPD.
        </p>

        {/* MOCKUP PLACEHOLDER */}
        <Card className="mb-6">
          <CardContent style={{ backgroundColor: '#f8f9fa', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="text-center">
              <h5 className="text-muted mb-3">📸 IMAGEN REQUERIDA</h5>
              <p className="text-muted mb-1"><strong>Archivo:</strong> preferences-properties.png</p>
              <p className="text-muted mb-1"><strong>Tamaño:</strong> 800x600px (4:3)</p>
              <p className="text-muted mb-1"><strong>Contenido:</strong> Panel de propiedades del Preferences mostrando:</p>
              <ul className="text-muted text-start" style={{ maxWidth: '500px' }}>
                <li>Configuración de categorías</li>
                <li>Opciones de diseño del centro</li>
                <li>Configuración de textos descriptivos</li>
                <li>Personalización de switches</li>
                <li>Opciones de vendors IAB</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <h3 className="text-xl font-medium mb-4">Categorías de Cookies</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🔧 Necesarias</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">Cookies esenciales para el funcionamiento del sitio.</p>
              <p className="text-sm text-gray-500">Estado: Siempre activas (no se pueden desactivar)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📊 Analíticas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">Estadísticas de uso y comportamiento del usuario.</p>
              <p className="text-sm text-gray-500">Estado: Opcional (control del usuario)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🎯 Marketing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">Publicidad personalizada y remarketing.</p>
              <p className="text-sm text-gray-500">Estado: Opcional (control del usuario)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">⚙️ Preferencias</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">Configuraciones y personalización del usuario.</p>
              <p className="text-sm text-gray-500">Estado: Opcional (control del usuario)</p>
            </CardContent>
          </Card>
        </div>

        <h3 className="text-xl font-medium mb-4">Propiedades del Preferences</h3>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuración de Categorías</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li><strong>Categorías activas:</strong> Seleccionar qué categorías mostrar</li>
                <li><strong>Nombres personalizados:</strong> Títulos específicos por categoría</li>
                <li><strong>Descripciones:</strong> Explicaciones detalladas para cada tipo</li>
                <li><strong>Estado por defecto:</strong> Activado/desactivado inicial</li>
                <li><strong>Íconos:</strong> Símbolos representativos para cada categoría</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Diseño y Layout</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li><strong>Estilo de presentación:</strong> Lista, tarjetas, acordeón</li>
                <li><strong>Disposición:</strong> Vertical, horizontal, grid</li>
                <li><strong>Espaciado:</strong> Márgenes entre elementos</li>
                <li><strong>Colores:</strong> Paleta para switches y elementos</li>
                <li><strong>Tipografía:</strong> Fuentes para títulos y descripciones</li>
                <li><strong>Animaciones:</strong> Transiciones suaves entre estados</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Switches y Controles</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li><strong>Tipo de control:</strong> Toggle, checkbox, radio button</li>
                <li><strong>Tamaño:</strong> Dimensiones de los switches</li>
                <li><strong>Colores:</strong> Activo, inactivo, hover</li>
                <li><strong>Etiquetas:</strong> Textos "On/Off", "Sí/No"</li>
                <li><strong>Accesibilidad:</strong> Soporte para navegación por teclado</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Detallada</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li><strong>Lista de cookies:</strong> Mostrar cookies específicas por categoría</li>
                <li><strong>Vendors:</strong> Información de terceros (IAB TCF)</li>
                <li><strong>Propósitos:</strong> Explicación de uso de datos</li>
                <li><strong>Duración:</strong> Tiempo de vida de las cookies</li>
                <li><strong>Enlaces:</strong> Políticas de privacidad relevantes</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <h3 className="text-xl font-medium mt-6 mb-4">Configuración Avanzada</h3>
        <div className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertTitle className="text-blue-800">Transparencia</AlertTitle>
            <AlertDescription className="text-blue-700">
              <ul className="mt-2 space-y-1">
                <li>• Proporciona descripciones claras y comprensibles</li>
                <li>• Lista todas las cookies utilizadas en cada categoría</li>
                <li>• Incluye información sobre la duración y propósito</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert className="border-green-200 bg-green-50">
            <AlertTitle className="text-green-800">Usabilidad</AlertTitle>
            <AlertDescription className="text-green-700">
              <ul className="mt-2 space-y-1">
                <li>• Hace que guardar preferencias sea fácil y visible</li>
                <li>• Permite cambios rápidos sin navegar múltiples pantallas</li>
                <li>• Proporciona feedback visual inmediato sobre cambios</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert className="border-purple-200 bg-purple-50">
            <AlertTitle className="text-purple-800">Cumplimiento Legal</AlertTitle>
            <AlertDescription className="text-purple-700">
              <ul className="mt-2 space-y-1">
                <li>• Las cookies necesarias no pueden ser desactivadas</li>
                <li>• Todas las demás categorías deben ser opcionales</li>
                <li>• Incluye información sobre transferencias internacionales</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </section>

      <section id="responsive-design" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Diseño Responsive</h2>
        <p className="mb-4 text-gray-600">
          El editor permite optimizar tu banner para diferentes dispositivos y tamaños de pantalla, 
          asegurando una experiencia consistente en desktop, tablet y móvil.
        </p>

        {/* MOCKUP PLACEHOLDER */}
        <Card className="mb-6">
          <CardContent style={{ backgroundColor: '#f8f9fa', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="text-center">
              <h5 className="text-muted mb-3">📸 IMAGEN REQUERIDA</h5>
              <p className="text-muted mb-1"><strong>Archivo:</strong> responsive-preview.png</p>
              <p className="text-muted mb-1"><strong>Tamaño:</strong> 1200x800px (3:2)</p>
              <p className="text-muted mb-1"><strong>Contenido:</strong> Vista del editor mostrando:</p>
              <ul className="text-muted text-start" style={{ maxWidth: '500px' }}>
                <li>Selector de dispositivos (desktop/tablet/mobile)</li>
                <li>Preview responsive del banner</li>
                <li>Ajustes específicos por dispositivo</li>
                <li>Indicadores de breakpoints</li>
                <li>Herramientas de test responsive</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <h3 className="text-xl font-medium mb-4">Breakpoints y Dispositivos</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🖥️ Desktop</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">≥ 1024px de ancho</p>
              <ul className="text-sm space-y-1">
                <li>• Layout horizontal óptimo</li>
                <li>• Más espacio para contenido</li>
                <li>• Interacciones con mouse</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📱 Tablet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">768px - 1023px</p>
              <ul className="text-sm space-y-1">
                <li>• Layout adaptativo</li>
                <li>• Botones más grandes</li>
                <li>• Touch-friendly</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📱 Mobile</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">&lt; 768px de ancho</p>
              <ul className="text-sm space-y-1">
                <li>• Layout vertical</li>
                <li>• Texto más grande</li>
                <li>• Fácil navegación táctil</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertTitle className="text-blue-800">Mejores Prácticas Móviles</AlertTitle>
            <AlertDescription className="text-blue-700">
              <ul className="mt-2 space-y-1">
                <li>• Tamaño mínimo de botones: 44x44px para navegación táctil</li>
                <li>• Texto de al menos 16px para evitar zoom automático</li>
                <li>• Espacio suficiente entre elementos clicables</li>
                <li>• Considera la posición del pulgar para botones principales</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert className="border-green-200 bg-green-50">
            <AlertTitle className="text-green-800">Optimización de Contenido</AlertTitle>
            <AlertDescription className="text-green-700">
              <ul className="mt-2 space-y-1">
                <li>• Prioriza el contenido más importante en móvil</li>
                <li>• Usa layouts verticales para pantallas pequeñas</li>
                <li>• Simplifica el texto manteniendo la información esencial</li>
                <li>• Asegura que todos los botones sean accesibles</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </section>

      <section id="best-practices" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Mejores Prácticas Generales</h2>
        <p className="mb-4 text-gray-600">
          Sigue estas recomendaciones para crear banners efectivos que cumplan con las normativas 
          y proporcionen una excelente experiencia de usuario.
        </p>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">✅ Cumplimiento Legal</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li>• Botones "Aceptar" y "Rechazar" con igual prominencia visual</li>
                <li>• Información clara sobre el uso de cookies</li>
                <li>• Fácil acceso al centro de preferencias</li>
                <li>• Opción para retirar el consentimiento en cualquier momento</li>
                <li>• Texto en idioma local del usuario</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🎨 Diseño Visual</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li>• Mantén consistencia con la identidad de tu marca</li>
                <li>• Usa colores con suficiente contraste para accesibilidad</li>
                <li>• Limita la paleta de colores a 3-4 tonos principales</li>
                <li>• Aplica espaciado generoso para mejor legibilidad</li>
                <li>• Evita sobrecargar con demasiados elementos</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">⚡ Rendimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li>• Optimiza las imágenes para carga rápida</li>
                <li>• Mantén el banner ligero para no afectar el sitio</li>
                <li>• Usa animaciones sutiles, evita efectos excesivos</li>
                <li>• Testa la velocidad de carga en dispositivos móviles</li>
                <li>• Implementa lazy loading para elementos no críticos</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">👥 Experiencia de Usuario</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li>• Posiciona el banner donde no interrumpa la navegación</li>
                <li>• Proporciona opciones claras y fáciles de entender</li>
                <li>• Respeta las decisiones del usuario sin insistir</li>
                <li>• Ofrece información adicional sin ser intrusivo</li>
                <li>• Testa la usabilidad en diferentes dispositivos</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="troubleshooting" className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Solución de Problemas</h2>
        
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">El editor no carga correctamente</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                <li>• Verifica tu conexión a internet</li>
                <li>• Limpia la caché del navegador</li>
                <li>• Desactiva temporalmente bloqueadores de anuncios</li>
                <li>• Prueba en una ventana de incógnito</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Los cambios no se guardan</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                <li>• Asegúrate de hacer clic en "Guardar" antes de salir</li>
                <li>• Verifica que tengas permisos de edición</li>
                <li>• Comprueba la estabilidad de tu conexión</li>
                <li>• Evita hacer cambios en múltiples pestañas simultáneamente</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">El banner no se ve bien en móvil</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                <li>• Usa la vista previa móvil del editor</li>
                <li>• Ajusta el tamaño de texto para pantallas pequeñas</li>
                <li>• Simplifica el layout para dispositivos móviles</li>
                <li>• Testa en dispositivos reales, no solo emuladores</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Las imágenes no se cargan</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                <li>• Verifica que el formato de imagen sea compatible</li>
                <li>• Asegúrate de que el archivo no exceda 5MB</li>
                <li>• Comprueba la URL si usas imágenes externas</li>
                <li>• Intenta subir la imagen nuevamente</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Alert className="mt-6 border-yellow-200 bg-yellow-50">
          <AlertTitle className="text-yellow-800">¿Necesitas más ayuda?</AlertTitle>
          <AlertDescription className="text-yellow-700">
            Si los problemas persisten, contacta con nuestro equipo de soporte técnico en{' '}
            <strong>soporte@cookie21.com</strong> o consulta la sección de{' '}
            <a href="/documentation/faq" className="text-blue-600 hover:underline">Preguntas Frecuentes</a>.
          </AlertDescription>
        </Alert>
      </section>
    </div>
  );
};

export default BannerCustomization;