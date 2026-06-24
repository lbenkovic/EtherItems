import {
  ItemTypeEmoji,
  ItemTypeLabel,
  RarityLabel,
  RarityColor,
  type ItemData,
} from "../utils/contracts";

interface ItemCardProps {
  item: ItemData;
  onBattle: (item: ItemData) => void;
  onRepair: (item: ItemData) => void;
  selected?: boolean;
  onClick?: () => void;
}

export function ItemCard({ item, onBattle, onRepair, selected, onClick }: ItemCardProps) {
  const rarityColor = RarityColor[item.rarity];
  const isDamaged = item.durability < 50;
  const isBroken = item.durability === 0;

  return (
    <div
      className={`item-card ${selected ? "selected" : ""} ${isBroken ? "broken" : ""}`}
      onClick={onClick}
      style={{ "--rarity-color": rarityColor } as React.CSSProperties}
    >
      {/* Rarity glow border */}
      <div className="item-card-border" />

      {/* Header */}
      <div className="item-header">
        <span className="item-emoji">{ItemTypeEmoji[item.itemType]}</span>
        <div className="item-title">
          <span className="item-type">{ItemTypeLabel[item.itemType]}</span>
          <span className="item-rarity" style={{ color: rarityColor }}>
            {RarityLabel[item.rarity]}
          </span>
        </div>
        <span className="item-id">#{item.tokenId}</span>
      </div>

      {/* Stats */}
      <div className="item-stats">
        {item.attack > 0 && <StatBar label="ATK" value={item.attack} color="#ef4444" />}
        {item.defense > 0 && <StatBar label="DEF" value={item.defense} color="#60a5fa" />}
        {item.magic > 0 && <StatBar label="MAG" value={item.magic} color="#c084fc" />}
        {item.speed > 0 && <StatBar label="SPD" value={item.speed} color="#4ade80" />}
      </div>

      {/* Durability */}
      <div className="item-durability">
        <div className="dur-label">
          <span>Durability</span>
          <span style={{ color: isBroken ? "#ef4444" : isDamaged ? "#f97316" : "#4ade80" }}>
            {isBroken ? "BROKEN" : `${item.durability}/100`}
          </span>
        </div>
        <div className="dur-bar-bg">
          <div
            className="dur-bar-fill"
            style={{
              width: `${item.durability}%`,
              background: isBroken ? "#ef4444" : isDamaged ? "#f97316" : "#4ade80",
            }}
          />
        </div>
      </div>

      {/* Power score */}
      <div className="item-power">
        ⚡ Power Score: <strong>{item.power}</strong>
      </div>

      {/* Actions */}
      <div className="item-actions">
        <button
          className="btn-battle"
          onClick={(e) => {
            e.stopPropagation();
            onBattle(item);
          }}
          disabled={isBroken}
        >
          {isBroken ? "Broken" : "Enter Dungeon"}
        </button>
        <button
          className="btn-repair"
          onClick={(e) => {
            e.stopPropagation();
            onRepair(item);
          }}
          disabled={item.durability === 100}
        >
          Repair (0.005Ξ)
        </button>
      </div>
    </div>
  );
}

interface StatBarProps {
  label: string;
  value: number;
  color: string;
}

function StatBar({ label, value, color }: StatBarProps) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <div className="stat-bar-bg">
        <div className="stat-bar-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="stat-value">{value}</span>
    </div>
  );
}
