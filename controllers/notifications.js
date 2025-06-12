import admin from "../config/firebase.js";
import DeviceTokens from "../model/DeviceToken.js";

const sendNotification = async (req, res) => {
  const { token, title, description, imgUrl } = req.body;
  try {
    console.log(req.body);
    const response = await admin.messaging().send({
      token: token,
      notification: {
          title: title,
          body: description || "",
          imageUrl: imgUrl,
        },
      data: {
        title: title,
        description: description,
        imageUrl: imgUrl,
      },
    });
    console.log("Response: ", response);
    res.status(200).json({
      success: true,
      message: "Notification sent successfully",
      response: response,
    });
  } catch (error) {
    console.log(error);
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

    const chunkSize = 100; // 🔥 Max tokens per FCM batch
    const chunks = [];

    for (let i = 0; i < deviceTokens.length; i += chunkSize) {
      chunks.push(deviceTokens.slice(i, i + chunkSize));
    }

    const responses = [];
    console.log(`Total chunks: ${chunks.length}`);
    // for (let i = 0; i < chunks.length; i++) {
    //     const response = await admin.messaging().sendEachForMulticast({
    //       tokens: [...chunks[i]],
    //       data: {
    //         title,
    //         description,
    //         imageUrl: imgUrl,
    //       },
    //     });
    //     console.log({successCount: response.successCount, failureCount: response.failureCount})
    //     responses.push(response);
    //     setTimeout(() => {
    //       console.log("waiting 1 second")
    //     },1000)
    //     // responses.push({successCount: response.successCount, failureCount: response.failureCount});
    //     // console.log(chunk)

    // }

    for (let i = 0; i < chunks.length; i++) {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: [...chunks[i]],
        notification: {
          title: title,
          body: description || "",
          imageUrl: imgUrl,
        },
        data: {
          title,
          description,
          imageUrl: imgUrl,
        },
        android: {
          priority: "high",
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              alert: {
                title,
                body: description || "",
              },
            },
          },
        },
      });

      responses.push(response);
      console.log({
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      // Wait 1 second before next batch to avoid rate limit
      await new Promise((resolve) => setTimeout(resolve, 1000));
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
    const { device_token, name, email, topic } = req.body;

    if (!device_token || !name || !email || !topic) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    let user = await DeviceTokens.findOne({ device_token: device_token });
    if (user) {
      return res.status(200).json({
        success: false,
        message: "Token already registered",
      });
    }

    user = new DeviceTokens({
      device_token: device_token,
      name: name,
      email: email,
      topic: topic,
    });
    await user.save();

    const response =  await admin.messaging().subscribeToTopic(device_token, "all");
    if(!response){
      return res.status(500).json({
        success: false,
        message: "Error in registering token",
      });
    }

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


export const subscribeAllToTopics = async (req, res) => {
  try {
    const allTokens = await DeviceTokens.find({});

    if (!allTokens.length) {
      return res.status(404).json({
        success: false,
        message: "No device tokens found in the collection.",
      });
    }

    // Group tokens by topic
    const topicMap = new Map();

    for (const doc of allTokens) {
      const { device_token, topic } = doc;
      if (!topicMap.has(topic)) {
        topicMap.set(topic, []);
      }
      topicMap.get(topic).push(device_token);
    }
    console.log("this is all token", topicMap)
    const results = [];

    for (const [topic, tokens] of topicMap.entries()) {
      try {
        const response =  await admin.messaging().subscribeToTopic(tokens, topic);
        results.push({
          topic,
          successCount: response.successCount,
          failureCount: response.failureCount,
        });
      } catch (error) {
        console.error(`Error subscribing to topic ${topic}:`, error);
        results.push({
          topic,
          error: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Subscription process completed",
      results,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to subscribe device tokens: " + error.message,
    });
  }
};

const sendNotificationToTopic = async (req, res) => {
  try {
    const { title, description, imgUrl, data, topic = "all" } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required.",
      });
    }

    const message = {
      topic: topic,
      notification: {
          title: title,
          body: description,
          imageUrl: imgUrl,
      },
      data: {
          title:title,
          description: description,
          imageUrl: imgUrl || "",
      },
      data: data || {}, // optional key-value data
    };

    const response = await admin.messaging().send(message);

    return res.status(200).json({
      success: true,
      message: "Notification sent successfully",
      messageId: response,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send notification: " + error.message,
    });
  }
};
export default { sendNotification, broadcastNotification, registerToken, subscribeAllToTopics, sendNotificationToTopic };
