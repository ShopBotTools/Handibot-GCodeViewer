/*jslint todo: true, browser: true, continue: true, white: true*/
/*global THREE, GCodeViewer, GCodeToGeometry*/

/**
 * Written by Alex Canales for ShopBotTools, Inc.
 */

/**
 * This file contains the class managing the animation of the bit.
 */

//refreshFunction is the function to refresh the display/render the scene
//path is the instance of the class Path
GCodeViewer.Animation = function(scene, refreshFunction, gui, path, fps,
        initialPosition) {
    "use strict";
    var that = this;

    var lengthBit = 1;
    var G0Feedrate = 120;

    //Get the position of the tip of the bit according to the meshes of
    //the path class.
    function getRelativeBitPosition() {
        var pos = that.bit.position;
        return {
            x : pos.x - that.initialPosition.x,
            y : pos.y - that.initialPosition.y,
            z : pos.z - that.initialPosition.z
        };
    }

    function setBitPosition(point) {
        that.bit.position.set(point.x, point.y, point.z);
    }

    function translateBit(vector) {
        that.bit.position.add(vector);
    }

    //Used to have an smooth animation
    //Returns the time elapsed between each update.
    function calculateDeltaTime() {
        //TODO: should have a maximum
        var newTime = new Date().getTime();
        var deltaTime = newTime - that.lastTime;
        that.lastTime = newTime;
        return deltaTime;
    }

    //Check if the animation is starting to animate a new path
    function isStartingPath() {
        if(that.iPath === 0) {
            return true;
        }
        var currentLine = that.currentPath[that.iPath].lineNumber;
        var previousLine = that.currentPath[that.iPath-1].lineNumber;

        return (currentLine !== previousLine);
    }

    //Check if the animation is ending the animation of a path
    function isEndingPath() {
        if(that.iPath === 0) {
            return false;
        }
        if(that.iPath === that.currentPath.length - 1) {
            return true;
        }
        var currentLine = that.currentPath[that.iPath].lineNumber;
        var nextLine = that.currentPath[that.iPath+1].lineNumber;

        return (currentLine !== nextLine);
    }

    //Warns the path class of the current position
    //changedIndex {bool}, if true, means that the point reached the current point
    function warnPath(changedIndex) {
        var pointPath = that.currentPath[that.iPath];
        if(changedIndex === false) {
            that.path.isReachingPoint(pointPath, getRelativeBitPosition());
        } else {
            if(isStartingPath() === true) {
                that.path.startPath(pointPath);
            } else if(isEndingPath() === true) {
                that.path.endPath(pointPath);
            } else {
                that.path.reachedIntermediate(pointPath);
            }
        }
    }

    function setCurrentSpeed() {
        //We use in/ms here and feedrate is in in/min
        var line = that.currentPath[that.iPath];
        if(line.type === "G0") {
            that.currentSpeed = G0Feedrate / 60000;
        } else {
            that.currentSpeed = that.currentPath[that.iPath].feedrate / 60000;
        }
    }

    //Check if need to change index of the path and do the appropriate operations
    //return true if continuing the animation, else false
    function checkChangeIndexPath() {
        //While instead of if because we can have commands that have same
        //start and end points
        while(that.iPath < that.currentPath.length &&
                GCodeViewer.samePosition(that.currentPath[that.iPath].point,
                    getRelativeBitPosition()) === true) {
            warnPath(true);
            that.iPath++;

            if(that.iPath >= that.currentPath.length) {
                that.isInPause = true;
                that.gui.setStatusAnimation("pause");
                return false;
            }
            that.gui.highlight(that.currentPath[that.iPath].lineNumber);
            setCurrentSpeed();
        }
        return true;
    }

    //deltaDistance : the distance to make
    //returns true if can continue animation
    function moveBit(deltaDistance) {
        var destination = that.currentPath[that.iPath].point;
        var position = getRelativeBitPosition();
        var translation = {
            x : destination.x - position.x,
            y : destination.y - position.y,
            z : destination.z - position.z
        };
        var distance2 = translation.x * translation.x;
        distance2 += translation.y * translation.y;
        distance2 += translation.z * translation.z;

        if(distance2 > deltaDistance * deltaDistance) {
            var length = Math.sqrt(distance2);
            translation.x = translation.x / length * deltaDistance;
            translation.y = translation.y / length * deltaDistance;
            translation.z = translation.z / length * deltaDistance;
            translateBit(translation);
            warnPath(false);
            return true;
        }

        setBitPosition(destination);
        if(checkChangeIndexPath() === false) {
            return false;
        }

        return moveBit(deltaDistance - Math.sqrt(distance2));
    }

    // Updates the position and do the logical for the animation.
    function update() {
        var deltaTime = calculateDeltaTime(); //Must be here to update each time
        if(that.isPaused() === true) {
            return;
        }

        moveBit(that.currentSpeed * deltaTime);

        that.refreshFunction();
    }

    /**
     * Returns if the animation is paused.
     *
     * @return {boolean} True if the animation is paused.
     */
    that.isPaused = function() {
        return that.isInPause === true;
    };

    /**
     * Returns if the animation is running.
     *
     * @return {boolean} True if the animation is running.
     */
    that.isRunning = function() {
        return that.isInPause === false;
    };

    /**
     * Starts the animation from the beginning of the path.
     *
     * @return {boolean} Returns true if start the animation; false if problem.
     */
    that.start = function() {
        console.log("[animation] start");
        that.currentPath = that.path.getPath();
        that.iPath = 0;
        if(that.currentPath.length === 0) {
            return false;
        }

        that.gui.highlight(that.currentPath[that.iPath].lineNumber);
        that.bit.position.setX(that.initialPosition.x + that.currentPath[0].point.x);
        that.bit.position.setY(that.initialPosition.y + that.currentPath[0].point.y);
        that.bit.position.setZ(that.initialPosition.z + that.currentPath[0].point.z);
        setCurrentSpeed();
        that.refreshFunction();

        that.animating = true;  //Must be at the end
        that.isInPause = false;

        return true;
    };

    //Returns the index of the point in path associated to this lineNumber
    // returns -1 if nothing found
    function fineIndexPath(lineNumber) {
        var i = 0;
        for(i=0; i < that.currentPath.length; i++) {
            if(that.currentPath[i].lineNumber === lineNumber) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Starts the animation according to the command in the line number given
     * (the animation is paused).
     *
     * @param {number} lineNumber The line number of the command.
     * @return {boolean} Returns true if start the animation; false if problem.
     */
    that.goTo = function(lineNumber) {
        that.path.redoMeshes();
        that.pause();
        that.currentPath = that.path.getPath();
        var iLine = fineIndexPath(lineNumber);
        var pos = { x : 0, y : 0, z : 0 };
        var pointPath;

        if(iLine === -1) {
            return false;
        }

        for(that.iPath=0; that.iPath <= iLine; that.iPath++) {
            pointPath = that.currentPath[that.iPath];
            if(isStartingPath() === true) {
                that.path.startPath(pointPath);
            } else if(isEndingPath() === true) {
                that.path.endPath(pointPath);
            } else {
                that.path.reachedIntermediate(pointPath);
            }
        }

        pos = that.currentPath[that.iPath-1].point;
        that.bit.position.setX(pos.x + that.initialPosition.x);
        that.bit.position.setY(pos.y + that.initialPosition.y);
        that.bit.position.setZ(pos.z + that.initialPosition.z);

        that.gui.highlight(that.currentPath[that.iPath].lineNumber);
        setCurrentSpeed();
        that.animating = true;
        that.isInPause = true;
        that.refreshFunction();

        return true;
    };

    /**
     * Pauses the animation.
     */
    that.pause = function() {
        that.isInPause = true;
        that.gui.setStatusAnimation("pause");
    };

    /**
     * Resumes the animation.
     */
    that.resume = function() {
        if(that.currentPath.length > 0) {
            if(that.iPath === that.currentPath.length) {
                that.reset();
            }
            that.isInPause = false;
            that.gui.setStatusAnimation("running");
        } else {
            that.start();
        }
    };

    that.rewind = function() {
        setBitPosition(that.initialPosition);
        that.iPath = 0;
        that.path.redoMeshes();
        that.pause();
        that.refreshFunction();
    };

    /**
     * Resets the animation.
     */
    that.reset = function() {
        console.log("[animation] reset");
        that.rewind();
        that.currentPath = that.path.getPath();
    };

    function createBit() {
        var material = new THREE.MeshLambertMaterial({color: 0xF07530,
            transparent: true, opacity: 0.5});
        var geometry = new THREE.CylinderGeometry(0, lengthBit / 5, lengthBit, 32);
        geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
        geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0, lengthBit/2));
        that.bit = new THREE.Mesh(geometry, material);
        setBitPosition(that.initialPosition);
        that.scene.add(that.bit);
        that.refreshFunction();
    }

    //initialize
    that.currentPath = [];
    that.path = path;
    if(initialPosition === undefined) {
        that.initialPosition = { x : 0, y : 0, z : 0};
    } else {
        that.initialPosition = initialPosition;
    }
    that.scene = scene;
    that.refreshFunction = refreshFunction;
    that.gui = gui;
    createBit();

    that.pause();
    that.lastTime = new Date().getTime();
    setInterval(update, 1000 / fps);
};
