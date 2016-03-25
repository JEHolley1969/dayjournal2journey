var fs = require("fs");
var fsx = require("fs-extra");
var glob = require("glob");
var JSZip = require("jszip");
var path = require("path");
var sqlite3 = require("sqlite3").verbose();

var tpl = require("./newItem.json");
var weatherMap = require("./weatherMap.json");

var db = "./dayjournal.db";
var imageCache = {};
var outDir = "out";
var errors = {
    database: "Database file can not be found or invalid format!",
    isEmpty: "`" + outDir + "` directory already contains files! Aborting operation...",
    processing: "Error occurred during processing!",
    zipping: "An error occurred during the zipping proces!"
};
var query = "SELECT UUID, DTM, CONTENT, LOC_PLACENAME, LOC_LATITUDE, LOC_LONGITUDE, LOC_DISPLAYNAME, W_CELSIUS, W_ICONNAME, LASTMODIFIED, HASPHOTOS FROM DJENTRY";

/**
 * Start processing on 2 conditions:
 *  1. The output directory is empty
 *  2. The database file is present
 */
if (isEmpty()) {
    if (fs.existsSync(db)) {
        console.log("Processing started.");
        createImageCache();

        var sqldb = new sqlite3.Database(db, sqlite3.OPEN_READONLY);

        sqldb.serialize(function () {
            sqldb.each(query, function (err, row) {
                if (err) {
                    console.error(errors.processing, err);
                }
                processRow(row);
            }, function (err, count) {
                if (err) {
                    console.error(errors.processing, err);
                }

                console.log("Successfully processed " + count + " items.");

                zipEntries(function (err) {
                    if (err) {
                        console.error(errors.zipping, err);
                    }
                    console.log("Done!\nYou can now close this window.");
                });
            });
        });

        sqldb.close();
    } else {
        console.error(errors.database);
    }
} else {
    console.error(errors.isEmpty);
}

/**
 * Create a cache for all images inside the /images folder
 * This speeds up the app about a 100 times
 */
function createImageCache() {
    console.log("Creating image cache...");

    glob.sync("**/images/*.jpg").forEach(function (photo) {
        var uuid = photo.split("-")[0].split("/")[1].split(".")[0];

        if (!imageCache[uuid]) {
            imageCache[uuid] = [];
        }
        imageCache[uuid].push(photo);
    });
}

/**
 * Check for the presence of JSON files in the output directory
 * Abort the operation if files exist
 */
function isEmpty() {
    var entries = glob.sync("**/" + outDir + "/*.json");
    return entries.length === 0;
}

/**
 * Process the current row in the loop
 * @param  {any} row
 */
function processRow(row) {
    console.log("Creating new Journey entry for current Day Journal item ", row.DTM);
    var newItem = createEntry(row);

    if (row.HASPHOTOS === 1) {
        console.log("Processing image(s)...");
        newItem.photos = processImages(newItem.id, row);
    }

    console.log("Saving Journey entry to output directory...");
    saveEntry(newItem.id, newItem);
}

/**
 * Create a new Journey object based on the template using
 * date stored in the current Day Journal entry
 * @param  {any} dayJournalEntry
 */
function createEntry(dayJournalEntry) {
    var id = generateUuid();
    var newItem = JSON.parse(JSON.stringify(tpl));

    newItem.id = dayJournalEntry.DTM + "-" + id;
    newItem.text = dayJournalEntry.CONTENT;
    newItem.date_journal = dayJournalEntry.DTM;
    newItem.date_modified = dayJournalEntry.LASTMODIFIED;
    newItem.preview_text = dayJournalEntry.CONTENT;

    newItem.address = dayJournalEntry.LOC_DISPLAYNAME;
    newItem.lat = parseFloat(dayJournalEntry.LOC_LATITUDE);
    newItem.lon = parseFloat(dayJournalEntry.LOC_LONGITUDE);

    if (dayJournalEntry.W_CELSIUS) {
        newItem.weather.degree_c = parseFloat(dayJournalEntry.W_CELSIUS);
    }

    if (dayJournalEntry.W_ICONNAME) {
        newItem.weather.description = weatherMap[dayJournalEntry.W_ICONNAME].desc;
        newItem.weather.icon = weatherMap[dayJournalEntry.W_ICONNAME].img;
    }

    newItem.weather.place = dayJournalEntry.LOC_PLACENAME;

    return newItem;
}

/**
 * Process any images stored with the Day Journal entry
 * @param  {string} id      Journey ID
 * @param  {any}    row     current row with Day Journal data
 */
function processImages(id, row) {
    var photos = [];

    if (imageCache[row.UUID]) {
        imageCache[row.UUID].forEach(function (photo) {
            var newPhotoName = id + "-" + generateUuid() + ".jpg";
            photos.push(newPhotoName);
            fsx.copySync(photo, path.join(__dirname, outDir, newPhotoName));
        });
    } else {
        console.warn("No image(s) present for current Day Journal item", row.UUID);
    }

    return photos;
}

/**
 * Save the newly created Journey item to disk
 * @param  {string} id              Journey ID
 * @param  {any}    journeyEntry    Journey object
 */
function saveEntry(id, journeyEntry) {
    fs.writeFileSync(path.join(__dirname, outDir, id + ".json"),
        JSON.stringify(journeyEntry), "utf8");
}

/**
 * Zip the contents of the output directory
 * @param  {any} done   Callback function
 */
function zipEntries(done) {
    var zip = new JSZip();
    var files = glob.sync("**/" + outDir + "/*.j*");

    console.log("Zipping the contents of the output directory to `djexport.zip`");

    files.forEach(function (file) {
        var fileName = file.split("/")[1];
        zip.file(fileName, fs.readFileSync(file));
    });

    var content = zip.generate({
        type: "nodebuffer"
    });

    fs.writeFile("./djexport.zip", content, function (err) {
        done(err);
    });
}

/**
 * Generate a unique identifier
 */
function generateUuid() {
    function s4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }

    return (s4() + s4() + s4() + s4()).toLowerCase();
}
