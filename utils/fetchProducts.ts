import "server-only";
import { getEbayAuthToken } from './ebayAuth';

// Matches the structure in ebay_search_schema.json for productLinks items
interface ProductInfo {
  link: string;
  imageUrl: string;
  price: string;
  description: string;
}

interface ProductSearchResult {
  success: boolean;
  data?: {
    searchTerm: string;
    products: ProductInfo[]; // This will be 'productLinks' in the final JSON output for Hume
  };
  error?: string;
}

/**
 * Function which consumes the eBay Buy API to get products matching a specified search term
 *
 * @param parameters object which includes the searchTerm
 * @returns a ProductSearchResult object
 */
export const fetchProducts = async (parameters: string): Promise<ProductSearchResult> => {
  const args = JSON.parse(parameters) as { searchTerm: string };

  try {
    const keywords = encodeURIComponent(args.searchTerm);
    const isSandbox = process.env.EBAY_SANDBOX?.toLowerCase() === 'true';
    const marketplaceId = process.env.EBAY_MARKETPLACE_ID || 'EBAY_US';

    // Get OAuth token
    const accessToken = await getEbayAuthToken();

    const ebayApiUrl = isSandbox
      ? 'https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search'
      : 'https://api.ebay.com/buy/browse/v1/item_summary/search';

    const url = new URL(ebayApiUrl);
    url.searchParams.append('q', keywords);
    url.searchParams.append('limit', '20'); // You can adjust the limit
    // Example filter: filter for new or used items. Adjust as needed.
    // url.searchParams.append('filter', 'conditions:{NEW|USED}'); 

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': marketplaceId,
        'Content-Type': 'application/json'
        // 'X-EBAY-C-ENDUSERCTX': 'affiliateCampaignId=<YOUR_CAMPAIGN_ID>,affiliateReferenceId=<YOUR_REFERENCE_ID>' // Optional for tracking
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`eBay API call failed with status ${response.status}: ${errorText}`);
      throw new Error(`API call failed: ${response.status} - ${errorText}`);
    }

    const responseJson = await response.json();

    // Map the new API response to your ProductInfo structure
    const products: ProductInfo[] = responseJson.itemSummaries?.map((item: any) => ({
      link: item.itemWebUrl || '',
      imageUrl: item.image?.imageUrl || '', // Ensure image and imageUrl exist
      price: item.price?.value ? `${item.price.currency} ${item.price.value}` : 'N/A',
      description: item.title || 'No description available'
    })) || [];

    // Filter out products that might be missing essential info after mapping
    const validProducts = products.filter(product => product.link && product.imageUrl && product.description);

    return {
      success: true,
      data: {
        searchTerm: args.searchTerm,
        products: validProducts // This array will be used as 'productLinks'
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
