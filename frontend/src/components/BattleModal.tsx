import { useState } from "react";
import {
    DifficultyLabel,
    DifficultyEmoji,
    DifficultyColor,
    ItemTypeEmoji,
    ItemTypeLabel,
    RarityLabel,
    RarityColor,
    type ItemData,
    type BattleRecord
} from "../utils/contracts";

interface BattleModalProps {
    item: ItemData;
    onClose: () => void;
    onFight: (tokenId: number, difficulty: number) => void;
    loading: boolean;
    lastBattle: BattleRecord | null;
}

const DIFFICULTIES = [0, 1, 2, 3] as const;
const MONSTER_POWERS = [15, 30, 55, 90] as const;
const REWARDS = ["0.003", "0.006", "0.012", "0.025"] as const;

export function BattleModal({
    item,
    onClose,
    onFight,
    loading,
    lastBattle
}: BattleModalProps) {
    const [selectedDifficulty, setSelectedDifficulty] = useState(0);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    ✕
                </button>

                <h2 className="modal-title">⚔️ Enter the Dungeon</h2>

                <div className="modal-item-preview">
                    <span className="preview-emoji">
                        {ItemTypeEmoji[item.itemType]}
                    </span>
                    <div>
                        <div
                            style={{
                                color: RarityColor[item.rarity],
                                fontWeight: 700
                            }}
                        >
                            {RarityLabel[item.rarity]}{" "}
                            {ItemTypeLabel[item.itemType]} #{item.tokenId}
                        </div>
                        <div className="preview-power">
                            ⚡ Power: {item.power}
                        </div>
                    </div>
                </div>

                <div className="difficulty-grid">
                    {DIFFICULTIES.map((d) => (
                        <button
                            key={d}
                            className={`difficulty-btn ${
                                selectedDifficulty === d ? "active" : ""
                            }`}
                            style={
                                {
                                    "--diff-color": DifficultyColor[d]
                                } as React.CSSProperties
                            }
                            onClick={() => setSelectedDifficulty(d)}
                        >
                            <span className="diff-emoji">
                                {DifficultyEmoji[d]}
                            </span>
                            <span className="diff-name">
                                {DifficultyLabel[d]}
                            </span>
                            <span className="diff-power">
                                Monster: ~{MONSTER_POWERS[d]}
                            </span>
                            <span className="diff-reward">
                                Win: {REWARDS[d]} ETH
                            </span>
                        </button>
                    ))}
                </div>

                {lastBattle && (
                    <div
                        className={`battle-result ${
                            lastBattle.playerWon ? "won" : "lost"
                        }`}
                    >
                        <div className="result-title">
                            {lastBattle.playerWon
                                ? "🏆 Victory!"
                                : "💀 Defeated!"}
                        </div>
                        <div className="result-details">
                            <span>vs {lastBattle.monsterName}</span>
                            <span>
                                Your power: {lastBattle.playerPower} — Monster:{" "}
                                {lastBattle.monsterPower}
                            </span>
                        </div>
                        {lastBattle.playerWon && (
                            <div className="result-reward">
                                +{REWARDS[selectedDifficulty]} ETH added to
                                claimable rewards
                            </div>
                        )}
                    </div>
                )}

                <p className="modal-fee-notice">Entry fee: 0.005 ETH</p>

                <button
                    className="btn-fight"
                    onClick={() => onFight(item.tokenId, selectedDifficulty)}
                    disabled={loading}
                >
                    {loading ? (
                        <span className="loading-dots">
                            Fighting<span>.</span>
                            <span>.</span>
                            <span>.</span>
                        </span>
                    ) : (
                        `Fight! ${DifficultyEmoji[selectedDifficulty]}`
                    )}
                </button>
            </div>
        </div>
    );
}
