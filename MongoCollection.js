var Collection = require("infrastructure/lib/ExtendedCollection");
var sync = require("./mongo-backbone-sync.js");

module.exports = Collection.extend("MongoCollection", {
  __sync: sync
});
