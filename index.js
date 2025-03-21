import dotenv from "dotenv"
import express from "express"
import connectDB from "./config/connect.js"
import notificationRoutes from "./routes/notification.js"

dotenv.config()

const app = express()
const port = process.env.PORT || 5501

app.use(express.json())

app.use('/notifications', notificationRoutes)
app.use("/",(req,res)=>res.send("Hello World"))

const start = async () => {
    try {
        await connectDB(process.env.MONGO_URI)
        app.listen(port, () => {
            console.log(`Server is listening on port ${port}`)
        })
    } catch (error) {
        console.log(error)
    }
}

start()