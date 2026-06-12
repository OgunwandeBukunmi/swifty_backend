import 'dotenv/config';

import express from "express";
import cors from "cors";
import morgan from "morgan";
import { runAgent } from "./agent/runtime.js";
import { getDb } from './config/mongodb.js';
import { startPriceCron } from './cron/priceCron.js';

const app = express();
app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://handiness-entity-moonscape.ngrok-free.dev",
            "https://swifty-rose.vercel.app",

        ],
        credentials: true,
    })
);
app.use(express.json());
app.use(morgan("dev"));

startPriceCron()
app.post("/api/chat", async (req, res) => {

    try {

        const { prompt, history } = req.body;

        if (!prompt) {
            return res.status(400).json({
                error: "Prompt is required"
            });
        }

        const result = await runAgent(prompt, history);

        console.log(result);

        res.json(result);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Internal server error"
        });
    }
});
app.post("/api/trigger", async (req, res) => {
    const { userId, asset, symbol, targetPrice, condition, isActive } = req.body;
    console.log("Trigger received")
    console.log(asset, symbol)
    try {
        const triggerDB = await getDb("triggers")
        const trigger = triggerDB.collection("triggers")
        const result = await trigger.insertOne({ userId, asset, symbol, targetPrice, condition, isActive })
        res.json(result)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Internal server error" })
    }

})
app.get("/api/notification/:userId", async (req, res) => {
    const userId = req.params.userId
    try {
        const triggerDB = await getDb("triggers")
        const trigger = triggerDB.collection("notifications")
        const result = await trigger.find({ userId }).toArray()
        res.json(result)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Internal server error" })
    }
})
app.listen(3001, () => {
    console.log("Server running on port 3001");
});