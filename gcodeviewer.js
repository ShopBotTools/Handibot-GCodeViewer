/*jslint todo: true, browser: true, continue: true */
/*global THREE */

/**
 * Written by Alex Canales for ShopBotTools, Inc.
 */

var GCodeViewer = {
    renderer : {},
    camera: {},
    scene: {},
    controls: {},
    width : window.innerWidth,
    height: window.innerHeight,
    initialized : false,
    lines: [],  //Represents the paths of the bit
    cncConfiguration: {},
    gcode: [],

    initialize: function(configuration) {
        var that = GCodeViewer;
        if(that.initialized === true) {
            return;
        }
        that.cncConfiguration = configuration;
        that.scene = new THREE.Scene();
        that.camera = new THREE.PerspectiveCamera(75, that.width/that.height,
                0.1, 1000);
        //TODO: configure OrthographicCamera
        // that.camera = new THREE.OrthographicCamera(that.width / - 2, that.width / 2,
        //         that.height / 2, that.height / - 2, 1, 1000);
        that.renderer = new THREE.WebGLRenderer();
        that.renderer.setSize(that.width, that.height);
        document.body.appendChild(that.renderer.domElement);
        that.initialized = true;

        that.controls = new THREE.OrbitControls(that.camera);
        that.controls.damping = 0.2;
        that.controls.addEventListener('change', that.render);
    },

    render: function() {
        var that = GCodeViewer;
        window.requestAnimationFrame(that.render);
        // that.controls.update();
        that.renderer.render(that.scene, that.camera);
    },

    addCurveToLines: function(curve) {
        var that = GCodeViewer;
        var path = new THREE.Path(curve.getPoints(50));
        var geometry = path.createPointsGeometry(50);
        var material = new THREE.LineBasicMaterial({ color : 0xffffff });

        // Create the final Object3d to add to the scene
        that.lines.push(new THREE.Line(geometry, material));
    },

    //Careful, we use Z as up, THREE3D use Y as up
    addStraightPath: function(start, end) {
        var curve = new THREE.LineCurve3(
            new THREE.Vector3(start.x, start.z, start.y),
            new THREE.Vector3(end.x, end.z, end.y)
        );
        GCodeViewer.addCurveToLines(curve);
    },

    setGCode: function(string) {
        var that = GCodeViewer;
        that.gcode = string.split('\n');
    },

    createGrid : function() {
        var size = 10;
        var step = 1;

        var gridHelper = new THREE.GridHelper(size, step);
        return gridHelper;
    },

    //Returns a string if no command
    removeComments: function(command) {
        return command.split('(')[0].split(';')[0]; //No need to use regex
    },

    //TODO: do for more than a command by line
    parseGCode: function(command) {
        if(command === "") {
            return {};
        }
        var that = GCodeViewer;
        var com = that.removeComments(command);  //COMmand
        var obj = {};
        var res;

        if(com === "") {
            return {};
        }

        //TODO: do the same for all commands
        if(com.indexOf("G0") !== -1 || com.indexOf("G1") !== -1) {
            if(com.indexOf("G0") !== -1) {
                obj = { type: "G0" };
            } else {
                obj = { type: "G1" };
            }

            res = /X(\d+(\.\d*)?)/.exec(com);
            if(res !== null && res.length > 1) {
                obj.x = parseFloat(res[1], 10);
            }
            res = /Y(\d+(\.\d*)?)/.exec(com);
            if(res !== null && res.length > 1) {
                obj.y = parseFloat(res[1], 10);
            }
            res = /Z(\d+(\.\d*)?)/.exec(com);
            if(res !== null && res.length > 1) {
                obj.z = parseFloat(res[1], 10);
            }
        } else if(com.indexOf("G2") !== -1 || com.indexOf("G3") !== -1) {
            //NOTE: not implemented yet
            if(com.indexOf("G2") !== -1) {
                obj = { type: "G2" };
            } else {
                obj = { type: "G3" };
            }
        } else if(com.indexOf("G4") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "G4" };
        } else if(com.indexOf("G20") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "G20" };
        } else if(com.indexOf("G21") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "G21" };
        } else if(com.indexOf("G90") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "G90" };
        } else if(com.indexOf("G91") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "G91" };
        } else if(com.indexOf("M4") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "M4" };
        } else if(com.indexOf("M8") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "M8" };
        } else if(com.indexOf("M30") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "M30" };
        }

        return obj;
    },

    viewGCode: function(code) {
        var that = GCodeViewer;
        var i = 0;
        var lastPosition = { x:0, y:0, z:0 };
        var result = {};
        that.setGCode(code);

        for(i=0; i < that.gcode.length; i++) {
            result = that.parseGCode(that.gcode[i]);
            //TODO: look the type and do stuff
        }
    },

    test: function() {
        var that = GCodeViewer;
        var i = 0;

        that.addStraightPath({x:0,y:0,z:0}, {x:0,y:0,z:-1});
        that.addStraightPath({x:0,y:0,z:-1}, {x:1,y:1,z:-1});
        that.addStraightPath({x:1,y:1,z:-1}, {x:1,y:1,z:2});
        that.addStraightPath({x:1,y:1,z:2}, {x:0,y:0,z:2});
        that.addStraightPath({x:0,y:0,z:2}, {x:0,y:0,z:0});

        that.scene.add(that.createGrid());
        for(i=0; i < that.lines.length; i++) {
            that.scene.add(that.lines[i]);
        }

        console.log("done");
        that.camera.position.x = 1;
        that.camera.position.y = 1;
        that.camera.position.z = 1;
        that.camera.lookAt(new THREE.Vector3(0, 0, 0));

        that.render();
    }
};
