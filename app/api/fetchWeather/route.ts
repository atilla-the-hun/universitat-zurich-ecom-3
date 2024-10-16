import { NextResponse } from 'next/server';
import { fetchWeather } from '@/utils/fetchWeather';
import { fetchProducts } from '@/utils/fetchProducts'; // Import the fetchProducts function

export async function POST(request: Request) {
  const { url } = request;
  const { parameters } = await request.json();

  try {
    if (url.endsWith('/api/fetchWeather')) {
      const currentWeather = await fetchWeather(parameters);
      return NextResponse.json({ success: true, data: currentWeather });
    } else if (url.endsWith('/api/fetchProducts')) {
      const productLinks = await fetchProducts(JSON.stringify(parameters)); // Ensure parameters are stringified
      return NextResponse.json({ success: true, data: productLinks });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid API endpoint' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json({ success: false, error: 'API tool error' }, { status: 500 });
  }
}