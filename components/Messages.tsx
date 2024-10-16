"use client";
import { cn } from "utils";
import { useVoice } from "@humeai/voice-react";
import Expressions from "./Expressions";
import { motion } from "framer-motion";
import { ComponentRef, forwardRef } from "react";
import { EmotionScores as HumeEmotionScores } from "hume/api/resources/empathicVoice/types/EmotionScores";
import Image from 'next/image';

type EmotionScores = HumeEmotionScores & Record<string, number>;

interface ProductInfo {
  imageUrl: string;
  linkText: string;
  productUrl: string;
  price: string;
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

const Messages = forwardRef<
  ComponentRef<typeof motion.div>,
  Record<never, never>
>(function Messages(_, ref) {
  const { messages } = useVoice();

  const renderProductImages = (content: string) => {
    try {
      const result: ProductSearchResult = JSON.parse(content);
      if (result.success && result.data) {
        return (
          <div className="mt-2">
            <h4 className="font-semibold">Products for "{result.data.searchTerm}":</h4>
            {result.data.products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                {result.data.products.map((product, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <Image
                      src={product.imageUrl}
                      alt={`Product ${index + 1}`}
                      width={150}
                      height={150}
                      className="w-full h-auto object-cover rounded-md mb-2"
                    />
                    <a
                      href={product.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline cursor-pointer"
                    >
                      {product.linkText}
                    </a>
                    <div className="mt-2">
                      <p><strong>Price:</strong> {product.price}</p>
                      <p><strong>Description:</strong> {product.description}</p>
                      <p><strong>Flavor:</strong> {product.flavor}</p>
                      <p><strong>Ingredients:</strong> {product.ingredients}</p>
                      <p><strong>Weight:</strong> {product.weight}</p>
                      <p><strong>Quantity:</strong> {product.quantity}</p>
                      <p><strong>Brand:</strong> {product.brand}</p>
                      <p><strong>Type:</strong> {product.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No products found for this search term.</p>
            )}
          </div>
        );
      } else if (result.error) {
        return (
          <div className="mt-2 text-red-500">
            Error: {result.error}
          </div>
        );
      }
    } catch (error) {
      // console.error('Error parsing product search result:', error);
    }
    return null;
  }

  return (
    <motion.div
      layoutScroll
      className={"grow rounded-md overflow-auto p-4"}
      ref={ref}
    >
      <motion.div
        className={"max-w-2xl mx-auto w-full flex flex-col gap-4 pb-24"}
      >
        {messages.map((msg, index) => {
          if (
            msg.type === "user_message" ||
            msg.type === "assistant_message"
          ) {
            return (
              <motion.div
                key={msg.type + index}
                className={cn(
                  "w-[80%]",
                  "bg-card",
                  // "border border-border rounded", // Comment out these classes
                  msg.type === "user_message" ? "ml-auto" : ""
                )}
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: 0,
                }}
              >
                {/* Remove user and assistant blocks */}
                {/* <div
                  className={cn(
                    "text-xs capitalize font-medium leading-none opacity-50 pt-4 px-3"
                  )}
                >
                  {msg.message.role}
                </div>
                <div className={"pb-3 px-3"}>
                  {msg.message.content}
                  {msg.message.content && renderProductImages(msg.message.content)}
                </div> */}
                {/* Remove expressions */}
                {/* <Expressions values={(msg.models.prosody?.scores as EmotionScores) || {}} /> */}
              </motion.div>
            );
          }

          return null;
        })}
      </motion.div>
    </motion.div>
  );
});

export default Messages;

