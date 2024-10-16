import "server-only";
import { readFileSync } from 'fs';
import { join } from 'path';

interface ProductInfo {
  linkText: string;
  productUrl: string;
  price: string;
  imageUrl: string;
  description: string;
  flavor: string;
  ingredients: string;
  weight: string;
  quantity: number;
  brand: string;
  type: string; // Added type property
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
 * Function which reads product details from a local JSON file
 *
 * @param parameters object which includes the searchTerm
 * @returns a ProductSearchResult object
 */
export const fetchLocalProducts = async (parameters: string): Promise<ProductSearchResult> => {
  const args = JSON.parse(parameters) as { searchTerm: string };

  try {
    // Read the local JSON file
    const filePath = join(process.cwd(), 'products.json');
    const fileContent = readFileSync(filePath, 'utf-8');
    const productsData = JSON.parse(fileContent);

    // Extract products based on the search term
    const searchTerm = args.searchTerm.toLowerCase();
    const products: ProductInfo[] = [];

    for (const category in productsData.products) {
      if (productsData.products.hasOwnProperty(category)) {
        const categorySingular = category.slice(0, -1); // Remove the last character to get the singular form
        console.log(`Comparing category: ${category.toLowerCase()} with search term: ${searchTerm}`);
        console.log(`Comparing singular category: ${categorySingular.toLowerCase()} with search term: ${searchTerm}`);
        if (category.toLowerCase().includes(searchTerm) || categorySingular.toLowerCase().includes(searchTerm)) {
          productsData.products[category].forEach((product: any) => {
            products.push({
              linkText: 'Explore Product',
              productUrl: product.link,
              price: `${product.price} ${product.currency}`,
              imageUrl: product.imageUrl || '', // Assuming imageUrl might not be present
              description: product.description || '', // Assuming description might not be present
              flavor: product.flavor || '', // Assuming flavor might not be present
              ingredients: product.ingredients ? product.ingredients.replace(/;/g, ', ') : '', // Replace semicolons with commas for better readability
              weight: product.weight || '', // Assuming weight might not be present
              quantity: product.quantity || 0, // Assuming quantity might not be present
              brand: product.brand || '', // Assuming brand might not be present
              type: product.type || '' // Assuming type might not be present
            });
          });
        }
      }
    }

    // Check if the search term is a substring of any product's description, flavor, or type
    for (const category in productsData.products) {
      if (productsData.products.hasOwnProperty(category)) {
        productsData.products[category].forEach((product: any) => {
          if (product.description.toLowerCase().includes(searchTerm) ||
              product.flavor.toLowerCase().includes(searchTerm) ||
              product.type.toLowerCase().includes(searchTerm)) {
            products.push({
              linkText: 'Explore Product',
              productUrl: product.link,
              price: `${product.price} ${product.currency}`,
              imageUrl: product.imageUrl || '', // Assuming imageUrl might not be present
              description: product.description || '', // Assuming description might not be present
              flavor: product.flavor || '', // Assuming flavor might not be present
              ingredients: product.ingredients ? product.ingredients.replace(/;/g, ', ') : '', // Replace semicolons with commas for better readability
              weight: product.weight || '', // Assuming weight might not be present
              quantity: product.quantity || 0, // Assuming quantity might not be present
              brand: product.brand || '', // Assuming brand might not be present
              type: product.type || '' // Assuming type might not be present
            });
          }
        });
      }
    }

    return {
      success: true,
      data: {
        searchTerm: args.searchTerm,
        products: products
      }
    };
  } catch (error) {
    console.error('Error in fetchLocalProducts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
};
