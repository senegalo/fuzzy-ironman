//%export Timer NE.Timer
//%export Reactor NE.Reactor
/*
	Class Reactor
	Implements the Reactor pattern, inherits from Publisher to provide full event management
*/
NE.Timer = Class.create({
    initialize : function(periodical, ticks, delay, object, method, args){
        this.periodical = periodical;
        this.ticks = ticks;
        this.active = true;
        this.delay = delay;
        this.object = object;
        this.method = method;
        this.args = (args) ? (args.clone()) : ([]);
        // reserving an extra element for deltaTicks
        this.args.push(0);
    },
	
    cancel : function(){
        this.active = false;
    },
	
    // deltaTicks is passed in case execution is slowed down or stopped
    // (typical in javascript timers), it gives the timer the chance to rectify.
    // It is also passed to logic function (in case needed)
    fire : function(deltaTicks, reactorTicks) {
        if (!this.active) return this;
        this.args[this.args.length - 1] = deltaTicks;
        var result = this.object[this.method].apply(this.object, this.args);
        if (this.periodical) this.delay = reactorTicks + this.ticks;
        if (result === false) this.active = false;
        return this;
    }
});

NE.Reactor = Class.create(NE.Publisher, {
	
    initialize : function(delay, timeCorrectionOn){
        this.delay = delay || 50;
        this.events = []
        this.ticks = 0
        this.running = false
        this.timeCorrectionOn = timeCorrectionOn;
    },
	
    /* is the reactor running ? */
    isRunning : function(){
        return this.running;
    },
	
    /* returns the elapsed time since the reactor started (not accurate and does not account for pause time) */
    currentTime : function(){
        return this.ticks * this.delay
    },
	
    /* pause the reactor, keep every thing intact */
    pause : function(){
        this.running = false;
        this._compensateTimeDelay();
        return this;
    },
  
    /* resume the reactor */
    resume : function(){
        return this.run();
    },
	
    /* stop the reactor, clears all pending timed events (but not subscribers and observers)*/
    stop : function(){
        this.clear();
        this.running = false;
        return this;
    },

    clear : function(){
        clearTimeout(this.lastRunTimeout);
        this.events = [];
        this.ticks = 0;
        this.oldTime = (new Date()).getTime();
        return this;
    },
    
    /* starts the reactor */
    run : function(){
        this.running = true;
        this.runOnce();
        return this;
    },
    
    tickOnce: function(){
        var deltaTicks = this._compensateTimeDelay();
        var toFire = [];
        var event = this.events[this.events.length - 1];
        while (event && event.delay <= this.ticks) {
            toFire.push(this.events.pop());
            event = this.events[this.events.length - 1];
        }
        for (var i = 0; i < toFire.length; i++) {
            event = toFire[i].fire(deltaTicks, this.ticks);
            if (event.active) {
                if (event.periodical) {
                    this._pushEvent(event);
                }
            }
        }
        this.ticks++;
    },
	
    /* the heart of the reactor, the runOnce function is run at every interval and it is responsible for firing the events */
    runOnce : function() {
        if (!this.running) {
            return this;
        }
        
        if (!this.noTimeout) {
            var self = this;
            this.lastRunTimeout = setTimeout(function() {
                if(self.running){
                    self.runOnce();
                }
            }, this.delay);
        }
        this.tickOnce();
        
        return this;
    },
  	
    /*
        push a handler to the reactor, 
        it accepts the tick at which it will fire, 
        the handler function and an optional scope for the function 
    */
    fireAfter : function(ticks, object, method, args, periodical) {
        var timer = new NE.Timer(periodical || false, ticks, this.ticks + ticks, object, method, args)
        this._pushEvent(timer);
        return timer;
    },
		
    /*
        push a handler to be run every certain ticks
        The handler is deactivated if it returns an explicit false value
    */
    fireEvery : function(ticks, object, method, args) {
        var timer = new NE.Timer(true, ticks, this.ticks, object, method, args)
        this._pushEvent(timer);
        return timer;
    },
		
    /* convert a certain time duration in milliseconds to ticks */
    timeToTicks : function(time){
        return Math.round(time / this.delay);
    },

    _pushEvent : function(event){
        this.events.push(event);
        this.events.sort(this._compareFunction);
    },
  
    _compareFunction : function (a, b) {
           return b.delay - a.delay; 
    },
    
    _compensateTimeDelay : function() {
        if (!this.timeCorrectionOn) {
            return 1;
        }
        var time = (new Date()).getTime()
        var deltaTime = time - (this.oldTime || this.time);
        var deltaTicks = 1;
        if (deltaTime >= 2 * this.delay) {
            deltaTicks = Math.floor(deltaTime / this.delay);
            this.ticks += deltaTicks - 1;
        }
        this.oldTime = time;
        return deltaTicks;
    }
});
