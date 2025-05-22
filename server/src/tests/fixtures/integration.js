// tests/fixtures/integration.js

const integrationFixtures = {
    clientScenarios: {
      basic: {
        name: 'Basic Client',
        email: 'basic@test.com',
        password: 'Basic123!',
        company: {
          name: 'Basic Company',
          website: 'https://basic.com'
        },
        subscription: {
          plan: 'basic',
          allowedDomains: 1
        }
      },
      premium: {
        name: 'Premium Client',
        email: 'premium@test.com',
        password: 'Premium123!',
        company: {
          name: 'Premium Company',
          website: 'https://premium.com'
        },
        subscription: {
          plan: 'premium',
          allowedDomains: 10
        }
      }
    },
  
    domainScenarios: {
      simple: {
        domain: 'simple.com',
        settings: {
          scanning: {
            enabled: true,
            interval: 24
          },
          design: {
            theme: {
              primary: '#000000',
              secondary: '#FFFFFF'
            }
          }
        }
      },
      complex: {
        domain: 'complex.com',
        settings: {
          scanning: {
            enabled: true,
            interval: 12,
            customPaths: ['/blog', '/shop']
          },
          design: {
            theme: {
              primary: '#1a73e8',
              secondary: '#ffffff'
            },
            layout: 'modal'
          },
          notifications: {
            email: {
              enabled: true,
              recipients: ['admin@complex.com']
            },
            webhooks: [{
              url: 'https://complex.com/webhook',
              events: ['scan_completed', 'consent_updated']
            }]
          }
        }
      }
    },
  
    bannerScenarios: {
      minimal: {
        name: 'Minimal Banner',
        type: 'custom',
        layout: {
          type: 'banner',
          position: 'bottom'
        },
        components: [
          {
            type: 'button',
            id: 'accept-all',
            action: { type: 'accept_all' },
            content: { text: 'Accept All' }
          }
        ]
      },
      complete: {
        name: 'Complete Banner',
        type: 'custom',
        layout: {
          type: 'modal',
          position: 'center'
        },
        components: [
          {
            type: 'text',
            id: 'title',
            content: { text: 'Privacy Settings' }
          },
          {
            type: 'text',
            id: 'description',
            content: { text: 'We use cookies to improve your experience.' }
          },
          {
            type: 'container',
            id: 'buttons',
            components: [
              {
                type: 'button',
                id: 'accept-all',
                action: { type: 'accept_all' },
                content: { text: 'Accept All' }
              },
              {
                type: 'button',
                id: 'reject-all',
                action: { type: 'reject_all' },
                content: { text: 'Reject All' }
              },
              {
                type: 'button',
                id: 'preferences',
                action: { type: 'show_preferences' },
                content: { text: 'Preferences' }
              }
            ]
          }
        ]
      }
    },
  
    consentScenarios: {
      acceptAll: {
        decisions: {
          purposes: [
            { id: 1, allowed: true },
            { id: 2, allowed: true },
            { id: 3, allowed: true }
          ],
          vendors: [
            { id: 1, allowed: true },
            { id: 2, allowed: true }
          ]
        },
        metadata: {
          deviceType: 'desktop',
          browser: 'chrome'
        }
      },
      customized: {
        decisions: {
          purposes: [
            { id: 1, allowed: true },
            { id: 2, allowed: false },
            { id: 3, allowed: true }
          ],
          vendors: [
            { id: 1, allowed: true },
            { id: 2, allowed: false }
          ]
        },
        metadata: {
          deviceType: 'mobile',
          browser: 'safari'
        }
      }
    },
  
    cookieScenarios: {
      analytics: [
        {
          name: '_ga',
          provider: 'Google Analytics',
          category: 'analytics',
          description: { en: 'Google Analytics Cookie' }
        },
        {
          name: '_hjid',
          provider: 'Hotjar',
          category: 'analytics',
          description: { en: 'Hotjar User ID' }
        }
      ],
      marketing: [
        {
          name: '_fbp',
          provider: 'Facebook',
          category: 'marketing',
          description: { en: 'Facebook Pixel' }
        },
        {
          name: '_gcl_au',
          provider: 'Google',
          category: 'marketing',
          description: { en: 'Google Ads Conversion' }
        }
      ]
    }
  };
  
  module.exports = integrationFixtures;