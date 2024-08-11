"use client";
import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { useWallet } from "@solana/wallet-adapter-react";

import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import * as borsh from "@coral-xyz/borsh";

import { PROGRAM_ID } from "../../../constants";
import { useProgram } from "./WalletContextProvider";

import GameCard from "./GameCard";
import LoadingComponent from "./Loading";

const pubkeyModal = borsh.struct([
  borsh.publicKey("player"),
  borsh.publicKey("token_account"),
  borsh.u64("bet_amount"),

  borsh.u8("game_state"),
]);

const gamStateModal = borsh.struct([
  borsh.publicKey("turn"),
  borsh.publicKey("other_player"),
  borsh.u64("winner"),
]);

const AllGames: NextPage = () => {
  const [allGames, setAllGames] = useState<any>([]);
  const [gamesLoading, setGamesLoading] = useState<boolean>(false);

  const { connection } = useConnection();

  const { publicKey }: any = useWallet();

  const program = useProgram();

  useEffect(() => {
    const subscriptionId = program.addEventListener(
      "NewGameCreated",
      (event: any) => {
        fetchAllGames();
      }
    );
    // return () => {
    //   const clear = () => {
    //     program.removeEventListener(subscriptionId);
    //   };
    //   clear();
    // };
  }, []);

  useEffect(() => {
    fetchAllGames();
  }, []);
  const fetchAllGames = async () => {
    let mappedAccounts: any = [];
    setGamesLoading(true);
    connection
      .getProgramAccounts(new PublicKey(PROGRAM_ID), {
        filters: [
          {
            dataSize: 186,
          },
        ],
      })
      .then((accounts) => {
        accounts.map(({ pubkey, account }) => {
          try {
            const offset = 8,
              gameOffset = 8 + 32 + 32 + 1 + 1 + 16;
            const { player, token_account, bet_amount, game_state } =
              pubkeyModal.decode(
                account.data.slice(offset, account.data.length)
              );
            const { turn, other_player, winner } = gamStateModal.decode(
              account.data.slice(gameOffset, account.data.length)
            );
            if (
              token_account.toBase58() !== "11111111111111111111111111111111" &&
              player.toBase58() !== "11111111111111111111111111111111"
            ) {
              let win = "";
              try {
                win = winner.toBase58();
              } catch (e) {}
              mappedAccounts.push({
                player: player.toBase58(),
                token: token_account.toBase58(),
                amount: bet_amount.toNumber(),
                game_state: game_state,
                turn: turn.toBase58(),
                other_player: other_player.toBase58(),
                winner: win,

                game: pubkey.toBase58(),
              });
            }
          } catch (e) {}
        });
        setAllGames(mappedAccounts);
        setGamesLoading(false);
      });
  };
  const divideGameData = (array_bytes: any, data_str: any) => {
    let index = 0;
    let result: any = [];
    data_str.forEach((dt: number) => {
      result.push(array_bytes.slice(index, index + dt));
      index = index + dt;
    });
    return result;
  };
  const getGamelabel = (acc: any) => {
    if (
      publicKey &&
      (acc.player == publicKey.toBase58() ||
        acc.other_player == publicKey.toBase58())
    ) {
      return "Open game";
    } else if (
      publicKey &&
      (acc.player !== publicKey.toBase58() ||
        acc.other_player == "11111111111111111111111111111111")
    ) {
      return "Join game";
    } else {
      return "View game";
    }
  };
  return (
    <div>
      {gamesLoading ? (
        <LoadingComponent />
      ) : (
        <>
          {!allGames.length && (
            <div className="text-center">
              <h2>There is no games. Please try to create game</h2>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {allGames.map((acc: any, index: any) => {
              return (
                <div key={acc.game}>
                  <GameCard
                    player={acc.player}
                    token={acc.token}
                    amount={acc.amount}
                    game={acc.game}
                    button_label={getGamelabel(acc)}
                    other_player={acc.other_player}
                    game_state={acc.game_state}
                    winner={acc.winner}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default AllGames;
