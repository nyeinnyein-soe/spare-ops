import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import * as userController from "./controllers/userController";
import * as requestController from "./controllers/requestController";
import * as usageController from "./controllers/usageController";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "50mb" }));

const apiRouter = express.Router();

apiRouter.use("/auth", authRoutes);

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

app.use("/api/v1", apiRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
