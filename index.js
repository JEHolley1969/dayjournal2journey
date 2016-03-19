require("colors");
var EasyZip = require("easy-zip").EasyZip;
var fs = require("fs");
var fsx = require("fs-extra");
var glob = require("glob");
var path = require("path");
var sqlite3 = require("sqlite3").verbose();

var file = "./db/dayjournal.db";
var tpl = require("./templates/newItem.json");
var weatherMap = require("./templates/weatherMap.json");

if (fs.existsSync(file)) {
    var db = new sqlite3.Database(file, sqlite3.OPEN_READONLY);
    db.serialize(function () {
        db.each("SELECT UUID, DTM, CONTENT, LOC_PLACENAME, LOC_LATITUDE, LOC_LONGITUDE, LOC_DISPLAYNAME, W_CELSIUS, W_ICONNAME, LASTMODIFIED, HASPHOTOS FROM DJENTRY WHERE UUID = '84002381947A48D6A7F3E37D0ABC47BA'", function (err, row) {
            if (err) {
                console.error("Error occurred during processing.".red);
            }
            processRow(row);
        });
    });
    db.close();
} else {
    console.error("Database can not be found or invalid format!".red);
}

function processRow(row) {
    if (!checkOutputDir()) {
        return;
    }

    console.log("Creating new entry for uuid ", row.DTM);
    var newItem = createEntry(row);

    if (row.HASPHOTOS === 1) {
        console.log("Processing image...");
        newItem.photos = processImages(newItem.id, row);
    }

    console.log("Saving entry to output directory...");
    saveEntry(newItem.id, newItem);

    console.log("Zipping the contents of the output directory...");
    zipEntries();
}

function checkOutputDir() {
    var entries = glob.sync("**/out/*.json");
    if (entries.length > 0) {
        console.error("The `out` directory already contains files. Aborting operation.".red);
        return false;
    }
    return true;
}

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

function processImages(id, row) {
    var photos = [];

    glob.sync("**/images/" + row.UUID + "*").forEach(function (photo) {
        var ext = generateUuid();
        var newPhotoName = id + "-" + ext + ".jpg";

        photos.push(newPhotoName);

        var from = path.resolve(__dirname, photo);
        var to = path.join(__dirname, "out", newPhotoName);

        fsx.copySync(from, to);
    }, this);

    return photos;
}

function saveEntry(id, content) {
    fs.writeFileSync(path.join(__dirname, "out", id + ".json"),
                     JSON.stringify(content), "utf8");
}

function zipEntries() {
    var zip = new EasyZip();
    var files = [];

    glob.sync("**/out/*.j*").forEach(function (file) {
        files.push({
            source: file,
            target: file.split("/")[1]
        });
    });

    zip.batchAdd(files, function () {
        zip.writeToFile("./out.zip");
        console.log("Done compressing");
    });
}

function generateUuid() {
    function s4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }

    var guid = (s4() + s4() + s4() + s4()).toLowerCase();

    return guid;
}
