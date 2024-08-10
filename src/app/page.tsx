"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import HomeComponent from "./components/HomeComponent";

export default function Home() {
  const { publicKey } = useWallet();

  return (
    <main>
      <div className="flex flex-col items-center justify-between p-10">
        <div className="flex flex-col gap-5 text-center">
          <div>
            <h1 className="text-2xl">Welcome to tik-tac-sol</h1>
          </div>
          <div>
            <h1 className="text-lg">
              {publicKey
                ? "Create new game are join existed ones"
                : "Please connect you wallet to play the game"}
            </h1>
          </div>
          <div>
            <HomeComponent />
          </div>
        </div>
      </div>
    </main>
  );
}
