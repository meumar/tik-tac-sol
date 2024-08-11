import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import * as anchor from "@project-serum/anchor";
import { useProgram, getWalletAta } from "./WalletContextProvider";
import { PROGRAM_ID } from "../../../constants";
import LoadingComponent from "./Loading";

const GameCard = ({
  player,
  token,
  amount,
  game,
  button_label,
  other_player,
  game_state,
  winner,
}: {
  player: string;
  token: string;
  amount: number;
  game: string;
  button_label: String;
  other_player: String;
  game_state: number;
  winner: String;
}) => {
  const [gamesLoading, setGamesLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const router = useRouter();
  const { publicKey }: any = useWallet();
  const program = useProgram();
  const { connection } = useConnection();

  const openGame = () => {
    if (
      player == publicKey.toBase58() ||
      other_player == publicKey.toBase58()
    ) {
      router.push(`/games/play/${game}`);
    } else if (
      player !== publicKey.toBase58() ||
      other_player == "11111111111111111111111111111111"
    ) {
      joinGame();
    } else {
      router.push(`/games/play/${game}`);
    }
  };

  const checkPlayerWallet = async () => {
    setError("");
    let getSelectedAccountDetails = getWalletAta(
      publicKey,
      new PublicKey(token)
    );
    if (!getSelectedAccountDetails) {
      setError("You don't have selected tokens");
      return null;
    }
    let { value } = await connection.getTokenAccountBalance(
      getSelectedAccountDetails
    );
    if (!value?.amount || Number(value.amount) < amount) {
      setError("Insufficient balance");
      return null;
    }

    return getSelectedAccountDetails;
  };

  const joinGame = async () => {
    try {
      setGamesLoading(true);
      const [game_wallet, bump_token] = PublicKey.findProgramAddressSync(
        [Buffer.from("wallet")],
        new PublicKey(PROGRAM_ID)
      );
      const player_ata = await checkPlayerWallet();
      if (!player_ata) {
        setGamesLoading(false);
        return;
      }
      const [program_ata] = PublicKey.findProgramAddressSync(
        [new PublicKey(token).toBuffer()],
        new PublicKey(PROGRAM_ID)
      );
      const game_request = new PublicKey(game);

      const sign = await program.methods
        .joinGame()
        .accounts({
          playerAta: player_ata,
          programAta: program_ata,
          gameRequest: game_request,

          gameWallet: game_wallet,
          signer: publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([])
        .rpc();
      // let { value } = await connection.getTokenAccountBalance(program_ata);
      // console.log("Program balance", value);
      // console.log(`solana confirm -v ${sign}`);
      setGamesLoading(false);
      router.push(`/games/play/${game}`);
    } catch (e) {
      console.log("joinGame", e);
    }
  };

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 sd:w-full">
      <a href="#">
        <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white truncate">
          {game}
        </h5>
      </a>
      <p className="mb-3 font-normal text-gray-700 dark:text-gray-400 truncate">
        Token: {token}
      </p>
      {winner ? (
        <>
          <p className="mb-3 font-normal text-gray-700 dark:text-gray-400 truncate">
            Winner: {winner}
          </p>
        </>
      ) : (
        <>
          <p className="mb-3 font-normal text-gray-700 dark:text-gray-400 truncate">
            Player: {player}
          </p>
        </>
      )}
      <p className="mb-3 font-normal text-gray-700 dark:text-gray-400 truncate">
        Bet amount: {amount}
      </p>
      <p className="text-red-400">{error}</p>
      {gamesLoading ? (
        <LoadingComponent />
      ) : (
        <a
          href="#"
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
          onClick={openGame}
        >
          {button_label}
          <svg
            className="rtl:rotate-180 w-3.5 h-3.5 ms-2"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 14 10"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M1 5h12m0 0L9 1m4 4L9 9"
            />
          </svg>
        </a>
      )}
    </div>
  );
};

export default GameCard;
