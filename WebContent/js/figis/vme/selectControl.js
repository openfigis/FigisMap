OpenLayers.Control.SelectFeature = OpenLayers.Class(OpenLayers.Control.SelectFeature, {
    
    /**
     * Property: hover
     * {Boolean} - Used to determine whether the SelectFeature control is listening for hover events as opposed to click events.
     * 
     * Default setting is true.
     */
    hover: false,
    
    /**
     * Property: maxWidth
     * {Boolean} - Used to determine maxWidth for popups.
     * 
     * Default setting is null.
     */
    maxWidth: null,
    
    /**
     * Property: maxHeight
     * {Boolean} - Used to determine maxHeight for popups.
     * 
     * Default setting is null.
     */
    maxHeight: null,
    
    /**
     * Property: selectedFeature
     * {Object} - A handle to the currently selected feature.
     * 
     * Default setting is null.
     */
    selectedFeature: null,
    
    /**
     * Constant: EVENT_TYPES
     *
     * Supported event types:
     *  - *beforefeaturehighlighted* Triggered before a feature is highlighted
     *  - *featurehighlighted* Triggered when a feature is highlighted
     *  - *featureunhighlighted* Triggered when a feature is unhighlighted
     */
    EVENT_TYPES: ["beforefeaturehighlighted", "featurehighlighted", "featureunhighlighted"],

    /**
     * APIProperty: highlightOnly
     * {Boolean} If true do not actually select features (i.e. place them in the
     * layer's selected features array), just highlight them. This property has
     * no effect if hover is false. Defaults to false.
     */
    highlightOnly: false,

    
    /**
     * Property: onBeforeSelect 
     * {Function} Optional function to be called before a feature is selected.
     *     The function should expect to be called with a feature.
     */
    onBeforeSelect: function() {},
    
    /**
     * Property: scope
     * {Object} The scope to use with the onBeforeSelect, onSelect, onUnselect
     *     callbacks. If null the scope will be this control.
     */
    scope: null,

    /**
     * Property: layers
     * {Array(<OpenLayers.Layer.Vector>} The layers this control will work on,
     * or null if the control was configured with a single layer
     */
    layers: null,
    

    /**
     * Constructor: OpenLayers.Control.SelectFeature
     * Create a new control for selecting features.
     *
     * Parameters:
     * layers - {<OpenLayers.Layer.Vector>}, or an array of vector layers. The
     *     layer(s) this control will select features from.
     * options - {Object} 
     */
    initialize: function(layers, options) {
        this.EVENT_TYPES = ["beforefeaturehighlighted", "featurehighlighted", "featureunhighlighted", "activate", "deactivate"];
        OpenLayers.Control.prototype.initialize.apply(this, [options]);
        
        if(this.scope == null) {
            this.scope = this;
        }
        if(this.maxHeight != null) {
        	OpenLayers.Popup.MAXPOPUPHEIGHT = this.maxHeight;
        }
        if(this.maxWidth != null) {
        	OpenLayers.Popup.MAXPOPUPWIDTH = this.maxWidth;
        }
        if(layers instanceof Array) {
            this.layers = layers;
            this.layer = new OpenLayers.Layer.Vector.RootContainer(
                this.id + "_container", {
                    layers: layers[0]
                }
            );
        } else {
            this.layer = layers;
        }
        var callbacks = {
            click: this.clickFeature,
            clickout: this.clickoutFeature
        };
        if (this.hover) {
            callbacks.over = this.overFeature;
            callbacks.out = this.outFeature;
        }
             
        this.callbacks = OpenLayers.Util.extend(callbacks, this.callbacks);
        this.handlers = {
            feature: new OpenLayers.Handler.Feature(
                this, this.layer, this.callbacks,
                {geometryTypes: this.geometryTypes}
            )
        };

        if (this.box) {
            this.handlers.box = new OpenLayers.Handler.Box(
                this, {done: this.selectBox},
                {boxDivClassName: "olHandlerBoxSelectFeature"}
            ); 
        }
        this.onSelect = this.onFeatureSelect; 
    },
    
    /**
     * Method: destroy
     */
    destroy: function() {
        OpenLayers.Control.prototype.destroy.apply(this, arguments);
        if(this.layers) {
            this.layer.destroy();
        }
    },


    /**
     * Method: overFeature
     * Called when the feature handler detects a mouse-over on a feature.
     * Only responds if this.hover is true.
     *
     * Parameters:
     * feature - {<OpenLayers.Feature.Vector>} 
     */
    onFeatureSelect: function (feature) {
        if (this.hover && (OpenLayers.Util.indexOf(this.layer.selectedFeatures, feature) == -1)) {
            this.select(feature, false, this.maxWidth, this.maxHeight);
        }
    },
    
    /**
     * Add feature to the layer's selectedFeature array, render the feature as
     * selected, and call the onSelect function.
     * Parameters:
     * feature - {OpenLayers.Feature.Vector}
     */
    select: function (feature, minimizedView) 
    {
        this.setPopupColor('red');
        //OpenLayers.Control.SelectFeature.prototype.select.apply(this, arguments);
        this.map.activeFeature = feature;
        this.map.activeFeatureArgs = arguments;
        this.createPopup(feature, minimizedView, OpenLayers.Popup.MAXPOPUPWIDTH, OpenLayers.Popup.MAXPOPUPHEIGHT);
        this.map.addPopup(feature.popup, true);
        feature.popup.panIntoView();
    },

    /**
     * Method: featureResize
     * Called when the popup title link is clicked. This maximizes the popup to full size.
     *
     * Parameters:
     * feature - {<OpenLayers.Feature.Vector>}
     * arguments - {object} HashTable of arguments
     * minimize - {boolean} Whether to create a maximized popup or minizmied one
     */
    featureResize: function (feature, arguments, minimize) {
        //feature.layer.map.removePopup(feature.popup);
        this.setPopupColor('red');
        if (!(OpenLayers.Util.indexOf(feature.layer.selectedFeatures, feature) > -1) || feature.layer.CLASS_NAME == "COMET.Layer.WIS" || feature.layer.CLASS_NAME == "COMET.Layer.AATF") {
            this.setPopupColor('red');
            if (minimize == true) {
                this.createPopup(feature, true, OpenLayers.Popup.MAXPOPUPWIDTH, OpenLayers.Popup.MAXPOPUPHEIGHT);
            } else {
                this.createPopup(feature, false, OpenLayers.Popup.MAXPOPUPWIDTH, OpenLayers.Popup.MAXPOPUPHEIGHT);
            }
            feature.layer.map.addPopup(feature.popup, true);
        }
    },
    
    /**
     * Method: showClusterFeatures
     * Called by a link inside a Cluster popup. Displays individual features 
     * in a Cluster. Sets COMET.CMap.activeFeature to a random individual feature.
     * Parameters:
     * feature - {<OpenLayers.Feature.Vector>} COMET.CMap.activeFeature
     */
    showClusterFeatures: function(feature) {
        feature.layer.map.removePopup(feature.popup);
        this.map.activeFeature = feature.layer._strategy.showFeatures(feature);
    },
     
    
    /**
     * Method: onFeatureUnselect
     * Called when the popup is closed. Destroys the popup.
     *
     * Parameters:
     * feature - {<OpenLayers.Feature.Vector>}
     */ 
    onFeatureUnselect: function (feature) {
        this.map.removePopup(feature.popup);
        feature.popup.destroy();
        feature.popup = null;
    },
    
    /**
     * Method: clickFeature
     * Called on click in a feature
     * Only responds if this.hover is false.
     *
     * Parameters:
     * feature - {<OpenLayers.Feature.Vector>} 
     */
    clickFeature: function(feature) {
        if(!this.hover) {
        	if (OpenLayers.Util.indexOf(this.layer.selectedFeatures, feature) == -1) {
	            this.select(feature, false, this.maxWidth, this.maxHeight);
	        }
            /***
            var selected = (OpenLayers.Util.indexOf(
                feature.layer.selectedFeatures, feature) > -1);
            if(selected) {
                if(this.toggleSelect()) {
                    this.unselect(feature);
                } else if(!this.multipleSelect()) {
                    this.unselectAll({except: feature});
                }
            } else {
                if(!this.multipleSelect()) {
                    this.unselectAll({except: feature});
                }
                this.select(feature);
            }
            ***/
        }
    },

    /**
     * Method: multipleSelect
     * Allow for multiple selected features based on <multiple> property and
     *     <multipleKey> event modifier.
     *
     * Returns:
     * {Boolean} Allow for multiple selected features.
     */
    multipleSelect: function() {
        return this.multiple || (this.handlers.feature.evt &&
                                 this.handlers.feature.evt[this.multipleKey]);
    },
    
    /**
     * Method: toggleSelect
     * Event should toggle the selected state of a feature based on <toggle>
     *     property and <toggleKey> event modifier.
     *
     * Returns:
     * {Boolean} Toggle the selected state of a feature.
     */
    toggleSelect: function() {
        return this.toggle || (this.handlers.feature.evt &&
                               this.handlers.feature.evt[this.toggleKey]);
    },


    /**
     * Method: overFeature
     * Called on over a feature.
     * Only responds if this.hover is true.
     *
     * Parameters:
     * feature - {<OpenLayers.Feature.Vector>} 
     */
    overFeature: function(feature) {
        var layer = feature.layer;
        if(this.hover) {
            if(this.highlightOnly) {
                this.highlight(feature);
            } else if(OpenLayers.Util.indexOf(
                layer.selectedFeatures, feature) == -1) {
                this.select(feature);
            }
        }
    },

    /**
     * Method: outFeature
     * Called on out of a selected feature.
     * Only responds if this.hover is true.
     *
     * Parameters:
     * feature - {<OpenLayers.Feature.Vector>} 
     */
    outFeature: function(feature) {
        if(this.hover) {
            if(this.highlightOnly) {
                // we do nothing if we're not the last highlighter of the
                // feature
                if(feature._lastHighlighter == this.id) {
                    // if another select control had highlighted the feature before
                    // we did it ourself then we use that control to highlight the
                    // feature as it was before we highlighted it, else we just
                    // unhighlight it
                    if(feature._prevHighlighter &&
                       feature._prevHighlighter != this.id) {
                        delete feature._lastHighlighter;
                        var control = this.map.getControl(
                            feature._prevHighlighter);
                        if(control) {
                            control.highlight(feature);
                        }
                    } else {
                        this.unhighlight(feature);
                    }
                }
            } else {
                this.unselect(feature);
            }
        }
    },


    /**
     * Method: highlight
     * Redraw feature with the select style.
     *
     * Parameters:
     * feature - {<OpenLayers.Feature.Vector>} 
     */
    highlight: function(feature) {
        var layer = feature.layer;
        var cont = this.events.triggerEvent("beforefeaturehighlighted", {
            feature : feature
        });
        if(cont != false) {
            feature._prevHighlighter = feature._lastHighlighter;
            feature._lastHighlighter = this.id;
            var style = this.selectStyle || this.renderIntent;
            layer.drawFeature(feature, style);
            this.events.triggerEvent("featurehighlighted", {feature : feature});
        }
    },

    /**
     * Method: unhighlight
     * Redraw feature with the "default" style
     *
     * Parameters:
     * feature - {<OpenLayers.Feature.Vector>} 
     */
    unhighlight: function(feature) {
        var layer = feature.layer;
        feature._lastHighlighter = feature._prevHighlighter;
        delete feature._prevHighlighter;
        layer.drawFeature(feature, feature.style || feature.layer.style ||
            "default");
        this.events.triggerEvent("featureunhighlighted", {feature : feature});
    },
    

    
    
    /**
     * Method: createPopup
     * Called when the feature detects a mouse over event or a title link is selected to maximize an existing popup.
     *
     * Parameters:
     * feature - {<OpenLayers.Feature.Vector>}
     * minimizedView - {boolean} Whether to create a maximized popup or minizmied one
     */
    createPopup: function (feature, minimizedView, maxWidth, maxHeight) {
    	minimizedView = false;
        var size = new OpenLayers.Size(250, 120); 
        var name = (feature.attributes.name != null) ? feature.attributes.name : feature.attributes.title;
        if (name == undefined) {
            //name = "No Title";
        	if (feature.attributes.stat_name != null && feature.attributes.stat_name != undefined) {
        		name = feature.attributes.stat_name;
        	} else if (feature.attributes.school != null && feature.attributes.school != undefined) {
        		name = feature.attributes.school;
        	} else if (feature.attributes.wagency != null && feature.attributes.wagency != undefined) {
        		name = feature.attributes.wagency + " Fire Hydrant";
        	} else {
        		name = "No Title";
        	}
        }
        
        if (feature.attributes.description == undefined) {
        	if (feature.attributes.stat_name != null && feature.attributes.stat_name != undefined) {
        		feature.attributes.description = "<b>District: </b>" + feature.attributes.dist_name + "<br/>";
        		feature.attributes.description += "<b>Jurisdiction: </b>" + feature.attributes.juris + "<br/>";
        		feature.attributes.description += "<b>Type: </b>" + feature.attributes.stat_type + "<br/>";
        		feature.attributes.description += "<b>Station Number: </b>" + feature.attributes.sta_num + "<br/>";
        		if (feature.attributes.phone_num == undefined || feature.attributes.phone_num == null) {
        			feature.attributes.description += "<b>Phone: </b> Not Available";
        		} else {
        			feature.attributes.description += "<b>Phone: </b>" + feature.attributes.phone_num;
        		}
        	} else if (feature.attributes.school != null && feature.attributes.school != undefined) {
        		feature.attributes.description = "<b>District: </b>" + feature.attributes.district + "<br/>";
        		feature.attributes.description += "<b>Type: </b>" + feature.attributes.sch_type + "<br/>";
        		feature.attributes.description += "<b>Grades: </b>" + feature.attributes.grd_span + "<br/>";
        		feature.attributes.description += "<b>Address 1: </b>" + feature.attributes.str_addr + "<br/>";
        		feature.attributes.description += "<b>Address 2: </b>" + feature.attributes.str_city + ", " + feature.attributes.zip;
        	} else if (feature.attributes.wagency != null && feature.attributes.wagency != undefined) {
        		feature.attributes.description = "<b>Type: </b>" + feature.attributes.pubpvt + "<br/>";
        		feature.attributes.description += "<b>Flow (GPM): </b>" + feature.attributes.gpmflow; 
        	} else if (feature.attributes.lic_type != null && feature.attributes.lic_type != undefined) {
        		feature.attributes.description = "<b>Type: </b>" + feature.attributes.lic_type + "<br/>";
        		feature.attributes.description += "<b>Services: </b>" + feature.attributes.srv_type + "<br/>";
        		feature.attributes.description += "<b>Address 1: </b>" + feature.attributes.addr + "<br/>";
        		feature.attributes.description += "<b>Address 2: </b>" + feature.attributes.city + ", " + feature.attributes.zip;
        	} else {
            	feature.attributes.description = "No Description";
        	}
        }
        
        var time = (feature.attributes.timestring? feature.attributes.timestring : undefined);
         
        if (minimizedView == false) {
            popup = new OpenLayers.Popup.SmartPopup('test',
                feature.geometry.getBounds().getCenterLonLat(), 
                size, 
                name,
                feature.attributes.description, 
                feature.attributes.link, 
                null, 
                true, 
                "vector",
                time,
                maxWidth,
                maxHeight);
        } else {
            popup = new OpenLayers.Popup.SmartPopup('test', 
                feature.geometry.getBounds().getCenterLonLat(), 
                size, 
                name,
                feature.attributes.description, 
                feature.attributes.link, 
                null, 
                false, 
                "vector", 
                time,
                maxWidth,
                maxHeight);
        }
        feature.popup = popup;
        //OpenLayers.map.activeFeature.layer.map.addPopup(popup);
        this.map.addPopup(popup);
    },


    /**
     * Method: activate
     * Activates the control.
     * 
     * Returns:
     * {Boolean} The control was effectively activated.
     */
    activate: function () {
        if (!this.active) {
            if(this.layers) {
                this.map.addLayer(this.layer);
            }
            this.handlers.feature.activate();
            if(this.box && this.handlers.box) {
                this.handlers.box.activate();
            }
        }
        return OpenLayers.Control.prototype.activate.apply(
            this, arguments
        );
    },

    /**
     * Method: deactivate
     * Deactivates the control.
     * 
     * Returns:
     * {Boolean} The control was effectively deactivated.
     */
    deactivate: function () {
        if (this.active) {
            this.handlers.feature.deactivate();
            if(this.handlers.box) {
                this.handlers.box.deactivate();
            }
            if(this.layers) {
                this.map.removeLayer(this.layer);
            }
        }
        return OpenLayers.Control.prototype.deactivate.apply(
            this, arguments
        );
    },

    /**
     * Method: unselectAll
     * Unselect all selected features.  To unselect all except for a single
     *     feature, set the options.except property to the feature.
     *
     * Parameters:
     * options - {Object} Optional configuration object.
     */
    unselectAll: function(options) {
        // we'll want an option to supress notification here
        var layers = this.layers || [this.layer];
        var layer, feature;
        for(var l=0; l<layers.length; ++l) {
            layer = layers[l];
            if (layer.selectedFeatures != null && layer.selectedFeatures != undefined) {
	            for(var i=layer.selectedFeatures.length-1; i>=0; --i) {
	                feature = layer.selectedFeatures[i];
	                if(!options || options.except != feature) {
	                    this.unselect(feature);
	                }
	            }
            }
        }
    },
    
    /**
     * Method: createFramedPopup
     * Called when the feature that uses a FramedCloud popup class is selected.
     *
     * Parameters:
     * feature - {<OpenLayers.Feature.Vector>}
     */
    createFramedPopup: function (feature) { 
        this.selectedFeature = feature;
        // Since KML is user-generated, do naive protection against
        // Javascript.
        var content = "<h2>" + feature.attributes.name + "</h2>" + feature.attributes.description;
        if (content.search("<script") != -1) {
            content = "Content contained Javascript! Escaped content below.<br />" + content.replace(/</g, "&lt;");
        }
        popup = new OpenLayers.Popup.FramedCloud("chicken", 
                feature.geometry.getBounds().getCenterLonLat(),
                new OpenLayers.Size(100, 100),
                content,
                null, true, this.onPopupClose);
        feature.popup = popup;
        this.map.addPopup(popup);
    },
 
    /**
     * Method: selectBox
     * Callback from the handlers.box set up when <box> selection is true
     *     on.
     *
     * Parameters:
     * position - {<OpenLayers.Bounds> || <OpenLayers.Pixel> }  
     */
    selectBox: function(position) {
        if (position instanceof OpenLayers.Bounds) {
            var minXY = this.map.getLonLatFromPixel(
                new OpenLayers.Pixel(position.left, position.bottom)
            );
            var maxXY = this.map.getLonLatFromPixel(
                new OpenLayers.Pixel(position.right, position.top)
            );
            var bounds = new OpenLayers.Bounds(
                minXY.lon, minXY.lat, maxXY.lon, maxXY.lat
            );
            
            // if multiple is false, first deselect currently selected features
            if (!this.multipleSelect()) {
                this.unselectAll();
            }
            
            // because we're using a box, we consider we want multiple selection
            var prevMultiple = this.multiple;
            this.multiple = true;
            var layers = this.layers || [this.layer];
            var layer;
            for(var l=0; l<layers.length; ++l) {
                layer = layers[l];
                for(var i=0, len = layer.features.length; i<len; ++i) {
                    var feature = layer.features[i];
                    if (this.geometryTypes == null || OpenLayers.Util.indexOf(
                            this.geometryTypes, feature.geometry.CLASS_NAME) > -1) {
                        if (bounds.toGeometry().intersects(feature.geometry)) {
                            if (OpenLayers.Util.indexOf(layer.selectedFeatures, feature) == -1) {
                                this.select(feature);
                            }
                        }
                    }
                }
            }
            this.multiple = prevMultiple;
        }
    },


    
    /**
     * Method: onPopupClose
     * Called when the popup is closed. This method unselects the selected feature.
     *
     * Parameters:
     * feature - {<OpenLayers.Feature.Vector>}
     */
    onPopupClose: function (evt) {
        this.unselect(this.selectedFeature);
    },
    
    setPopupColor: function (color) {
	    OpenLayers.Popup.CORNERS = {
	        TL : {src:'/js/OpenLayers/img/' + color + '/topl.png', sizing: 'scale'},
	        TM : {src:'/js/OpenLayers/img/' + color + '/topm.png', sizing: 'crop'},
	        TR : {src:'/js/OpenLayers/img/' + color + '/topr.png', sizing: 'scale'},
	        CL : {src:'/js/OpenLayers/img/' + color + '/close.PNG', sizing: 'scale'},
	        MN : {src:'/js/OpenLayers/img/' + color + '/icon_up.gif', sizing: 'scale'},
	        LN : {src:'/js/OpenLayers/img/' + color + '/line.png', sizing: 'crop'},
	        ML : {src:'/js/OpenLayers/img/' + color + '/midl.png', sizing: 'crop'},
	        MR : {src:'/js/OpenLayers/img/' + color + '/midr.png', sizing: 'crop'},
	        BL : {src:'/js/OpenLayers/img/' + color + '/botl.png', sizing: 'scale'},
	        BM : {src:'/js/OpenLayers/img/' + color + '/botm.png', sizing: 'crop'},
	        BR : {src:'/js/OpenLayers/img/' + color + '/botr.png', sizing: 'scale'}
	    };
	},

       /** @final @type String */
    CLASS_NAME: "OpenLayers.Control.SelectFeature"
});
OpenLayers.Popup.MAXPOPUPWIDTH = 700;
OpenLayers.Popup.MAXPOPUPHEIGHT = 250;