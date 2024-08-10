"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import { useProgram, getWalletAta } from "./WalletContextProvider";
// import idl from "../../../idl.json";

import "./GameBoard.css";
import { useConnection } from "@solana/wallet-adapter-react";

import { PROGRAM_ID, TOKEN_ID, AMOUNT } from "../../../constants";
import { PublicKey } from "@solana/web3.js";
import LoadingComponent from "./Loading";

export default function CreateGame() {
  const router = useRouter();

  const [token, setToken] = useState<string>(TOKEN_ID);
  const [amount, setAmount] = useState<number>(AMOUNT);
  const [loading, setLoading] = useState(false);
  const [gameTokenCheck, setGameTokenCheck] = useState(false);
  const [error, setError] = useState<string>("");

  const { publicKey }: any = useWallet();
  const { connection } = useConnection();
  const program = useProgram();
  //   const program = new anchor.Program(idl as anchor.Idl, PROGRAM_ID, provider);
  const [gameWallet, wallet_bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("wallet")],
    new PublicKey(PROGRAM_ID)
  );

  useEffect(() => {
    if (!publicKey) {
      setError("Please connect your wallet!");
    }
  }, []);

  const createTokenAccountForGame = async () => {
    try {
      setLoading(true);
      const [getSelectedProgramTokenDetails, token_bump] =
        PublicKey.findProgramAddressSync(
          [new PublicKey(token).toBuffer()],
          new PublicKey(PROGRAM_ID)
        );
      const sign = await program.methods
        .createGameTokenAccount()
        .accounts({
          gameTokenAccount: getSelectedProgramTokenDetails,
          gameWallet: gameWallet,
          mint: token,
          signer: publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([])
        .rpc();
      console.log(`solana confirm -v ${sign}`);
      setLoading(false);
      setGameTokenCheck(false);
    } catch (e) {
      console.log("createTokenAccountForGame", e);
      setLoading(false);
    }
  };
  const onCreateGame = async () => {
    try {
      setError("");
      let getSelectedAccountDetails = getWalletAta(
        publicKey,
        new PublicKey(token)
      );
      if (!getSelectedAccountDetails) {
        setError("You don't have selected tokens");
        return;
      }
      let { value } = await connection.getTokenAccountBalance(
        getSelectedAccountDetails
      );
      if (!value?.amount || Number(value.amount) < amount) {
        setError("Insufficient balance");
        return;
      }
      const [getSelectedProgramTokenDetails, bump_token] =
        PublicKey.findProgramAddressSync(
          [new PublicKey(token).toBuffer()],
          new PublicKey(PROGRAM_ID)
        );

      let programTokenCheck = await connection.getAccountInfo(
        getSelectedProgramTokenDetails
      );
      if (programTokenCheck == null) {
        setGameTokenCheck(true);
      } else {
        createGame(getSelectedProgramTokenDetails, getSelectedAccountDetails);
      }
    } catch (error) {
      setLoading(false);
      console.log("fff", error);
    }
  };

  const createGame = async (program_ata: PublicKey, player_ata: PublicKey) => {
    try {
      setLoading(true);
      let gameReuestingAccount = anchor.web3.Keypair.generate();
      const sign = await program.methods
        .requestGame(new anchor.BN(AMOUNT))
        .accounts({
          playerAta: player_ata,
          programAta: program_ata,
          mint: new PublicKey(token),
          gameRequest: gameReuestingAccount.publicKey,
          signer: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([gameReuestingAccount])
        .rpc();
      let { value } = await connection.getTokenAccountBalance(program_ata);
      console.log("Program balance", value);
      console.log(`solana confirm -v ${sign}`);
      setLoading(false);
      console.log(
        "Created account ",
        gameReuestingAccount.publicKey.toBase58()
      );
      router.push("/games");
      //   const tx = await program.transaction.requestGame(
      //     new anchor.BN(1),
      //     TOKEN_ID,
      //     {
      //       accounts: {
      //         gameRequest: gameReuestingAccount.publicKey,
      //         signer: publicKey,
      //         systemProgram: anchor.web3.SystemProgram.programId,
      //       },
      //     }
      //   );
      //   tx.feePayer = publicKey;
      //   tx.recentBlockhash = (
      //     await connection.getLatestBlockhash("finalized")
      //   ).blockhash;
      //   const sign = await provider.wallet.signTransaction(tx);
      //   console.log("sign", sign);
    } catch (e) {
      setLoading(false);
      console.log("createGame", e);
    }
  };
  return (
    <main className="flex items-center justify-center">
      <>
        <div className="justify-center items-center flex w-full">
          <div className="relative w-full my-6 mx-auto max-w-3xl">
            <div className="border-0 rounded-lg shadow-lg relative flex flex-col w-full dark:bg-gray-800 outline-none ">
              <div className="flex items-start justify-between p-5 border-b border-solid border-blueGray-200 rounded-t">
                <h3 className="text-3xl font-semibold">Create game</h3>
              </div>
              <div className="relative px-6 py-2 flex-auto">
                {gameTokenCheck ? (
                  <div>
                    <p>
                      {`It seems like game doesn't have wallet to store given token. Can you please initiate account?`}{" "}
                    </p>
                  </div>
                ) : (
                  <form>
                    <div className="grid gap-6 mb-6 md:grid-cols-1">
                      <div>
                        <label
                          htmlFor="first_name"
                          className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                        >
                          Token address
                        </label>
                        <input
                          type="text"
                          id="first_name"
                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                          placeholder="6D3XiqeC1DU5Sxug6HU7MAv6Cs8sV167VsE72YSWBb1E"
                          required
                          value={token}
                          onChange={(value) => setToken(value.target.value)}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="last_name"
                          className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                        >
                          Amount
                        </label>
                        <input
                          type="number"
                          id="last_name"
                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                          placeholder="5"
                          required
                          value={amount}
                          onChange={(value) =>
                            setAmount(Number(value.target.value))
                          }
                        />
                      </div>
                    </div>
                  </form>
                )}
              </div>
              {error && (
                <div
                  className="px-3 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400"
                  role="alert"
                >
                  <span className="font-medium">Warning!</span> {error}
                </div>
              )}
              <div className="flex items-center justify-end p-6 border-t border-solid border-blueGray-200 rounded-b">
                {loading ? (
                  <LoadingComponent />
                ) : (
                  <>
                    {publicKey && (
                      <button
                        className="text-blue-500"
                        type="button"
                        onClick={() =>
                          gameTokenCheck
                            ? createTokenAccountForGame()
                            : onCreateGame()
                        }
                        disabled={!amount || !token || amount <= 0}
                      >
                        {gameTokenCheck ? "Continue" : "Create game"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    </main>
  );
}
