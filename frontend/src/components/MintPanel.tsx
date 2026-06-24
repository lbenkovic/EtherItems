import { useState } from "react";
import { ItemTypeEmoji, ItemTypeLabel } from "../utils/contracts";

interface MintPanelProps {
    onMint: (itemType: number) => void;
    loading: boolean;
}

const DESCRIPTIONS = [
    "High attack power. Best for aggressive dungeon runs.",
    "Strong defense. Reduces damage from tough monsters.",
    "Balanced attack + magic. Great for legendary bosses.",
    "High speed. Speed affects battle variance — more unpredictable!"
] as const;

export function MintPanel({ onMint, loading }: MintPanelProps) {
    const [selected, setSelected] = useState(0);

    return (
        <div className="mint-panel">
            <h2 className="panel-title">⚒️ Forge an Item</h2>
            <p className="panel-subtitle">
                Mint a new NFT item. Stats are rolled on-chain — every item is
                unique.
            </p>

            <div className="item-type-grid">
                {[0, 1, 2, 3].map((t) => (
                    <button
                        key={t}
                        className={`type-btn ${selected === t ? "active" : ""}`}
                        onClick={() => setSelected(t)}
                    >
                        <span className="type-emoji">{ItemTypeEmoji[t]}</span>
                        <span className="type-label">{ItemTypeLabel[t]}</span>
                    </button>
                ))}
            </div>

            <p className="type-description">{DESCRIPTIONS[selected]}</p>

            <div className="mint-info">
                <span>
                    Mint price: <strong>0.01 ETH</strong>
                </span>
                <span>
                    Rarity: <strong>Random</strong>
                </span>
            </div>

            <button
                className="btn-mint"
                onClick={() => onMint(selected)}
                disabled={loading}
            >
                {loading ? (
                    <span className="loading-dots">
                        Minting<span>.</span>
                        <span>.</span>
                        <span>.</span>
                    </span>
                ) : (
                    `Mint ${ItemTypeEmoji[selected]} ${ItemTypeLabel[selected]}`
                )}
            </button>

            <p className="mint-note">
                🎲 Stats, rarity, and durability are all generated on-chain at
                mint time. No two items are identical.
            </p>
        </div>
    );
}
