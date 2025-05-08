import "server-only";

interface ProductInfo {
  imageUrl: string;
  linkText: string;
  productUrl: string;
  price: string; // Added price field
}

interface ProductSearchResult {
  success: boolean;
  data?: {
    searchTerm: string;
    products: ProductInfo[];
  };
  error?: string;
}

/**
 * Function which consumes the eBay Finding API to get products matching a specified search term
 *
 * @param parameters object which includes the searchTerm
 * @returns a ProductSearchResult object
 */
export const fetchProducts = async (parameters: string): Promise<ProductSearchResult> => {
  const args = JSON.parse(parameters) as { searchTerm: string };

  const keywords = encodeURIComponent(args.searchTerm);
  const ebayAppId = process.env.EBAY_APP_ID;
  const isSandbox = process.env.EBAY_SANDBOX?.toLowerCase() === 'true';

  if (!ebayAppId) {
    return {
      success: false,
      error: 'EBAY_APP_ID is not set in the environment variables'
    };
  }

  const ebayApiUrl = isSandbox
    ? `https://svcs.sandbox.ebay.com/services/search/FindingService/v1`
    : `https://svcs.ebay.com/services/search/FindingService/v1`;

  const fullUrl = `${ebayApiUrl}` +
    `?OPERATION-NAME=findItemsByKeywords` +
    `&SERVICE-VERSION=1.0.0` +
    `&SECURITY-APPNAME=${ebayAppId}` +
    `&RESPONSE-DATA-FORMAT=JSON` +
    `&REST-PAYLOAD` +
    `&keywords=${keywords}`;

  try {
    const response = await fetch(fullUrl, { method: 'GET' });
    
    if (!response.ok) {
      throw new Error(`API call failed with status code ${response.status}`);
    }

    const responseJson = await response.json();
    
    // Check if items are present in the response
    const items = responseJson.findItemsByKeywordsResponse?.[0]?.searchResult?.[0]?.item || [];

    // Extract product information
    const products: ProductInfo[] = items.map((item: any) => ({
      imageUrl: item.galleryURL?.[0] || '',
      linkText: 'Explore Product',
      productUrl: item.viewItemURL?.[0] || '',
      price: item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 'N/A' // Extract price
    })).filter((product: ProductInfo) => product.imageUrl && product.productUrl);

    return {
      success: true,
      data: {
        searchTerm: args.searchTerm,
        products: products
      }
    };
  } catch (error) {
    console.error('Error in fetchProducts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
};
