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
  console.log(`[fetchProducts] Original searchTerm: "${args.searchTerm}"`);

  try {
    let apiSearchTerm = args.searchTerm;
    const lowerSearchTerm = args.searchTerm.toLowerCase();

    // Improved detection for "16 pack" or "sixteen pack/count" style searches
    const hasSixteen = lowerSearchTerm.includes("16") || lowerSearchTerm.includes("sixteen");
    const hasPackIndicator = lowerSearchTerm.includes("pack") || lowerSearchTerm.includes("pk") || lowerSearchTerm.includes("count");
    const isSixteenPackSearch = hasSixteen && hasPackIndicator;
    console.log(`[fetchProducts] isSixteenPackSearch: ${isSixteenPackSearch}`);

    if (isSixteenPackSearch) {
      // Attempt to extract base product type, e.g., "AA batteries", "AAA batteries"
      // This is a simplified approach.
      if (lowerSearchTerm.includes("aaa")) {
        apiSearchTerm = "AAA batteries";
      } else if (lowerSearchTerm.includes("aa")) {
        apiSearchTerm = "AA batteries";
      } else {
        apiSearchTerm = "batteries"; // Fallback if AA/AAA not clearly specified
      }
      // More robust extraction could involve removing quantity/pack words:
      // apiSearchTerm = lowerSearchTerm
      //   .replace(/16|sixteen/gi, "")
      //   .replace(/pack|pk|count/gi, "")
      //   .replace(/\s+/g, " ") // Normalize spaces
      //   .trim();
      // if (!apiSearchTerm.toLowerCase().includes("batteries")) {
      //   apiSearchTerm = (apiSearchTerm + " batteries").trim();
      // }
      // if (apiSearchTerm === "batteries") apiSearchTerm = "AA batteries"; // Default if too generic
    }
    console.log(`[fetchProducts] API search term sent to eBay: "${apiSearchTerm}"`);

    const keywords = encodeURIComponent(apiSearchTerm);
    const isSandbox = process.env.EBAY_SANDBOX?.toLowerCase() === 'true';
    const marketplaceId = process.env.EBAY_MARKETPLACE_ID || 'EBAY_US';

    // Get OAuth token
    const accessToken = await getEbayAuthToken();

    const ebayApiUrl = isSandbox
      ? 'https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search'
      : 'https://api.ebay.com/buy/browse/v1/item_summary/search';

    const url = new URL(ebayApiUrl);
    url.searchParams.append('q', keywords);
    url.searchParams.append('limit', '50'); // Increased limit for more results to filter
    // url.searchParams.append('category_ids', '20710'); // Temporarily removed category for batteries to test
    // url.searchParams.append('sort', 'price'); // Temporarily removed sort by price to test
    url.searchParams.append('safeSearch', 'false'); // Added safeSearch=false
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
    console.log(`[fetchProducts] Raw items from eBay API for "${apiSearchTerm}": ${responseJson.itemSummaries?.length || 0}`);

    // Map the new API response to your ProductInfo structure
    let mappedProducts: ProductInfo[] = responseJson.itemSummaries?.map((item: any) => ({
      link: item.itemWebUrl || '',
      imageUrl: item.image?.imageUrl || '', // Ensure image and imageUrl exist
      price: item.price?.value ? `${item.price.currency} ${item.price.value}` : 'N/A',
      description: item.title || 'No description available'
    })) || [];
    console.log(`[fetchProducts] Mapped products before any local filtering: ${mappedProducts.length}`);
    if (mappedProducts.length > 0) {
      console.log('[fetchProducts] Titles of mapped products (before local filter):');
      mappedProducts.forEach((product, index) => {
        console.log(`  ${index + 1}: ${product.description}`);
      });
    }

    // If it was a "16 pack" style search, filter mappedProducts by title content
    if (isSixteenPackSearch) {
      mappedProducts = mappedProducts.filter(product => {
        const titleLower = product.description.toLowerCase();
        // Check for "16" or "sixteen" and ("pack" or "pk" or "count")
        const titleHasSixteen = titleLower.includes("16") || titleLower.includes("sixteen");
        const titleHasPackIndicator = titleLower.includes("pack") || titleLower.includes("pk") || titleLower.includes("count");
        return titleHasSixteen && titleHasPackIndicator;
      });
      console.log(`[fetchProducts] Mapped products after 'isSixteenPackSearch' filter: ${mappedProducts.length}`);
    }

    // Filter out products that might be missing essential info after mapping
    const validProducts = mappedProducts.filter(product => product.link && product.imageUrl && product.description);
    console.log(`[fetchProducts] Final valid products count: ${validProducts.length}`);

    return {
      success: true,
      data: {
        searchTerm: args.searchTerm, // Return the original search term
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
