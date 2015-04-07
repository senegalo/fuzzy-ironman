//%export Publisher NE.Publisher

if (typeof NE == "undefined") {
    NE = {};
}

NE.Publisher = {
    
    DestroyObject: function(object) {
        //Clear subscriptions.
        if (object.subscriptions) {
            for (var method in object.subscriptions) {
                for (var i = object.subscriptions[method].length - 1; i >= 0; i = Math.min(i - 1, object.subscriptions[method].length - 1)) {
                    var publisher = object.subscriptions[method][i];
                    publisher.detach(object, method);
                }
            }
        }
        //Clear attachments.
        if (object.attachments) {
            for (var method in object.attachments) {
                for (var i = object.attachments[method].length - 1; i >= 0; i--) {
                    var attachment = object.attachments[method][i];
                    var subscriber = attachment.object;
                    subscriber.subscriptions[method] = subscriber.subscriptions[method].reject(function(element) {
                        return element == object;
                    });
                }
            }
        }

        // IMPORTANT: Lazy removal is to allow invokation of destroy for objects
        // in attachments "which MUST be the next invokation call, or else the
        // attachments will be deleted and destroy of the attachments not
        // called."
        object.lazyRemoveAttachments = true;
    },
            
    attachMethod: function(object, method, callback) {
        if (!method) {
            raise("Publisher#attach : method not defined on target");
        }
        this.attachments = this.attachments || {};
        this.attachments[method] = this.attachments[method] || [];
        this.attachments[method].push({
            object: object,
            callback: callback
        });
        //Push the publisher to the subscriptions list.
        object.subscriptions = object.subscriptions || {};
        object.subscriptions[method] = object.subscriptions[method] || [];
        object.subscriptions[method].push(this);
    },
            
    attach: function(object, methods, callbak) {
        if (!(methods instanceof Array)) {
            methods = [methods];
        }
        for (var i = 0; i < methods.length; i++) {
            var method = methods[i];
            this.attachMethod(object, method, callbak);
            if (!this["__" + method + "__"]) {
                this._wrap(method);
            }
        }
        if (object.onattach) {
            object.onattach(this);
        }
        return this;
    },
            
    invokeAttachments: function(method, args) {
        var attachments = this.attachments[method];
        if (!attachments) {
            return; // attachments are removed.
        }
        for (var i = 0, len = attachments.length; i < len; i++) {
            var attachment = attachments[i];
            var object = attachment.object;
            var attached_method = attachment.callback
                ? attachment.callback : object[method];
            if (!object.destroyed && attached_method) {
                attached_method.apply(object, args);
            }
        }

        if (this.lazyRemoveAttachments) {
            this.attachments = {destroyedBefore: true};
            this.lazyRemoveAttachments = null;
        }
    },
            
    _wrap: function(method) {
        this["__" + method + "__"] = this[method];
        this[method] = function() {
            var ret = this["__" + method + "__"].apply(this, arguments);
            this.invokeAttachments(method, arguments);

            return ret;
        };
    },
            
    detach: function(object, methods) {
        if (!(methods instanceof Array)) {
            methods = [methods];
        }
        for (var i = 0; i < methods.length; i++) {
            var method = methods[i];
            if (this.attachments && this.attachments[method]) {
                this.attachments[method] = this.attachments[method].reject(function(element) {//Remove subscriber from the publisher.
                    return element.object == object;
                });
            }
            var publisher = this;
            if (object.subscriptions && object.subscriptions[method]) { //Avoid detach without attach.
                object.subscriptions[method] = object.subscriptions[method].reject(function(element) {//Remove publisher from subscriber.
                    return element == publisher;
                });
            }
        }
    }
};
