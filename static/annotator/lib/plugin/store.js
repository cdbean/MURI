// Generated by CoffeeScript 1.6.3
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Annotator.Plugin.Store = (function(_super) {
    __extends(Store, _super);

    Store.prototype.events = {
        'annotationCreated': 'annotationCreated',
        'annotationDeleted': 'annotationDeleted',
        'annotationUpdated': 'annotationUpdated',
        '/annotations/created': 'annotationsCreated',
        '/annotations/updated': 'annotationsUpdated',
    };

    Store.prototype.options = {
        annotationData: {},
        emulateHTTP: false,
        loadFromSearch: false,
        prefix: '/store',
        urls: {
            create: '/annotations',
            read: '/annotations/:id',
            update: '/annotations/:id',
            destroy: '/annotations/:id',
            search: '/search'
        }
    };

    function Store(element, options) {
        this._onError = __bind(this._onError, this);
        this._onLoadAnnotationsFromSearch = __bind(this._onLoadAnnotationsFromSearch, this);
        this._onLoadAnnotations = __bind(this._onLoadAnnotations, this);
        this._getAnnotations = __bind(this._getAnnotations, this);
        Store.__super__.constructor.apply(this, arguments);
        this.annotations = [];
    }

    Store.prototype.pluginInit = function() {
        if (!Annotator.supported()) {
            return;
        }
        if (this.annotator.plugins.Auth) {
            return this.annotator.plugins.Auth.withToken(this._getAnnotations);
        } else {
            return this._getAnnotations();
        }
    };

    Store.prototype._getAnnotations = function() {
        if (this.options.loadFromSearch) {
            return this.loadAnnotationsFromSearch(this.options.loadFromSearch);
        } else {
            return this.loadAnnotations();
        }
    };

    Store.prototype.annotationsCreated = function(annotations) {
        var to_create = [];
        var _this = this;

        for (var i = 0, len = annotations.length; i < len; i++) {
            var annotation = annotations[i];
            if (__indexOf.call(this.annotations, annotation) < 0) {
                this.registerAnnotation(annotation);
                to_create.push(annotation);
            } else {
                return this.updateAnnotation(annotation, {});
            }
        }
        this._apiRequest('create', to_create, function(data) {
            if (data.length == 0 || data[0].id == null || to_create.length !==  data.length) {
                console.warn(Annotator._t("Warning: No ID returned from server for annotation "), annotation);
            }
            for (var i = 0, len = data.length; i< len; i++) {
                _this.updateAnnotation(to_create[i], data[i]);
                _this.annotator.setupAnnotation(to_create[i]);
            }
            Annotator.showNotification(Annotator._t("Added " + data.length + " new annotations!"), Annotator.Notification.SUCCESS);
            $.publish("/entity/added", [to_create]);
        });
    };

    Store.prototype.annotationCreated = function(annotation) {
        var _this = this;
        if (__indexOf.call(this.annotations, annotation) < 0) {
            this.registerAnnotation(annotation);
            return this._apiRequest('create', annotation, function(data) {
                if (data.id == null) {
                    console.warn(Annotator._t("Warning: No ID returned from server for annotation "), annotation);
                }
                _this.updateAnnotation(annotation, data);
                $.publish("/entity/added", [[annotation]]);
            });
        } else {
            return this.updateAnnotation(annotation, {});
        }
    };

    Store.prototype.annotationsUpdated = function(annotation) {
        var to_update = [];
        for (var i = 0, len = this.annotations.length; i < len; i++) {
            var ann = this.annotations[i];
            if (ann.quote === annotation.quote) {
                ann.tags = annotation.tags;
                to_update.push(ann);
            }
        }
        this._apiRequest('update', to_update[0], function(data) {
            Annotator.showNotification(Annotator._t("Updated " + to_update.length + " annotations!"), Annotator.Notification.SUCCESS);
        });
    };

    Store.prototype.annotationUpdated = function(annotation) {
        var _this = this;
        if (__indexOf.call(this.annotations, annotation) >= 0) {
            return this._apiRequest('update', annotation, (function(data) {
                return _this.updateAnnotation(annotation, data);
            }));
        }
    };

    Store.prototype.annotationDeleted = function(annotation) {
        var _this = this;
        if (__indexOf.call(this.annotations, annotation) >= 0) {
            return this._apiRequest('destroy', annotation, (function() {
                _this.unregisterAnnotation(annotation);
                // $.publish('/entity/deleted', [[annotaion]]);
            }));
        }
    };

    Store.prototype.registerAnnotation = function(annotation) {
        return this.annotations.push(annotation);
    };

    Store.prototype.unregisterAnnotation = function(annotation) {
        return this.annotations.splice(this.annotations.indexOf(annotation), 1);
    };

    Store.prototype.updateAnnotation = function(annotation, data) {
        if (__indexOf.call(this.annotations, annotation) < 0) {
            console.error(Annotator._t("Trying to update unregistered annotation!"));
        } else {
            $.extend(annotation, data);
        }
        return $(annotation.highlights).data('annotation', annotation);
    };

    Store.prototype.loadAnnotations = function() {
        return this._apiRequest('read', null, this._onLoadAnnotations);
    };

    Store.prototype._onLoadAnnotations = function(data) {
        var a, annotation, annotationMap, newData, _i, _j, _len, _len1, _ref;
        if (data == null) {
            data = [];
        }
        annotationMap = {};
        _ref = this.annotations;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            a = _ref[_i];
            annotationMap[a.id] = a;
        }
        newData = [];
        for (_j = 0, _len1 = data.length; _j < _len1; _j++) {
            a = data[_j];
            if (annotationMap[a.id]) {
                annotation = annotationMap[a.id];
                this.updateAnnotation(annotation, a);
            } else {
                newData.push(a);
            }
        }
        this.annotations = this.annotations.concat(newData);
        return this.annotator.loadAnnotations(newData.slice());
    };

    Store.prototype.loadAnnotationsFromSearch = function(searchOptions) {
        return this._apiRequest('search', searchOptions, this._onLoadAnnotationsFromSearch);
    };

    Store.prototype._onLoadAnnotationsFromSearch = function(data) {
        if (data == null) {
            data = {};
        }
        return this._onLoadAnnotations(data.rows || []);
    };

    Store.prototype.dumpAnnotations = function() {
        var ann, _i, _len, _ref, _results;
        _ref = this.annotations;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            ann = _ref[_i];
            _results.push(JSON.parse(this._dataFor(ann)));
        }
        return _results;
    };

    Store.prototype._apiRequest = function(action, obj, onSuccess) {
        var id, options, request, url;
        id = obj && obj.id;
        url = this._urlFor(action, id);
        options = this._apiRequestOptions(action, obj, onSuccess);
        request = $.ajax(url, options);
        request._id = id;
        request._action = action;
        return request;
    };

    Store.prototype._apiRequestOptions = function(action, obj, onSuccess) {
        var data, method, opts;
        method = this._methodFor(action);
        opts = {
            type: method,
            headers: this.element.data('annotator:headers'),
            dataType: "json",
            success: onSuccess || function() {},
            error: this._onError
        };
        if (this.options.emulateHTTP && (method === 'PUT' || method === 'DELETE')) {
            opts.headers = $.extend(opts.headers, {
                'X-HTTP-Method-Override': method
            });
            opts.type = 'POST';
        }
        if (action === "search") {
            opts = $.extend(opts, {
                data: obj
            });
            return opts;
        }
        data = obj && this._dataFor(obj);
        if (this.options.emulateJSON) {
            opts.data = {
                json: data
            };
            if (this.options.emulateHTTP) {
                opts.data._method = method;
            }
            return opts;
        }
        opts = $.extend(opts, {
            data: data,
            contentType: "application/json; charset=utf-8"
        });
        return opts;
    };

    Store.prototype._urlFor = function(action, id) {
        var url;
        url = this.options.prefix != null ? this.options.prefix : '';
        url += this.options.urls[action];
        url = url.replace(/\/:id/, id != null ? '/' + id : '');
        url = url.replace(/:id/, id != null ? id : '');
        return url;
    };

    Store.prototype._methodFor = function(action) {
        var table;
        table = {
            'create': 'POST',
            'read': 'GET',
            'update': 'PUT',
            'destroy': 'DELETE',
            'search': 'GET'
        };
        return table[action];
    };

    Store.prototype._dataFor = function(annotation) {
        var data = '', highlights;
        if (annotation.constructor === Object) {
            highlights = annotation.highlights;
            delete annotation.highlights;
            $.extend(annotation, this.options.annotationData);
            data = JSON.stringify(annotation);
            if (highlights) {
                annotation.highlights = highlights;
            }
        } else if (annotation.constructor === Array) {
            for (var i = 0, len = annotation.length; i < len; i++) {
                highlights = [];
                highlights.push(annotation[i].highlights);
                delete annotation[i].highlights;
            }
            data = JSON.stringify(annotation);
//            data = JSON.stringify(annotation); // somehow this does not work. Maybe JSON.stringify cannot be applied to deep objects?
            if (highlights) {
                for (var i = 0, len = annotation.length; i < len; i++) {
                    annotation[i].highlights = highlights[i];
                }
            }
        }
        return data;
    };

    Store.prototype._onError = function(xhr) {
        var action, message;
        action = xhr._action;
        message = Annotator._t("Sorry we could not ") + action + Annotator._t(" this annotation");
        if (xhr._action === 'search') {
            message = Annotator._t("Sorry we could not search the store for annotations");
        } else if (xhr._action === 'read' && !xhr._id) {
            message = Annotator._t("Sorry we could not ") + action + Annotator._t(" the annotations from the store");
        }
        switch (xhr.status) {
            case 401:
                message = Annotator._t("Sorry you are not allowed to ") + action + Annotator._t(" this annotation");
                break;
            case 404:
                message = Annotator._t("Sorry we could not connect to the annotations store");
                break;
            case 500:
                message = Annotator._t("Sorry something went wrong with the annotation store");
        }
        Annotator.showNotification(message, Annotator.Notification.ERROR);
        return console.error(Annotator._t("API request failed:") + (" '" + xhr.status + "'"));
    };

    return Store;

})(Annotator.Plugin);

/*
 //@ sourceMappingURL=store.map
 */
