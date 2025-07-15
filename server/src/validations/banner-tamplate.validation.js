// validations/banner-template.validation.js
const Joi = require('joi');

// Esquemas de validación para solicitudes relacionadas con plantillas de banner
const bannerTemplateValidation = {
  // Validación para getSystemTemplates
  getSystemTemplates: {
    query: Joi.object({
      language: Joi.string().optional().default('en').min(2).max(5)
    })
  },
  
  // Validación para createSystemTemplate
  createSystemTemplate: {
    body: Joi.object({
      name: Joi.string().required().max(100),
      layout: Joi.object({
        desktop: Joi.object({
          type: Joi.string().valid('modal', 'banner', 'floating'),
          position: Joi.string().valid('top', 'bottom', 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'),
          width: Joi.string(),
          height: Joi.string(),
          backgroundColor: Joi.string(),
          minHeight: Joi.string()
        }).required(),
        tablet: Joi.object({
          type: Joi.string().valid('modal', 'banner', 'floating'),
          position: Joi.string().valid('top', 'bottom', 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'),
          width: Joi.string(),
          height: Joi.string(),
          backgroundColor: Joi.string(),
          minHeight: Joi.string()
        }).optional(),
        mobile: Joi.object({
          type: Joi.string().valid('modal', 'banner', 'floating'),
          position: Joi.string().valid('top', 'bottom', 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'),
          width: Joi.string(),
          height: Joi.string(),
          backgroundColor: Joi.string(),
          minHeight: Joi.string()
        }).optional()
      }).required(),
      components: Joi.array().items(
        Joi.object({
          id: Joi.string().required(),
          type: Joi.string().valid('text', 'button', 'link', 'logo', 'checkbox', 'toggle', 'container', 'panel', 'image', 'language-button').required(),
          action: Joi.object({
            type: Joi.string().valid('accept_all', 'reject_all', 'save_preferences', 'show_preferences', 'close', 'none', 'custom'),
            callback: Joi.string().optional()
          }).optional(),
          content: Joi.alternatives().try(
            Joi.string(),
            Joi.object({
              texts: Joi.object().pattern(
                Joi.string().min(2).max(5), // Código de idioma (ej: 'en', 'es')
                Joi.string() // Texto para ese idioma
              ).required(),
              translatable: Joi.boolean().optional(),
              text: Joi.string().optional() // Para compatibilidad
            }),
            // Configuración específica para language-button
            Joi.object({
              displayMode: Joi.string().valid('flag-dropdown', 'text-dropdown', 'flags-only', 'text-only').optional(),
              languages: Joi.array().items(Joi.string().min(2).max(5)).optional(),
              defaultLanguageMode: Joi.string().valid('auto', 'manual').optional(),
              defaultLanguage: Joi.string().min(2).max(5).optional(),
              showLabel: Joi.boolean().optional(),
              labelText: Joi.string().optional(),
              autoDetectConfig: Joi.object({
                useHtmlLang: Joi.boolean().optional(),
                useMetaTags: Joi.boolean().optional(),
                useUrlParams: Joi.boolean().optional(),
                useLocalStorage: Joi.boolean().optional(),
                useNavigatorLanguage: Joi.boolean().optional(),
                fallbackLanguage: Joi.string().min(2).max(5).optional()
              }).optional()
            })
          ).optional(),
          style: Joi.object({
            desktop: Joi.object().unknown(true).required(),
            tablet: Joi.object().unknown(true).optional(),
            mobile: Joi.object().unknown(true).optional()
          }).required(),
          position: Joi.object({
            desktop: Joi.object({
              top: Joi.string().regex(/%$/),
              left: Joi.string().regex(/%$/)
            }).required(),
            tablet: Joi.object({
              top: Joi.string().regex(/%$/),
              left: Joi.string().regex(/%$/)
            }).optional(),
            mobile: Joi.object({
              top: Joi.string().regex(/%$/),
              left: Joi.string().regex(/%$/)
            }).optional()
          }).required(),
          children: Joi.array().items(Joi.object().unknown(true)).optional(),
          locked: Joi.boolean().optional()
        })
      ).min(1),
      theme: Joi.object({
        colors: Joi.object({
          primary: Joi.string().optional(),
          secondary: Joi.string().optional(),
          accent: Joi.string().optional(),
          background: Joi.string().optional(),
          text: Joi.string().optional(),
          border: Joi.string().optional()
        }).optional(),
        fonts: Joi.object({
          primary: Joi.string().optional(),
          secondary: Joi.string().optional()
        }).optional(),
        spacing: Joi.object({
          unit: Joi.number().optional()
        }).optional(),
        animation: Joi.object({
          type: Joi.string().valid('fade', 'slide', 'none').optional(),
          duration: Joi.number().min(0).max(2000).optional()
        }).optional()
      }).optional(),
      settings: Joi.object({
        overlay: Joi.object({
          enabled: Joi.boolean().optional(),
          color: Joi.string().optional(),
          opacity: Joi.number().min(0).max(1).optional()
        }).optional(),
        closeButton: Joi.object({
          enabled: Joi.boolean().optional(),
          position: Joi.string().valid('inside', 'outside').optional()
        }).optional(),
        behaviour: Joi.object({
          autoHide: Joi.object({
            enabled: Joi.boolean().optional(),
            delay: Joi.number().min(0).optional()
          }).optional(),
          reshow: Joi.object({
            enabled: Joi.boolean().optional(),
            interval: Joi.number().min(0).optional()
          }).optional(),
          preferencesButton: Joi.string().valid('always', 'once', 'never').optional()
        }).optional(),
        responsive: Joi.object({
          breakpoints: Joi.object({
            mobile: Joi.number().min(0).max(1000).optional(),
            tablet: Joi.number().min(0).max(2000).optional()
          }).optional()
        }).optional()
      }).optional(),
      metadata: Joi.object({
        isPublic: Joi.boolean().optional().default(true),
        tags: Joi.array().items(Joi.string()).optional(),
        category: Joi.string().valid('basic', 'advanced', 'custom').optional().default('basic')
      }).optional()
    })
  },

  // Validación para getClientTemplates
  getClientTemplates: {
    query: Joi.object({
      status: Joi.string().optional().valid('draft', 'active', 'archived'),
      search: Joi.string().optional().allow('').max(100),
      type: Joi.string().optional().valid('system', 'custom'),
      clientId: Joi.string().optional(), // Para owners
      page: Joi.number().optional().integer().min(1),
      limit: Joi.number().optional().integer().min(1).max(100)
    })
  },

  // Validación para getTemplate
  getTemplate: {
    params: Joi.object({
      id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId
    }),
    query: Joi.object({
      language: Joi.string().optional().default('en').min(2).max(5)
    })
  },

  // Validación para createTemplate
  createTemplate: {
    body: Joi.object({
      name: Joi.string().optional().max(100),
      // Layout con formato frontend unificado
      layout: Joi.object({
        desktop: Joi.object({
          type: Joi.string().valid('modal', 'banner', 'floating'),
          position: Joi.string().valid('top', 'bottom', 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'),
          width: Joi.string(),
          height: Joi.string(),
          backgroundColor: Joi.string(),
          minHeight: Joi.string()
        }).required(),
        tablet: Joi.object({
          type: Joi.string().valid('modal', 'banner', 'floating'),
          position: Joi.string().valid('top', 'bottom', 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'),
          width: Joi.string(),
          height: Joi.string(),
          backgroundColor: Joi.string(),
          minHeight: Joi.string()
        }).optional(),
        mobile: Joi.object({
          type: Joi.string().valid('modal', 'banner', 'floating'),
          position: Joi.string().valid('top', 'bottom', 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'),
          width: Joi.string(),
          height: Joi.string(),
          backgroundColor: Joi.string(),
          minHeight: Joi.string()
        }).optional()
      }).required(),
      // Componentes
      components: Joi.array().items(
        Joi.object({
          id: Joi.string().required(),
          type: Joi.string().valid('text', 'button', 'link', 'logo', 'checkbox', 'toggle', 'container', 'panel', 'image', 'language-button').required(),
          action: Joi.object({
            type: Joi.string().valid('accept_all', 'reject_all', 'save_preferences', 'show_preferences', 'close', 'none', 'custom'),
            callback: Joi.string().optional()
          }).optional(),
          // Contenido (string o objeto con textos)
          content: Joi.alternatives().try(
            Joi.string(),
            Joi.object({
              texts: Joi.object().pattern(
                Joi.string().min(2).max(5), // Código de idioma (ej: 'en', 'es')
                Joi.string() // Texto para ese idioma
              ).required(),
              translatable: Joi.boolean().optional(),
              text: Joi.string().optional() // Para compatibilidad
            }),
            // Configuración específica para language-button
            Joi.object({
              displayMode: Joi.string().valid('flag-dropdown', 'text-dropdown', 'flags-only', 'text-only').optional(),
              languages: Joi.array().items(Joi.string().min(2).max(5)).optional(),
              defaultLanguageMode: Joi.string().valid('auto', 'manual').optional(),
              defaultLanguage: Joi.string().min(2).max(5).optional(),
              showLabel: Joi.boolean().optional(),
              labelText: Joi.string().optional(),
              autoDetectConfig: Joi.object({
                useHtmlLang: Joi.boolean().optional(),
                useMetaTags: Joi.boolean().optional(),
                useUrlParams: Joi.boolean().optional(),
                useLocalStorage: Joi.boolean().optional(),
                useNavigatorLanguage: Joi.boolean().optional(),
                fallbackLanguage: Joi.string().min(2).max(5).optional()
              }).optional()
            })
          ).optional(),
          // Estilos para cada dispositivo
          style: Joi.object({
            desktop: Joi.object().unknown(true).required(),
            tablet: Joi.object().unknown(true).optional(),
            mobile: Joi.object().unknown(true).optional()
          }).required(),
          // Posiciones para cada dispositivo (siempre en %)
          position: Joi.object({
            desktop: Joi.object({
              top: Joi.string().regex(/%$/),
              left: Joi.string().regex(/%$/)
            }).required(),
            tablet: Joi.object({
              top: Joi.string().regex(/%$/),
              left: Joi.string().regex(/%$/)
            }).optional(),
            mobile: Joi.object({
              top: Joi.string().regex(/%$/),
              left: Joi.string().regex(/%$/)
            }).optional()
          }).required(),
          // Otros
          children: Joi.array().items(Joi.object().unknown(true)).optional(),
          locked: Joi.boolean().optional()
        })
      ).min(1),
      // Tema
      theme: Joi.object({
        colors: Joi.object({
          primary: Joi.string().optional(),
          secondary: Joi.string().optional(),
          accent: Joi.string().optional(),
          background: Joi.string().optional(),
          text: Joi.string().optional(),
          border: Joi.string().optional()
        }).optional(),
        fonts: Joi.object({
          primary: Joi.string().optional(),
          secondary: Joi.string().optional()
        }).optional(),
        spacing: Joi.object({
          unit: Joi.number().optional()
        }).optional(),
        animation: Joi.object({
          type: Joi.string().valid('fade', 'slide', 'none').optional(),
          duration: Joi.number().min(0).max(2000).optional()
        }).optional()
      }).optional(),
      // Configuraciones
      settings: Joi.object({
        overlay: Joi.object({
          enabled: Joi.boolean().optional(),
          color: Joi.string().optional(),
          opacity: Joi.number().min(0).max(1).optional()
        }).optional(),
        closeButton: Joi.object({
          enabled: Joi.boolean().optional(),
          position: Joi.string().valid('inside', 'outside').optional()
        }).optional(),
        behaviour: Joi.object({
          autoHide: Joi.object({
            enabled: Joi.boolean().optional(),
            delay: Joi.number().min(0).optional()
          }).optional(),
          reshow: Joi.object({
            enabled: Joi.boolean().optional(),
            interval: Joi.number().min(0).optional()
          }).optional(),
          preferencesButton: Joi.string().valid('always', 'once', 'never').optional()
        }).optional(),
        responsive: Joi.object({
          breakpoints: Joi.object({
            mobile: Joi.number().min(0).max(1000).optional(),
            tablet: Joi.number().min(0).max(2000).optional()
          }).optional()
        }).optional()
      }).optional()
    })
  },

  // Validación para cloneTemplate
  cloneTemplate: {
    params: Joi.object({
      id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId
    }),
    body: Joi.object({
      name: Joi.string().required().max(100),
      customizations: Joi.object().pattern(
        Joi.string(),
        Joi.object({
          // Contenido (string o objeto con textos)
          content: Joi.alternatives().try(
            Joi.string(),
            Joi.object({
              texts: Joi.object().pattern(
                Joi.string().min(2).max(5),
                Joi.string()
              ).optional(),
              translatable: Joi.boolean().optional(),
              text: Joi.string().optional()
            }),
            // Configuración específica para language-button
            Joi.object({
              displayMode: Joi.string().valid('flag-dropdown', 'text-dropdown', 'flags-only', 'text-only').optional(),
              languages: Joi.array().items(Joi.string().min(2).max(5)).optional(),
              defaultLanguageMode: Joi.string().valid('auto', 'manual').optional(),
              defaultLanguage: Joi.string().min(2).max(5).optional(),
              showLabel: Joi.boolean().optional(),
              labelText: Joi.string().optional(),
              autoDetectConfig: Joi.object({
                useHtmlLang: Joi.boolean().optional(),
                useMetaTags: Joi.boolean().optional(),
                useUrlParams: Joi.boolean().optional(),
                useLocalStorage: Joi.boolean().optional(),
                useNavigatorLanguage: Joi.boolean().optional(),
                fallbackLanguage: Joi.string().min(2).max(5).optional()
              }).optional()
            })
          ).optional(),
          style: Joi.object({
            desktop: Joi.object().unknown(true).optional(),
            tablet: Joi.object().unknown(true).optional(),
            mobile: Joi.object().unknown(true).optional()
          }).optional()
        })
      ).optional()
    })
  },

  // Las demás validaciones continuarían aquí...
  // (Se mantienen iguales pero ajustando al nuevo formato)
  updateTemplate: {
    params: Joi.object({
      id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
    }),
    // Permite cualquier key en el body (debe tener al menos 1)
    body: Joi.object({}).min(1).unknown(true)
  },
  
  updateSystemTemplate: {
    params: Joi.object({
      id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
    }),
    body: Joi.object({
      name: Joi.string().optional().max(100),
      layout: Joi.object({
        desktop: Joi.object({
          type: Joi.string().valid('modal', 'banner', 'floating'),
          position: Joi.string().valid('top', 'bottom', 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'),
          width: Joi.string(),
          height: Joi.string(),
          backgroundColor: Joi.string(),
          minHeight: Joi.string()
        }).optional(),
        tablet: Joi.object({
          type: Joi.string().valid('modal', 'banner', 'floating'),
          position: Joi.string().valid('top', 'bottom', 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'),
          width: Joi.string(),
          height: Joi.string(),
          backgroundColor: Joi.string(),
          minHeight: Joi.string()
        }).optional(),
        mobile: Joi.object({
          type: Joi.string().valid('modal', 'banner', 'floating'),
          position: Joi.string().valid('top', 'bottom', 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'),
          width: Joi.string(),
          height: Joi.string(),
          backgroundColor: Joi.string(),
          minHeight: Joi.string()
        }).optional()
      }).optional(),
      components: Joi.array().items(
        Joi.object({
          id: Joi.string().required(),
          type: Joi.string().valid('text', 'button', 'link', 'logo', 'checkbox', 'toggle', 'container', 'panel', 'image', 'language-button').required(),
          action: Joi.object({
            type: Joi.string().valid('accept_all', 'reject_all', 'save_preferences', 'show_preferences', 'close', 'none', 'custom'),
            callback: Joi.string().optional()
          }).optional(),
          content: Joi.alternatives().try(
            Joi.string(),
            Joi.object({
              texts: Joi.object().pattern(
                Joi.string().min(2).max(5),
                Joi.string()
              ).optional(),
              translatable: Joi.boolean().optional(),
              text: Joi.string().optional()
            }),
            // Configuración específica para language-button
            Joi.object({
              displayMode: Joi.string().valid('flag-dropdown', 'text-dropdown', 'flags-only', 'text-only').optional(),
              languages: Joi.array().items(Joi.string().min(2).max(5)).optional(),
              defaultLanguageMode: Joi.string().valid('auto', 'manual').optional(),
              defaultLanguage: Joi.string().min(2).max(5).optional(),
              showLabel: Joi.boolean().optional(),
              labelText: Joi.string().optional(),
              autoDetectConfig: Joi.object({
                useHtmlLang: Joi.boolean().optional(),
                useMetaTags: Joi.boolean().optional(),
                useUrlParams: Joi.boolean().optional(),
                useLocalStorage: Joi.boolean().optional(),
                useNavigatorLanguage: Joi.boolean().optional(),
                fallbackLanguage: Joi.string().min(2).max(5).optional()
              }).optional()
            })
          ).optional(),
          style: Joi.object({
            desktop: Joi.object().unknown(true).optional(),
            tablet: Joi.object().unknown(true).optional(),
            mobile: Joi.object().unknown(true).optional()
          }).optional(),
          position: Joi.object({
            desktop: Joi.object({
              top: Joi.string().regex(/%$/),
              left: Joi.string().regex(/%$/)
            }).optional(),
            tablet: Joi.object({
              top: Joi.string().regex(/%$/),
              left: Joi.string().regex(/%$/)
            }).optional(),
            mobile: Joi.object({
              top: Joi.string().regex(/%$/),
              left: Joi.string().regex(/%$/)
            }).optional()
          }).optional(),
          children: Joi.array().items(Joi.object().unknown(true)).optional(),
          locked: Joi.boolean().optional()
        })
      ).optional(),
      theme: Joi.object({
        colors: Joi.object({
          primary: Joi.string().optional(),
          secondary: Joi.string().optional(),
          accent: Joi.string().optional(),
          background: Joi.string().optional(),
          text: Joi.string().optional(),
          border: Joi.string().optional()
        }).optional(),
        fonts: Joi.object({
          primary: Joi.string().optional(),
          secondary: Joi.string().optional()
        }).optional(),
        spacing: Joi.object({
          unit: Joi.number().optional()
        }).optional(),
        animation: Joi.object({
          type: Joi.string().valid('fade', 'slide', 'none').optional(),
          duration: Joi.number().min(0).max(2000).optional()
        }).optional()
      }).optional(),
      settings: Joi.object({
        overlay: Joi.object({
          enabled: Joi.boolean().optional(),
          color: Joi.string().optional(),
          opacity: Joi.number().min(0).max(1).optional()
        }).optional(),
        closeButton: Joi.object({
          enabled: Joi.boolean().optional(),
          position: Joi.string().valid('inside', 'outside').optional()
        }).optional(),
        behaviour: Joi.object({
          autoHide: Joi.object({
            enabled: Joi.boolean().optional(),
            delay: Joi.number().min(0).optional()
          }).optional(),
          reshow: Joi.object({
            enabled: Joi.boolean().optional(),
            interval: Joi.number().min(0).optional()
          }).optional(),
          preferencesButton: Joi.string().valid('always', 'once', 'never').optional()
        }).optional(),
        responsive: Joi.object({
          breakpoints: Joi.object({
            mobile: Joi.number().min(0).max(1000).optional(),
            tablet: Joi.number().min(0).max(2000).optional()
          }).optional()
        }).optional()
      }).optional(),
      metadata: Joi.object({
        isPublic: Joi.boolean().optional(),
        tags: Joi.array().items(Joi.string()).optional(),
        category: Joi.string().valid('basic', 'advanced', 'custom').optional()
      }).optional(),
      status: Joi.string().valid('active', 'draft', 'archived').optional()
    }).min(1)
  },

  previewTemplate: {
    body: Joi.object({
      config: Joi.object().required() // La validación detallada se hará en el controlador
    }),
    query: Joi.object({
      domainId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional()
    })
  },

  archiveTemplate: {
    params: Joi.object({
      id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
    })
  },

  exportConfig: {
    params: Joi.object({
      id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
    }),
    query: Joi.object({
      format: Joi.string().valid('json', 'html').default('json')
    })
  },

  getVersions: {
    params: Joi.object({
      id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
    }),
    query: Joi.object({
      limit: Joi.number().integer().min(1).max(50).default(10)
    })
  },

  restoreVersion: {
    params: Joi.object({
      id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
    }),
    body: Joi.object({
      version: Joi.number().integer().min(1).required()
    })
  },

  testTemplate: {
    params: Joi.object({
      id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
    }),
    body: Joi.object({
      testConfig: Joi.object().required() // La validación detallada se hará en el controlador
    })
  },

  deleteTemplate: {
    params: Joi.object({
      id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
    }),
    query: Joi.object({
      permanentDelete: Joi.boolean().optional().default(true)
    })
  },

  // Validación para assignTemplateToClient
  assignTemplateToClient: {
    params: Joi.object({
      id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/) // Template ID
    }),
    body: Joi.object({
      clientId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
    })
  },

  // Validación para getClientAssignments
  getClientAssignments: {
    params: Joi.object({
      id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/) // Template ID
    }),
    query: Joi.object({
      page: Joi.number().optional().integer().min(1).default(1),
      limit: Joi.number().optional().integer().min(1).max(100).default(10),
      search: Joi.string().optional().allow('').max(100)
    })
  },

  // Validación para removeClientAssignment
  removeClientAssignment: {
    params: Joi.object({
      id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/), // Template ID
      clientId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/) // Client ID
    })
  },

  // Validación para asignar banner a cliente
  assignBannerToClient: {
    params: Joi.object({
      id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/) // Banner Template ID
    }),
    body: Joi.object({
      clientId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/) // Client ID al que asignar
    })
  }
};

module.exports = { bannerTemplateValidation };