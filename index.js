const socketIO = require("socket.io");
const http = require("http");
const express = require("express");
const cors = require("cors");
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
require("dotenv").config({
  path: "./.env",
});

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello! Ths is socket server");
});

let users = [];
const addUser = (userId, socketId) => {
  !users.some((user) => user.userId === userId) &&
    users.push({ userId, socketId });
};

const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};

const getUser = (receiverId) => {
  return users.find((user) => user.userId === receiverId);
};

//define a message object with a seen message or not
const createMessage = ({ senderId, receiverId, text, images }) => ({
  senderId,
  receiverId,
  text,
  images,
  seen: false,
});

io.on("connection", (socket) => {
  //when the client connects to the server it will emit this event and we can use that to send messages to all clients connected in real time
  console.log("user is connected");
  // take userId and socketId from user
  socket.on("addUser", (userId) => {
    addUser(userId, socket.id);
    io.emit("getUsers", users);
  });

  //   send and get message
  const messages = {}; //object to track messgae sent to a user
  socket.on("sendMessage", ({ senderId, receiverId, text, images }) => {
    const message = createMessage({ senderId, receiverId, text, images });
    const user = getUser(receiverId);
    //storing the messages in messgaes object created above
    if (!messages[receiverId]) {
      messages[receiverId] = [message];
    } else {
      messages[receiverId].push(message);
    }
    //send the message to the receiver
    io.to(user?.socketId).emit("getMessage", message);
  });

  socket.on("messageSeen", ({ senderId, receiverId, messageId }) => {
    const user = getUser(senderId);
    // update the seen status of the message
    if (messages[senderId]) {
      const message = messages[senderId].find(
        (message) =>
          message.receiverId === receiverId && message.id === messageId
      );
      if (message) {
        message.seen = true;

        //send a message to sender that the receiver has seen the message

        io.to(user?.socketId).emit("messageSeen", {
          senderId,
          receiverId,
          messageId,
        });
      }
    }
  });
  
  // update the messages and get the last send message
  socket.on("updateLastMessage", ({ lastMessage, lastMessageId }) => {
    io.emit("getLastMessage", {
      lastMessage,
      lastMessageId,
    });
  });

  //check when user will be disconnected
  socket.on("disconnect", () => {
    console.log("User is disconnected");
    removeUser(socket.id);
    io.emit("getusers", users);
  });
});

server.listen(process.env.PORT || 4000, () => {
  console.log(`socket server is running on  ${process.env.PORT || 4000}`);
});