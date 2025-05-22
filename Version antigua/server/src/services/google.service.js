const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');
const { decrypt } = require('../utils/crypto');

class GoogleService {
  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.GTM_API_URL = 'https://www.googleapis.com/tagmanager/v2';
    this.GA_API_URL = 'https://www.googleapis.com/analytics/v4/data';
    this.GA_ADMIN_API_URL = 'https://analytics.googleapis.com/analytics/v3/management';
    this.CONSENT_MODES = {
      ANALYTICS: 'analytics_storage',
      ADS: 'ad_storage',
      PERSONALIZATION: 'personalization_storage'
    };

    this.CACHE_TTL = 3600;
  }

  async validateGoogleConfig(config) {
    try {
      const { measurementId, credentials } = config;

      if (!this._isValidMeasurementId(measurementId)) {
        return {
          isValid: false,
          errors: ['Invalid Measurement ID format']
        };
      }

      if (credentials) {
        const credentialsValidation = await this._validateCredentials(credentials);
        if (!credentialsValidation.isValid) {
          return credentialsValidation;
        }
      }

      const accessValidation = await this._verifyPropertyAccess(measurementId, credentials);
      if (!accessValidation.isValid) {
        return accessValidation;
      }

      return {
        isValid: true,
        measurementId,
        propertyDetails: accessValidation.property
      };
    } catch (error) {
      logger.error('Error validating Google config:', error);
      throw error;
    }
  }

  async configureGTM(domain, config) {
    try {
      const { containerId, credentials, workspaceId = 'default' } = config;

      if (!this._isValidContainerId(containerId)) {
        throw new Error('Invalid Container ID format');
      }

      const accessToken = await this._getAccessToken(credentials);
      const container = await this._getOrCreateContainer(domain, containerId, accessToken);
      const workspace = await this._getWorkspace(
        container.accountId, 
        container.containerId, 
        workspaceId,
        accessToken
      );

      const cmpConfig = await this._generateCMPConfig(domain, config);
      const gtmConfig = await this._setupCMPConfiguration(container, workspace, cmpConfig, accessToken);

      return {
        accountId: container.accountId,
        containerId: container.containerId,
        workspaceId: workspace.workspaceId,
        publicId: container.publicId,
        configuration: gtmConfig
      };
    } catch (error) {
      logger.error('Error configuring GTM:', error);
      throw error;
    }
  }

  async generateTagConfiguration(config) {
    try {
      const { type, settings } = config;

      switch (type.toLowerCase()) {
        case 'analytics':
          return this._generateAnalyticsTag(settings);
        case 'adsense':
          return this._generateAdsenseTag(settings);
        case 'doubleclick':
          return this._generateDoubleclickTag(settings);
        default:
          throw new Error(`Unsupported tag type: ${type}`);
      }
    } catch (error) {
      logger.error('Error generating tag configuration:', error);
      throw error;
    }
  }

  async verifyConsentState(measurementId, userId) {
    try {
      const cacheKey = `google:consent:${measurementId}:${userId}`;
      const cachedState = await cache.get(cacheKey);
      
      if (cachedState) {
        return JSON.parse(cachedState);
      }

      const state = await this._fetchConsentState(measurementId, userId);
      await cache.set(cacheKey, JSON.stringify(state), 'EX', this.CACHE_TTL);

      return state;
    } catch (error) {
      logger.error('Error verifying consent state:', error);
      throw error;
    }
  }

  // NUEVO: Método para trackear eventos de consentimiento
  async trackConsentEvents(measurementId, events) {
    if (!Array.isArray(events) || events.some(e => !e.event)) {
      throw new Error('Invalid events format');
    }
    try {
      const response = await axios.post(
        `${this.GA_API_URL}/trackConsent`,
        { measurementId, events }
      );
      return response.data;
    } catch (error) {
      logger.error('Error tracking consent events:', error);
      throw error;
    }
  }

  async _generateCMPConfig(domain, config) {
    return {
      domain: domain.domain,
      defaultConsent: {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        personalization_storage: 'denied',
        wait_for_update: 500
      },
      consentTypes: [
        this.CONSENT_MODES.ANALYTICS,
        this.CONSENT_MODES.ADS,
        this.CONSENT_MODES.PERSONALIZATION
      ],
      ...config
    };
  }

  async _setupCMPConfiguration(container, workspace, config, accessToken) {
    try {
      const variables = await this._createCMPVariables(
        container.accountId,
        container.containerId, 
        workspace.workspaceId,
        accessToken
      );

      const triggers = await this._createCMPTriggers(
        container.accountId,
        container.containerId,
        workspace.workspaceId, 
        accessToken
      );

      const tags = await this._createCMPTags(
        container.accountId,
        container.containerId,
        workspace.workspaceId,
        config,
        accessToken
      );

      const version = await this._createVersion(
        container.accountId,
        container.containerId,
        workspace.workspaceId,
        'CMP Configuration',
        accessToken
      );

      return {
        variables,
        triggers,
        tags,
        version
      };

    } catch (error) {
      logger.error('Error setting up CMP configuration:', error);
      throw error;
    }
  }

  async _createCMPVariables(accountId, containerId, workspaceId, accessToken) {
    const variables = [
      {
        name: 'CMP Status',
        type: 'jsm',
        parameter: [{
          key: 'javascript',
          value: `function() {
            return window.CMP && window.CMP.getConsentState 
              ? window.CMP.getConsentState() 
              : undefined;
          }`
        }]
      },
      {
        name: 'Analytics Consent',
        type: 'jsm',
        parameter: [{
          key: 'javascript',
          value: `function() {
            return window.CMP && window.CMP.hasConsent
              ? window.CMP.hasConsent('${this.CONSENT_MODES.ANALYTICS}')
              : false;
          }`
        }]
      }
    ];

    const createdVariables = [];
    for (const variable of variables) {
      const { data } = await axios.post(
        `${this.GTM_API_URL}/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables`,
        variable,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      createdVariables.push(data);
    }

    return createdVariables;
  }

  async _createCMPTriggers(accountId, containerId, workspaceId, accessToken) {
    const triggers = [
      {
        name: 'CMP Load',
        type: 'windowLoaded'
      },
      {
        name: 'CMP Ready',
        type: 'customEvent',
        customEventFilter: [{
          type: 'equals',
          parameter: [
            { key: 'eventName', value: 'cmp.ready' }
          ]
        }]
      },
      {
        name: 'Consent Updated',
        type: 'customEvent',
        customEventFilter: [{
          type: 'equals',
          parameter: [
            { key: 'eventName', value: 'cmp.consent.updated' }
          ]
        }]
      }
    ];

    const createdTriggers = [];
    for (const trigger of triggers) {
      const { data } = await axios.post(
        `${this.GTM_API_URL}/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers`,
        trigger,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      createdTriggers.push(data);
    }

    return createdTriggers;
  }

  async _createCMPTags(accountId, containerId, workspaceId, config, accessToken) {
    const tags = [
      {
        name: 'CMP Initialization',
        type: 'html',
        parameter: [{
          key: 'html',
          value: `
            <script>
              window.dataLayer = window.dataLayer || [];
              window.gtag = window.gtag || function() { 
                dataLayer.push(arguments); 
              };
              
              gtag('consent', 'default', ${JSON.stringify(config.defaultConsent)});
              
              window.CMP = {
                ...${JSON.stringify(config)},
                
                getConsentState() {
                  return this._state || {};
                },
                
                hasConsent(type) {
                  return this.getConsentState()[type] === 'granted';
                },
                
                updateConsent(state) {
                  this._state = state;
                  gtag('consent', 'update', state);
                  dataLayer.push({
                    event: 'cmp.consent.updated',
                    consentState: state
                  });
                }
              };
              
              dataLayer.push({
                event: 'cmp.ready'
              });
            </script>
          `
        }],
        firingTriggerId: ['CMP Load']
      }
    ];

    const createdTags = [];
    for (const tag of tags) {
      const { data } = await axios.post(
        `${this.GTM_API_URL}/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags`,
        tag,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      createdTags.push(data);
    }

    return createdTags;
  }

  _generateAnalyticsTag(settings) {
    if (!settings.trackingId) {
      throw new Error('Missing required parameters');
    }
    return {
      name: 'Google Analytics',
      type: 'ua',
      parameter: [
        {
          key: 'trackingId',
          value: settings.trackingId
        },
        {
          key: 'anonymizeIp',
          value: true
        }
      ],
      consentSettings: {
        consentStatus: 'needed',
        consentType: this.CONSENT_MODES.ANALYTICS
      }
    };
  }

  _generateAdsenseTag(settings) {
    if (!settings.clientId || !settings.slotId) {
      throw new Error('Missing required AdSense parameters (clientId, slotId)');
    }
   
    return {
      name: 'Google AdSense',
      type: 'adsense', 
      parameter: [
        {
          key: 'clientId',
          value: settings.clientId
        },
        {
          key: 'slotId', 
          value: settings.slotId
        },
        {
          key: 'format',
          value: settings.format || 'auto'
        },
        {
          key: 'responsive',
          value: settings.responsive !== false
        },
        {
          key: 'pageLevelAds',
          value: settings.pageLevelAds || false
        }
      ],
      consentSettings: {
        consentStatus: 'needed',
        consentType: this.CONSENT_MODES.ADS
      }
    };
   }
   
   _generateDoubleclickTag(settings) {
    if (!settings.networkCode || !settings.unitPath) {
      throw new Error('Missing required DoubleClick parameters (networkCode, unitPath)');
    }
   
    return {
      name: 'Google DoubleClick',
      type: 'doubleclick',
      parameter: [
        {
          key: 'networkCode',
          value: settings.networkCode  
        },
        {
          key: 'unitPath',
          value: settings.unitPath
        },
        {
          key: 'size',
          value: settings.size || [300, 250]
        },
        {
          key: 'targeting',
          value: settings.targeting || {}
        },
        {
          key: 'collapseEmptyDiv',
          value: settings.collapseEmptyDiv !== false
        }
      ],
      consentSettings: {
        consentStatus: 'needed', 
        consentType: this.CONSENT_MODES.ADS
      }
    };
   }

  _isValidMeasurementId(id) {
    return /^G-[A-Z0-9]+$/.test(id);
  }

  _isValidContainerId(id) {
    return /^GTM-[A-Z0-9]+$/.test(id);
  }

  async _validateCredentials(credentials) {
    try {
      const decodedCredentials = decrypt(credentials);
      const client = new OAuth2Client();
      await client.verifyIdToken({
        idToken: decodedCredentials.token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      return { isValid: true };
    } catch (error) {
      logger.error('Error validating credentials:', error);
      return {
        isValid: false,
        errors: ['Invalid credentials']
      };
    }
  }

  async _verifyPropertyAccess(measurementId, credentials) {
    try {
      const accessToken = await this._getAccessToken(credentials);
      const { data } = await axios.get(
        `${this.GA_ADMIN_API_URL}/accounts/~all/properties/${measurementId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      return {
        isValid: true,
        property: data
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Unable to access property']
      };
    }
  }

  async _getAccessToken(credentials) {
    try {
      const decodedCredentials = decrypt(credentials);
      const { tokens } = await this.oauth2Client.getToken(decodedCredentials.code);
      return tokens.access_token;
    } catch (error) {
      logger.error('Error getting access token:', error);
      throw error;
    }
  }
}

module.exports = new GoogleService();
