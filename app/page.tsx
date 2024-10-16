import { getHumeAccessToken } from "@/utils/getHumeAccessToken";
import dynamic from "next/dynamic";
import ClientComponent from '../components/ClientComponent';

const Chat = dynamic(() => import("@/components/Chat"), {
  ssr: false,
});

export default async function Page() {
  const accessToken = await getHumeAccessToken();

  if (!accessToken) {
    throw new Error("Failed to retrieve Hume access token. Please check your API key and client secret.");
  }

  return (
    <div className={"grow flex flex-col"}>
    <ClientComponent accessToken={accessToken} />
    </div>
  );
}
