const express = require('express');
const router = express.Router();
const { catchAsync } = require('../../utils/catchAsync');
const path = require('path');
const fs = require('fs');

// Ruta para la documentación general
router.get('/', catchAsync(async (req, res) => {
  res.render('documentation/index', {
    title: 'Documentación de Cookie21',
    section: 'home'
  });
}));

// Ruta para documentación de integración de script
router.get('/script-integration', catchAsync(async (req, res) => {
  res.render('documentation/script-integration', {
    title: 'Integración del Script - Documentación',
    section: 'script'
  });
}));

// Ruta para documentación del banner y personalización
router.get('/banner-customization', catchAsync(async (req, res) => {
  res.render('documentation/banner-customization', {
    title: 'Personalización del Banner - Documentación',
    section: 'banner'
  });
}));

// Ruta para documentación de cumplimiento normativo
router.get('/compliance', catchAsync(async (req, res) => {
  res.render('documentation/compliance', {
    title: 'Cumplimiento Normativo - Documentación',
    section: 'compliance'
  });
}));

// Ruta alternativa - documentación en html estático en caso de no usar un motor de plantillas
router.get('/html', catchAsync(async (req, res) => {
  const docPath = path.join(__dirname, '../../../public/documentation/index.html');
  res.sendFile(docPath);
}));

module.exports = router;