
var Kernel = function () {
};

Kernel.prototype = {
    
    isMaster: false,
    
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
        
        setTimeout(function(){
            self.send("actionSync", self.reactor.ticks+3);
            self.sendAction();
        },2000);
    },
    
    actionSync: function(ticks){
        if(this.reactor.ticks > ticks){
            console.error("panic");
            this.send("panic", this.reactor.ticks-ticks);
            this.panicEnabled = true;
            this.reactor.stop();
        } else {
            console.log("Action Recieved on tick: "+this.reactor.ticks+" scedueled for: "+ticks + "Diff: "+(ticks - this.reactor.ticks));
        }
    },
    
    panic: function(diff){
        console.error("Panic on remote with diff: "+diff);
        this.reactor.stop();
    },
    
    startReactor: function(delta){
        var self = this;
        this.sendAction();
        setTimeout(function(){
            self.reactor.run();
        }, delta);
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