import cron from "node-cron";
import { getDb } from "../config/mongodb.js";
import axios from "axios";

const COINS = {
    BTC: "bitcoin",
    ETH: "ethereum",
    USDT: "tether",
    USDC: "usd-coin",
    SUI: "sui",
    SOL: "solana",
    TRX: "tron",
    HYPE: "hyperliquid",
    DOGE: "dogecoin",
};

async function getPrice(coinId) {
    const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
    );

    return response.data[coinId]?.usd;
}


export async function startPriceCron() {
    cron.schedule("*/2 * * * *", async () => {
        try {
            console.log("Checking triggers...");

            const TriggerDB = await getDb("triggers");
            const NotificationCollection = TriggerDB.collection("notifications")
            const triggerCollection = TriggerDB.collection("triggers");

            const triggers = await triggerCollection.find({
                isActive: true,
            }).toArray();

            let triggerByCoin = {}
            triggers.forEach((trigger) => {
                if (triggerByCoin[trigger.symbol]) {
                    triggerByCoin[trigger.symbol].push(trigger)
                } else {
                    triggerByCoin[trigger.symbol] = [trigger]
                }
            })
            for (const symbol of Object.keys(triggerByCoin)) {
                const coinId = COINS[symbol.toUpperCase()];

                if (!coinId) {
                    console.log(`No CoinGecko ID found for ${symbol}`);
                    continue;
                }
                let price;
                try {
                    price = await getPrice(coinId);
                    if (!price) continue;
                    console.log(`Price Gotten for ${symbol} ${price}`)
                }
                catch (err) {
                    console.log(`Error getting price for ${symbol} ${err.message}`);
                    continue;
                }

                for (const trigger of triggerByCoin[symbol]) {
                    let triggered = false;

                    if (
                        trigger.condition === "above" &&
                        price >= trigger.targetPrice
                    ) {
                        triggered = true;
                    }

                    if (
                        trigger.condition === "below" &&
                        price <= trigger.targetPrice
                    ) {
                        triggered = true;
                    }

                    if (!triggered) continue;

                    await triggerCollection.updateOne(
                        { _id: trigger._id },
                        {
                            $set: {
                                isActive: false,
                                status: "triggered",
                                currentPrice: price,
                                triggeredAt: new Date(),
                            },
                        }
                    );
                    console.log("Notification Sent", trigger.userId, trigger.symbol, price)

                    // Create notification
                    await NotificationCollection.insertOne({
                        userId: trigger.userId,
                        title: `${trigger.symbol} Alert`,
                        message: `${trigger.symbol} reached $${price}`,
                        isRead: false,
                        createdAt: new Date(),
                    });

                    console.log(
                        `Triggered ${trigger.symbol} for user ${trigger.userId}`
                    );
                }
            }
        }
        catch (error) {
            console.error("Trigger cron failed:", error);
        }
    }
    )
}