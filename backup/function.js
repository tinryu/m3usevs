const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const m3u8Parser = require('m3u8-parser');
const now = Date.now();
// Folder containing your .ts files
const tsFolderPath = path.join(__dirname, 'downloaded_segments_'+now);
const outputTsFile = path.join(tsFolderPath, 'merged.ts');
const outputMp4File = path.join(tsFolderPath, 'output.mp4');
// Directory to save downloaded files
const outputDir = './downloaded_segments_'+now;
// ffmpeg -i https://vip.opstream17.com/20240815/16791_012dc4d1/index.m3u8 -c copy output.mp4
// The URL to your .m3u8 playlist
// const playlistUrl = 'https://vip.opstream11.com/20240707/51988_a48d3a33/3000k/hls/mixed.m3u8'; // this a link response SEGMENT for use parse
// This Code use convert link .m3u8, (NOTE: it happen when a link res pipes .ts) "hls/mixed.m3u8"

// Main function to download all segments
async function downloadM3U8(url) {
    // Ensure the output directory exists
    if (!fs.existsSync(outputDir)){
        fs.mkdirSync(outputDir);
    }
    let download = false;
    try {
        const response = await axios.get(url);
        const parser = new m3u8Parser.Parser();
        parser.push(response.data);
        parser.end();
        console.log('response.data', response.data);
        const segments = parser.manifest.segments;
        console.log('segments', segments);
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const segmentUrl = new URL(segment.uri, playlistUrl).href;
            const segmentPath = path.join(outputDir, `segment-${i}.ts`);

            console.log(`Downloading segment ${i + 1}/${segments.length}: ${segmentUrl}`);
            await downloadFile(segmentUrl, segmentPath);
        }
        download = true;
        console.log('All segments downloaded successfully.');
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
async function downloadFile(url, filePath) {
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
function setRemoveTime(out, flag, time)  {
    if(!flag) return;
    var countdown = 5 * 60 * 1000; // 30 minutes in milliseconds
    var timerId;
    const deplay = time;
    const tsfolderPath = path.join(__dirname, out);
    // const filePath = path.join(tsfolderPath, 'filelist.txt');

    timerId = setInterval(() => {
        // Calculate remaining time
        var min = Math.floor(countdown / (60 * 1000));
        var sec = Math.floor((countdown % (60 * 1000)) / 1000);
        console.log('' + min + ':' + sec.toString().padStart(2, '0'));
        // Check if time's up
        if (countdown <= 0) {
            removeFolder(tsfolderPath);
            clearInterval(timerId); // Stop the timer
            console.log('done');
        } else {
            countdown -= 1000; // Decrement by 1 second
        }
    }, deplay);
}
function removeFolder(folderPath) {
    fs.rm(folderPath, { recursive: true, force: true }, (err) => {
        if (err) {
          console.error(`Error deleting folder: ${err.message}`);
        } else {
          console.log(`Folder ${folderPath} deleted successfully.`);
        }
    });
}
function removeFile(path) {
    fs.unlink(path, (err) => {
        if (err) {
            console.error(`Error deleting file: ${err.message}`);
        } else {
            console.log(`File ${path} deleted successfully.`);
        }
    });
}

// Step 1: Generate a file list for concatenation
function generateFileList(callback) {
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
function mergeTsFiles(fileListPath, callback) {
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
function convertToMp4(mergedTsFile) {
    const convertCommand = `ffmpeg -i ${mergedTsFile} -c:v copy -c:a copy ${outputMp4File}`;

    exec(convertCommand, (err, stdout, stderr) => {
        if (err) {
            console.error('Error converting to .mp4:', err);
            return;
        }
        console.log('Converted to .mp4:', outputMp4File);
    });

    setRemoveTime(outputDir, true, 1000);
}