import {
  convertToMp4,
  stopProgress,
  pauseProgress,
  resumeProgress,
  removeFolder,
  getFileDownload,
} from "../helper/convertHelper.js";
import { downloadMp4, } from "../helper/downhelper.js";
import { LocalStorage } from "node-localstorage";
const localStorage = new LocalStorage("./scratch");

export const getVideoById = (req, res) => {
  const url = parseInt(req.params.id);
  console.log("log", url);
  res.json(url);
};
export const downloadUrl = (req, res) => {
  const { id, url } = req.body;
  if (!id || !url) {
    return res.status(400).json({ error: "ID and name are required" });
  }
  console.log(url);

  downloadM3U8(url);
  res.json("done");
};
export const handleDetailVid = (req, res) => {
  const data = req.body;
  if (data && data.storageKey) {
    let result = JSON.stringify(data, null, 2);
    const nameKey = data.storageKey;
    localStorage.setItem(nameKey, result);
  }
  res.send("Data received successfully!");
};
export const getM3u8Detail = (req, res, io) => {
  const storeId = req.params.id;
  const value = localStorage.getItem(storeId);
  const result = JSON.parse(value);
  if (result.url) {
    convertToMp4(result.url, storeId, io);
  }
  res.json(value ? { data: result } : "No data");
};
export const getVideoDetail = (req, res) => {
  const storeId = req.params.id;
  const value = localStorage.getItem(storeId);
  const result = JSON.parse(value);
  if (result.url) {
    downloadMp4(result.url, storeId);
  }
  res.json(value ? { data: result } : "No data");
};
export const clearUpStore = (req, res) => {
  const type = req.body.type;
  const key = req.body.id;
  switch (type) {
    case "rm-folders":
      removeFolder(key);
      localStorage.removeItem(key);
      res.send("Store removed");
      break;
    case "rm-stores":
      localStorage.clear();
      res.send("Removed all localstore");
      break;
    default:
      console.log("defualt nothing");
  }
};
export const downFileUrl = async (req, res) => {
  const key = req.body.id;
  const localstore = localStorage.getItem(key);
  const result = JSON.parse(localstore);
  let filePath = await getFileDownload(key, result.name).then((files) => {
    return files.filter((file) => file !== undefined);
  }).catch(err => console.error('Error:', err));
  console.log('filePath', filePath[0]);
  res.download(filePath[0], (err) => {
    if (err) {
      res.status(500).send('Error downloading the file.');
    }
  });
};
export const stopDown = (req, res) => {
  if (req.body.id) {
    stopProgress();
    const key = req.body.id;
    localStorage.removeItem(key);
    removeFolder(key);
  }
  res.json({ message: "Stoped Down" });
};
export const pauseDown = (req, res) => {
  const flag = req.body && req.body.flag;
  switch (flag) {
    case "pause":
      pauseProgress();
      break;
    case "resume":
      resumeProgress();
      break;
    default:
      console.log("api pause working");
  }
  res.json({
    message: flag === "pause" ? "Pause progress" : "Resume progress",
  });
};
