import "server-only";

interface EbayAuthToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

let tokenCache: {
  token: string;
  expiry: number;
} | null = null;

/**
 * Gets an OAuth token for eBay API
 */
export const getEbayAuthToken = async (): Promise<string> => {
  // Check if we have a valid cached token
  if (tokenCache && tokenCache.expiry > Date.now()) {
    return tokenCache.token;
  }

  const isSandbox = process.env.EBAY_SANDBOX?.toLowerCase() === 'true';
  const ebayAppId = process.env.EBAY_APP_ID;
  const ebayClientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!ebayAppId || !ebayClientSecret) {
    throw new Error('EBAY_APP_ID or EBAY_CLIENT_SECRET not set in environment variables');
  }

  const authUrl = isSandbox
    ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
    : 'https://api.ebay.com/identity/v1/oauth2/token';

  const credentials = Buffer.from(`${ebayAppId}:${ebayClientSecret}`).toString('base64');

  try {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope'
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('eBay auth error response body:', errorBody);
      throw new Error(`Authentication failed with status ${response.status}`);
    }

    const tokenData: EbayAuthToken = await response.json();
    
    // Cache the token with 5 minute buffer before expiry
    tokenCache = {
      token: tokenData.access_token,
      expiry: Date.now() + (tokenData.expires_in * 1000) - 300000 // 5 minutes buffer
    };

    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting eBay auth token:', error);
    throw error;
  }
};
