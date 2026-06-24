import { useState, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import {
    ADDRESSES,
    ITEM_REGISTRY_ABI,
    DUNGEON_BATTLE_ABI,
    type ItemData,
    type BattleRecord
} from "../utils/contracts";

export function useContracts(
    signer: ethers.JsonRpcSigner | null,
    chainId: number | null
) {
    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [txError, setTxError] = useState<string | null>(null);

    const addresses = chainId ? ADDRESSES[chainId] : undefined;

    const itemRegistry = useMemo(() => {
        if (!signer || !addresses?.ItemRegistry) return null;
        return new ethers.Contract(
            addresses.ItemRegistry,
            ITEM_REGISTRY_ABI,
            signer
        );
    }, [signer, addresses]);

    const dungeonBattle = useMemo(() => {
        if (!signer || !addresses?.DungeonBattle) return null;
        return new ethers.Contract(
            addresses.DungeonBattle,
            DUNGEON_BATTLE_ABI,
            signer
        );
    }, [signer, addresses]);

    const sendTx = useCallback(
        async <T>(
            contract: ethers.Contract,
            method: string,
            args: unknown[],
            overrides: Record<string, unknown> = {}
        ): Promise<T> => {
            setLoading(true);
            setTxHash(null);
            setTxError(null);
            try {
                const estimated = await contract[method].estimateGas(
                    ...args,
                    overrides
                );
                const gasLimit = (estimated * 120n) / 100n; // +20%

                const tx: ethers.ContractTransactionResponse = await contract[
                    method
                ](...args, {
                    ...overrides,
                    gasLimit
                });
                setTxHash(tx.hash);
                const receipt = await tx.wait();
                return receipt as T;
            } catch (e) {
                console.error("sendTx error:", e);
                const err = e as {
                    reason?: string;
                    shortMessage?: string;
                    message?: string;
                };
                const msg =
                    err.reason ||
                    err.shortMessage ||
                    err.message ||
                    "Transaction failed";
                setTxError(msg);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        []
    );

    const mintItem = useCallback(
        async (itemType: number) => {
            if (!itemRegistry) throw new Error("Contracts not ready");
            const price: bigint = await itemRegistry.MINT_PRICE();
            return sendTx(itemRegistry, "mintItem", [itemType], {
                value: price
            });
        },
        [itemRegistry, sendTx]
    );

    const repairItem = useCallback(
        async (tokenId: number) => {
            if (!itemRegistry) throw new Error("Contracts not ready");
            return sendTx(itemRegistry, "repairItem", [tokenId], {
                value: ethers.parseEther("0.005")
            });
        },
        [itemRegistry, sendTx]
    );

    const getItem = useCallback(
        async (tokenId: number): Promise<Omit<ItemData, "power"> | null> => {
            if (!itemRegistry) return null;
            const raw = await itemRegistry.getItem(tokenId);
            return {
                tokenId,
                itemType: Number(raw.itemType),
                rarity: Number(raw.rarity),
                attack: Number(raw.attack),
                defense: Number(raw.defense),
                magic: Number(raw.magic),
                speed: Number(raw.speed),
                durability: Number(raw.durability),
                mintedAt: Number(raw.mintedAt)
            };
        },
        [itemRegistry]
    );

    const getPowerScore = useCallback(
        async (tokenId: number): Promise<number> => {
            if (!itemRegistry) return 0;
            const score: bigint = await itemRegistry.getPowerScore(tokenId);
            return Number(score);
        },
        [itemRegistry]
    );

    const getPlayerItems = useCallback(
        async (address: string): Promise<ItemData[]> => {
            if (!itemRegistry) return [];

            const filter = itemRegistry.filters.ItemMinted(address);
            const events = await itemRegistry.queryFilter(filter, 0, "latest");
            const tokenIds = events.map((e) =>
                Number((e as ethers.EventLog).args.tokenId)
            );

            if (tokenIds.length === 0) return [];

            const owners = await Promise.all(
                tokenIds.map((id) => itemRegistry.ownerOf(id).catch(() => null))
            );

            const ownedIds = tokenIds.filter(
                (_, i) => owners[i]?.toLowerCase() === address.toLowerCase()
            );

            if (ownedIds.length === 0) return [];

            const [rawItems, powers] = await Promise.all([
                Promise.all(ownedIds.map((id) => itemRegistry.getItem(id))),
                Promise.all(
                    ownedIds.map((id) => itemRegistry.getPowerScore(id))
                )
            ]);

            return ownedIds.map((tokenId, i) => ({
                tokenId,
                itemType: Number(rawItems[i].itemType),
                rarity: Number(rawItems[i].rarity),
                attack: Number(rawItems[i].attack),
                defense: Number(rawItems[i].defense),
                magic: Number(rawItems[i].magic),
                speed: Number(rawItems[i].speed),
                durability: Number(rawItems[i].durability),
                mintedAt: Number(rawItems[i].mintedAt),
                power: Number(powers[i])
            }));
        },
        [itemRegistry]
    );

    const enterDungeon = useCallback(
        async (tokenId: number, difficulty: number) => {
            if (!dungeonBattle) throw new Error("Contracts not ready");
            const fee: bigint = await dungeonBattle.ENTRY_FEE();
            return sendTx(
                dungeonBattle,
                "enterDungeon",
                [tokenId, difficulty],
                { value: fee }
            );
        },
        [dungeonBattle, sendTx]
    );

    const claimRewards = useCallback(async () => {
        if (!dungeonBattle) throw new Error("Contracts not ready");
        return sendTx(dungeonBattle, "claimRewards", []);
    }, [dungeonBattle, sendTx]);

    const getPlayerStats = useCallback(
        async (address: string): Promise<{ wins: number; losses: number }> => {
            if (!dungeonBattle) return { wins: 0, losses: 0 };
            const [wins, losses] = await dungeonBattle.getPlayerStats(address);
            return { wins: Number(wins), losses: Number(losses) };
        },
        [dungeonBattle]
    );

    const getPendingRewards = useCallback(
        async (address: string): Promise<string> => {
            if (!dungeonBattle) return "0";
            const rewards: bigint = await dungeonBattle.pendingRewards(address);
            return ethers.formatEther(rewards);
        },
        [dungeonBattle]
    );

    const getRecentBattles = useCallback(
        async (count = 5): Promise<BattleRecord[]> => {
            if (!dungeonBattle) return [];
            const raw = await dungeonBattle.getRecentBattles(count);
            return raw.map(
                (b: {
                    player: string;
                    itemTokenId: bigint;
                    playerPower: bigint;
                    monsterPower: bigint;
                    playerWon: boolean;
                    timestamp: bigint;
                    monsterName: string;
                }) => ({
                    player: b.player,
                    itemTokenId: Number(b.itemTokenId),
                    playerPower: Number(b.playerPower),
                    monsterPower: Number(b.monsterPower),
                    playerWon: b.playerWon,
                    timestamp: Number(b.timestamp),
                    monsterName: b.monsterName
                })
            );
        },
        [dungeonBattle]
    );

    return {
        loading,
        txHash,
        txError,
        setTxError,
        mintItem,
        repairItem,
        getItem,
        getPowerScore,
        getPlayerItems,
        enterDungeon,
        claimRewards,
        getPlayerStats,
        getPendingRewards,
        getRecentBattles
    };
}
