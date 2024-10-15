import { Router } from "express";
import {
  getVideoById,
  downloadUrl,
  handleDetailVid,
  getM3u8Detail,
  getVideoDetail,
  clearUpStore,
  downFileUrl,
  stopDown,
  pauseDown,
} from "../controllers/videoController.js";

const router = Router();

// Define user-related routes
router.get("/m3u8/:id", (req, res) => {
  const io = req.app.get("io");
  getM3u8Detail(req, res, io);
});

router.get("/video/:id", getVideoDetail);
router.get("/:id", getVideoById);

router.post("/", downloadUrl);
router.post("/down", (req, res) => {
  downFileUrl(req, res);
});
router.post("/detail", handleDetailVid);
router.post("/pausedown", pauseDown);
router.post("/canceldown", stopDown);

router.delete("/clear", clearUpStore);
export default router;
