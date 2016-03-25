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
console.log("ok");
//# sourceMappingURL=index.js.map