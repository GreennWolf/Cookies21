import React from 'react';
import { Card, Alert } from 'react-bootstrap';

const BannerCustomization = () => {
  return (
    <div>
      <h1 className="mb-4">Personalización del Banner</h1>
      
      <section id="visual-editor">
        <h2 className="mb-3">Editor visual</h2>
        <p>
          Cookie21 proporciona un potente editor visual que te permite personalizar completamente 
          el aspecto y comportamiento de tu banner de consentimiento sin necesidad de conocimientos técnicos.
        </p>
        <Alert variant="info">
          Esta sección está en desarrollo. Próximamente encontrarás aquí una guía completa sobre el editor visual.
        </Alert>
      </section>
    </div>
  );
};

export default BannerCustomization;