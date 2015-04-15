
var Kernel = function () {
};

Kernel.prototype = {
    
    isMaster: false,
    syncedTicks: {},
    syncWindow: 4,
    recievedDelay: 0,

    initialize: function () {
        this.reactor = new NE.Reactor(40);
        this.connect();
        this.initAnimation();
        this.registerGlobalEvents();
    },
    
    connect: function () {
        var self = this;
        this.peer = new Peer({key: 'rloqtlh6u6z2gldi'});
        this.peer.on('open', function (id) {
            jQuery("#my-id").val(id);
        });
        this.peer.on('connection', function (connection) {
            console.log("Connection Established");
            self.connection = connection;
            self.connection.on('data', function(data){
                self.parseData(data);
            });
        });
    },
    
    parseData: function (data) {
        var self = this;
        setTimeout(function(){
            console.log("Command Recieved: " + data);
            var action = JSON.parse(data);
            if (self[action.command]) {
                console.log("==" + action.command);
                self[action.command].apply(self, action.params);
            }
        }, this.recievedDelay);
    },
    
    connectTo: function(id){
        var self = this;
        this.isMaster = true;
        this.connection = this.peer.connect(id);
        this.connection.on('open', function () {
            self.connectionEstablished();
        });
        
        this.connection.on('data', function (data) {
            self.parseData(data);
        });
    },
    
    connectionEstablished: function(){
      console.log("Connection Established");
      this.pingStart = new Date();
      this.send("ping");
    },
    
    ping: function(){
        this.send("pong");
    },
    
    pong: function(){
        this.delta = (new Date()) - this.pingStart;
        console.log("DELTA =======", this.delta);
        this.send("startReactor", 1000 - this.delta/2);
        this.startReactor(1000);
    },
    
    sendAction: function(){
        var self = this;
        if(this.panicEnabled === true){
            return;
        }
        self.send("actionSync", self.reactor.ticks);
    },
    
    actionSync: function(ticks){
        this.syncedTicks[ticks] = true;
        if(!this.reactor.running){
            this.sync();
        }
    },
    
    panic: function(diff){
        console.error("Panic on remote");
        this.panicFlag = true;
    },
    
    startReactor: function(delta){
        var self = this;
        //this.sendAction();
        setTimeout(function(){
            self.reactor.fireEvery(1, self, 'reactorTick');
            self.reactor.run();
        }, delta);
    },
    
    reactorTick: function () {
        var self = this;
        
        // if(this.reactor.ticks > 0){
            this.sendAction();
        // }
        if(this.reactor.ticks >= this.syncWindow){
            this.sync();
        }
        this.update();
        
    },
    
    sync: function(){
        clearTimeout(this.panicTimer);
        if(!this.syncedTicks[this.reactor.ticks - this.syncWindow]){
            this.reactor.pause();
            this.timePaused = new Date();
            console.log("PAUSED=======================PAUSED======================PAUSED");
            var self = this;
            this.panicTimer = setTimeout(function(){
                self.panic();
            },3000);
        } else if(!this.reactor.running){
            this.reactor.resume();
            console.log("RESUME --- PAUSED Time:",(new Date())- this.timePaused);
        }
    },
    
    send: function(){
        console.log("Sending Command: " + arguments[0]);
        this.connection.send(JSON.stringify({
            command: arguments[0],
            params: Array.prototype.slice.call(arguments).slice(1)
        }));
    },

    initAnimation: function(){
        var image = new Image();
        image.src = "algeria-body-a.png";
        this.canvas = $$('.canvas')[0];
        this.ctx = this.canvas.getContext('2d');
        var self = this;
        this.x = 0;
        this.y = 0;
        this.frameY = 0;
        this.noOfFrames = 12;
        this.image = image;
        image.onload = function(){
            self.ctx.drawImage(image, 0,0);
            self.frameh = image.height/self.noOfFrames;
        }
    },
    
    update: function(){
        this.frameY  =  (this.frameY + 1)% this.noOfFrames;
        this.ctx.clearRect(0,0,1000,1000);
        this.ctx.drawImage(this.image, 0, -this.frameY* this.frameh);
    },

    registerGlobalEvents: function(){
        var self = this;
        (function($){
            $(function () {
                $("#connect-to-button").click(function () {
                    self.connectTo($("#connect-to").val());
                });
            });
        })(jQuery);
    }

};
var k = new Kernel();
k.initialize();  
