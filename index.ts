let fs = require("fs");
let fsx = require("fs-extra");
let glob = require("glob");
let JSZip = require("jszip");
let path = require("path");
let sqlite3 = require("sqlite3").verbose();

let tpl = require("./newItem.json");
let weatherMap = require("./weatherMap.json");

let db = "./dayjournal.db";
let imageCache = {};
let outDir = "out";
let errors = {
    database: "Database file can not be found or invalid format!",
    isEmpty: "`" + outDir + "` directory already contains files! Aborting operation...",
    processing: "Error occurred during processing!",
    zipping: "An error occurred during the zipping proces!"
};
let query = "SELECT UUID, DTM, CONTENT, LOC_PLACENAME, LOC_LATITUDE, LOC_LONGITUDE, LOC_DISPLAYNAME, W_CELSIUS, W_ICONNAME, LASTMODIFIED, HASPHOTOS FROM DJENTRY";

console.log("ok");