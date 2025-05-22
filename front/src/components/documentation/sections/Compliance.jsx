import React from 'react';
import { Card, Alert } from 'react-bootstrap';

const Compliance = () => {
  return (
    <div>
      <h1 className="mb-4">Cumplimiento Normativo</h1>
      
      <section id="gdpr">
        <h2 className="mb-3">RGPD / GDPR</h2>
        <p>
          El Reglamento General de Protección de Datos (RGPD) es una normativa de la Unión Europea 
          que regula cómo las empresas deben manejar los datos personales de los residentes de la UE.
        </p>
        <Alert variant="info">
          Esta sección está en desarrollo. Próximamente encontrarás aquí una guía completa sobre el cumplimiento del RGPD.
        </Alert>
      </section>
    </div>
  );
};

export default Compliance;