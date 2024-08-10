"use client";

import AllGames from "../components/AllGames";

const gamePage = () => {
    return <main>
        <div className="flex min-h-screen flex-col items-center justify-between p-10">
            <AllGames />
        </div>
    </main>
}

export default gamePage