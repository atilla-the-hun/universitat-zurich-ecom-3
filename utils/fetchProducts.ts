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
// Helper for number normalization
const spelledOutNumbers: { [key: string]: string } = {
  one: "1", two: "2", three: "3", four: "4", five: "5",
  six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
  eleven: "11", twelve: "12", thirteen: "13", fourteen: "14", fifteen: "15",
  sixteen: "16", seventeen: "17", eighteen: "18", nineteen: "19", twenty: "20",
  thirty: "30", forty: "40", fifty: "50", hundred: "100"
  // Consider adding more or using a library for more comprehensive parsing
};

function normalizeSearchTermNumbers(term: string): string {
  let normalizedTerm = term.toLowerCase();
  for (const word in spelledOutNumbers) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    normalizedTerm = normalizedTerm.replace(regex, spelledOutNumbers[word]);
  }
  return normalizedTerm;
}

// Common pack indicators for detection and filtering
const commonPackIndicatorsList = ["pack", "pk", "pck", "count", "ct", "cnt", "pcs", "piece", "pc", "unit", "un", "x"];
// Regex to detect a number followed by a pack indicator.
// It captures the number (group 1) and the matched pack phrase (group 0 for full match).
const packDetectRegex = new RegExp(`(\\d+)\\s*(?:${commonPackIndicatorsList.join('|')})(?:s|es)?\\b`, "i");

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export const fetchProducts = async (parameters: string): Promise<ProductSearchResult> => {
  const args = JSON.parse(parameters) as { searchTerm: string };
  console.log(`[fetchProducts] Original searchTerm: "${args.searchTerm}"`);

  try {
    let apiSearchTerm = args.searchTerm; // Default API search term
    const originalLowerSearchTerm = args.searchTerm.toLowerCase();
    const normalizedNumericSearchTerm = normalizeSearchTermNumbers(originalLowerSearchTerm);
    console.log(`[fetchProducts] Normalized numeric search term: "${normalizedNumericSearchTerm}"`);

    let detectedQuantity: string | null = null;
    let isPackSizeSearch = false;

    const packMatch = normalizedNumericSearchTerm.match(packDetectRegex);

    if (packMatch) {
      detectedQuantity = packMatch[1]; // The captured number, e.g., "16"
      const matchedPackPhrase = packMatch[0]; // The full matched phrase, e.g., "16 pack", "24pcs"
      isPackSizeSearch = true;
      console.log(`[fetchProducts] Detected pack search: Quantity="${detectedQuantity}", MatchedPhrase="${matchedPackPhrase}"`);

      // Attempt to extract base product name by removing the matched phrase
      let baseProductApiSearchTerm = normalizedNumericSearchTerm
        .replace(new RegExp(escapeRegExp(matchedPackPhrase), 'i'), "")
        .trim();
      baseProductApiSearchTerm = baseProductApiSearchTerm.replace(/\s+/g, " ").trim(); // Clean up multiple spaces

      if (baseProductApiSearchTerm) {
        apiSearchTerm = baseProductApiSearchTerm;
        // If base term is just "batteries", and original had AA/AAA, refine it
        if (apiSearchTerm === "batteries" && (originalLowerSearchTerm.includes("aa") || originalLowerSearchTerm.includes("aaa"))) {
          if (originalLowerSearchTerm.includes("aaa")) {
            apiSearchTerm = "AAA batteries";
          } else if (originalLowerSearchTerm.includes("aa")) {
            apiSearchTerm = "AA batteries";
          }
        }
         console.log(`[fetchProducts] Extracted base product for API: "${apiSearchTerm}"`);
      } else {
        // If stripping pack phrase results in empty base product (e.g., user searched "16 pack")
        console.log(`[fetchProducts] Base product extraction resulted in empty string. Reverting to original search term and disabling pack-specific filtering for this query.`);
        apiSearchTerm = args.searchTerm; // Use original search term
        isPackSizeSearch = false; // Disable special filtering
        detectedQuantity = null;
      }
    } else {
      console.log(`[fetchProducts] No specific pack size pattern detected. API search term will be based on original.`);
      // If no pack size detected, apiSearchTerm remains args.searchTerm or any other general modifications
      // For example, if you still want to simplify "AA batteries by Energizer" to "AA batteries Energizer"
      // that logic would go here or be part of a general pre-processing step.
      // For now, it defaults to args.searchTerm if no pack is found.
    }
    
    console.log(`[fetchProducts] Final API search term sent to eBay: "${apiSearchTerm}"`);
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
      console.log('[fetchProducts] Titles of mapped products (before local pack/quantity filter):');
      mappedProducts.forEach((product, index) => {
        console.log(`  ${index + 1}: ${product.description}`);
      });
    }

    // Generalized local filtering if a pack size search was intended
    if (isPackSizeSearch && detectedQuantity) {
      const numericQtyStr = detectedQuantity; // e.g., "16"
      const quantityRegex = new RegExp(`\\b${numericQtyStr}\\b`); // Match whole word for quantity

      mappedProducts = mappedProducts.filter(product => {
        const titleLower = product.description.toLowerCase();
        
        // Check 1: Title must contain the numeric quantity (e.g., "16" as a whole word)
        const titleHasNumericQuantity = quantityRegex.test(titleLower);

        // Check 2: Title must contain at least one of the common pack indicators
        const titleHasAnyPackIndicator = commonPackIndicatorsList.some(indicator => titleLower.includes(indicator));
        
        return titleHasNumericQuantity && titleHasAnyPackIndicator;
      });
      console.log(`[fetchProducts] Mapped products after generalized pack size filter (qty: ${numericQtyStr}): ${mappedProducts.length}`);
    }

    // Filter out products that might be missing essential info after mapping (e.g. no link, image, or desc)
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
