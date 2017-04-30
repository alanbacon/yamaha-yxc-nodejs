var Promise = require("bluebird");
var request = Promise.promisify(require("request"));
Promise.promisifyAll(request);


function YamahaYXC() {}

YamahaYXC.prototype.SendGetToDevice = function(cmd) {
    var self = this;
    return this.getOrDiscoverIP().then(ip => {
        var delay = 0;
        var req = {
            method: 'GET',
            uri: 'http://' + ip + '/YamahaExtendedControl/v1' + cmd,
        };
        if (this.requestTimeout) req.timeout = this.requestTimeout;

        var prom = request.getAsync(req).delay(delay).then(response => response.body)
        if (self.catchRequestErrors === true) prom.catch(console.log.bind(console));

        return prom

    })

};

YamahaYXC.prototype.SendPostToDevice = function(cmd, data) {
    var self = this;
    return this.getOrDiscoverIP().then(ip => {
        var delay = this.responseDelay * 1000;
        var req = {
            method: 'POST',
            uri: 'http://' + ip + '/YamahaExtendedControl/v1' + cmd,
            body: data
        };
        if (this.requestTimeout) req.timeout = this.requestTimeout;

        var prom = request.postAsync(req).delay(delay).then(response => response.body)
        if (self.catchRequestErrors === true) prom.catch(console.log.bind(console));

        return prom

    })

};

YamahaYXC.prototype.getOrDiscoverIP = function() {
    if (this.ip) return Promise.resolve(this.ip)
    if (!this.discoverPromise) {
        this.discoverPromise = this.discover().tap(function(ip) {
            this.ip = ip
        })
    }
    return this.discoverPromise
}

var reManufacturer = /<manufacturer>*.yamaha.*<\/manufacturer>/i;
var reYamahaModelDesc = /<modelDescription>*.MusicCast.*<\/modelDescription>/i;
var reFriendlyName = /<friendlyName>([^<]*)<\/friendlyName>/;
var reModelName = /<modelName>([^<]*)<\/modelName>/i;
var reUniqueID = /<serialNumber>([^<]*)<\/serialNumber>/i; //same as getDeviceInfo:system_id

YamahaYXC.prototype.discover = function(timeout) {
    return new Promise(function(resolve, reject) {
        var ssdp = require("peer-ssdp");
        var peer = ssdp.createPeer();
        var timer = setTimeout(notFound, timeout || 5000);

        function notFound() {
            if (peer) peer.close();
            reject(new Error('Yamaha MusicCast not found'))
        }

        peer.on("ready", function() {
            peer.search({
                ST: 'urn:schemas-upnp-org:device:MediaRenderer:1'
            });
        }).on("found", function(headers, address) {
            if (headers.LOCATION) {
                request(headers.LOCATION, function(error, response, body) {
                    if (!error && response.statusCode == 200 && reManufacturer.test(body)) {
                        var model = reModelName.exec(body);
                        var name = reFriendlyName.exec(body);
                        var uid = reUniqueID.exec(body);
                        clearTimeout(timer);
                        peer.close()
                        resolve([address.address, name[1], model[1], uid[1]])
                    }
                });
            } //müsste hier reject stehen?
        }).start();
    })

};

// ---- zone number to string
    function getZone(zone) {
        if (!zone) return "main";
        if (zone.length == 1) {
            zone = zone.replace("/^1", "main");
            zone = zone.replace("/^2", "zone2");
            zone = zone.replace("/^3", "zone3");
            zone = zone.replace("/^4", "zone4");
        }
        switch (zone) {
            case 1:
                zone = "main";
                break;
            case 2: case 3: case 4:
                zone = "zone" + zone;
        }
        return zone;
    }

//-------------Zone related comands----------


    YamahaYXC.prototype.powerOn = function(zone) {
        var command = '/' + getZone(zone) + '/setPower?power=on'
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.powerOff = function(zone) {
        var command = '/' + getZone(zone) + '/setPower?power=standby';
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.sleep = function(val, zone) {
        if (val < 30) val = '0';
        else if (val < 60) val = '30';
        else if (val < 90) val = '60';
        else if (val < 120) val = '90';
        else val = '120';
        var command = '/' + getZone(zone) + '/setSleep?sleep=' + val;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.setVolumeTo = function(to, zone) {
        var command = '/' + getZone(zone) + '/setVolume?volume' + to;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.muteOn = function(zone) {
        var command = '/' + getZone(zone) + '/setMute?enable=true';
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.muteOff = function(zone) {
        var command = '/' + getZone(zone) + '/setMute?enable=false';
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.setInput = function(input, zone) {
        //check for correct input in calling program
        var command = '/' + getZone(zone) + '/setInput?input=' + input;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.setSound = function(input, zone) {
        //check for correct input in calling program
        var command = '/' + getZone(zone) + '/setSoundProgram?program=' + input;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.surroundOn = function(zone) {
        var command = '/' + getZone(zone) + '/set3dSurround?enable=true';
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.surroundOff = function(zone) {
        var command = '/' + getZone(zone) + '/set3dSurround?enable=false';
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.setDirect = function(on, zone) {
        var command = '/' + getZone(zone) + '/setDirect?enable='+ (on ? 'true' : 'false') ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.setPureDirect = function(on, zone) {
        var command = '/' + getZone(zone) + '/setPureDirect?enable='+ (on ? 'true' : 'false') ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.setEnhancer = function(on, zone) {
        var command = '/' + getZone(zone) + '/setEnhancer?enable='+ (on ? 'true' : 'false') ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.setClearVoice = function(on, zone) {
        var command = '/' + getZone(zone) + '/setClearVoice?enable='+ (on ? 'true' : 'false') ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.setBassTo = function(val, zone) {
        var command = '/' + getZone(zone) + '/setToneControl?mode=manual&bass='+ val;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.setTrebleTo = function(val, zone) {
        var command = '/' + getZone(zone) + '/setToneControl?mode=manual&treble='+ val;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.setEqualizer = function(low, mid, high, zone) {
        var command = '/' + getZone(zone) + '/setEqualizer?mode=manual&low='+ low + '&mid=' + mid + '&high=' +high;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.setBalance = function(val, zone) {
        var command = '/' + getZone(zone) + '/setBalance?value=' + val;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.setSubwooferVolumeTo = function(val, zone) {
        var command = '/' + getZone(zone) + '/setSubwooferVolume?volume='+ val;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.setBassExtension = function(on, zone) {
        var command = '/' + getZone(zone) + '/setBassExtension?enable='+ (on ? 'true' : 'false') ;
        return this.SendGetToDevice(command);
    };

    //get commands
    YamahaYXC.prototype.getSignalInfo = function(zone) {
        var command = '/' + getZone(zone) + '/getSignalInfo' ;
        return this.SendGetToDevice(command);
    };


    YamahaYXC.prototype.getSignalInfo = function(zone) {
        var command = '/' + getZone(zone) + '/getStatus' ;
        return this.SendGetToDevice(command);
    };

    YamahaYXC.prototype.getSignalInfo = function(zone) {
        var command = '/' + getZone(zone) + '/getSoundProgramList' ;
        return this.SendGetToDevice(command);
    };    


//------------ NetUSB commands --------------

    YamahaYXC.prototype.getPresetInfo = function() {
        var command = '/netusb/getPresetInfo' ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.getPlayInfo = function() {
        var command = '/netusb/getPlayInfo' ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.getSettings = function() {
        var command = '/netusb/getSettings' ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.getRecentInfo = function() {
        var command = '/netusb/getRecentInfo' ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.clearRecentInfo = function() {
        var command = '/netusb/clearRecentInfo' ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.setNetPlayback = function(val) {
        if (!val || val == 'play') val = 'play';
        else if (val == 'stop') val = 'stop';
        else if (val == 'pause') val = 'pause';
        else if (val == 'play_pause') val = 'play_pause';
        else if (val =='previous') val = 'previous';
        else if (val == 'next') val = 'next';
        else if (val == 'frw_start') val = 'fast_reverse_start';
        else if (val == 'frw_end') val = 'fast_reverse_end';
        else if (val == 'ffw_start') val = 'fast_forward_start';
        else if (val =='ffw_end') val = 'fast_forward_end';
        var command = '/netusb/setPlayback?playback='+ val ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.toggleNetRepeat = function() {
        var command = '/netusb/toggleRepeat' ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.toggleNetShuffle = function() {
        var command = '/netusb/toggleShuffle' ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.recallPreset = function(val, zone) {
        if (!val) val ='1';
        var command = '/netusb/recallPreset?zone=' + getZone(zone) + '&num='+ val;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.stopNet = function() {
        var command = '/netusb/setPlayback?playback=stop';
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.pauseNet = function() {
        var command = '/netusb/setPlayback?playback=pause';
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.playNet = function() {
        var command = '/netusb/setPlayback?playback=play';
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.nextNet = function() {
        var command = '/netusb/setPlayback?playback=next';
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.prevNet = function() {
        var command = '/netusb/setPlayback?playback=previous';
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.frwNet = function(state, zone) {
        var on;
        if (state === '1' || state === true || state === 1 || state === 'true'){
           on = 1;}
        else{on = 0;}
        var command = '/netusb/setDirect?playback='+ (on ? 'fast_reverse_start' : 'fast_reverse_end') ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.ffwNet = function(state, zone) {
        var on;
        if (state === '1' || state === true || state === 1 || state === 'true'){
           on = 1;}
        else{on = 0;}
        var command = '/netusb/setDirect?playback='+ (on ? 'fast_forward_start' : 'fast_forward_end') ;
        return this.SendGetToDevice(command);
    };



//------------ CD commands ------------

    YamahaYXC.prototype.setCDPlayback = function(val, zone) {
        if (!val || val == 'play') val = 'play';
        else if (val == 'stop') val = 'stop';
        else if (val == 'pause') val = 'pause';
        else if (val == 'play_pause') val = 'play_pause';
        else if (val =='previous') val = 'previous';
        else if (val == 'next') val = 'next';
        else if (val == 'frw_start') val = 'fast_reverse_start';
        else if (val == 'frw_end') val = 'fast_reverse_end';
        else if (val == 'ffw_start') val = 'fast_forward_start';
        else if (val =='ffw_end') val = 'fast_forward_end';
        var command = '/cd/setPlayback?playback='+ val ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.toggleTray = function(on) {
        var command = '/cd/toggleTray' ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.toggleCDRepeat = function(on) {
        var command = '/cd/toggleRepeat' ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.toggleCDShuffle = function(on) {
        var command = '/cd/toggleShuffle' ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.stopCD = function(zone) {
        var command = '/cd/setPlayback?playback=stop';
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.pauseCD = function(zone) {
        var command = '/cd/setPlayback?playback=stop';
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.playCD = function(zone) {
        var command = '/cd/setPlayback?playback=play';
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.nextCD = function(zone) {
        var command = '/cd/setPlayback?playback=next';
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.prevCD = function(zone) {
        var command = '/cd/setPlayback?playback=previous';
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.frwCD = function(state, zone) {
        var on;
        if (state === '1' || state === true || state === 1 || state === 'true'){
           on = 1;}
        else{on = 0;}
        var command = '/cd/setDirect?playback='+ (on ? 'fast_reverse_start' : 'fast_reverse_end') ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.ffwCD = function(state, zone) {
        var on;
        if (state === '1' || state === true || state === 1 || state === 'true'){
           on = 1;}
        else{on = 0;}
        var command = '/cd/setDirect?playback='+ (on ? 'fast_forward_start' : 'fast_forward_end') ;
        return this.SendGetToDevice(command);
    };


//-------------System commands------
    YamahaYXC.prototype.getDeviceInfo = function() {
        var command = '/system/getDeviceInfo' ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.getFeatures = function() {
        var command = '/system/getFeatures' ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.getNetworkStatus = function() {
        var command = '/system/getNetworkStatus' ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.getFuncStatus = function() {
        var command = '/system/getFuncStatus' ;
        return this.SendGetToDevice(command);
    };    
    YamahaYXC.prototype.getNameText = function(zone) {
        var command = '/system/getNameText?id=' + zone ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.getLocationInfo = function() {
        var command = '/system/getLocationInfo' ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.setAutoPowerStandby = function(state, zone) {
        var on;
        if (state === '1' || state === true || state === 1 || state === 'true'){
           on = 1;}
        else{on = 0;}
        var command = '/system/setAutoPowerStandby?enable='+ (on ? 'true' : 'false') ;
        return this.SendGetToDevice(command);
    };    
    YamahaYXC.prototype.setHdmiOut1 = function(state, zone) {
        var on;
        if (state === '1' || state === true || state === 1 || state === 'true'){
           on = 1;}
        else{on = 0;}
        var command = '/system/setHdmiOut1?enable='+ (on ? 'true' : 'false') ;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.setHdmiOut2 = function(state, zone) {
        var on;
        if (state === '1' || state === true || state === 1 || state === 'true'){
           on = 1;}
        else{on = 0;}
        var command = '/system/setHdmiOut2?enable='+ (on ? 'true' : 'false') ;
        return this.SendGetToDevice(command);
    };

//-----------  advanced ------------

    YamahaYXC.prototype.setLinkControl = function(control, zone) {
        var command = '/' + getZone(zone) + '/setLinkControl?control=' + control;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.setLinkAudioDelay = function(delay, zone) {
        var command = '/' + getZone(zone) + '/setLinkAudioDelay?delay=' + delay;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.getDistributionInfo = function() {
        var command = '/dist/getDistributionInfo';
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.setServerInfo = function(data) {
        var command = '/dist/setServerInfo';
        return this.SendPostToDevice(command, data );
    };
    YamahaYXC.prototype.setClientInfo = function(data) {
        var command = '/dist/setClientInfo';
        return this.SendPostToDevice(command, data );
    };
    YamahaYXC.prototype.startDistribution = function(num) {
        var command = '/dist/startDistribution?num=' + num;
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.stopDistribution = function() {
        var command = '/dist/stopDistribution';
        return this.SendGetToDevice(command);
    };
    YamahaYXC.prototype.setGroupName = function(name) {
        var command = '/dist/setGroupName';
        return this.SendPostToDevice(command, name);
    };

module.exports =YamahaYXC;