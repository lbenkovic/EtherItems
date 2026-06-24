import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const EtherItemsModule = buildModule("EtherItems", (m) => {
    const itemRegistry = m.contract("ItemRegistry");

    const dungeonBattle = m.contract("DungeonBattle", [itemRegistry]);

    m.call(itemRegistry, "setDungeonContract", [dungeonBattle], {
        id: "LinkContracts"
    });

    m.call(dungeonBattle, "fundContract", [], {
        id: "FundDungeon",
        value: 100_000_000_000_000_000n // 0.1 ETH u wei
    });

    return { itemRegistry, dungeonBattle };
});

export default EtherItemsModule;
