var datafilter = null;
var dDate   // date dimension
  , gDate   // group by date
  , dLocation
  , dPerson
  , dOrganization
  , dEvent
  , dResource
  , dMessage
  , gAll    // group for all
  ;

var formatNumber = d3.format(",d"),
  formatChange = d3.format("+,d"),
  formatDate = d3.time.format("%B %d, %Y"),
  formatTime = d3.time.format("%I:%M %p");

var network = null;
var map = null;
var timeline = null;
var resourceTable = null;
var personTable = null;
var organizationTable = null;
var messageTable = null;
var workbench = null;
var eventTable = null;
var locationTable = null;

var viz_panels = [];

// enable sub/pub within individual elements
$.each({
    trigger  : 'publish',
    on       : 'subscribe',
    off      : 'unsubscribe'
}, function ( key, val) {
    jQuery.fn[val] = function() {
        this[key].apply(this, Array.prototype.slice.call(arguments));
    };
});

$.subscribe('/data/filter', update);

$.subscribe("/viz/close", function(e, panel_id) {
    // remove the viz panel from viz_panels
    for (var i = 0; i < viz_panels.length; i++) {
        var panel = viz_panels[i];
        if (panel.attr("id") === panel_id) {
            viz_panels.splice(i, 1);
            break;
        }
    }
})
// Event 'entityAdded', triggered after tag is saved in server and returned with attributes from server
$.subscribe("entityAdded", function(e, annotation) {
    var records = [];
    var msg_info = {};
    dMessage.top(Infinity).some(function(d) {
        if (d.uid === annotation.anchor) {
            msg_info.uid = d.uid;
            msg_info.content = d.content;
            msg_info.date = d.date;
            return true;
        }
    })
    annotation.tags.forEach(function(tag) {
        var record = $.extend({
            location: {},
            event: {},
            person: {},
            organization: {},
            resource: {}
        }, msg_info);
        record[tag.entity] = $.extend(record, tag);
        records.push(record);
    })
    updateData(records);
})

function updateData(records) {
    datafilter.add(records);
}

$(document).ready(function() {
    // show progress bar before data is loaded
    $("#progressbar").progressbar({
        value: false
    });
    
    d3.json("data", function(error, result) {
        // Various formatters.
        var data = result.data;
        var wktParser = new OpenLayers.Format.WKT();
        var locations = [];

        data.forEach(function(d, i) {
            d.date  = new Date(d.date);
            if (d.location) {
                var fp = d.location;
                if (fp.shape) {
                    var feature = wktParser.read(fp.shape);
                    var origin_prj = new OpenLayers.Projection("EPSG:" + fp.srid);
                    var dest_prj   = new OpenLayers.Projection("EPSG:900913");
                    feature.geometry.transform(origin_prj, dest_prj); // projection of google map
                    feature.attributes.id = fp.uid;
                    feature.attributes.name= fp.name;
                    fp.shape = feature;
                }
            }
        });

        var nestByDate = d3.nest()
          .key(function(d) { return d3.time.day(d.date); });

        // Create the crossfilter for the relevant dimensions and groups.
        datafilter = crossfilter(data);
        gAll = datafilter.groupAll();
        dDate = datafilter.dimension(function(d) { return d.date; });
        dLocation = datafilter.dimension(function(d) {
            return [d.location.uid, d.location.name, d.location.shape, d.location.srid]; });
        gDate = dDate.group(d3.time.day);
        dResource = datafilter.dimension(function(d) { 
            var res = d.resource;
            return [res.uid, res.name, res.condition, res.resource_type]; 
        });
        dEvent    = datafilter.dimension(function(d) {
            var eve = d.event;
            return [eve.uid, eve.name, eve.types, eve.date];
        });
        dPerson   = datafilter.dimension(function(d) { 
            return [d.person.uid, d.person.name, d.person.gender, d.person.race, d.person.nationality]; 
        });
        dOrganization = datafilter.dimension(function(d) {
            var org = d.organization;
            return [org.uid, org.name, org.types, org.nationality, org.ethnicity, org.religion]; 
        });
        dMessage  = datafilter.dimension(function(d) {
            var mes = d;
            return [mes.uid, mes.content, mes.date] 
        });
        //
        // show requested dialogs
        var dialogs = $.trim($("#display_dialogs").text()).split(",");
        console.log(dialogs);
        showDialogs(dialogs);

        $("#progressbar").remove();


        function parseDate(d) {
            return new Date(2001,
                d.substring(0, 2) - 1,
                d.substring(2, 4),
                d.substring(4, 6),
                d.substring(6, 8));
        }
    });
});

function update() {
//    var panels = ["viz-viztimeline", "viz-viztable", "viz-vizmap", "viz-viznetwork"];
    var len = arguments.length;
	// first argument is event object, ignore it
	// other arguments are the id of viz panels to be excluded for update
    for (var j = 0; j < viz_panels.length; j++) {
        var panel = viz_panels[j];
        if ($.makeArray(arguments).indexOf(panel.attr("id")) < 0) {
            var viz = panel.data("viz");
            panel.data(viz).update();
        }
    }
    /*
	for (var j = 0; j < viz_panels.length; j++) {
        if (len === 1) {
            for (var i = 1; i < len; i++) {
                $(":"+viz_panels[j]).each(function() {
                    this.update();
                });
            }
        } else {
            for (var i = 1; i < len; i++) {
                $(":"+viz_panels[j]).not(":"+arguments[i]).each(function() {
                    this.update();
                });
            }
	    }
	}
	*/
};

//
//

// Whenever the brush moves, re-render everything.
function renderAll() {
    if (map) {
        map.update();
    }
    renderAllButMap();
}

function renderAllExcept(charts) {
    var toDraw = [];
    var all = ['map', 'locationTable', 'timeline', 'network', 'personTable', 'messageTable', 'resourceTable', 'eventTable','organizationTable'];
    for (var i = 0, len = all.length; i < len; i++) {
        if (charts.indexOf(all[i]) === -1) {
            toDraw.push(all[i])
        }
    }
    for (var i = 0, len = toDraw.length; i < len; i++) {
        switch (toDraw[i]) {
            case "map":
                if (map) map.update();
                break;
            case "timeline":
                if (timeline) timeline.each(render);
                break;
            case "network":
                if (network) network.update();
                break;
            case "personTable":
                if (personTable) personTable.update();
                break;
            case "messageTable":
                if (messageTable) messageTable.update();
                break;
            case "locationTable":
                if (locationTable) locationTable.update();
                break;
            case "resourceTable":
                if (resourceTable) resourceTable.update();
                break;
            case "eventTable":
                if (eventTable) eventTable.update();
                break;
            case "organizationTable":
                if (organizationTable) organizationTable.update();
                break;
        }
    }

}

function renderAllButNetwork() {
    if (map) {
        map.update();
    }
    if(timeline) {
        timeline.each(render);
    }
    if (eventTable) {
        eventTable.update();
    }
    if (locationTable) {
        locationTable.update();
    }
    if (messageTable) {
        messageTable.update();
    }
    if (resourceTable) {
        resourceTable.update();
    }
    if (organizationTable) {
        organizationTable.update();
    }
    if (personTable) {
        personTable.update();
    }
    if (network) {
        network.update();
    }
}

function renderAllButMap() {
    if (timeline) {
        timeline.each(render);
    }
    if (messageTable) {
        messageTable.update();
    }
    if (resourceTable) {
        resourceTable.update();
    }
    if (locationTable) {
        locationTable.update();
    }
    if (eventTable) {
        eventTable.update();
    }
    if (organizationTable) {
        organizationTable.update();
    }
    if (personTable) {
        personTable.update();
    }
    if (network) {
        network.update();
    }
}

function highlight(location_id) {
    if (map) map.highlight([location_id]);
//  var eve = null; // the target event
//  var NoException = {};
//  try {
//      // NoException: dirty trick to do 'break' in forEach
//      dDate.top(Infinity).forEach(function(p, i) {
//          if (p.id == event_id) {
//              eve = p;
//              throw NoException;
//          }
//      });
//  } catch(e) {
//      if (e !== NoException) throw e;
//      var footprints_id = [];
//      for (var i = 0; i < eve.footprints.length; i++) {
//          footprints_id.push(eve.footprints[i].id);
//      }
//      if (map) {
//          map.highlight(footprints_id);
//      }
//  }
}

function highlightFromNetwork(ids) {
    for (var i = 0, len = ids.length; i < len; i++) {
        dDate.top(Infinity).forEach(function(p, i) {
        });
    }
}

function unhighlightFromNetwork(ids) {
    for (var i = 0, len = ids.length; i < len; i++) {
    }
}
