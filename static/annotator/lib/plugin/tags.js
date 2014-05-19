// Generated by CoffeeScript 1.6.3
var _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Annotator.Plugin.Tags = (function(_super) {
    __extends(Tags, _super);

    function Tags() {
        this.setAnnotationTags = __bind(this.setAnnotationTags, this);
        this.updateField = __bind(this.updateField, this);
        this.initTagField = __bind(this.initTagField, this);
        this.updateTagField = __bind(this.updateTagField, this);
        this.initAttrField = __bind(this.initAttrField, this);
        this.updateAttrField = __bind(this.updateAttrField, this);
        this.setTagAttributes = __bind(this.setTagAttributes, this);
        _ref = Tags.__super__.constructor.apply(this, arguments);
        return _ref;
    }

    Tags.prototype.options = {
        parseTags: function(tags) {
            if (tags && tags.length > 0) {
                return $.map(tags, function(tag){
                    return {'entity': tag};
                })
            }
        },
        stringifyTags: function(array) { //array of tag objects
            return $.map(array, function(tag) {
                return tag.entity;
            }).join(" ")
        }
    };

    Tags.prototype.field = null;
    Tags.prototype.attrField = null;

    Tags.prototype.input = null;

    Tags.prototype.pluginInit = function() {
        var self = this;

        if (!Annotator.supported()) {
            return;
        }
        // this.field = this.annotator.editor.addField({
        //     label: Annotator._t('Add some tags here') + '\u2026',
        //     load: this.updateField,
        //     submit: this.setAnnotationTags
        // });
        this.tagField = this.annotator.editor.addField({
            type: 'custom',
            html_content: '<select class="selectize-entity" multiple />',
            init: this.initTagField,
            load: this.updateTagField,
            submit: this.setAnnotationTags
        });
        this.attrField = this.annotator.editor.addField({
            type: 'custom',
            html_content: '<div>\n    <p class="annotator-title">Entity attributes</p>\n\n</div>',
            init: this.initAttrField,
            load: this.updateAttrField,
            submit: this.setTagAttributes
        });

        this.subscribe('/tag/changed', function(value) {
            if (value && value.indexOf('location') > -1) {
                if (self.annotation) {
                    // search for mgrs string and update attribute
                    var node = self.annotation.highlights[0].parentNode;
                    if (!node) {
                        console.log(annotation)
                    }
                    var latlon = [];
                    if (!$(node).data('location')) {
                        var text = node.innerText;
                        var mgrs = text.match(/\/\/MGRSCOORD:([0-9A-Za-z ]+)\/\//)
                        if (mgrs) {
                            USNGtoLL(mgrs[1], latlon); // function from usng.js
                            $(node).data("location", latlon);
                        }
                    }
                    latlon = $(node).data('location');
                    if (latlon.length === 2 ) {
                        if (!self.annotation.tags) self.annotation.tags = [];
                        self.annotation.tags.push({
                            entity: 'location',
                            location: latlon
                        });
                        self.updateAttrField(self.attrField, self.annotation);
                    }
                }
            }
        });

        this.annotator.viewer.addField({
            load: this.updateViewer
        });
        if (this.annotator.plugins.Filter) {
            this.annotator.plugins.Filter.addFilter({
                label: Annotator._t('Tag'),
                property: 'tags',
                isFiltered: Annotator.Plugin.Tags.filterCallback
            });
        }
        return this.input = $(this.field).find(':input');
    };

    Tags.prototype.parseTags = function(tags) {
        return this.options.parseTags(tags);
    };

    Tags.prototype.stringifyTags = function(array) {
        return this.options.stringifyTags(array);
    };

    Tags.prototype.capitalizeFirstLetter = function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    };

    Tags.prototype.updateField = function(field, annotation) {
        var value;
        value = '';
        if (annotation.tags) {
            value = this.stringifyTags(annotation.tags);
        }
        return this.input.val(value);
    };

    Tags.prototype.initTagField = function(field) {
        var self = this;
        this.tagselect = $(field).find('.selectize-entity')
            .selectize({
                maxItems: null,
                valueField: 'value',
                labelField: 'title',
                searchField: 'title',
                create: false,
                options: [
                    {value: 'person', title: 'Person'},
                    {value: 'organization', title: 'Organization'},
                    {value: 'resource', title: 'Resource'},
                    {value: 'location', title: 'Location'},
                    {value: 'event', title: 'Event'}
                ],
                placeholder: 'Select an entity...',
                create: false,
                onChange: function(value) {
                    self.publish('/tag/changed', [value]);
                }
            }
        );
    }

    Tags.prototype.updateTagField = function(field, annotation) {
        this.annotation = annotation;

        var selectize = this.tagselect[0].selectize;
        selectize.clear();
        if (annotation.tags) {
            selectize.addItem(annotation.tags.map(function(t) {return t.entity; }));
        }
    }


    Tags.prototype.initAttrField = function(field, annotation) {
        var $content = $($(field).children()[0])
        $content.append($('<div class="annotator-attribute-group">\n    <div class="annotator-attribute">\n        <select placeholder="Attribute...">\n            <option value="">Attribute...</option>\n            <option value="1">Color</option>\n            <option value="2">Name<option>\n            <option value="3">Age</option>\n        </select>\n    </div>\n    <div class="annotator-value" style="">\n        <input placeholder="Value...">\n    </div>\n    <div class="annotator-add-btn">\n        <button type="button" class="btn btn-default">\n            <span class="glyphicon glyphicon-plus"></span>\n        </button>\n    </div>\n</div>'))
        initializeAttrGroup();

        function initializeAttrGroup() {
            $(field).find('.annotator-attribute select').selectize({
                create: true
            });
            $(field).find('.annotator-add-btn button').click(function() {
                $($(field).children()[0]).append($('<div class="annotator-attribute-group">\n    <div class="annotator-attribute">\n        <select placeholder="Attribute...">\n            <option value="">Attribute...</option>\n                <option value="1">Color</option>\n            <option value="2">Name<option>\n            <option value="3">Age</option>\n        </select>\n    </div>\n    <div class="annotator-value" style="">\n        <input placeholder="Value...">\n    </div>\n    <div class="annotator-add-btn">\n        <button type="button" class="btn btn-default">\n            <span class="glyphicon glyphicon-plus"></span>\n        </button>\n    </div>\n</div>'))
                $(this).parent().hide(); //hide add button last row
                initializeAttrGroup();
            })
        }
    }

    Tags.prototype.updateAttrField = function(field, annotation) {
        var $content = $($(field).children()[0]);
        $content.find(".annotator-attribute-group").remove();
        $content.append($('<div class="annotator-attribute-group">\n    <div class="annotator-attribute">\n        <select placeholder="Attribute...">\n            <option value="">Attribute...</option>\n            </select>\n    </div>\n    <div class="annotator-value" style="">\n        <input placeholder="Value...">\n    </div>\n    <div class="annotator-add-btn">\n        <button type="button" class="btn btn-default">\n            <span class="glyphicon glyphicon-plus"></span>\n        </button>\n    </div>\n</div>'))
        if (annotation.tags) {
            for (var i = 0; i < annotation.tags.length; i++) {
                var tag = annotation.tags[i];
                for (var attr in tag) {
                    if (attr !== 'entity' && attr !== 'uid') {
                        if (tag.hasOwnProperty(attr)) {
                            var $group = $content.children().last();
                            $group.find('select').append('<option selected value="' + attr + '">' + this.capitalizeFirstLetter(attr) + '</option>');
                            $group.find('input').val(tag[attr] ? tag[attr].toString() : '');
                            $group.find('.annotator-add-btn').hide();
                            $content.append($('<div class="annotator-attribute-group">\n    <div class="annotator-attribute">\n        <select placeholder="Attribute...">\n            <option value="">Attribute...</option>\n            </select>\n    </div>\n    <div class="annotator-value" style="">\n        <input placeholder="Value...">\n    </div>\n    <div class="annotator-add-btn">\n        <button type="button" class="btn btn-default">\n            <span class="glyphicon glyphicon-plus"></span>\n        </button>\n    </div>\n</div>'))
                        }
                    }

                }
            }
        }
        initializeAttrGroup();

        function initializeAttrGroup() {
            $(field).find('.annotator-attribute select').selectize({
                create: true
            });
            $(field).find('.annotator-add-btn button').click(function() {
                $($(field).children()[0]).append($('<div class="annotator-attribute-group">\n    <div class="annotator-attribute">\n        <select placeholder="Attribute...">\n            <option value="">Attribute...</option>\n        </select>\n    </div>\n    <div class="annotator-value" style="">\n        <input placeholder="Value...">\n    </div>\n    <div class="annotator-add-btn">\n        <button type="button" class="btn btn-default">\n            <span class="glyphicon glyphicon-plus"></span>\n        </button>\n    </div>\n</div>'))
                $(this).parent().hide(); //hide add button last row
                initializeAttrGroup();
            })
        }
    }

    Tags.prototype.setAnnotationTags = function(field, annotation) {
        if (! annotation.tags) {
            annotation.tags = [];
        }
        annotation.tags.push(this.parseTags($(field).find('.selectize-entity').val()));
    };

    Tags.prototype.setTagAttributes = function(field, annotation) {
        // assume setAnnotationTags are run first
        // so that by this time annotation has tags already
        if (annotation.tags) {
            for (var i = 0; i < annotation.tags.length; i ++) {
                var tag = annotation.tags[i];
                $(field).find('.annotator-attribute-group').each(function() {
                    var attr = $(this).find('.annotator-attribute select').val();
                    var val = $(this).find('.annotator-value input').val();
                    if (attr && val) {
                        attr = Annotator.Util.escape(attr);
                        val = Annotator.Util.escape(val);
                        tag[attr] = val;
                    }
                })
            }
        }
    };

    Tags.prototype.updateViewer = function(field, annotation) {
        field = $(field);
        if (annotation.tags && $.isArray(annotation.tags) && annotation.tags.length) {
            return field.addClass('annotator-tags').html(function() {
                var string;
                return string = $.map(annotation.tags, function(tag) {
                    return '<span class="annotator-tag annotator-hl-' + tag['entity'] + '">' + Annotator.Util.escape(tag['entity']) + '</span>';
                }).join(' ');
            });
        } else {
            return field.remove();
        }
    };

    return Tags;

})(Annotator.Plugin);

Annotator.Plugin.Tags.filterCallback = function(input, tags) {
    var keyword, keywords, matches, tag, _i, _j, _len, _len1;
    if (tags == null) {
        tags = [];
    }
    matches = 0;
    keywords = [];
    if (input) {
        keywords = input.split(/\s+/g);
        for (_i = 0, _len = keywords.length; _i < _len; _i++) {
            keyword = keywords[_i];
            if (tags.length) {
                for (_j = 0, _len1 = tags.length; _j < _len1; _j++) {
                    tag = tags[_j];
                    if (tag.indexOf(keyword) !== -1) {
                        matches += 1;
                    }
                }
            }
        }
    }
    return matches === keywords.length;
};

/*
 //@ sourceMappingURL=tags.map
 */
