// getHumeAccessToken.ts
import 'server-only';
import { fetchAccessToken } from "@humeai/voice";

export const getHumeAccessToken = async () => {
  try {
    const apiKey = process.env.HUME_API_KEY;
    const secretKey = process.env.HUME_SECRET_KEY;

    if (!apiKey || !secretKey) {
      throw new Error("HUME_API_KEY or HUME_SECRET_KEY is not set in the environment variables.");
    }

    const accessToken = await fetchAccessToken({
      apiKey: apiKey,
      clientSecret: secretKey, // Use the correct property name
    });

    if (!accessToken) {
      throw new Error("Failed to fetch access token from Hume AI.");
    }

    return accessToken;
  } catch (error) {
    console.error("Error fetching Hume access token:", error);
    return null;
  }
}