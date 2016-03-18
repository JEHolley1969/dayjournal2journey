var fs = require("fs");
var path = require("path");
var glob = require("glob");
var fsx = require('fs-extra');
var sqlite3 = require("sqlite3").verbose();

var file = "./db/dayjournal.db";
var tpl = require("./templates/newItem.json");
var weatherMap = require("./templates/weatherMap.json");

if (fs.existsSync(file)) {
    var db = new sqlite3.Database(file, sqlite3.OPEN_READONLY);
    db.serialize(readEntries);
    db.close();
} else {
    console.error("Database can not be found or invalid format!");
}

function readEntries() {
    db.each("SELECT UUID, DTM, CONTENT, LOC_PLACENAME, LOC_LATITUDE, LOC_LONGITUDE, LOC_DISPLAYNAME, W_CELSIUS, W_ICONNAME, LASTMODIFIED, HASPHOTOS FROM DJENTRY", function(err, row) {
        if (err) { console.error("Error occurred during processing."); }
        processRow(row);
    });
}

function processRow(row) {
    var newItem = createEntry(row);

    if (row.HASPHOTOS == 1) {
        newItem.photos = processImages(newItem.id, row);
    }

    saveEntry(newItem.id, newItem);
}

function createEntry(dayJournalEntry) {
    var id = generateUuid();
    var newItem = JSON.parse(JSON.stringify(tpl));

    console.log("Creating new entry with id ", dayJournalEntry.DTM + "-" + id);

    newItem.id = dayJournalEntry.DTM + "-" + id;
    newItem.text = dayJournalEntry.CONTENT;
    newItem.date_journal = dayJournalEntry.DTM;
    newItem.date_modified = dayJournalEntry.LASTMODIFIED;
    newItem.preview_text = dayJournalEntry.CONTENT;

    newItem.address = dayJournalEntry.LOC_DISPLAYNAME;
    newItem.lat = parseFloat(dayJournalEntry.LOC_LATITUDE);
    newItem.lon = parseFloat(dayJournalEntry.LOC_LONGITUDE);

    if (dayJournalEntry.W_CELSIUS)
        newItem.weather.degree_c = parseFloat(dayJournalEntry.W_CELSIUS);

    if (dayJournalEntry.W_ICONNAME) {
        newItem.weather.description = weatherMap[dayJournalEntry.W_ICONNAME].desc;
        newItem.weather.icon = weatherMap[dayJournalEntry.W_ICONNAME].img;
    }

    newItem.weather.place = dayJournalEntry.LOC_PLACENAME;

    return newItem;
}

function processImages(id, row) {
    var photos = [];

    glob.sync("**/images/" + row.UUID + "*").forEach(function(photo) {
        var ext = generateUuid();
        var newPhotoName = id + "-" + ext + ".jpg";

        photos.push(newPhotoName);

        console.log("Processing image...");

        var from = path.resolve(__dirname, photo);
        var to = path.join(__dirname, "out", newPhotoName);

        fsx.copySync(from, to);
    }, this);

    return photos;
}

function saveEntry(id, content) {
    console.log("Saving entry to output directory...");
    fs.writeFileSync(path.join("./out", id + ".json"), JSON.stringify(content), "utf8");
}

function generateUuid() {
    function S4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }

    guid = (S4() + S4() + S4() + "4" + S4().substr(0, 3)).toLowerCase();
    return guid;
}