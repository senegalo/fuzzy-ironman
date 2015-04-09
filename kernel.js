
var Kernel = function () {
};

Kernel.prototype = {
    
    isMaster: false,
    syncedTicks: {},
    syncWindow: 2,

    initialize: function () {
        this.reactor = new NE.Reactor(40);
        this.connect();
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
        console.log("Command Recieved: " + data);
        var action = JSON.parse(data);
        if (this[action.command]) {
            console.log("==" + action.command);
            this[action.command].apply(this, action.params);
        }
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
        if(this.paused){
            this.enforceSync();
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
            self.reactorTick();
        }, delta);
    },
    
    reactorTick: function () {
        if(this.paused){
            return;
        }
        var self = this;
        
        setTimeout(function () {
            self.reactorTick();
        }, this.reactor.delay);
        
        if(this.reactor.ticks >= this.syncWindow){
            this.enforceSync();
        } else {
            this.reactor.tickOnce();
        }
        
        if(this.reactor.ticks > 0){
            this.sendAction();
        }
    },
    
    enforceSync: function(){
        this.paused = false;
        clearTimeout(this.panicTimer);
        if(!this.syncedTicks[this.reactor.ticks - this.syncWindow]){
            this.paused = true;
        }
        if(!this.paused){
            this.reactor.tickOnce();
        } else {
            console.log("PAUSED=============================PAUSED======================PAUSED");
            var self = this;
            this.panicTimer = setTimeout(function(){
                self.panic();
            },3000);
        }
    },
    
    send: function(){
        console.log("Sending Command: "+arguments[0]);
        this.connection.send(JSON.stringify({
            command: arguments[0],
            params: Array.prototype.slice.call(arguments).slice(1)
        }));
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