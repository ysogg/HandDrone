var arDrone = require('ar-drone')
var Client = arDrone.createClient()
var navdata;

Client.config('general:navdata_demo', 'FALSE')

Client.on('navdata', function(data) {
    navdata = data;
    console.log(navdata.demo);
})