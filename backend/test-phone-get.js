import hubspotClient from './src/integrations/hubspot/client.js';

async function testPhoneGetSearch() {
  try {
    console.log('Testing GET search method with phone +61434681036...\n');

    const response = await hubspotClient.get('/crm/v3/objects/contacts/+61434681036', {
      params: {
        properties: 'firstname,lastname,email,phone,address,contact_type',
        idProperty: 'phone'
      }
    });

    console.log('\n✅ Search successful!\n');
    console.log('Full response:\n');
    console.log(JSON.stringify(response.data, null, 2));

    console.log('\n\n=== DETAILED CONTACT INFO ===\n');
    console.log(`ID: ${response.data.id}`);
    console.log(`Name: ${response.data.properties.firstname} ${response.data.properties.lastname}`);
    console.log(`Email: ${response.data.properties.email}`);
    console.log(`Phone: ${response.data.properties.phone}`);
    console.log(`Contact Type: ${response.data.properties.contact_type || '❌ NOT SET'}`);
    console.log(`Address: ${response.data.properties.address}`);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testPhoneGetSearch();
