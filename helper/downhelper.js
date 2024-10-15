import axios from 'axios';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { exec } from 'child_process';
import { Parser } from 'm3u8-parser';

// Folder containing your .ts files
const now = Date.now();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tsFolderPath = path.join(__dirname, `../downloaded_segments_${now}`);
const outputTsFile = path.join(tsFolderPath, 'merged.ts');
const outputMp4File = path.join(tsFolderPath, 'output.mp4');
// Directory to save downloaded files
const outputDir = `./downloaded_segments_${now}`;
//  function to download Mp4
export const downloadMp4 = async (url, storeId) => {
    const outDir = `./downloaded_segments_${storeId}`;
    const outputFilePath = path.join(outDir, 'output.mp4');
    if (!fs.existsSync(outDir)){
        fs.mkdirSync(outDir);
    }
    try {
        const response = await axios({
            url: url,
            method: 'GET',
            responseType: 'stream'
        });
        const fileStream = fs.createWriteStream(outputFilePath);
        response.data.pipe(fileStream);
      
        return new Promise((resolve, reject) => {
            fileStream.on('finish', resolve);
            fileStream.on('error', reject);
        });
    } catch (error) {
        console.error('An error occurred:', error);
    }
}
// Main function to download all segments
export const downloadM3U8 = async(url) => {
    // Ensure the output directory exists
    if (!fs.existsSync(outputDir)){
        fs.mkdirSync(outputDir);
    }
    let download = false;
    try {
        const response = await axios.get(url);
        console.log('response.data', response.data);
        const parser = new Parser();
        parser.push(response.data);
        parser.end();
       
        const segments = parser.manifest.segments;
        console.log('segments', segments);
        if(segments.length > 0) {
            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                const segmentUrl = new URL(segment.uri, url).href;
                const segmentPath = path.join(outputDir, `segment-${i}.ts`);
    
                console.log(`Downloading segment ${i + 1}/${segments.length}: ${segmentUrl}`);
                downloadFile(segmentUrl, segmentPath);
            }
            download = true;
            console.log('All segments downloaded successfully.');
        }
    } catch (error) {
        console.error('An error occurred:', error);
    }
    if(download) {
        setTimeout(() => {
            generateFileList((fileListPath) => {
                mergeTsFiles(fileListPath, (mergedTsFile) => {
                    convertToMp4(mergedTsFile);
                });
            });
        }, 2000);
    }
}
// Function to download a file
const downloadFile = async (url, filePath) => {
    const writer = fs.createWriteStream(filePath);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

// Step 1: Generate a file list for concatenation
const generateFileList = (callback) => {
    const fileListPath = path.join(tsFolderPath, 'filelist.txt');
    fs.readdir(tsFolderPath, (err, files) => {
        if (err) return console.error('Error reading directory:', err);

        // Filter and sort .ts files
        const tsFiles = files.filter(file => file.endsWith('.ts')).sort(
            (a,b) => {
                 // Extract the numeric part from the filenames
                const numA = parseInt(a.match(/-(\d+)\.ts$/)[1], 10);
                const numB = parseInt(b.match(/-(\d+)\.ts$/)[1], 10);
                // Compare the numeric parts
                return numA - numB;
            }
        );
        // console.log('tsFiles', tsFiles);
        const fileListContent = tsFiles.map(file => `file '${path.join(tsFolderPath, file)}'`).join('\n');

        fs.writeFile(fileListPath, fileListContent, (err) => {
            if (err) return console.error('Error writing file list:', err);
            console.log('File list generated:', fileListPath);
            callback(fileListPath);
        });
    });
}
// Step 2: Merge the .ts files
const mergeTsFiles = (fileListPath, callback) => {
    const mergeCommand = `ffmpeg -f concat -safe 0 -i ${fileListPath} -c copy ${outputTsFile}`;

    exec(mergeCommand, (err, stdout, stderr) => {
        if (err) {
            console.error('Error merging .ts files:', err);
            return;
        }
        console.log('Merged .ts files into:', outputTsFile);
        callback(outputTsFile);
    });
}
// Step 3: Convert the merged .ts file to .mp4
const convertToMp4 = (mergedTsFile) => {
    const convertCommand = `ffmpeg -i ${mergedTsFile} -c:v copy -c:a copy ${outputMp4File}`;

    exec(convertCommand, (err, stdout, stderr) => {
        if (err) {
            console.error('Error converting to .mp4:', err);
            return;
        }
        console.log('Converted to .mp4:', outputMp4File);
        setRemoveTime(flag, 1000, 1) // (flag, interval, minute)
    });
}
const setRemoveTime = (flag, delay, timer)  => {
    if(!flag) return;
    var countdown = timer * 60 * 1000; // 30 minutes in milliseconds
    var timerId;

    timerId = setInterval(() => {
        // Calculate remaining time
        var min = Math.floor(countdown / (60 * 1000));
        var sec = Math.floor((countdown % (60 * 1000)) / 1000);
        console.log('' + min + ':' + sec.toString().padStart(2, '0'));
        // Check if time's up
        if (countdown <= 0) {
            removeFolder(tsFolderPath);
            clearInterval(timerId); // Stop the timer
            console.log('done');
        } else {
            countdown -= 1000; // Decrement by 1 second
        }
    }, delay);
}
const removeFolder = (folderPath) => {
    fs.rm(folderPath, { recursive: true, force: true }, (err) => {
        if (err) {
          console.error(`Error deleting folder: ${err.message}`);
        } else {
          console.log(`Folder ${folderPath} deleted successfully.`);
        }
    });
}
const removeFile = (path) => {
    fs.unlink(path, (err) => {
        if (err) {
            console.error(`Error deleting file: ${err.message}`);
        } else {
            console.log(`File ${path} deleted successfully.`);
        }
    });
}