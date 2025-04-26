import admin from "../config/firebase.js";
import DeviceTokens from "../model/DeviceToken.js";

const sendNotification = async (req, res) => {
  const { token, title, description, imgUrl } = req.body;
  try {
    console.log(req.body)
    const response = await admin.messaging().send({
      token: token,
      data: {
        title: title,
        description: description,
        imageUrl: imgUrl,
      },
    });

    res.status(200).json({
      success: true,
      message: "Notification sent successfully",
      response: response,
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      message: "Error in sending notification" + error.message,
    });
  }
};

const broadcastNotification = async (req, res) => {
  const { title, description, imgUrl } = req.body;
  try {
    const users = await DeviceTokens.find().select("device_token -_id");
    const deviceTokens = users
      .filter((user) => user.device_token)
      .map((user) => user.device_token);

    console.log(`Total device tokens: ${deviceTokens.length}`);

    const chunkSize = 500; // 🔥 Max tokens per FCM batch
    const chunks = [];

    for (let i = 0; i < deviceTokens.length; i += chunkSize) {
      chunks.push(deviceTokens.slice(i, i + chunkSize));
    }

    const responses = [];

    for (const chunk of chunks) {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: chunk,
        data: {
          title,
          description,
          imageUrl: imgUrl,
        },
      });
      responses.push(response);
    }

    res.status(200).json({
      success: true,
      message: "Notification broadcast sent successfully",
      totalBatches: chunks.length,
      responses: responses,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error in sending broadcast notification: " + error.message,
    });
  }
};


const registerToken = async (req, res) => {
  try {
    const { device_token } = req.body;

    let user = await DeviceTokens.findOne({ device_token: device_token });
    if (user) {
      return res.status(200).json({
        success: false,
        message: "Token already registered",
      });
    }

    user = new DeviceTokens({ device_token: device_token });
    await user.save();
    res.status(201).json({
      success: true, 
      message: "Token registered successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error in registering token " + error.message,
    });
  }
};

export default { sendNotification, broadcastNotification, registerToken };

