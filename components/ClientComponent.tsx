'use client';
import {
  VoiceProvider,
  ToolCallHandler
} from '@humeai/voice-react';
import Messages from './Controls';
import Controls from './Messages';
import StartCall from "./StartCall";

const handleToolCall: ToolCallHandler = async (
  message,
  send,
) => {
  if (message.name === 'get_current_weather') {
    try {
      const response = await fetch('/api/fetchWeather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parameters: message.parameters }),
      });

      const result = await response.json();

      if (result.success) {
        return send.success(result.data);
      } else {
        return send.error(result.error);
      }
    } catch (error) {
      return send.error({
        error: 'Weather tool error',
        code: 'weather_tool_error',
        level: 'warn',
        content: 'There was an error with the weather tool',
      });
    }
  }

  if (message.name === 'fetch_products') {
    try {
      const response = await fetch('/api/fetchProducts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parameters: message.parameters }),
      });

      const result = await response.json();

      if (result.success) {
        return send.success(result.data);
      } else {
        return send.error(result.error);
      }
    } catch (error) {
      return send.error({
        error: 'Product fetch error',
        code: 'product_fetch_error',
        level: 'warn',
        content: 'There was an error fetching products',
      });
    }
  }

  if (message.name === 'fetch_local_products') {
    try {
      const response = await fetch('/api/fetchLocalProducts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parameters: message.parameters }),
      });

      const result = await response.json();

      if (result.success) {
        return send.success(result.data);
      } else {
        return send.error(result.error);
      }
    } catch (error) {
      return send.error({
        error: 'Local product fetch error',
        code: 'local_product_fetch_error',
        level: 'warn',
        content: 'There was an error fetching local products',
      });
    }
  }

  return send.error({
    error: 'Tool not found',
    code: 'tool_not_found',
    level: 'warn',
    content: 'The tool you requested was not found',
  });
};

export default function ClientComponent({ accessToken }: { accessToken: string }) {
  return (
    <VoiceProvider
      configId={process.env.NEXT_PUBLIC_HUME_CONFIG_ID}
      auth={{ type: 'accessToken', value: accessToken }}
      onToolCall={handleToolCall}
    >
      <Messages />
      <Controls />
      <StartCall />
    </VoiceProvider>
  );
}