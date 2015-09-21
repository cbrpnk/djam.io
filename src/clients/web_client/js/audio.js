instCfgs = [
	{'name': 'Drum', 'version': '1', 'keyStart': 36, 'keyEnd': 71, 'soundPath': 'drum/', 'sustain': false, 'lowpass': false},
	{'name': 'Piano', 'version': '1', 'keyStart': 36, 'keyEnd': 84, 'keys': [38, 43, 48, 53, 58, 63, 68, 73, 78, 83], 'soundPath': 'piano/', 'sustain': true, 'lowpass': true}
];


/*
 * Audio class
 */

function Audio() {
	// Range of supported MIDI channels/keys [inclusive]
   this.MIDI_CHANNEL_RANGE_LOW = 129;
   this.MIDI_CHANNEL_RANGE_HIGH = 159;
	this.MIDI_KEY_RANGE_LOW = 36;
	this.MIDI_KEY_RANGE_HIGH = 84
	
	window.AudioContext = window.AudioContext || window.webkitAudioContext;
	this.context = new AudioContext();
	this.currentlyPressed = {};
	this.decayRate = 14; // in ms
	this.instruments = {};
	this.mute = false;
}


Audio.prototype.loadInstrument = function(instData) {
	var instrument = new Instrument(instData);
	this.instruments[instData.name] = instrument;
	
	for(var i in instrument.keys) {
		index = instrument.keys[i].toString();
		
		var thisObj = this;
		this.loadSound(instrument.soundPath, index, instrument.version, function(sound, pos) {
			thisObj.instruments[instrument.name].sounds[pos] = sound;
		});
	}
}


Audio.prototype.loadSound = function(soundPath, index, version, callback) {
	fileType = 'ogg';
	if(navigator.vendor == 'Apple Computer, Inc.')
		fileType = 'mp3';
		
	var req = new XMLHttpRequest();
	req.open('GET', 'http://static1.djam.io/instruments/' + soundPath + fileType + '/'  + index + '.' + fileType + '?v=' + version, true);
	req.responseType = 'arraybuffer';
	
	var thisObj = this;
	req.onload = function(e) {
		thisObj.context.decodeAudioData(req.response, function(buffer) {
			callback(buffer, index);
		});
	}
	
	req.send();
}

Audio.prototype.playSound = function(key, buffer, rate, vol, lowpass) {
	
	var source = this.context.createBufferSource();
	var lpFilter = this.context.createBiquadFilter();
	var gainNode = this.context.createGain();
	
	if(lowpass) {
		source.connect(lpFilter);
		lpFilter.connect(gainNode);
		lpFilter.type = 'lowpass';
		lpFilter.frequency.value = 3000 * vol;
	} else {
		source.connect(gainNode);
	}
	gainNode.connect(this.context.destination);
	
	source.buffer = buffer;
	gainNode.gain.value = vol;
	
	// Save sound nodes
	this.currentlyPressed[key] = {};
	this.currentlyPressed[key]['stopSound'] = false;
	this.currentlyPressed[key]['gainNode'] = gainNode;
	
	source.playbackRate.value = rate;
	source.start(0);
	//console.log(window.performance.now());
}

Audio.prototype.stopSound = function(key) {
	var sound = this.currentlyPressed[key];
	sound.stopSound = true;
	
	var thisObj = this;
	var loop = setInterval(function() {
		if(sound.gainNode.gain.value > 0.01 && sound.stopSound) {
			sound.gainNode.gain.value *= .95;
		} else {
			clearInterval(loop);
		}
	}, this.decayRate);
}

/*
 * Instrument Class
 */

function Instrument(data) {
	this.NOTE_RATIO = .059463094359;
	
	this.name = data.name;
	this.keys = [];
	this.keyStart = data.keyStart;
	this.keyEnd = data.keyEnd;
	this.lowpass = data.lowpass;
	this.soundPath = data.soundPath;
	this.fileType = data.fileType;
	this.sounds = {};
	this.sustain = data.sustain;
	this.version = data.version
	
	if(data.keys){
		this.keys = data.keys;
	} else {
		for(var i=data.keyStart; i<data.keyEnd; i++) {
			this.keys.push(i);	
		}
	}
}


Instrument.prototype.playMidi = function(midi_packet) {
	
	if(midi_packet[1].toString() >= this.keyStart && midi_packet[1].toString() <= this.keyEnd) {
		// Velocity
		if(midi_packet[2] == 0) {
			if(this.sustain)
				audio.stopSound(midi_packet[1].toString());
		} else {
			
			// Find the the nearest sound (in terms of frequency) and the rate at which it should be
			// played to get desired note
			var soundRate = this.findSoundAndRate(midi_packet[1]);
			
			audio.playSound(midi_packet[1].toString(), soundRate.sound, soundRate.rate, midi_packet[2]/127, this.lowpass);
		}
	}
}

Instrument.prototype.findSoundAndRate = function(targetNote) {
	var bestSoundCode = 0;
	var bestDiff = 1000;

	for(var i in this.keys) {
		var diff = Math.abs(this.keys[i] - targetNote);
		if(diff <= bestDiff) {
			bestDiff = diff;
			bestSoundCode = this.keys[i];
		}
	}
	
	var rate = 1 + (targetNote - bestSoundCode) * this.NOTE_RATIO;
	
	return {'sound': this.sounds[bestSoundCode], 'rate': rate};
}



/*
 * Event handlers
 */

$(document).on('msg_midi', function(e, msg) {
	if(session && session.players.indexOf(msg.username) != -1) {
		audio.instruments[msg.inst].playMidi(msg.midi);
	}
});


/*
 * Init
 */
function initAudio() {
	audio = new Audio();
	
	instCfgs.forEach(function(cfg) {
		audio.loadInstrument(cfg);
	});
}

