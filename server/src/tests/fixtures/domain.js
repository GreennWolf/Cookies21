// tests/fixtures/domains.js
const domainFixtures = {
    validDomain: {
      domain: 'test.com',
      settings: {
        scanning: {
          enabled: true,
          interval: 24
        }
      }
    },
    inactiveDomain: {
      domain: 'inactive.com',
      status: 'inactive',
      settings: {
        scanning: {
          enabled: false
        }
      }
    }
  };
  
  module.exports = domainFixtures;