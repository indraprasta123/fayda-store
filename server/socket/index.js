const { Server } = require("socket.io");
const { verifyToken } = require("../helpers/jwt");

let io;
const ADMIN_ROOM = "admin:all";

function initSocket(server, allowedOrigins = []) {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("join-user-room", (token) => {
      try {
        if (!token) return;

        const payload = verifyToken(token);
        if (!payload?.id) return;

        socket.join(`user:${payload.id}`);
      } catch (_) {}
    });

    socket.on("join-admin-room", (token) => {
      try {
        if (!token) return;

        const payload = verifyToken(token);
        if (!payload?.id || payload?.role !== "admin") return;

        socket.join(ADMIN_ROOM);
      } catch (_) {}
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
}

function emitOrderStatusUpdated(order) {
  if (!io || !order) return;

  const userId = order.user_id || order.userId;
  if (!userId) return;

  const payload = {
    orderId: order.id,
    userId,
    status: order.status,
    paymentStatus: order.payment_status || null,
    updatedAt: order.updatedAt,
  };

  io.to(`user:${userId}`).emit("order:status-updated", payload);
  io.to(ADMIN_ROOM).emit("order:status-updated", payload);
}

function emitOrderCreated(order) {
  if (!io || !order) return;

  io.to(ADMIN_ROOM).emit("order:created", {
    orderId: order.id,
    userId: order.user_id || order.userId || null,
    status: order.status || "pending",
    paymentStatus: order.payment_status || null,
    totalPrice: order.total_price || 0,
    createdAt: order.createdAt,
  });
}

function emitProductSync(payload = {}) {
  if (!io) return;

  io.emit("product:sync", payload);
  io.to(ADMIN_ROOM).emit("dashboard:refresh", {
    reason: payload.reason || "product-sync",
    payload,
  });
}

function emitDashboardRefresh(payload = {}) {
  if (!io) return;

  io.to(ADMIN_ROOM).emit("dashboard:refresh", payload);
}

module.exports = {
  initSocket,
  getIO,
  emitOrderStatusUpdated,
  emitOrderCreated,
  emitProductSync,
  emitDashboardRefresh,
};
