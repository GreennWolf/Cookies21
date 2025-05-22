import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar, Container, Nav } from 'react-bootstrap';

const DocHeader = () => {
  return (
    <Navbar bg="primary" variant="dark" expand="lg" className="doc-navbar">
      <Container>
        <Navbar.Brand as={Link} to="/documentation">Cookie21 Docs</Navbar.Brand>
        <Navbar.Toggle aria-controls="doc-navbar-nav" />
        <Navbar.Collapse id="doc-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/documentation/getting-started">Primeros pasos</Nav.Link>
            <Nav.Link as={Link} to="/documentation/script-integration">Integración del Script</Nav.Link>
            <Nav.Link as={Link} to="/documentation/banner-customization">Personalización del Banner</Nav.Link>
            <Nav.Link as={Link} to="/documentation/compliance">Cumplimiento Normativo</Nav.Link>
          </Nav>
          <Nav>
            <Nav.Link as={Link} to="/dashboard">Volver al Dashboard</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default DocHeader;