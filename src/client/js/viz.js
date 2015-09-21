function Viz() {
	this.canvas = $('#canvas');
	this.canvasElem = document.getElementById('canvas');
	this.ctx = this.canvasElem.getContext('2d');
	this.currentAnimation = null;
	this.docH = null;
	this.docW = null;
	this.fps = 15;
	this.loop = null;
	this.stageViz = new StageViz();
	this.tsViz = new TsViz();

	this.resize();
}


Viz.prototype.play = function(animationName) {
	if(!this.currentAnimation != animationName) {
		
		if(this.currentAnimation) {
			this.stop();
		}
		
		var thisObj = this;
		this.loop = window.setInterval(function() {
			thisObj[animationName + 'Viz'].draw();
		}, 1000/this.fps);
		
		this.currentAnimation = animationName;
	}
}

Viz.prototype.stop = function() {
	if(this.currentAnimation) {
		window.clearInterval(this.loop);
		this.loop = null;
		this.ctx.clearRect(0, 0, this.docW, this.docH);
		this.currentAnimation = null;
	}
}

Viz.prototype.resize = function() {
	this.docH = $(document).height();
	this.docW = $(document).width();
	this.canvas.attr('width', this.docW);
	this.canvas.attr('height', this.docH);
	
	this.stageViz.setup();
}


/*
 * Static class implementing the visualization for the title screen
 */

function TsViz() {
	this.jointColor = '#D0D0D0';
	this.jointWidth = 1;
	this.maxJointSize = 150;
	this.minJointSize = 0;
	this.maxParticuleSize = 5;
	this.minParticuleSize = 1;
	this.nParticules = 70;
	this.particuleColor = 'rgba(250, 250, 250, 0)';
	this.particules = [];
	this.speedSizeRatio = .1;
}

TsViz.prototype.generateParticules = function() {
	
	for(var i=0; i<this.nParticules; i++) {
		var part = {};
		
		part.size = parseInt((Math.random() * this.maxParticuleSize) + this.minParticuleSize);
		part.x = Math.random() * viz.docW;
		part.y = Math.random() * viz.docH;
		part.direction = Math.random();
		
		this.particules.push(part);
	}
}


TsViz.prototype.draw = function() {
	// Clear canvas
	viz.canvasElem.width = viz.canvasElem.width
	
	if(this.particules.length == 0) {
		this.generateParticules();
	}
	
	for(var i in this.particules) {
		var part = this.particules[i];
		
		// Update particle
		this.rainUpdate(part);
		
		// Draw particle
		viz.ctx.fillStyle = this.particuleColor;
		viz.ctx.fillRect(part.x, part.y, part.size, part.size);
	}
	
	// Draw Joints
	joint = this.findJoints();
	
	for(var i in joints) {
		var joint = joints[i];
		
		viz.ctx.strokeStyle = this.jointColor;
		viz.ctx.lineWidth = this.jointWidth;
		viz.ctx.beginPath();
		viz.ctx.moveTo(joint.x1, joint.y1);
		viz.ctx.lineTo(joint.x2, joint.y2);
		viz.ctx.stroke();
	}
}


TsViz.prototype.rainUpdate = function(part) {
	if(part.direction < 0.5) {
		part.x += this.speedSizeRatio * part.size;
		part.y += this.speedSizeRatio * part.size;
	} else {
		part.x -= this.speedSizeRatio * part.size;
		part.y += this.speedSizeRatio * part.size;
	}
	
	
	if(part.x > (viz.docW + part.size) && part.direction < 0.5) {
		part.x = -1 * part.size;
	} else if(part.x < 0-part.size && part.direction >= 0.5) {
		part.x = viz.docW + part.size;
	}
	
	if(part.y > (viz.docH + part.size)) {
		part.y = -1 * part.size;
	} else if(part.y < 0-part.size) {
		part.y = viz.docH + part.size();
	}
}


TsViz.prototype.findJoints = function() {
	joints = [];
	
	// Compute distances
	for(var i=0; i<this.particules.length; i++) {
		var origin = this.particules[i];
		
		for(var j=i+1; j<this.particules.length; j++) {
			var dest = this.particules[j];
				
			var d = this.distance(origin.x, origin.y, dest.x, dest.y);
			if(d>this.minJointSize && d<this.maxJointSize) {
				joints.push({'x1': origin.x, 'y1': origin.y, 'x2': dest.x, 'y2': dest.y});
			}
		}
	}
	
	return joints;
}


TsViz.prototype.distance = function(x1, y1, x2, y2) {
	return Math.sqrt((Math.pow((x2-x1), 2)) + (Math.pow((y2-y1), 2)));
}



/*
 *  Stage Viz
 */

function StageViz() {
	this.BLACK_KEYS = [37, 39, -1, 42, 44, 46, -1, 49, 51, -1, 54, 56, 58, -1, 61, 63, -1, 66, 68, 70, -1, 73, 75, -1, 78, 80, 82];
	this.KEY_COLORS = ['255, 0, 96', '48, 184, 255', '29, 166, 255', '255, 166, 29'];
	this.WHITE_KEYS = [36, 38, 40, 41, 43, 45, 47, 48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84];
	
	this.blackKeyOffset = 15;
	this.decayOpacity = .1;
	this.decaySize = .4;
	this.fadeDelay = 70; // in ms
	this.firstKey = 36;
	this.nKeys = 49;
	this.keys = {};
	this.keyWidth = 30;
	this.keyMargin = 2;
	this.leftMargin = 0;
	this.topMargin = 0;
	
	this.setup();
}

StageViz.prototype.setup = function() {
	
	// TODO
	// Adjust the size of the keys to fit the screen
	//this.keyWidth = ($(document).width() / (this.WHITE_KEYS.length));
	
	// Adjust the size of the keyboard for the screen
	this.leftMargin = ($(document).width() - (this.keyWidth + 2*this.keyMargin) * this.WHITE_KEYS.length) / 2;
	
	// Adjust the vertical position of the keyboard, should be a the center of the screen
	this.topMargin = ($(document).height() / 2) - (this.keyWidth / 2);
}

StageViz.prototype.draw = function() {
	var cleared = false;
	
	thisObj = viz.stageViz;
	for(var i in thisObj.keys) {
		var part = thisObj.keys[i];
		
		if(part.opacity > 0) {
			if(part.fadeDelay == 0) {
				part.opacity -= thisObj.decayOpacity;
				part.size -= thisObj.decaySize;
				part.x += thisObj.decaySize / 2;
				part.y += thisObj.decaySize / 2;
			} else {
				part.fadeDelay--;
			}
			
			if(!cleared) {
				viz.canvasElem.width = viz.canvasElem.width;
				cleared = true;
			}
			
			viz.ctx.fillStyle = 'rgba(' + part.rgb + ', ' + part.opacity + ')';
			//viz.ctx.beginPath();
			//viz.ctx.arc(part.x, part.y, part.size/2, 0, Math.PI * 2);
			//viz.ctx.fill();
			viz.ctx.fillRect(part.x, part.y, part.size, part.size);
		}
	}
}

StageViz.prototype.midiInput = function(msg) {
		
	var key = msg.midi[1];
	var velocity = msg.midi[2];
	var part = {};
	
	if(key >= this.firstKey && key <= (this.firstKey + this.nKeys - 1)) {
		// Set the offset
		part.x = this.leftMargin;
		part.y = this.topMargin;
		
		// Set Position
		if(this.BLACK_KEYS.indexOf(key) != -1) {
			part.x += ((this.keyWidth + this.keyMargin) * (this.BLACK_KEYS.indexOf(key))) + 15;
			part.y -= this.blackKeyOffset;
		}
		
		if(this.WHITE_KEYS.indexOf(key) != -1) {
			part.x += ((this.keyWidth + this.keyMargin) * (this.WHITE_KEYS.indexOf(key)));
		}
		
		// Set color
		part.rgb = this.KEY_COLORS[room.players[msg.playerId].position];
		
		// Other properties
		if(velocity == 0) {
			this.keys[key].fadeDelay = 0;
		} else {
			part.fadeDelay = this.fadeDelay;
			part.opacity = velocity / 64;
			part.size = this.keyWidth;
			this.keys[key] = part;
		}
	}
}


/* 
 * Init Visualization
 */

function initViz() {
	viz = new Viz;
}
