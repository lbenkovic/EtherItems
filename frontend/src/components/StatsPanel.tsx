import { useEffect, useState, useCallback } from "react";

interface StatsPanelProps {
    address: string;
    getPlayerStats: (
        address: string
    ) => Promise<{ wins: number; losses: number }>;
    getPendingRewards: (address: string) => Promise<string>;
    getRecentBattles: (count: number) => Promise<
        {
            player: string;
            itemTokenId: number;
            playerPower: number;
            monsterPower: number;
            playerWon: boolean;
            timestamp: number;
            monsterName: string;
        }[]
    >;
    claimRewards: () => void;
    loading: boolean;
}

export function StatsPanel({
    address,
    getPlayerStats,
    getPendingRewards,
    getRecentBattles,
    claimRewards,
    loading
}: StatsPanelProps) {
    const [stats, setStats] = useState({ wins: 0, losses: 0 });
    const [pending, setPending] = useState("0");
    const [battles, setBattles] = useState<
        Awaited<ReturnType<typeof getRecentBattles>>
    >([]);
    const [refreshing, setRefreshing] = useState(false);

    const refresh = useCallback(async () => {
        setRefreshing(true);
        try {
            const [s, p, b] = await Promise.all([
                getPlayerStats(address),
                getPendingRewards(address),
                getRecentBattles(10)
            ]);
            setStats(s);
            setPending(p);
            setBattles(b);
        } catch (e) {
            console.error(e);
        } finally {
            setRefreshing(false);
        }
    }, [address, getPlayerStats, getPendingRewards, getRecentBattles]);

    useEffect(() => {
        if (address) refresh();
    }, [address, refresh]);

    const winRate =
        stats.wins + stats.losses > 0
            ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
            : 0;

    const myBattles = battles.filter(
        (b) => b.player.toLowerCase() === address.toLowerCase()
    );

    return (
        <div className="stats-panel">
            <div className="stats-header">
                <h2 className="panel-title">📊 Your Stats</h2>
                <button
                    className="btn-refresh"
                    onClick={refresh}
                    disabled={refreshing}
                >
                    {refreshing ? "↻" : "↺ Refresh"}
                </button>
            </div>

            <div className="wl-row">
                <div className="wl-box wins">
                    <span className="wl-num">{stats.wins}</span>
                    <span className="wl-label">Wins</span>
                </div>
                <div className="wl-box losses">
                    <span className="wl-num">{stats.losses}</span>
                    <span className="wl-label">Losses</span>
                </div>
                <div className="wl-box rate">
                    <span className="wl-num">{winRate}%</span>
                    <span className="wl-label">Win Rate</span>
                </div>
            </div>

            {parseFloat(pending) > 0 && (
                <div className="rewards-box">
                    <div>
                        <div className="rewards-amount">
                            💰 {parseFloat(pending).toFixed(4)} ETH
                        </div>
                        <div className="rewards-label">Unclaimed rewards</div>
                    </div>
                    <button
                        className="btn-claim"
                        onClick={claimRewards}
                        disabled={loading}
                    >
                        {loading ? "..." : "Claim"}
                    </button>
                </div>
            )}

            <h3 className="battle-log-title">Recent Battles</h3>
            {myBattles.length === 0 ? (
                <p className="empty-log">No battles yet. Enter a dungeon!</p>
            ) : (
                <div className="battle-log">
                    {myBattles.map((b, i) => (
                        <div
                            key={i}
                            className={`battle-entry ${
                                b.playerWon ? "win" : "loss"
                            }`}
                        >
                            <span className="be-result">
                                {b.playerWon ? "🏆" : "💀"}
                            </span>
                            <span className="be-monster">{b.monsterName}</span>
                            <span className="be-powers">
                                {b.playerPower} vs {b.monsterPower}
                            </span>
                            <span className="be-time">
                                {new Date(
                                    b.timestamp * 1000
                                ).toLocaleDateString()}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
