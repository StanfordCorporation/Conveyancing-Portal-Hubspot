import hubspotClient from './src/integrations/hubspot/client.js';

async function testPhoneSearch() {
  try {
    console.log('Testing POST search method with phone +61434681036...\n');

    const response = await hubspotClient.post('/crm/v3/objects/contacts/search', {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'phone',
              operator: 'EQ',
              value: '+61434681036'
            }
          ]
        }
      ],
      limit: 10,
      properties: ['firstname','lastname','email','phone','address','contact_type']
    });

    console.log('\n✅ Search successful!\n');
    console.log('Number of results:', response.data.results?.length || 0);
    console.log('\nFull response:\n');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.results && response.data.results.length > 0) {
      console.log('\n\n=== DETAILED CONTACT INFO ===\n');
      response.data.results.forEach((contact, idx) => {
        console.log(`Contact ${idx + 1}:`);
        console.log(`  ID: ${contact.id}`);
        console.log(`  Name: ${contact.properties.firstname} ${contact.properties.lastname}`);
        console.log(`  Email: ${contact.properties.email}`);
        console.log(`  Phone: ${contact.properties.phone}`);
        console.log(`  Contact Type: ${contact.properties.contact_type || '❌ NOT SET'}`);
        console.log(`  Address: ${contact.properties.address}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testPhoneSearch();
