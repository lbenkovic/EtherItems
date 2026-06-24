// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ItemRegistry is ERC721, Ownable {
    uint256 public constant MINT_PRICE = 0.01 ether;

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

    mapping(uint256 => Item) public items;
    uint256 private _nextTokenId;
    address public dungeonContract;

    event ItemMinted(address indexed owner, uint256 indexed tokenId, ItemType itemType, Rarity rarity);
    event DurabilityReduced(uint256 indexed tokenId, uint8 newDurability);
    event ItemRepaired(uint256 indexed tokenId, uint8 newDurability);

    constructor() ERC721("RPG Items", "RPGI") Ownable(msg.sender) {}

    modifier onlyDungeon() {
        require(msg.sender == dungeonContract, "ItemRegistry: caller is not the dungeon contract");
        _;
    }

    function setDungeonContract(address _dungeon) external onlyOwner {
        require(_dungeon != address(0), "ItemRegistry: zero address");
        dungeonContract = _dungeon;
    }

    function mintItem(ItemType _itemType) external payable returns (uint256) {
        require(msg.value >= MINT_PRICE, "ItemRegistry: insufficient ETH");

        uint256 tokenId = _nextTokenId++;

        bytes32 seed = keccak256(abi.encodePacked(
            block.prevrandao,
            block.timestamp,
            msg.sender,
            tokenId
        ));

        Rarity rarity = _rollRarity(seed);
        Item memory newItem = _generateStats(_itemType, rarity, seed);

        items[tokenId] = newItem;
        _safeMint(msg.sender, tokenId);

        emit ItemMinted(msg.sender, tokenId, _itemType, rarity);
        return tokenId;
    }

    function _rollRarity(bytes32 seed) internal pure returns (Rarity) {
        uint8 roll = uint8(seed[0]) % 100;
        if (roll < 50) return Rarity.COMMON;
        if (roll < 75) return Rarity.UNCOMMON;
        if (roll < 90) return Rarity.RARE;
        if (roll < 98) return Rarity.EPIC;
        return Rarity.LEGENDARY;
    }

    function _rarityMultiplier(Rarity _rarity) internal pure returns (uint8) {
        if (_rarity == Rarity.COMMON)   return 10;
        if (_rarity == Rarity.UNCOMMON) return 13;
        if (_rarity == Rarity.RARE)     return 16;
        if (_rarity == Rarity.EPIC)     return 20;
        return 25;
    }

    function _generateStats(ItemType _type, Rarity _rarity, bytes32 seed) internal view returns (Item memory) {
        uint8 mult = _rarityMultiplier(_rarity);
        uint8 statA = _scale(uint8(seed[1]) % 20 + 1, mult);
        uint8 statB = _scale(uint8(seed[2]) % 20 + 1, mult);
        uint8 durability = uint8(seed[3]) % 31 + 70;
        uint256 ts = block.timestamp;

        if (_type == ItemType.SWORD)  return Item(_type, _rarity, statA, 0, 0, 0, durability, ts);
        if (_type == ItemType.SHIELD) return Item(_type, _rarity, 0, statA, 0, 0, durability, ts);
        if (_type == ItemType.STAFF)  return Item(_type, _rarity, statA, 0, statB, 0, durability, ts);
        return Item(_type, _rarity, 0, 0, 0, statA, durability, ts); // BOOTS
    }

    function _scale(uint8 base, uint8 mult) internal pure returns (uint8) {
        uint16 result = uint16(base) * uint16(mult) / 10;
        return result > 100 ? 100 : uint8(result);
    }

    function reduceDurability(uint256 tokenId) external onlyDungeon {
        Item storage item = items[tokenId];
        require(item.durability > 0, "ItemRegistry: item is already broken");
        uint8 reduction = item.durability >= 5 ? 5 : item.durability;
        item.durability -= reduction;
        emit DurabilityReduced(tokenId, item.durability);
    }

    function repairItem(uint256 tokenId) external payable {
        require(ownerOf(tokenId) == msg.sender, "ItemRegistry: not your item");
        require(msg.value >= 0.005 ether, "ItemRegistry: insufficient repair fee");
        require(items[tokenId].durability < 100, "ItemRegistry: already at full durability");
        items[tokenId].durability = 100;
        emit ItemRepaired(tokenId, 100);
    }

    function getItem(uint256 tokenId) external view returns (Item memory) {
        return items[tokenId];
    }

    function getPowerScore(uint256 tokenId) external view returns (uint256) {
        Item memory item = items[tokenId];
        if (item.durability == 0) return 0;
        uint256 statTotal = item.attack + item.defense + item.magic + item.speed;
        return (statTotal * item.durability) / 100;
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "ItemRegistry: nothing to withdraw");
        payable(owner()).transfer(balance);
    }
}

