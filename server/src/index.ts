import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import * as userController from "./controllers/userController";
import * as requestController from "./controllers/requestController";
import * as usageController from "./controllers/usageController";
import * as notificationController from "./controllers/notificationController";
import * as inventoryItemController from "./controllers/inventoryItemController";
import { authenticateToken } from "./middleware/authMiddleware";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "50mb" }));

const apiRouter = express.Router();

apiRouter.use("/auth", authRoutes);

apiRouter.use(authenticateToken);

apiRouter.get("/users", userController.getUsers);
apiRouter.post("/users", userController.createUser);
apiRouter.put("/users/:id", userController.updateUser);
apiRouter.delete("/users/:id", userController.deleteUser);

apiRouter.get("/requests", requestController.getRequests);
apiRouter.post("/requests", requestController.createRequest);
apiRouter.patch("/requests/:id/status", requestController.updateStatus);
apiRouter.delete("/requests/:id", requestController.deleteRequest);

apiRouter.get("/usages", usageController.getUsages);
apiRouter.post("/usages", usageController.createUsage);
apiRouter.put("/usages/:id", usageController.updateUsage);
apiRouter.delete("/usages/:id", usageController.deleteUsage);

apiRouter.get("/notifications", notificationController.getMyNotifications);
apiRouter.patch("/notifications/:id/read", notificationController.markAsRead);
apiRouter.post("/notifications/clear", notificationController.clearAll);

apiRouter.get("/inventory-items", inventoryItemController.getInventoryItems);
apiRouter.post("/inventory-items", inventoryItemController.createInventoryItem);
apiRouter.put(
  "/inventory-items/:id",
  inventoryItemController.updateInventoryItem,
);
apiRouter.patch(
  "/inventory-items/:id/archive",
  inventoryItemController.toggleArchiveInventoryItem,
);

app.use("/api/v1", apiRouter);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
