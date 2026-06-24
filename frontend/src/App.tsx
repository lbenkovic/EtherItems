import { useState, useEffect, useCallback } from "react";
import { useWallet } from "./hooks/useWallet";
import { useContracts } from "./hooks/useContracts";
import { MintPanel } from "./components/MintPanel";
import { ItemCard } from "./components/ItemCard";
import { BattleModal } from "./components/BattleModal";
import { StatsPanel } from "./components/StatsPanel";
import type { ItemData, BattleRecord } from "./utils/contracts";
import "./App.css";

type Tab = "forge" | "inventory" | "dungeon" | "stats";

interface Notification {
    msg: string;
    type: "success" | "error";
}

export default function App() {
    const {
        signer,
        address,
        chainId,
        balance,
        error: walletError,
        connecting,
        isSupported,
        connect,
        refreshBalance
    } = useWallet();

    const contracts = useContracts(signer, chainId);

    const [tab, setTab] = useState<Tab>("forge");
    const [items, setItems] = useState<ItemData[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [battleItem, setBattleItem] = useState<ItemData | null>(null);
    const [lastBattle, setLastBattle] = useState<BattleRecord | null>(null);
    const [notification, setNotification] = useState<Notification | null>(null);

    const notify = (msg: string, type: Notification["type"] = "success") => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const loadItems = useCallback(async () => {
        if (!address) return;
        setLoadingItems(true);
        try {
            const playerItems = await contracts.getPlayerItems(address);
            setItems(playerItems);
        } catch (e) {
            console.error("Failed to load items:", e);
        } finally {
            setLoadingItems(false);
        }
    }, [address, contracts]);

    useEffect(() => {
        if (address && isSupported) loadItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [address, isSupported]);

    const handleMint = async (itemType: number) => {
        try {
            await contracts.mintItem(itemType);
            notify("Item minted! Check your inventory.");
            await loadItems();
            await refreshBalance();
            setTab("inventory");
        } catch (e) {
            console.error("handleMint error:", e);
            const err = e as { reason?: string };
            notify(err.reason || "Mint failed", "error");
        }
    };

    const handleBattle = async (tokenId: number, difficulty: number) => {
        try {
            await contracts.enterDungeon(tokenId, difficulty);

            const recent = await contracts.getRecentBattles(1);
            if (recent.length > 0) {
                const battle = recent[0];
                setLastBattle(battle);
                notify(
                    battle.playerWon
                        ? `Victory! Defeated ${battle.monsterName}!`
                        : `Defeated by ${battle.monsterName}. Try again!`,
                    battle.playerWon ? "success" : "error"
                );
            }

            await loadItems();
            await refreshBalance();
        } catch (e) {
            const err = e as { reason?: string };
            notify(err.reason || "Battle failed", "error");
        }
    };

    const handleRepair = async (item: ItemData) => {
        try {
            await contracts.repairItem(item.tokenId);
            notify(`Item #${item.tokenId} repaired to full durability!`);
            await loadItems();
            await refreshBalance();
        } catch (e) {
            const err = e as { reason?: string };
            notify(err.reason || "Repair failed", "error");
        }
    };

    const handleClaimRewards = async () => {
        try {
            await contracts.claimRewards();
            notify("Rewards claimed!");
            await refreshBalance();
        } catch (e) {
            const err = e as { reason?: string };
            notify(err.reason || "Claim failed", "error");
        }
    };

    if (!address) {
        return (
            <div className="app">
                <div className="connect-screen">
                    <div className="connect-orb" />
                    <h1 className="game-title">
                        <span className="title-rpg">Ether</span>
                        <span className="title-quest">Items</span>
                    </h1>
                    <p className="connect-tagline">
                        On-chain RPG items. Real ownership. Trustless battles.
                    </p>
                    <div className="connect-features">
                        <div className="feature">
                            ⚔️ Mint NFT items with on-chain stats
                        </div>
                        <div className="feature">
                            🏰 Fight monsters in the dungeon
                        </div>
                        <div className="feature">
                            💰 Earn ETH rewards for victories
                        </div>
                        <div className="feature">
                            🔗 Items work across any game
                        </div>
                    </div>
                    {walletError && (
                        <div className="error-banner">{walletError}</div>
                    )}
                    <button
                        className="btn-connect"
                        onClick={connect}
                        disabled={connecting}
                    >
                        {connecting ? "Connecting..." : "Connect Wallet"}
                    </button>
                    <p className="connect-note">
                        Requires MetaMask · Local Hardhat Network
                    </p>
                </div>
            </div>
        );
    }

    if (!isSupported) {
        return (
            <div className="app">
                <div className="connect-screen">
                    <h1 className="game-title">
                        <span className="title-rpg">Ether</span>
                        <span className="title-quest">Items</span>
                    </h1>
                    <div className="error-banner">
                        ⚠️ Unsupported network (Chain ID: {chainId})
                        <br />
                        Switch to Hardhat Local (31337) or Sepolia (11155111).
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            <header className="app-header">
                <div className="header-logo">
                    <span className="logo-rpg">Ether</span>
                    <span className="logo-quest">Items</span>
                </div>
                <nav className="header-nav">
                    {[
                        { id: "forge" as const, label: "⚒️ Forge" },
                        {
                            id: "inventory" as const,
                            label: `🎒 Inventory (${items.length})`
                        },
                        { id: "dungeon" as const, label: "🏰 Dungeon" },
                        { id: "stats" as const, label: "📊 Stats" }
                    ].map((t) => (
                        <button
                            key={t.id}
                            className={`nav-btn ${
                                tab === t.id ? "active" : ""
                            }`}
                            onClick={() => setTab(t.id)}
                        >
                            {t.label}
                        </button>
                    ))}
                </nav>
                <div className="header-wallet">
                    <span className="wallet-balance">
                        {parseFloat(balance || "0").toFixed(3)} ETH
                    </span>
                    <span className="wallet-address">
                        {address.slice(0, 6)}…{address.slice(-4)}
                    </span>
                </div>
            </header>

            {notification && (
                <div className={`notification ${notification.type}`}>
                    {notification.msg}
                </div>
            )}

            {contracts.txHash && (
                <div className="tx-banner">
                    ✅ Tx confirmed: {contracts.txHash.slice(0, 20)}...
                </div>
            )}

            <main className="app-main">
                {tab === "forge" && (
                    <MintPanel
                        onMint={handleMint}
                        loading={contracts.loading}
                    />
                )}

                {tab === "inventory" && (
                    <div className="inventory-tab">
                        <div className="tab-header">
                            <h2 className="panel-title">🎒 Your Items</h2>
                            <button
                                className="btn-refresh"
                                onClick={loadItems}
                                disabled={loadingItems}
                            >
                                {loadingItems ? "↻" : "↺ Refresh"}
                            </button>
                        </div>
                        {loadingItems ? (
                            <div className="loading-screen">
                                Loading items from chain...
                            </div>
                        ) : items.length === 0 ? (
                            <div className="empty-state">
                                <p>No items yet.</p>
                                <button
                                    className="btn-mint-small"
                                    onClick={() => setTab("forge")}
                                >
                                    ⚒️ Forge your first item
                                </button>
                            </div>
                        ) : (
                            <div className="items-grid">
                                {items.map((item) => (
                                    <ItemCard
                                        key={item.tokenId}
                                        item={item}
                                        onBattle={(i) => {
                                            setBattleItem(i);
                                            setTab("dungeon");
                                        }}
                                        onRepair={handleRepair}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {tab === "dungeon" && (
                    <div className="dungeon-tab">
                        <h2 className="panel-title">🏰 The Dungeon</h2>
                        <p className="panel-subtitle">
                            Select an item to bring into battle.
                        </p>
                        {items.length === 0 ? (
                            <div className="empty-state">
                                <p>You need an item to enter the dungeon.</p>
                                <button
                                    className="btn-mint-small"
                                    onClick={() => setTab("forge")}
                                >
                                    ⚒️ Forge an item
                                </button>
                            </div>
                        ) : (
                            <div className="items-grid">
                                {items.map((item) => (
                                    <ItemCard
                                        key={item.tokenId}
                                        item={item}
                                        selected={
                                            battleItem?.tokenId === item.tokenId
                                        }
                                        onClick={() => setBattleItem(item)}
                                        onBattle={(i) => setBattleItem(i)}
                                        onRepair={handleRepair}
                                    />
                                ))}
                            </div>
                        )}
                        {battleItem && (
                            <BattleModal
                                item={battleItem}
                                onClose={() => {
                                    setBattleItem(null);
                                    setLastBattle(null);
                                }}
                                onFight={handleBattle}
                                loading={contracts.loading}
                                lastBattle={lastBattle}
                            />
                        )}
                    </div>
                )}

                {tab === "stats" && (
                    <StatsPanel
                        address={address}
                        getPlayerStats={contracts.getPlayerStats}
                        getPendingRewards={contracts.getPendingRewards}
                        getRecentBattles={contracts.getRecentBattles}
                        claimRewards={handleClaimRewards}
                        loading={contracts.loading}
                    />
                )}
            </main>
        </div>
    );
}
