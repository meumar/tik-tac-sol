import type { NextPage } from "next";
import { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import * as anchor from "@project-serum/anchor";

import { PROGRAM_ID } from "../../../constants";
import { useProgram } from "./WalletContextProvider";

const HomeComponent: NextPage = () => {
  const [gameWalletInitiated, setGameWalletInitiated] =
    useState<boolean>(false);
  const [gamesLoading, setGamesLoading] = useState<boolean>(false);

  const { connection } = useConnection();

  const { publicKey }: any = useWallet();
  const program = useProgram();

  useEffect(() => {
    checkGameWallet();
  }, []);

  const checkGameWallet = async () => {
    const [gameWallet, bump_token] = PublicKey.findProgramAddressSync(
      [Buffer.from("wallet")],
      new PublicKey(PROGRAM_ID)
    );
    let accountDetails = await connection.getAccountInfo(gameWallet);
    if (accountDetails == null) {
      setGameWalletInitiated(false);
    }
  };
  const createGameWallet = async () => {
    try {
      setGamesLoading(true);
      const [gameWallet, bump_token] = PublicKey.findProgramAddressSync(
        [Buffer.from("wallet")],
        new PublicKey(PROGRAM_ID)
      );
      const sign = await program.methods
        .createGameWallet()
        .accounts({
          gameWallet: gameWallet,
          signer: publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([])
        .rpc();
      setGamesLoading(false);
      checkGameWallet();
    } catch (e) {
      setGamesLoading(false);
      console.log("createGameWallet", e);
    }
  };

  return (
    <div>
      {gameWalletInitiated && (
        <div>
          <h1 className="text-3xl">Game wallet not initiated!</h1>
          <button
            className="background-transparent font-bold px-6 py-2 text-sm outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
            type="button"
            onClick={createGameWallet}
          >
            Create wallet for game
          </button>
        </div>
      )}
    </div>
  );
};
export default HomeComponent;
