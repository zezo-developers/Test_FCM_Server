import express from "express"
import notifications from "../controllers/notifications.js"

const { sendNotification, registerToken, broadcastNotification } = notifications;

const router = express.Router()

router.post("/send", sendNotification)
router.post("/broadcast", broadcastNotification)
router.post("/register-token", registerToken)

export default router