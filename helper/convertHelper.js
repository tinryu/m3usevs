import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import util from "util";
import ffmpeg from "fluent-ffmpeg";

const readdir = util.promisify(fs.readdir);
// const now = Date.now();
let cmd;
// Define supported MIME types for conversion
const mimeTypes = {
  m3u8: "video/mp4",
  m3u: "video/mp4",
  mp4: "video/mp4",
  "3gp": "video/3gpp",
  flv: "video/x-flv",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  wmv: "video/x-ms-wmv",
  webm: "video/webm",
  ogg: "video/ogg",
  ogv: "video/ogg",
  f4v: "video/x-f4v",
  mkv: "video/x-matroska",
  rmvb: "application/vnd.rn-realmedia-vbr",
  m4s: "video/iso.segment",
  mp3: "audio/mpeg",
  wav: "audio/wav",
};
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const convertToMp4 = async (url, nPath, io) => {
  const outputDir = path.join(__dirname, `../converted_${nPath}`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  const ext = path.extname(url).slice(1);
  // Check if the file type is supported for conversion
  if ((mimeTypes[ext] && mimeTypes[ext].startsWith("video")) || mimeTypes[ext].startsWith("audio")) {
    const outputFile = path.join(outputDir, `${path.basename(url, path.extname(url))}.mp4`);
    try {
      await convertFile(url, outputFile, ext, (progress) => {
        io.emit("progressUpdate", progress);
      }, (message) => {
        io.emit("alertMessage", message)
      });
      io.emit("conversionComplete", "Video conversion complete!");
    } catch (err) {
      io.emit("conversionError", `Error during conversion: ${err.message}`);
    }
  } else {
    console.log(`Skipping unsupported file type:`);
  }
};
export const removeFolder = (namePath) => {
  const floderPath = path.join(__dirname, `../converted_${namePath}`);
  if (fs.existsSync(floderPath)) {
    fs.rm(floderPath, { recursive: true, force: true }, err => {
      if (err) {
        throw err;
      }
      console.log(`${namePath} is deleted!`);
    });
  }
}
export const stopProgress = () => {
  if(cmd) {
    cmd.kill(); // Sends a termination signal to stop FFmpeg process
    console.log('Process stopped');
  }
}
export const pauseProgress = () => {
  if(cmd) {
    cmd.kill('SIGSTOP');
    console.log('Process paused');
  }
}
export const resumeProgress = () => {
  if(cmd) {
    cmd.kill('SIGCONT');
    console.log('Process resumed');
  }
}
export const getFileDownload = async (namePath , namef) => {
  const dirPath = path.join(__dirname, `../converted_${namePath}`);
  try {
    // Read the directory contents
    const files = await readdir(dirPath);
    // Optionally map over the files to show their full path
    const filePaths = files.map(file => {
      const fileName = file.split('.')[0];
      const storeName = namef.split('.')[0];
      if(fileName === storeName) {
        return path.join(dirPath, file)
      }
    });
    return filePaths;
  } catch(error){
    console.error('Error reading directory:', error);
    throw error;
  }
}
const convertFile = async (inputFile, outputFile, ext, progressCallback, Message) => {
  if (ext === "m3u8" || ext === "m3u") {
    // Handle m3u8 streams
    return new Promise((resolve, reject) => {
      let totalTime = 0;
      let startTime = 0;
      cmd = ffmpeg(inputFile)
        .outputOptions("-c copy") // Copy the stream as is
        .output(outputFile)
        .on("start", (commandLine) => {
          console.log("commandLine", commandLine);
          startTime = Date.now();
          console.log(`Started converting ${inputFile} -> ${outputFile}`);
        })
        .on("codecData", (data) => {
          // Get the video duration from codecData
          const duration = data.duration.split(":");
          const Hours = parseInt(duration[0] * 3600);
          const Minutes = parseInt(duration[1] * 60);
          const Seconds = parseInt(duration[2]);

          totalTime = (Hours + Minutes + Seconds) / 8; // Duration in seconds
        })
        .on("progress", (progress) => {
          if (totalTime) {
            const timeParts = progress.timemark.split(":");
            const hours = parseInt(timeParts[0] * 3600);
            const minutes = parseInt(timeParts[1] * 60);
            const seconds = parseInt(timeParts[2]);

            const currentTime = (hours + minutes + seconds) / 8;

            // Calculate progress based on timemark
            let percentComplete = (currentTime / totalTime) * 100;

            // If timemark is lagging or the progress stalls near the end
            const elapsedTime = (Date.now() - startTime) / 1000; // in seconds
            const estimatedPercentByTime = (elapsedTime / totalTime) * 100;
            console.log('estimatedPercentByTime', estimatedPercentByTime);
            console.log('percentComplete', percentComplete);
            // Adjust progress if time-based progress is ahead of timemark-based progress
            if (estimatedPercentByTime > percentComplete) {
              percentComplete = estimatedPercentByTime;
            }

            // Handle stalling at 99.9% or near the end
            if (percentComplete > 99.5) {
              percentComplete = 100;
            }

            // Send the progress to the frontend via the callback
            progressCallback({
              percent: percentComplete.toFixed(2),
              targetsize: progress.targetSize,
              currentKbps: progress.currentKbps,
              timemark: progress.timemark,
              currentTime: percentComplete > 99.5 ? totalTime.toFixed(0) : currentTime.toFixed(0),
              totalTime: totalTime.toFixed(0),
            });
          }
        })
        .on("end", () => {
          Message({
            successMessage: `Finished converting ${inputFile}`
          })
          console.log(`Finished converting ${inputFile}`);
        })
        .on("error", (err) => {
          Message({
            errorMessage: err.message
          })
          console.error(`Error converting ${inputFile}: ${err.message}`);
        });
      cmd.run();  
    });
  } else {
    
  }
};
