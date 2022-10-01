const arDrone = require('ar-drone');
const Client = arDrone.createClient();

Client.config('general:navdata_demo', 'FALSE')

const control = arDrone.createUdpControl();

const readline = require('readline');

const Leap = require('leapjs');
const frame = require('leapjs/lib/frame');

const yawTrim = 0.5;
const deadzone = 55;
const xzScale = 0.0035;
const yScale = 0.003;

var flightPath = {x:0, y:0, z:0, yaw:0}
var pcmd = {};
var flying = false;
var emergency = false;
var navdata;
var X, Y, Z, YAW;

//Connect camera
var controller = new Leap.Controller();

controller.on('connect', function() {
    console.log("Successfully connected.");
  });
controller.connect();

//Hand coords
controller.on('deviceFrame', function(frame) {
    if (frame.hands.length > 0) {
        var hand = frame.hands[0];
        var pos = hand.palmPosition;
        var dir = hand.direction;
        
        //Hand
        var x = pos[0];
        var y = pos[1]; //Up
        var z = pos[2];

        //Drone
        //x = forward, y = horiz, z = vert

        var horizDir = dir[0]; //0.99 -> -0.99
    }

    // console.log(horizDir)
    console.log('x-value: ' + x + ' | y-value: ' + (y - 135) + ' | z-value: ' + z);
    (x == undefined) ? (flightPath.x = 0) : (flightPath.x = x);
    (y == undefined) ? (flightPath.y = 0) : (flightPath.y = y - 135);
    (z == undefined) ? (flightPath.z = 0) : (flightPath.z = z);
    (horizDir == undefined) ? (flightPath.yaw = 0) : (flightPath.yaw = horizDir);

    // X = (flightPath.x *= xzScale);
    // Y = (flightPath.y *= yScale);
    // Z = (flightPath.z *= xzScale);
    // YAW = (flightPath.yaw *- yawTrim);
    X = flightPath.x;
    Y = flightPath.y;
    Z = flightPath.z;
    // YAW = flightPath.yaw; // Yaw is annoying
});


function move() {
    if (!navdata || !navdata.demo) {
        return;
    }
    
    if (navdata && navdata.droneState.flying) {
        if (flightPath.x >= deadzone || flightPath.x <=(-deadzone)) pcmd[(flightPath.x > 0) ? "right" : "left"] = Math.abs(X);
        if (flightPath.y >= 40 || flightPath.y <=(-30)) pcmd[(flightPath.y > 0) ? "up" : "down"] = Math.abs(Y);
        if (flightPath.z >= deadzone || flightPath.z <=(-deadzone)) pcmd[(flightPath.z > 0) ? "back" : "front"] = Math.abs(Z);
    }

    control.ref({fly: flying, emergency: emergency});
    control.pcmd(pcmd);
    control.flush();
    pcmd = {};
}


Client.on('navdata', (data) => {
    navdata = data;
    updatePosition()
    // console.log(navdata.demo)
})


function updatePosition() {
    move();
    //Counter steering functions would go here
    //Ended up not using any
}



/*
*
*       Console key controls (start, stop, e-landing)
*
*/

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') {
        process.exit();
    } else if (key.name === 'c') {
        // client.calibrate(0);
        if (navdata.droneState.flying === 0) {
            /*
            * .raw queues a raw command which allows for full control,
            * FTRIM calibrates all positional states by resetting their 
            * current values to 0
            */
            control.raw('FTRIM',)
            control.flush();
            console.log("setting ground");
        }
    }

    if (key.name === 'space' && navdata) {
		if (navdata.droneState.emergencyLanding === 1) {
			var startTime = Date.now();

			var intervalID = setInterval(() => {
				emergency = true;
				control.config('general:navdata_demo', 'TRUE');
				control.ref({ fly: flying, emergency: emergency });
				control.flush();

				var elapsed = Date.now() - startTime;
				if (elapsed > 1000) {
					clearInterval(intervalID);
					emergency = false;
				}
			}, 30);

			return;
		}

		if (navdata.droneState.flying === 0) {
            flying = true;
            // Client.takeoff();
		} else
            flying = false;
            // Client.stop();
            // Client.land();
	}

	if (key.name === 'escape') {
		flying = false;
		control.raw('REF', 1 << 8);
        control.flush();
	}
});