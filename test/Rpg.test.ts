import { expect } from "chai";
import hre from "hardhat";

const ItemType = { SWORD: 0, SHIELD: 1, STAFF: 2, BOOTS: 3 };
const Difficulty = { EASY: 0, MEDIUM: 1, HARD: 2, LEGENDARY: 3 };

async function deploy() {
    const { ethers } = await hre.network.create();

    const MINT_PRICE = ethers.parseEther("0.01");
    const ENTRY_FEE = ethers.parseEther("0.005");
    const FUND_AMOUNT = ethers.parseEther("1.0");

    const [owner, player1, player2] = await ethers.getSigners();

    const ItemRegistryFactory = await ethers.getContractFactory("ItemRegistry");
    const itemRegistry = await ItemRegistryFactory.deploy();
    await itemRegistry.waitForDeployment();

    const DungeonBattleFactory = await ethers.getContractFactory(
        "DungeonBattle"
    );
    const dungeonBattle = await DungeonBattleFactory.deploy(
        await itemRegistry.getAddress()
    );
    await dungeonBattle.waitForDeployment();

    await itemRegistry.setDungeonContract(await dungeonBattle.getAddress());
    await dungeonBattle.fundContract({ value: FUND_AMOUNT });

    return {
        ethers,
        MINT_PRICE,
        ENTRY_FEE,
        itemRegistry,
        dungeonBattle,
        owner,
        player1,
        player2
    };
}

describe("ItemRegistry", function () {
    describe("Deployment", function () {
        it("sets the deployer as owner", async function () {
            const { itemRegistry, owner } = await deploy();
            expect(await itemRegistry.owner()).to.equal(owner.address);
        });

        it("has correct ERC721 name and symbol", async function () {
            const { itemRegistry } = await deploy();
            expect(await itemRegistry.name()).to.equal("RPG Items");
            expect(await itemRegistry.symbol()).to.equal("RPGI");
        });

        it("links to DungeonBattle correctly", async function () {
            const { itemRegistry, dungeonBattle } = await deploy();
            expect(await itemRegistry.dungeonContract()).to.equal(
                await dungeonBattle.getAddress()
            );
        });
    });

    describe("Minting", function () {
        it("mints a sword and assigns it to the caller", async function () {
            const { itemRegistry, player1, MINT_PRICE } = await deploy();
            await expect(
                itemRegistry
                    .connect(player1)
                    .mintItem(ItemType.SWORD, { value: MINT_PRICE })
            ).to.emit(itemRegistry, "ItemMinted");
            expect(await itemRegistry.ownerOf(0)).to.equal(player1.address);
        });

        it("reverts when ETH sent is below MINT_PRICE", async function () {
            const { ethers, itemRegistry, player1 } = await deploy();
            await expect(
                itemRegistry.connect(player1).mintItem(ItemType.SWORD, {
                    value: ethers.parseEther("0.001")
                })
            ).to.be.revertedWith("ItemRegistry: insufficient ETH");
        });

        it("mints all four item types without reverting", async function () {
            const { ethers, itemRegistry, player1, MINT_PRICE } =
                await deploy();
            for (const typeId of Object.values(ItemType)) {
                await expect(
                    itemRegistry
                        .connect(player1)
                        .mintItem(typeId, { value: MINT_PRICE })
                ).to.not.be.revert(ethers);
            }
        });

        it("assigns non-zero primary stat per item type", async function () {
            const { itemRegistry, player1, MINT_PRICE } = await deploy();
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.SWORD, { value: MINT_PRICE });
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.SHIELD, { value: MINT_PRICE });
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.STAFF, { value: MINT_PRICE });
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.BOOTS, { value: MINT_PRICE });

            expect((await itemRegistry.getItem(0)).attack).to.be.gt(0);
            expect((await itemRegistry.getItem(1)).defense).to.be.gt(0);
            expect((await itemRegistry.getItem(2)).magic).to.be.gt(0);
            expect((await itemRegistry.getItem(3)).speed).to.be.gt(0);
        });

        it("starts every item with durability 70–100", async function () {
            const { itemRegistry, player1, MINT_PRICE } = await deploy();
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.SWORD, { value: MINT_PRICE });
            const item = await itemRegistry.getItem(0);
            expect(item.durability).to.be.gte(70);
            expect(item.durability).to.be.lte(100);
        });

        it("increments tokenId with each mint", async function () {
            const { itemRegistry, player1, MINT_PRICE } = await deploy();
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.SWORD, { value: MINT_PRICE });
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.SHIELD, { value: MINT_PRICE });
            expect(await itemRegistry.ownerOf(0)).to.equal(player1.address);
            expect(await itemRegistry.ownerOf(1)).to.equal(player1.address);
        });
    });

    describe("Power Score", function () {
        it("returns a positive power score for a healthy item", async function () {
            const { itemRegistry, player1, MINT_PRICE } = await deploy();
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.SWORD, { value: MINT_PRICE });
            expect(await itemRegistry.getPowerScore(0)).to.be.gt(0);
        });
    });

    describe("Repair", function () {
        it("restores durability to 100 after battle", async function () {
            const {
                ethers,
                itemRegistry,
                dungeonBattle,
                player1,
                MINT_PRICE,
                ENTRY_FEE
            } = await deploy();
            const REPAIR_FEE = ethers.parseEther("0.005");
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.SWORD, { value: MINT_PRICE });
            await dungeonBattle
                .connect(player1)
                .enterDungeon(0, Difficulty.EASY, { value: ENTRY_FEE });
            await itemRegistry
                .connect(player1)
                .repairItem(0, { value: REPAIR_FEE });
            expect((await itemRegistry.getItem(0)).durability).to.equal(100);
        });

        it("reverts if called by non-owner of the item", async function () {
            const { ethers, itemRegistry, player1, player2, MINT_PRICE } =
                await deploy();
            const REPAIR_FEE = ethers.parseEther("0.005");
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.SWORD, { value: MINT_PRICE });
            await expect(
                itemRegistry
                    .connect(player2)
                    .repairItem(0, { value: REPAIR_FEE })
            ).to.be.revertedWith("ItemRegistry: not your item");
        });
    });

    describe("Access Control", function () {
        it("reverts when non-dungeon calls reduceDurability", async function () {
            const { itemRegistry, player1, MINT_PRICE } = await deploy();
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.SWORD, { value: MINT_PRICE });
            await expect(
                itemRegistry.connect(player1).reduceDurability(0)
            ).to.be.revertedWith(
                "ItemRegistry: caller is not the dungeon contract"
            );
        });

        it("reverts when non-owner calls setDungeonContract", async function () {
            const { ethers, itemRegistry, dungeonBattle, player1 } =
                await deploy();
            await expect(
                itemRegistry
                    .connect(player1)
                    .setDungeonContract(await dungeonBattle.getAddress())
            ).to.be.revert(ethers);
        });
    });

    describe("Withdrawal", function () {
        it("lets owner withdraw mint fees", async function () {
            const { ethers, itemRegistry, owner, player1, MINT_PRICE } =
                await deploy();
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.SWORD, { value: MINT_PRICE });
            const before = await ethers.provider.getBalance(owner.address);
            await itemRegistry.connect(owner).withdraw();
            const after = await ethers.provider.getBalance(owner.address);
            expect(after).to.be.gt(before);
        });
    });
});

describe("DungeonBattle", function () {
    describe("Deployment", function () {
        it("points to the correct ItemRegistry", async function () {
            const { itemRegistry, dungeonBattle } = await deploy();
            expect(await dungeonBattle.itemRegistry()).to.equal(
                await itemRegistry.getAddress()
            );
        });
    });

    describe("Enter Dungeon", function () {
        it("emits BattleStarted on entry", async function () {
            const {
                itemRegistry,
                dungeonBattle,
                player1,
                MINT_PRICE,
                ENTRY_FEE
            } = await deploy();
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.SWORD, { value: MINT_PRICE });
            await expect(
                dungeonBattle
                    .connect(player1)
                    .enterDungeon(0, Difficulty.EASY, { value: ENTRY_FEE })
            ).to.emit(dungeonBattle, "BattleStarted");
        });

        it("reverts if caller doesn't own the item", async function () {
            const {
                itemRegistry,
                dungeonBattle,
                player1,
                player2,
                MINT_PRICE,
                ENTRY_FEE
            } = await deploy();
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.SWORD, { value: MINT_PRICE });
            await expect(
                dungeonBattle
                    .connect(player2)
                    .enterDungeon(0, Difficulty.EASY, { value: ENTRY_FEE })
            ).to.be.revertedWith("DungeonBattle: you don't own this item");
        });

        it("reverts if entry fee is not paid", async function () {
            const { ethers, itemRegistry, dungeonBattle, player1, MINT_PRICE } =
                await deploy();
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.SWORD, { value: MINT_PRICE });
            await expect(
                dungeonBattle
                    .connect(player1)
                    .enterDungeon(0, Difficulty.EASY, {
                        value: ethers.parseEther("0.001")
                    })
            ).to.be.revertedWith("DungeonBattle: insufficient entry fee");
        });

        it("records the battle in history", async function () {
            const {
                itemRegistry,
                dungeonBattle,
                player1,
                MINT_PRICE,
                ENTRY_FEE
            } = await deploy();
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.SWORD, { value: MINT_PRICE });
            await dungeonBattle
                .connect(player1)
                .enterDungeon(0, Difficulty.EASY, { value: ENTRY_FEE });
            expect(await dungeonBattle.getTotalBattles()).to.equal(1);
        });

        it("reduces item durability by 5", async function () {
            const {
                itemRegistry,
                dungeonBattle,
                player1,
                MINT_PRICE,
                ENTRY_FEE
            } = await deploy();
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.SWORD, { value: MINT_PRICE });
            const before = Number((await itemRegistry.getItem(0)).durability);
            await dungeonBattle
                .connect(player1)
                .enterDungeon(0, Difficulty.EASY, { value: ENTRY_FEE });
            const after = Number((await itemRegistry.getItem(0)).durability);
            expect(after).to.equal(before - 5);
        });

        it("wins + losses sum to 1 after one battle", async function () {
            const {
                itemRegistry,
                dungeonBattle,
                player1,
                MINT_PRICE,
                ENTRY_FEE
            } = await deploy();
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.SWORD, { value: MINT_PRICE });
            await dungeonBattle
                .connect(player1)
                .enterDungeon(0, Difficulty.EASY, { value: ENTRY_FEE });
            const [wins, losses] = await dungeonBattle.getPlayerStats(
                player1.address
            );
            expect(wins + losses).to.equal(1n);
        });

        it("accepts all four difficulty levels", async function () {
            const {
                ethers,
                itemRegistry,
                dungeonBattle,
                player1,
                MINT_PRICE,
                ENTRY_FEE
            } = await deploy();
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.SWORD, { value: MINT_PRICE });
            for (const diff of Object.values(Difficulty)) {
                await expect(
                    dungeonBattle
                        .connect(player1)
                        .enterDungeon(0, diff, { value: ENTRY_FEE })
                ).to.not.be.revert(ethers);
            }
        });
    });

    describe("Rewards", function () {
        it("reverts claimRewards when nothing to claim", async function () {
            const { dungeonBattle, player1 } = await deploy();
            await expect(
                dungeonBattle.connect(player1).claimRewards()
            ).to.be.revertedWith("DungeonBattle: no rewards to claim");
        });

        it("pays ETH to player after winning", async function () {
            const {
                ethers,
                itemRegistry,
                dungeonBattle,
                player1,
                MINT_PRICE,
                ENTRY_FEE
            } = await deploy();
            const REPAIR_FEE = ethers.parseEther("0.005");
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.SWORD, { value: MINT_PRICE });

            let won = false;
            for (let i = 0; i < 20 && !won; i++) {
                const item = await itemRegistry.getItem(0);
                if (Number(item.durability) <= 10) {
                    await itemRegistry
                        .connect(player1)
                        .repairItem(0, { value: REPAIR_FEE });
                }
                await dungeonBattle
                    .connect(player1)
                    .enterDungeon(0, Difficulty.EASY, { value: ENTRY_FEE });
                if ((await dungeonBattle.pendingRewards(player1.address)) > 0n)
                    won = true;
            }

            if (won) {
                const before = await ethers.provider.getBalance(
                    player1.address
                );
                await dungeonBattle.connect(player1).claimRewards();
                const after = await ethers.provider.getBalance(player1.address);
                expect(after).to.be.gt(before);
            }
        });
    });

    describe("Battle History", function () {
        it("getRecentBattles returns the correct count", async function () {
            const {
                itemRegistry,
                dungeonBattle,
                player1,
                MINT_PRICE,
                ENTRY_FEE
            } = await deploy();
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.SWORD, { value: MINT_PRICE });
            for (let i = 0; i < 3; i++) {
                await dungeonBattle
                    .connect(player1)
                    .enterDungeon(0, Difficulty.EASY, { value: ENTRY_FEE });
            }
            expect((await dungeonBattle.getRecentBattles(2)).length).to.equal(
                2
            );
        });

        it("stores the player address in battle history", async function () {
            const {
                itemRegistry,
                dungeonBattle,
                player1,
                MINT_PRICE,
                ENTRY_FEE
            } = await deploy();
            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.SWORD, { value: MINT_PRICE });
            await dungeonBattle
                .connect(player1)
                .enterDungeon(0, Difficulty.EASY, { value: ENTRY_FEE });
            const battles = await dungeonBattle.getRecentBattles(1);
            expect(battles[0].player).to.equal(player1.address);
        });
    });

    describe("Full Game Loop", function () {
        it("completes mint -> battle -> repair -> claim", async function () {
            const {
                ethers,
                itemRegistry,
                dungeonBattle,
                player1,
                MINT_PRICE,
                ENTRY_FEE
            } = await deploy();
            const REPAIR_FEE = ethers.parseEther("0.005");

            await itemRegistry
                .connect(player1)
                .mintItem(ItemType.SWORD, { value: MINT_PRICE });
            expect(await itemRegistry.ownerOf(0)).to.equal(player1.address);
            const item = await itemRegistry.getItem(0);
            console.log(
                `\nMinted Sword — Attack: ${item.attack}, Durability: ${item.durability}`
            );

            await dungeonBattle
                .connect(player1)
                .enterDungeon(0, Difficulty.EASY, { value: ENTRY_FEE });
            const [wins, losses] = await dungeonBattle.getPlayerStats(
                player1.address
            );
            console.log(`Battle — Wins: ${wins}, Losses: ${losses}`);

            const afterBattle = await itemRegistry.getItem(0);
            expect(Number(afterBattle.durability)).to.be.lt(
                Number(item.durability)
            );

            await itemRegistry
                .connect(player1)
                .repairItem(0, { value: REPAIR_FEE });
            expect((await itemRegistry.getItem(0)).durability).to.equal(100);
            console.log(`Repaired to 100`);

            const pending = await dungeonBattle.pendingRewards(player1.address);
            if (pending > 0n) {
                await dungeonBattle.connect(player1).claimRewards();
                console.log(`Claimed ${ethers.formatEther(pending)} ETH`);
            }
            console.log(`Full loop complete!\n`);
        });
    });
});
