// routes/v1/validator.routes.js
const express = require('express');
const router = express.Router();
const standaloneScriptGenerator = require('../../services/standaloneScriptGenerator.service');
const { createCMPConfig } = require('../../config/cmp.config');

/**
 * @swagger
 * /api/v1/validator/test-page:
 *   get:
 *     summary: Genera página HTML completa para testing con CMP Validator
 *     description: Crea una página HTML standalone que funciona sin backend para probar con validadores
 *     tags: [Validator]
 *     responses:
 *       200:
 *         description: Página HTML con CMP integrado
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
router.get('/test-page', (req, res) => {
  try {
    const html = standaloneScriptGenerator.generateValidatorScript({
      validatorMode: true,
      debugMode: true
    });
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="cmp-validator-test.html"');
    res.send(html);
  } catch (error) {
    res.status(500).json({
      error: 'Error generando página de test',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/validator/script:
 *   get:
 *     summary: Genera script JavaScript standalone del CMP
 *     description: Devuelve solo el JavaScript del CMP para integrar en sitios existentes
 *     tags: [Validator]
 *     responses:
 *       200:
 *         description: Script JavaScript del CMP
 *         content:
 *           application/javascript:
 *             schema:
 *               type: string
 */
router.get('/script', (req, res) => {
  try {
    const script = standaloneScriptGenerator.generateStandaloneJS({
      validatorMode: true,
      debugMode: req.query.debug === 'true'
    });
    
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.send(script);
  } catch (error) {
    res.status(500).json({
      error: 'Error generando script',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/validator/config:
 *   get:
 *     summary: Obtiene la configuración actual del CMP
 *     description: Devuelve la configuración que se está usando para validación
 *     tags: [Validator]
 *     responses:
 *       200:
 *         description: Configuración del CMP
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/config', (req, res) => {
  try {
    const config = createCMPConfig().getClientConfig({
      validatorMode: true
    });
    
    res.json({
      success: true,
      config: config,
      status: 'ready_for_validation',
      endpoints: {
        testPage: '/api/v1/validator/test-page',
        script: '/api/v1/validator/script',
        config: '/api/v1/validator/config'
      },
      instructions: {
        step1: 'Descarga la página de test desde /api/v1/validator/test-page',
        step2: 'Guárdala como test-cmp.html',
        step3: 'Ábrela en tu navegador',
        step4: 'Ve al IAB TCF Validator: https://iabtcf.com/#validator',
        step5: 'Introduce la URL del archivo HTML o usa la herramienta de inspección'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error obteniendo configuración',
      message: error.message
    });
  }
});

module.exports = router;