import express from "express"
import notifications from "../controllers/notifications.js"

const { sendNotification, registerToken, broadcastNotification, subscribeAllToTopics, sendNotificationToTopic } = notifications;

const router = express.Router()

router.post("/send", sendNotification)
router.post("/broadcast", broadcastNotification)
router.post("/register-token", registerToken)
router.post("/subscribe-all", subscribeAllToTopics);
router.post("/send-topic", sendNotificationToTopic);


export default router