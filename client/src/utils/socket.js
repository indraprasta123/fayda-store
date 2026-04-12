import { io } from "socket.io-client";
import { url } from "../constant/Url";

const socket = io(url, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});

export default socket;
