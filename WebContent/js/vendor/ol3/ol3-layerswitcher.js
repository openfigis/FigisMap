/**
 * OpenLayers 3 Layer Switcher Control.
 * See [the examples](./examples) for usage.
 * @constructor
 * @extends {ol.control.Control}
 * @param {Object} opt_options Control options, extends olx.control.ControlOptions adding:
 *                              **`tipLabel`** `String` - the button tooltip.
 */
ol.control.LayerSwitcher = function(opt_options) {

    var options = opt_options || {};

    var tipLabel = options.tipLabel ?
      options.tipLabel : 'Legend';

    this.displayLegend_ = options.displayLegend ? options.displayLegend : false;
	this.togglingLegendGraphic_ = options.toggleLegendGraphic ? options.displayLegend : false;
	this.collapsableGroups_ = options.collapsableGroups ? options.collapsableGroups : false;
	this.isExternalized = (options.id)? true : false;
	
    this.mapListeners = [];

	if(this.isExternalized){
		this.panel = document.getElementById(options.id);
		this.panel.className = 'panel';
	}else{
		this.panel = document.createElement('div');
		
		 this.hiddenClassName = 'ol-unselectable ol-control layer-switcher';
		this.shownClassName = this.hiddenClassName + ' shown';
		
		var element = document.createElement('div');
		element.className = this.hiddenClassName;
		element.appendChild(this.panel);
		var button = document.createElement('button');
		button.setAttribute('title', tipLabel);
		element.appendChild(button);

		var this_ = this;

		button.onclick = function(e) {
			this_.showPanel();
		};
		
		element.onmouseover = function(e) {
			this_.showPanel();
		};

		element.onmouseout = function(e) {
			e = e || window.event;
			if (!element.contains(e.toElement)) {
				this_.hidePanel();
			}
		};
	}
		
    
    ol.control.Control.call(this, {
        element: (this.isExternalized)? this.panel : element,
        target: options.target
    });

};

ol.inherits(ol.control.LayerSwitcher, ol.control.Control);

/**
 * Show the layer panel.
 */
ol.control.LayerSwitcher.prototype.showPanel = function() {
    if (this.element.className != this.shownClassName) {
        this.element.className = this.shownClassName;
        this.renderPanel();
    }
};

/**
 * Hide the layer panel.
 */
ol.control.LayerSwitcher.prototype.hidePanel = function() {
    if (this.element.className != this.hiddenClassName) {
        this.element.className = this.hiddenClassName;
    }
};

/**
 * Re-draw the layer panel to represent the current state of the layers.
 */
ol.control.LayerSwitcher.prototype.renderPanel = function() {

    this.ensureTopVisibleBaseLayerShown_();

    while(this.panel.firstChild) {
        this.panel.removeChild(this.panel.firstChild);
    }

    var ul = document.createElement('ul');
    this.panel.appendChild(ul);
    this.renderLayers_(this.getMap(), ul);

};

/**
 * Set the map instance the control is associated with.
 * @param {ol.Map} map The map instance.
 */
ol.control.LayerSwitcher.prototype.setMap = function(map) {
    // Clean up listeners associated with the previous map
    for (var i = 0, key; i < this.mapListeners.length; i++) {
        this.getMap().unByKey(this.mapListeners[i]);
    }
    this.mapListeners.length = 0;
    // Wire up listeners etc. and store reference to new map
    ol.control.Control.prototype.setMap.call(this, map);
    if (map) {
		
		//configure map listeners
		this.mapListeners.push(map.once("postrender", function(){
			this.renderPanel();
		}, this));
		if(!this.isExternalized){
			this.mapListeners.push(map.on('pointerdown', function() {
				this.hidePanel();
			}, this));
		}
        this.renderPanel();
    }
};

/**
 * Ensure only the top-most base layer is visible if more than one is visible.
 * @private
 */
ol.control.LayerSwitcher.prototype.ensureTopVisibleBaseLayerShown_ = function() {
    var lastVisibleBaseLyr;
    ol.control.LayerSwitcher.forEachRecursive(this.getMap(), function(l, idx, a) {
        if (l.get('type') === 'base' && l.getVisible()) {
            lastVisibleBaseLyr = l;
        }
    });
    if (lastVisibleBaseLyr) this.setVisible_(lastVisibleBaseLyr, true);
};

/**
 * Toggle the visible state of a layer.
 * Takes care of hiding other layers in the same exclusive group if the layer
 * is toggle to visible.
 * @private
 * @param {ol.layer.Base} The layer whos visibility will be toggled.
 */
ol.control.LayerSwitcher.prototype.setVisible_ = function(lyr, visible) {
    var map = this.getMap();
    lyr.setVisible(visible);
    if (visible && lyr.get('type') === 'base') {
        // Hide all other base layers regardless of grouping
        ol.control.LayerSwitcher.forEachRecursive(map, function(l, idx, a) {
            if (l != lyr && l.get('type') === 'base') {
                l.setVisible(false);
            }
        });
    }
};


/**
 * Builds a GetLegendGraphic WMS request to handle layer legend
 * @param {ol.layer.TileWMS} lyr WMS Layer
 * @return {String} string representing the GetLegendGraphic URL request
 * 
 */
ol.control.LayerSwitcher.prototype.getLegendGraphic_ = function(lyr) {
	
	var source = lyr.getSource();
	if( !(source instanceof ol.source.TileWMS) ) return false;
	
	var params = source.getParams();

	var request = '';
	request += source.getUrls()[0] + '?';
	request += 'VERSION=1.0.0';
	request += '&REQUEST=GetLegendGraphic';
	request += '&LAYER=' + params.LAYERS;
	request += '&STYLE=' + ( (params.STYLES)? params.STYLES : '');
	request += '&LEGEND_OPTIONS=forcelabels:on;forcerule:True;fontSize:12'; //maybe to let as options
	request += '&SCALE=139770286.4465912'; //to investigate
	request += '&FORMAT=image/png';
	request += '&TRANSPARENT=true';
	
	return request;
}


/**
 * Render all layers that are children of a group.
 * @private
 * @param {ol.layer.Base} lyr Layer to be rendered (should have a title property).
 * @param {Number} idx Position in parent group list.
 */
ol.control.LayerSwitcher.prototype.renderLayer_ = function(lyr, idx) {

    var this_ = this;

    var li = document.createElement('li');

    var lyrTitle = lyr.get('title');
    var lyrId = lyr.get('title').replace(' ', '-') + '_' + idx;

    var label = document.createElement('label');

    if (lyr.getLayers) {

		var groupClassName = 'layer-switcher-layergroup shown';
		var groupHiddenClassName = 'layer-switcher-layergroup';
	
        li.className = groupClassName;
        label.innerHTML = lyrTitle;
		
		if(this.collapsableGroups_ ){
			if(lyr.getLayers().getArray().length > 0){
				if(lyr.getLayers().getArray()[0].get('type') != 'base')
					label.style.textDecoration = "underline";
					label.onclick = function(e) {
						li.className = (li.className == groupClassName)? groupHiddenClassName : groupClassName;
					};
			}
		}
        li.appendChild(label);
        var ul = document.createElement('ul');
        li.appendChild(ul);

        this.renderLayers_(lyr, ul);

    } else {
	
		li.className = "layer-switcher-layer";
	
		//create html
        var input = document.createElement('input');
        if (lyr.get('type') === 'base') {
            input.type = 'radio';
            input.name = 'base';
        } else {
            input.type = 'checkbox';
        }
        input.id = lyrId;
        input.checked = lyr.get('visible');
        input.onchange = function(e) {
            this_.setVisible_(lyr, e.target.checked);
			if(this_.togglingLegendGraphic_) this_.toggleLegendGraphic_(lyr, idx);
        };
        li.appendChild(input);

        label.htmlFor = lyrId;
        label.innerHTML = lyrTitle;
        li.appendChild(label);
		
		//handling legend graphic for overlays
		this.renderLegendGraphic_(lyr, idx, li);
    }

    return li;

};

/**
 * Render a layer legend graphic
 * @private
 * @param {ol.layer.Base} lyr Layer for which the legend should be rendered
 */
ol.control.LayerSwitcher.prototype.renderLegendGraphic_ = function(lyr, idx, li) {
	if( this.displayLegend_ && lyr.get('type') != 'base' && lyr.showLegendGraphic){
   	
		var imgSrc = false;
		if(lyr instanceof ol.layer.Tile){
			imgSrc = this.getLegendGraphic_(lyr);
		}else if(lyr instanceof ol.layer.Vector){
			imgSrc = (lyr.icon)? lyr.icon : false;
		}
		
		if(imgSrc){
			var legend = document.createElement('div');
			var legendId = lyr.get('title').replace(' ', '-') + '_' + idx + "_legend";
			legend.id = legendId;
			legend.style.display = (lyr.getVisible()? "block" : "none");
			var img = '<img src="'+imgSrc+'" />';
			legend.innerHTML = img;
			li.appendChild(legend);
		}
    }
}

/**
 * Toggles a layer legend (hide/show legend image)
 * @private
 * @param {ol.layer.Base} lyr Layer for which the legend should be rendered
 */
ol.control.LayerSwitcher.prototype.toggleLegendGraphic_ = function(lyr, idx) {
	var legendId = lyr.get('title').replace(' ', '-') + '_' + idx + "_legend";
	var legend = document.getElementById(legendId);
	legend.style.display = (lyr.getVisible()? "block" : "none");
}

/**
 * Render all layers that are children of a group.
 * @private
 * @param {ol.layer.Group} lyr Group layer whos children will be rendered.
 * @param {Element} elm DOM element that children will be appended to.
 */
ol.control.LayerSwitcher.prototype.renderLayers_ = function(lyr, elm) {
    var lyrs = lyr.getLayers().getArray().slice().reverse();
    for (var i = 0, l; i < lyrs.length; i++) {
        l = lyrs[i];
        if (l.get('title')) {
            elm.appendChild(this.renderLayer_(l, i));
        }
    }
};

/**
 * **Static** Call the supplied function for each layer in the passed layer group
 * recursing nested groups.
 * @param {ol.layer.Group} lyr The layer group to start iterating from.
 * @param {Function} fn Callback which will be called for each `ol.layer.Base`
 * found under `lyr`. The signature for `fn` is the same as `ol.Collection#forEach`
 */
ol.control.LayerSwitcher.forEachRecursive = function(lyr, fn) {
    lyr.getLayers().forEach(function(lyr, idx, a) {
        fn(lyr, idx, a);
        if (lyr.getLayers) {
            ol.control.LayerSwitcher.forEachRecursive(lyr, fn);
        }
    });
};
