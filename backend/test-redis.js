/**
 * Quick test to verify Redis connection
 */

import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import { getRedisClient } from './src/services/storage/token-storage.js';

async function testRedis() {
  try {
    console.log('🧪 Testing Redis connection...');
    console.log(`📍 KV_URL: ${process.env.KV_URL ? '✅ Found' : '❌ Not found'}`);

    // Get Redis client (will connect automatically)
    const redis = await getRedisClient();

    // Test 1: Set a value
    console.log('\n1️⃣ Setting test value...');
    await redis.set('test:hello', JSON.stringify({ message: 'Hello from Redis!', timestamp: Date.now() }));
    console.log('✅ Value set successfully');

    // Test 2: Get the value
    console.log('\n2️⃣ Getting test value...');
    const valueStr = await redis.get('test:hello');
    const value = JSON.parse(valueStr);
    console.log('✅ Value retrieved:', value);

    // Test 3: Store mock Smokeball tokens
    console.log('\n3️⃣ Storing mock Smokeball tokens...');
    const mockTokens = {
      access_token: 'mock_access_token_12345',
      refresh_token: 'mock_refresh_token_67890',
      expires_at: Date.now() + (3600 * 1000), // 1 hour from now
    };
    await redis.set('smokeball:tokens', JSON.stringify(mockTokens));
    console.log('✅ Tokens stored successfully');

    // Test 4: Retrieve tokens
    console.log('\n4️⃣ Retrieving mock tokens...');
    const tokensStr = await redis.get('smokeball:tokens');
    const tokens = JSON.parse(tokensStr);
    console.log('✅ Tokens retrieved:', tokens);

    // Test 5: Delete test values
    console.log('\n5️⃣ Cleaning up test data...');
    await redis.del('test:hello');
    await redis.del('smokeball:tokens');
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed! Redis is working correctly.');

    // Close connection
    await redis.quit();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Redis connection test failed:');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure KV_URL is set in your .env file');
    console.error('2. Check that the Redis URL is correct');
    console.error('3. Verify the Redis database is running and accessible');
    process.exit(1);
  }
}

testRedis();
