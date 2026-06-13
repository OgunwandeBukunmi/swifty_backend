import 'dotenv/config';

import express from "express";
import cors from "cors";
import morgan from "morgan";
import { runAgent } from "./agent/runtime.js";
import { getDb } from './config/mongodb.js';
import { startPriceCron } from './cron/priceCron.js';
import { ObjectId } from 'mongodb';


const app = express();
app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://handiness-entity-moonscape.ngrok-free.dev",
            "https://swifty-rosy.vercel.app",

        ],
        credentials: true,
    })
);
app.use(express.json());
app.use(morgan("dev"));

startPriceCron()
app.post("/api/chat", async (req, res) => {

    try {

        const { prompt, history, cryptoCoins } = req.body;

        if (!prompt) {
            return res.status(400).json({
                error: "Prompt is required"
            });
        }

        const result = await runAgent(prompt, history, cryptoCoins);

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
        const insertResult = await trigger.insertOne({ userId, asset, symbol, targetPrice, condition, isActive, triggered: false, triggeredAt: null, currentPrice: null })
        const result = await trigger.findOne({ _id: insertResult.insertedId })
        res.json(result)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Internal server error" })
    }

})
app.delete("/api/trigger/:userId/:id", async (req, res) => {
    const { userId, id } = req.params
    try {
        const triggerDB = await getDb("triggers")
        const trigger = triggerDB.collection("triggers")
        const result = await trigger.deleteOne({ userId, _id: new ObjectId(id) })
        res.json(result)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Internal server error" })
    }
})
app.get("/api/trigger/:userId", async (req, res) => {
    const userId = req.params.userId
    try {
        const triggerDB = await getDb("triggers")
        const trigger = triggerDB.collection("triggers")
        const result = await trigger.find({ userId }).toArray()
        res.json(result)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Internal server error" })
    }
})
app.put("api/trigger/:userId/:id", async (req, res) => {
    const { userId, id } = req.params
    try {
        const triggerDB = await getDb("triggers")
        const trigger = triggerDB.collection("triggers")
        const doc = await trigger.findOne({ userId, _id: new ObjectId(id) })
        if (!doc) return res.status(404).json({ error: "Trigger not found" })
        const result = await trigger.updateOne({ userId, _id: new ObjectId(id) }, { $set: { isActive: !doc.isActive } })
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
        const notifications = triggerDB.collection("notifications")
        const result = await notifications.find({ userId }).toArray()
        console.log(result)
        res.json(result)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Internal server error" })
    }
})
app.listen(3001, () => {
    console.log("Server running on port 3001");
});