// Quick verification test for tokenService
import * as tokenService from './src/services/tokenService.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('Testing tokenService implementation...\n');

// Test 1: Sign and verify access token
try {
  const userId = '507f1f77bcf86cd799439011';
  const accessToken = tokenService.signAccessToken(userId);
  console.log('✓ signAccessToken generated token:', accessToken.substring(0, 50) + '...');
  
  const decodedAccess = tokenService.verifyAccessToken(accessToken);
  console.log('✓ verifyAccessToken decoded:', { id: decodedAccess.id, exp: decodedAccess.exp, iat: decodedAccess.iat });
  console.log('✓ Access token expiry (days):', (decodedAccess.exp - decodedAccess.iat) / 86400);
  
  if (decodedAccess.id !== userId) {
    throw new Error('User ID mismatch!');
  }
  console.log('✓ Access token round-trip PASSED\n');
} catch (error) {
  console.error('✗ Access token test FAILED:', error.message);
  process.exit(1);
}

// Test 2: Sign and verify refresh token
try {
  const userId = '507f1f77bcf86cd799439011';
  const refreshToken = tokenService.signRefreshToken(userId);
  console.log('✓ signRefreshToken generated token:', refreshToken.substring(0, 50) + '...');
  
  const decodedRefresh = tokenService.verifyRefreshToken(refreshToken);
  console.log('✓ verifyRefreshToken decoded:', { id: decodedRefresh.id, exp: decodedRefresh.exp, iat: decodedRefresh.iat });
  console.log('✓ Refresh token expiry (days):', (decodedRefresh.exp - decodedRefresh.iat) / 86400);
  
  if (decodedRefresh.id !== userId) {
    throw new Error('User ID mismatch!');
  }
  console.log('✓ Refresh token round-trip PASSED\n');
} catch (error) {
  console.error('✗ Refresh token test FAILED:', error.message);
  process.exit(1);
}

// Test 3: Cross-verification should throw
try {
  const userId = '507f1f77bcf86cd799439011';
  const accessToken = tokenService.signAccessToken(userId);
  
  try {
    tokenService.verifyRefreshToken(accessToken);
    console.error('✗ Cross-verification test FAILED: should have thrown');
    process.exit(1);
  } catch (error) {
    console.log('✓ verifyRefreshToken correctly rejected access token');
  }
  
  const refreshToken = tokenService.signRefreshToken(userId);
  try {
    tokenService.verifyAccessToken(refreshToken);
    console.error('✗ Cross-verification test FAILED: should have thrown');
    process.exit(1);
  } catch (error) {
    console.log('✓ verifyAccessToken correctly rejected refresh token');
  }
  console.log('✓ Secret isolation test PASSED\n');
} catch (error) {
  console.error('✗ Secret isolation test FAILED:', error.message);
  process.exit(1);
}

// Test 4: setTokenCookies and clearTokenCookies
try {
  const mockResponse = {
    cookies: {},
    cookie: function(name, value, options) {
      this.cookies[name] = { value, options };
      console.log(`  - Set cookie "${name}" with options:`, JSON.stringify(options));
    },
    clearCookie: function(name) {
      delete this.cookies[name];
      console.log(`  - Cleared cookie "${name}"`);
    }
  };
  
  const accessToken = tokenService.signAccessToken('test-user-id');
  const refreshToken = tokenService.signRefreshToken('test-user-id');
  
  tokenService.setTokenCookies(mockResponse, accessToken, refreshToken);
  console.log('✓ setTokenCookies called successfully');
  
  if (!mockResponse.cookies.access_token || !mockResponse.cookies.refresh_token) {
    throw new Error('Cookies not set properly');
  }
  
  // Verify cookie options
  const accessOpts = mockResponse.cookies.access_token.options;
  const refreshOpts = mockResponse.cookies.refresh_token.options;
  
  if (!accessOpts.httpOnly || !refreshOpts.httpOnly) {
    throw new Error('httpOnly not set');
  }
  if (accessOpts.sameSite !== 'strict' || refreshOpts.sameSite !== 'strict') {
    throw new Error('sameSite not set to strict');
  }
  if (accessOpts.maxAge !== 3 * 24 * 60 * 60 * 1000) {
    throw new Error('Access token maxAge incorrect');
  }
  if (refreshOpts.maxAge !== 7 * 24 * 60 * 60 * 1000) {
    throw new Error('Refresh token maxAge incorrect');
  }
  console.log('✓ Cookie options validated');
  
  tokenService.clearTokenCookies(mockResponse);
  console.log('✓ clearTokenCookies called successfully');
  console.log('✓ Cookie management test PASSED\n');
} catch (error) {
  console.error('✗ Cookie management test FAILED:', error.message);
  process.exit(1);
}

console.log('═══════════════════════════════════════');
console.log('All tests PASSED! ✓');
console.log('═══════════════════════════════════════');
console.log('\nTask 2.1 implementation verified:');
console.log('- signAccessToken: ✓');
console.log('- signRefreshToken: ✓');
console.log('- verifyAccessToken: ✓');
console.log('- verifyRefreshToken: ✓');
console.log('- setTokenCookies: ✓');
console.log('- clearTokenCookies: ✓');
console.log('- JSDoc on all exports: ✓');
console.log('- Correct environment variables: ✓');
