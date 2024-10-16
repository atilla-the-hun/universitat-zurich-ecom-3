import { NextResponse } from 'next/server';
import { fetchLocalProducts } from '../../../utils/fetchLocalProducts';

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}

async function handleRequest(request: Request) {
  console.log('--- fetchLocalProducts API route started ---');
  let searchTerm: string | null = null;

  if (request.method === 'GET') {
    const { searchParams } = new URL(request.url);
    searchTerm = searchParams.get('searchTerm');
  } else if (request.method === 'POST') {
    try {
      const contentType = request.headers.get('content-type');
      console.log('Content-Type:', contentType);

      if (contentType?.includes('application/json')) {
        const body = await request.json();
        console.log('Received POST body:', JSON.stringify(body, null, 2));
        searchTerm = body.parameters ? JSON.parse(body.parameters).searchTerm : body.searchTerm;
      } else {
        const formData = await request.formData();
        console.log('Received form data:', JSON.stringify(Object.fromEntries(formData), null, 2));
        searchTerm = formData.get('searchTerm') as string;
      }
    } catch (error) {
      console.error('Error parsing request body:', error);
    }
  }

  console.log(`Received search term: ${searchTerm}`);

  if (!searchTerm) {
    console.log('Error: Search term is missing');
    return NextResponse.json({ success: false, error: 'Search term is required' }, { status: 400 });
  }

  try {
    console.log('Calling fetchLocalProducts function...');
    const result = await fetchLocalProducts(JSON.stringify({ searchTerm }));
    console.log('Fetch local products result:', JSON.stringify(result, null, 2));
    
    // Prepare a response message for the voice AI
    let responseMessage = '';
    if (result.success && result.data) {
      responseMessage = `I found ${result.data.products.length} products for "${result.data.searchTerm}". `;
      if (result.data.products.length > 0) {
        responseMessage += `You can explore these products by clicking on the "Explore Product" links below each image.`;
      } else {
        responseMessage += `Unfortunately, no products were found for this search term.`;
      }
    } else if (result.error) {
      responseMessage = `I'm sorry, but there was an error while searching for products: ${result.error}`;
    }

    // Return the result with the prepared response message
    return NextResponse.json({
      ...result,
      responseMessage
    });
  } catch (error) {
    console.error('Error in fetchLocalProducts route:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred in fetchLocalProducts route',
      responseMessage: "I'm sorry, but there was an error while searching for products. Please try again later."
    }, { status: 500 });
  } finally {
    console.log('--- fetchLocalProducts API route finished ---');
  }
}
