import React from 'react';
import { Card, Alert, Accordion } from 'react-bootstrap';

const Faq = () => {
  return (
    <div>
      <h1 className="mb-4">Preguntas Frecuentes</h1>
      
      <section id="general" className="mb-5">
        <h2 className="mb-3">Preguntas generales</h2>
        
        <Accordion>
          <Accordion.Item eventKey="0">
            <Accordion.Header>¿Cómo afecta Cookie21 al rendimiento de mi sitio web?</Accordion.Header>
            <Accordion.Body>
              Cookie21 está diseñado para tener un impacto mínimo en el rendimiento. El script se carga de forma asíncrona, 
              lo que significa que no bloquea la carga del resto de la página. Además, utiliza técnicas de carga diferida 
              para minimizar el impacto en los tiempos de carga.
            </Accordion.Body>
          </Accordion.Item>
          
          <Accordion.Item eventKey="1">
            <Accordion.Header>¿Funciona Cookie21 con cualquier tipo de sitio web?</Accordion.Header>
            <Accordion.Body>
              Sí, Cookie21 es compatible con cualquier tipo de sitio web, independientemente de la tecnología utilizada. 
              Funciona con sitios desarrollados en WordPress, Drupal, Joomla, Shopify, Wix, y con sitios personalizados 
              desarrollados con cualquier framework o lenguaje.
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
        
        <Alert variant="info" className="mt-4">
          Esta sección está en desarrollo. Próximamente encontrarás aquí más preguntas frecuentes.
        </Alert>
      </section>
    </div>
  );
};

export default Faq;