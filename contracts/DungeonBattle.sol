// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IItemRegistry {
    enum ItemType { SWORD, SHIELD, STAFF, BOOTS }
    enum Rarity { COMMON, UNCOMMON, RARE, EPIC, LEGENDARY }

    struct Item {
        ItemType itemType;
        Rarity rarity;
        uint8 attack;
        uint8 defense;
        uint8 magic;
        uint8 speed;
        uint8 durability;
        uint256 mintedAt;
    }

    function ownerOf(uint256 tokenId) external view returns (address);
    function getItem(uint256 tokenId) external view returns (Item memory);
    function getPowerScore(uint256 tokenId) external view returns (uint256);
    function reduceDurability(uint256 tokenId) external;
}

contract DungeonBattle is Ownable {
    uint256 public constant ENTRY_FEE = 0.005 ether;

    enum Difficulty { EASY, MEDIUM, HARD, LEGENDARY }

    struct Monster {
        string name;
        uint256 power;
        uint256 rewardEth;
    }

    struct BattleRecord {
        address player;
        uint256 itemTokenId;
        uint256 playerPower;
        uint256 monsterPower;
        bool playerWon;
        uint256 timestamp;
        string monsterName;
    }

    IItemRegistry public itemRegistry;

    BattleRecord[] public battleHistory;

    mapping(address => uint256) public wins;
    mapping(address => uint256) public losses;

    mapping(address => uint256) public pendingRewards;

    event BattleStarted(address indexed player, uint256 indexed tokenId, string monsterName);
    event BattleResolved(address indexed player, bool playerWon, uint256 playerPower, uint256 monsterPower);
    event RewardClaimed(address indexed player, uint256 amount);

    constructor(address _itemRegistry) Ownable(msg.sender) {
        require(_itemRegistry != address(0), "DungeonBattle: zero address");
        itemRegistry = IItemRegistry(_itemRegistry);
    }

    function enterDungeon(uint256 tokenId, Difficulty difficulty) external payable {
        require(msg.value >= ENTRY_FEE, "DungeonBattle: insufficient entry fee");
        require(
            itemRegistry.ownerOf(tokenId) == msg.sender,
            "DungeonBattle: you don't own this item"
        );

        uint256 playerPower = itemRegistry.getPowerScore(tokenId);
        require(playerPower > 0, "DungeonBattle: item is broken, repair it first");

        Monster memory monster = _spawnMonster(difficulty, tokenId);

        emit BattleStarted(msg.sender, tokenId, monster.name);

        uint256 variance = _rollVariance(tokenId, msg.sender);
        uint256 effectivePower = (playerPower * variance) / 100;

        bool playerWon = effectivePower >= monster.power;

        battleHistory.push(BattleRecord({
            player: msg.sender,
            itemTokenId: tokenId,
            playerPower: effectivePower,
            monsterPower: monster.power,
            playerWon: playerWon,
            timestamp: block.timestamp,
            monsterName: monster.name
        }));

        if (playerWon) {
            wins[msg.sender]++;
            pendingRewards[msg.sender] += monster.rewardEth;
        } else {
            losses[msg.sender]++;
        }

        itemRegistry.reduceDurability(tokenId);

        emit BattleResolved(msg.sender, playerWon, effectivePower, monster.power);
    }

    function _spawnMonster(
        Difficulty difficulty,
        uint256 tokenId
    ) internal view returns (Monster memory) {
        uint8 idx = uint8(
            uint256(keccak256(abi.encodePacked(block.timestamp, tokenId))) % 4
        );

        if (difficulty == Difficulty.EASY) {
            string[4] memory names = ["Slime", "Goblin", "Rat", "Mushroom"];
            return Monster(names[idx], 15, 0.003 ether);
        } else if (difficulty == Difficulty.MEDIUM) {
            string[4] memory names = ["Orc", "Skeleton", "Troll", "Bandit"];
            return Monster(names[idx], 30, 0.006 ether);
        } else if (difficulty == Difficulty.HARD) {
            string[4] memory names = ["Dark Knight", "Wyvern", "Necromancer", "Golem"];
            return Monster(names[idx], 55, 0.012 ether);
        } else {
            string[4] memory names = ["Dragon", "Lich King", "Demon Lord", "Ancient God"];
            return Monster(names[idx], 90, 0.025 ether);
        }
    }

    function _rollVariance(uint256 tokenId, address player) internal view returns (uint256) {
        uint256 roll = uint256(keccak256(abi.encodePacked(
            block.prevrandao,
            block.timestamp,
            tokenId,
            player
        ))) % 41;

        return 80 + roll;
    }

    function claimRewards() external {
        uint256 amount = pendingRewards[msg.sender];
        require(amount > 0, "DungeonBattle: no rewards to claim");

        pendingRewards[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "DungeonBattle: transfer failed");

        emit RewardClaimed(msg.sender, amount);
    }

    function getPlayerStats(address player)
        external
        view
        returns (uint256 playerWins, uint256 playerLosses)
    {
        return (wins[player], losses[player]);
    }

    function getTotalBattles() external view returns (uint256) {
        return battleHistory.length;
    }

    function getRecentBattles(uint256 count)
        external
        view
        returns (BattleRecord[] memory)
    {
        uint256 total = battleHistory.length;
        uint256 resultCount = count > total ? total : count;

        BattleRecord[] memory result = new BattleRecord[](resultCount);
        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = battleHistory[total - resultCount + i];
        }
        return result;
    }

    function fundContract() external payable onlyOwner {}

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "DungeonBattle: nothing to withdraw");
        payable(owner()).transfer(balance);
    }
}

