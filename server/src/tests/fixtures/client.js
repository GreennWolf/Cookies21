// tests/fixtures/clients.js
const clientFixtures = {
    validClient: {
      name: 'Test Client',
      email: 'client@test.com',
      password: 'Password123!',
      company: {
        name: 'Test Company',
        website: 'https://test.com'
      }
    },
    adminClient: {
      name: 'Admin Client',
      email: 'admin@test.com',
      password: 'Admin123!',
      role: 'admin'
    }
  };
  
  module.exports = clientFixtures;