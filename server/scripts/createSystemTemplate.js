// scripts/createSystemTemplate.js
require('dotenv').config();
const mongoose = require('mongoose');
const BannerTemplate = require('../src/models/BannerTemplate');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cookies21', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const createSystemTemplate = async () => {
  try {
    // Verificar si ya existe una plantilla del sistema
    const existingSystemTemplate = await BannerTemplate.findOne({ 
      type: 'system', 
      name: 'Banner Básico del Sistema'
    });
    
    if (existingSystemTemplate) {
      console.log('✅ Ya existe una plantilla del sistema:', existingSystemTemplate.name);
      return existingSystemTemplate;
    }

    // Crear una plantilla básica del sistema
    const systemTemplate = new BannerTemplate({
      name: 'Banner Básico del Sistema',
      type: 'system',
      status: 'active',
      metadata: {
        isPublic: true,
        category: 'basic',
        version: 1,
        tags: ['basic', 'cookie', 'consent']
      },
      layout: {
        width: '100%',
        height: 'auto',
        maxWidth: '500px',
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999
      },
      components: [
        {
          id: 'mainContainer',
          type: 'container',
          style: {
            desktop: {
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              border: '1px solid #e5e7eb'
            },
            tablet: {
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              border: '1px solid #e5e7eb'
            },
            mobile: {
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              border: '1px solid #e5e7eb'
            }
          },
          children: [
            {
              id: 'title',
              type: 'text',
              content: {
                texts: {
                  en: 'We use cookies',
                  es: 'Usamos cookies'
                }
              },
              style: {
                desktop: {
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: '12px'
                },
                tablet: {
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: '10px'
                },
                mobile: {
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: '10px'
                }
              }
            },
            {
              id: 'description',
              type: 'text',
              content: {
                texts: {
                  en: 'This website uses cookies to ensure you get the best experience on our website.',
                  es: 'Este sitio web utiliza cookies para garantizar que obtenga la mejor experiencia en nuestro sitio web.'
                }
              },
              style: {
                desktop: {
                  fontSize: '14px',
                  color: '#6b7280',
                  marginBottom: '16px',
                  lineHeight: '1.5'
                },
                tablet: {
                  fontSize: '14px',
                  color: '#6b7280',
                  marginBottom: '14px',
                  lineHeight: '1.5'
                },
                mobile: {
                  fontSize: '14px',
                  color: '#6b7280',
                  marginBottom: '14px',
                  lineHeight: '1.5'
                }
              }
            },
            {
              id: 'buttonContainer',
              type: 'container',
              style: {
                desktop: {
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end'
                },
                tablet: {
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'flex-end'
                },
                mobile: {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }
              },
              children: [
                {
                  id: 'rejectBtn',
                  type: 'button',
                  content: {
                    texts: {
                      en: 'Reject',
                      es: 'Rechazar'
                    }
                  },
                  action: {
                    type: 'reject_all'
                  },
                  style: {
                    desktop: {
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    },
                    tablet: {
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 14px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    },
                    mobile: {
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      width: '100%'
                    }
                  }
                },
                {
                  id: 'acceptBtn',
                  type: 'button',
                  content: {
                    texts: {
                      en: 'Accept All',
                      es: 'Aceptar Todo'
                    }
                  },
                  action: {
                    type: 'accept_all'
                  },
                  style: {
                    desktop: {
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    },
                    tablet: {
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 14px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    },
                    mobile: {
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      width: '100%'
                    }
                  }
                }
              ]
            }
          ]
        }
      ],
      theme: {
        colors: {
          primary: '#10b981',
          secondary: '#ef4444',
          accent: '#6b7280',
          background: '#ffffff',
          text: '#1f2937',
          border: '#e5e7eb'
        },
        fonts: {
          primary: 'system-ui, -apple-system, sans-serif',
          secondary: 'system-ui, -apple-system, sans-serif'
        },
        spacing: {
          unit: 8
        }
      },
      translations: {
        en: {
          title: 'We use cookies',
          description: 'This website uses cookies to ensure you get the best experience on our website.',
          acceptAll: 'Accept All',
          reject: 'Reject',
          preferences: 'Preferences'
        },
        es: {
          title: 'Usamos cookies',
          description: 'Este sitio web utiliza cookies para garantizar que obtenga la mejor experiencia en nuestro sitio web.',
          acceptAll: 'Aceptar Todo',
          reject: 'Rechazar',
          preferences: 'Preferencias'
        }
      }
    });

    const savedTemplate = await systemTemplate.save();
    console.log('✅ Plantilla del sistema creada exitosamente:', savedTemplate.name);
    console.log('📋 ID:', savedTemplate._id);
    
    return savedTemplate;
  } catch (error) {
    console.error('❌ Error creando plantilla del sistema:', error);
    throw error;
  }
};

const main = async () => {
  try {
    await connectDB();
    await createSystemTemplate();
    console.log('🎉 Script completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  }
};

main();