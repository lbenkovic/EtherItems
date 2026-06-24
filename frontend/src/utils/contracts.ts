export const ADDRESSES: Record<
    number,
    { ItemRegistry: string; DungeonBattle: string }
> = {
    // Local Hardhat node
    31337: {
        ItemRegistry: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        DungeonBattle: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
    }
    // Sepolia testnet
    // 11155111: {
    //   ItemRegistry: "",
    //   DungeonBattle: "",
    // },
};

export const ITEM_REGISTRY_ABI = [
    "function mintItem(uint8 itemType) external payable returns (uint256)",
    "function getItem(uint256 tokenId) external view returns (tuple(uint8 itemType, uint8 rarity, uint8 attack, uint8 defense, uint8 magic, uint8 speed, uint8 durability, uint256 mintedAt))",
    "function getPowerScore(uint256 tokenId) external view returns (uint256)",
    "function repairItem(uint256 tokenId) external payable",
    "function ownerOf(uint256 tokenId) external view returns (address)",
    "function balanceOf(address owner) external view returns (uint256)",
    "function MINT_PRICE() external view returns (uint256)",
    "event ItemMinted(address indexed owner, uint256 indexed tokenId, uint8 itemType, uint8 rarity)",
    "event ItemRepaired(uint256 indexed tokenId, uint8 newDurability)"
] as const;

export const DUNGEON_BATTLE_ABI = [
    "function enterDungeon(uint256 tokenId, uint8 difficulty) external payable",
    "function claimRewards() external",
    "function getPlayerStats(address player) external view returns (uint256 wins, uint256 losses)",
    "function getRecentBattles(uint256 count) external view returns (tuple(address player, uint256 itemTokenId, uint256 playerPower, uint256 monsterPower, bool playerWon, uint256 timestamp, string monsterName)[])",
    "function pendingRewards(address player) external view returns (uint256)",
    "function getTotalBattles() external view returns (uint256)",
    "function ENTRY_FEE() external view returns (uint256)",
    "event BattleStarted(address indexed player, uint256 indexed tokenId, string monsterName)",
    "event BattleResolved(address indexed player, bool playerWon, uint256 playerPower, uint256 monsterPower)",
    "event RewardClaimed(address indexed player, uint256 amount)"
] as const;

export const ItemType = { SWORD: 0, SHIELD: 1, STAFF: 2, BOOTS: 3 } as const;
export const ItemTypeLabel = ["Sword", "Shield", "Staff", "Boots"] as const;
export const ItemTypeEmoji = ["⚔️", "🛡️", "🪄", "👢"] as const;

export const Rarity = {
    COMMON: 0,
    UNCOMMON: 1,
    RARE: 2,
    EPIC: 3,
    LEGENDARY: 4
} as const;
export const RarityLabel = [
    "Common",
    "Uncommon",
    "Rare",
    "Epic",
    "Legendary"
] as const;
export const RarityColor = [
    "#9ca3af",
    "#4ade80",
    "#60a5fa",
    "#c084fc",
    "#fbbf24"
] as const;

export const Difficulty = {
    EASY: 0,
    MEDIUM: 1,
    HARD: 2,
    LEGENDARY: 3
} as const;
export const DifficultyLabel = ["Easy", "Medium", "Hard", "Legendary"] as const;
export const DifficultyEmoji = ["🐣", "⚔️", "💀", "🐉"] as const;
export const DifficultyColor = [
    "#4ade80",
    "#facc15",
    "#f97316",
    "#ef4444"
] as const;

export interface ItemData {
    tokenId: number;
    itemType: number;
    rarity: number;
    attack: number;
    defense: number;
    magic: number;
    speed: number;
    durability: number;
    mintedAt: number;
    power: number;
}

export interface BattleRecord {
    player: string;
    itemTokenId: number;
    playerPower: number;
    monsterPower: number;
    playerWon: boolean;
    timestamp: number;
    monsterName: string;
}
