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
import { verifyRole } from "./middleware/roleMiddleware";
import * as merchantController from "./controllers/merchantController";
import * as shopController from "./controllers/shopController";

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

apiRouter.post("/notifications/clear", notificationController.clearAll);

// Merchant Routes (Admin/Manager only)
apiRouter.get(
  "/merchants",
  verifyRole(["admin", "manager"]),
  merchantController.getMerchants
);
apiRouter.post(
  "/merchants",
  verifyRole(["admin", "manager"]),
  merchantController.createMerchant
);
apiRouter.put(
  "/merchants/:id",
  verifyRole(["admin", "manager"]),
  merchantController.updateMerchant
);
apiRouter.delete(
  "/merchants/:id",
  verifyRole(["admin", "manager"]),
  merchantController.deleteMerchant
);
apiRouter.post(
  "/merchants/bulk",
  verifyRole(["admin", "manager"]),
  merchantController.bulkImportMerchants
);


// Shop Routes (Admin/Manager only, but GET may be open for Sales dropdown if needed? Plan said Admin/Manager manage it. Sales needs to SEE it)
// Sales needs to List shops to deploy items. So GET /shops might need to be open to sales too?
// The user request said "only admin and manager role can only curd shop and merchant". CRUD usually implies Write. Read might be needed for Sales.
// I will allow 'sales' to GET /shops, but restricted Create/Update/Delete to admin/manager.

apiRouter.get("/shops", shopController.getShops); // Allow all authenticated roles

apiRouter.post(
  "/shops",
  verifyRole(["admin", "manager"]),
  shopController.createShop
);
apiRouter.put(
  "/shops/:id",
  verifyRole(["admin", "manager"]),
  shopController.updateShop
);
apiRouter.delete(
  "/shops/:id",
  verifyRole(["admin", "manager"]),
  shopController.deleteShop
);

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
