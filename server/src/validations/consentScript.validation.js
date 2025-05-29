// validations/consentScript.validation.js
const Joi = require('joi');
const { objectId } = require('./custom.validation');

const consentScriptValidation = {
  generateScript: {
    params: Joi.object().keys({
      domainId: Joi.string().custom(objectId).required()
    }),
    body: Joi.object().keys({
      templateId: Joi.string().custom(objectId),
      minify: Joi.boolean(),
      includeVendorList: Joi.boolean()
    })
  },
  
  generateIntegratedScript: {
    params: Joi.object().keys({
      domainId: Joi.string().custom(objectId).required()
    }),
    body: Joi.object().keys({
      templateId: Joi.string().custom(objectId),
      scriptIds: Joi.array().items(Joi.string().custom(objectId))
    })
  },
  
  generateInstallationCode: {
    params: Joi.object().keys({
      domainId: Joi.string().custom(objectId).required()
    })
  },
  
  generateTestPage: {
    params: Joi.object().keys({
      domainId: Joi.string().custom(objectId).required()
    }),
    body: Joi.object().keys({
      templateId: Joi.string().custom(objectId)
    })
  },
  
  getBanner: {
    params: Joi.object().keys({
      templateId: Joi.string().custom(objectId).required()
    })
  },
  
  getProviderScript: {
    params: Joi.object().keys({
      provider: Joi.string().required()
    }),
    body: Joi.object().keys({
      domainId: Joi.string().custom(objectId).required(),
      trackingId: Joi.string(),
      containerId: Joi.string(),
      pixelId: Joi.string(),
      siteId: Joi.string()
    })
  },
  
  serveEmbedScript: {
    params: Joi.object().keys({
      domainId: Joi.string().custom(objectId).required()
    })
  },
  
  detectCountry: {
    query: Joi.object().keys({
      country: Joi.string().length(2)
    })
  },
  
  logInteraction: {
    params: Joi.object().keys({
      domainId: Joi.string().custom(objectId).required()
    }),
    body: Joi.object().keys({
      userId: Joi.string().required(),
      action: Joi.string().required().valid(
        'accept_all', 
        'reject_all', 
        'save_preferences', 
        'close', 
        'no_interaction'
      ),
      timeToDecision: Joi.number(),
      decisions: Joi.object().keys({
        purposes: Joi.object().pattern(
          Joi.string(), 
          Joi.boolean()
        ),
        vendors: Joi.object().pattern(
          Joi.string(), 
          Joi.boolean()
        )
      }),
      deviceInfo: Joi.object().keys({
        userAgent: Joi.string(),
        platform: Joi.string(),
        language: Joi.string(),
        screenWidth: Joi.number(),
        screenHeight: Joi.number()
      })
    })
  }
};

module.exports = {
  consentScriptValidation
};