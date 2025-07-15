// routes/v1/tcstring.routes.js
const express = require('express');
const TCStringController = require('../../controllers/TCStringController');
const { authMiddleware } = require('../../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     TCStringRequest:
 *       type: object
 *       required:
 *         - tcData
 *       properties:
 *         tcData:
 *           type: object
 *           properties:
 *             cmpId:
 *               type: number
 *               description: CMP ID
 *             cmpVersion:
 *               type: number
 *               description: CMP Version
 *             publisherCC:
 *               type: string
 *               description: Publisher Country Code
 *             purposeConsents:
 *               type: object
 *               description: Purpose consents object
 *             purposeLegitimateInterests:
 *               type: object
 *               description: Purpose legitimate interests object
 *             vendorConsents:
 *               type: object
 *               description: Vendor consents object
 *             specialFeatureOptins:
 *               type: object
 *               description: Special feature opt-ins object
 *         domainId:
 *           type: string
 *           description: Domain ID for context
 */

/**
 * @swagger
 * /api/v1/tc-string/generate:
 *   post:
 *     summary: Generate TC String using official IAB library
 *     tags: [TC String]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TCStringRequest'
 *     responses:
 *       200:
 *         description: TC String generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 tcString:
 *                   type: string
 *                 metadata:
 *                   type: object
 */
router.post('/generate', TCStringController.generateTCString);

/**
 * @swagger
 * /api/v1/tc-string/generate-validator:
 *   post:
 *     summary: Generate TC String optimized for IAB validators
 *     tags: [TC String]
 *     responses:
 *       200:
 *         description: Validator-optimized TC String generated
 */
router.post('/generate-validator', TCStringController.generateValidatorTCString);

/**
 * @swagger
 * /api/v1/tc-string/validate:
 *   post:
 *     summary: Validate a TC String
 *     tags: [TC String]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tcString
 *             properties:
 *               tcString:
 *                 type: string
 *                 description: TC String to validate
 *     responses:
 *       200:
 *         description: TC String validation result
 */
router.post('/validate', TCStringController.validateTCString);

/**
 * @swagger
 * /api/v1/tc-string/simple:
 *   post:
 *     summary: Generate simple TC String for fallback cases
 *     tags: [TC String]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               consent:
 *                 type: object
 *                 description: Consent object with purposes and vendors
 *               cmpId:
 *                 type: number
 *                 description: CMP ID (optional)
 *               cmpVersion:
 *                 type: number
 *                 description: CMP Version (optional)
 *               publisherCC:
 *                 type: string
 *                 description: Publisher Country Code (optional)
 *     responses:
 *       200:
 *         description: Simple TC String generated successfully
 */
router.post('/simple', TCStringController.generateSimpleTCString);

/**
 * @swagger
 * /api/v1/tc-string/decode:
 *   post:
 *     summary: Decode a TC String to inspect its contents
 *     tags: [TC String]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tcString
 *             properties:
 *               tcString:
 *                 type: string
 *                 description: TC String to decode
 *     responses:
 *       200:
 *         description: TC String decoded successfully
 */
router.post('/decode', TCStringController.decodeTCString);

module.exports = router;