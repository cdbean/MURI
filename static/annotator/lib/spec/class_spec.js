// Generated by CoffeeScript 1.6.3
var DelegatedExample,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

DelegatedExample = (function(_super) {
  __extends(DelegatedExample, _super);

  DelegatedExample.prototype.events = {
    'div click': 'pushA',
    'baz': 'pushB',
    'li click': 'pushC'
  };

  DelegatedExample.prototype.options = {
    foo: "bar",
    bar: function(a) {
      return a;
    }
  };

  function DelegatedExample(elem) {
    DelegatedExample.__super__.constructor.apply(this, arguments);
    this.returns = [];
  }

  DelegatedExample.prototype.pushA = function() {
    return this.returns.push("A");
  };

  DelegatedExample.prototype.pushB = function() {
    return this.returns.push("B");
  };

  DelegatedExample.prototype.pushC = function() {
    return this.returns.push("C");
  };

  return DelegatedExample;

})(Delegator);

describe('Delegator', function() {
  var $fix, delegator;
  delegator = null;
  $fix = null;
  beforeEach(function() {
    addFixture('delegator');
    delegator = new DelegatedExample(fix());
    return $fix = $(fix());
  });
  afterEach(function() {
    return clearFixtures();
  });
  describe("options", function() {
    it("should provide access to an options object", function() {
      assert.equal(delegator.options.foo, "bar");
      return delegator.options.bar = function(a) {
        return "<" + a + ">";
      };
    });
    return it("should be unique to an instance", function() {
      return assert.equal(delegator.options.bar("hello"), "hello");
    });
  });
  it("automatically binds events described in its events property", function() {
    $fix.find('p').click();
    return assert.deepEqual(delegator.returns, ['A']);
  });
  it("will bind events in its events property to its root element if no selector is specified", function() {
    $fix.trigger('baz');
    return assert.deepEqual(delegator.returns, ['B']);
  });
  it("uses event delegation to bind the events", function() {
    $fix.find('ol').append("<li>Hi there, I'm new round here.</li>");
    $fix.find('li').click();
    return assert.deepEqual(delegator.returns, ['C', 'A', 'C', 'A']);
  });
  describe("removeEvents", function() {
    return it("should remove all events previously bound by addEvents", function() {
      delegator.removeEvents();
      $fix.find('ol').append("<li>Hi there, I'm new round here.</li>");
      $fix.find('li').click();
      $fix.trigger('baz');
      return assert.deepEqual(delegator.returns, []);
    });
  });
  describe("on", function() {
    return it("should be an alias of Delegator#subscribe()", function() {
      return assert.strictEqual(delegator.on, delegator.subscribe);
    });
  });
  describe("subscribe", function() {
    it("should bind an event to the Delegator#element", function() {
      var callback;
      callback = sinon.spy();
      delegator.subscribe('custom', callback);
      delegator.element.trigger('custom');
      return assert(callback.called);
    });
    it("should remove the event object from the parameters passed to the callback", function() {
      var callback;
      callback = sinon.spy();
      delegator.subscribe('custom', callback);
      delegator.element.trigger('custom', ['first', 'second', 'third']);
      return assert(callback.calledWith('first', 'second', 'third'));
    });
    it("should ensure the bound function is unbindable", function() {
      var callback;
      callback = sinon.spy();
      delegator.subscribe('custom', callback);
      delegator.unsubscribe('custom', callback);
      delegator.publish('custom');
      return assert.isFalse(callback.called);
    });
    return it("should not bubble custom events", function() {
      var callback;
      callback = sinon.spy();
      $('body').bind('custom', callback);
      delegator.element = $('<div />').appendTo('body');
      delegator.publish('custom');
      return assert.isFalse(callback.called);
    });
  });
  describe("unsubscribe", function() {
    return it("should unbind an event from the Delegator#element", function() {
      var callback;
      callback = sinon.spy();
      delegator.element.bind('custom', callback);
      delegator.unsubscribe('custom', callback);
      delegator.element.trigger('custom');
      assert.isFalse(callback.called);
      callback = sinon.spy();
      delegator.element.bind('custom', callback);
      delegator.unsubscribe('custom');
      delegator.element.trigger('custom');
      return assert.isFalse(callback.called);
    });
  });
  describe("publish", function() {
    return it("should trigger an event on the Delegator#element", function() {
      var callback;
      callback = sinon.spy();
      delegator.element.bind('custom', callback);
      delegator.publish('custom');
      return assert(callback.called);
    });
  });
  return describe("Delegator._isCustomEvent", function() {
    var events;
    events = [['click', false], ['mouseover', false], ['mousedown', false], ['submit', false], ['load', false], ['click.namespaced', false], ['save', true], ['cancel', true], ['update', true]];
    return it("should return true if the string passed is a custom event", function() {
      var event, result, _ref, _results;
      _results = [];
      while (events.length) {
        _ref = events.shift(), event = _ref[0], result = _ref[1];
        _results.push(assert.equal(Delegator._isCustomEvent(event), result));
      }
      return _results;
    });
  });
});

/*
//@ sourceMappingURL=class_spec.map
*/