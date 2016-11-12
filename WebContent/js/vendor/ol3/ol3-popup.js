/**
 * OpenLayers 3 Popup Overlay.
 * See [the examples](./examples) for usage. Styling can be done via CSS.
 * @constructor
 * @extends {ol.Overlay}
 * @param {Object} opt_options Overlay options, extends olx.OverlayOptions adding:
 *                              **`panMapIfOutOfView`** `Boolean` - Should the
 *                              map be panned so that the popup is entirely
 *                              within view.
 *                              **`dynamicPosition`** `Boolean` - Should the
 *                              map be panned so that the popup is entirely
 *                              within view. Default is false
 *
 */
ol.Overlay.Popup = function(opt_options) {
	
	var options = opt_options || {};
	
	//TODO @eblondel support in ol3-popup plugin to add
	this.id_ = options.id? options.id : undefined;

	this.panMapIfOutOfView = options.panMapIfOutOfView;
	if (this.panMapIfOutOfView === undefined) {
		this.panMapIfOutOfView = true;
	}

	this.dynamicPosition = options.dynamicPosition? options.dynamicPosition : false;

	this.isTooltip = (options.isTooltip)? options.isTooltip : false;
	
	this.ani = options.ani;
	if (this.ani === undefined) {
		this.ani = ol.animation.pan;
	}
	
	this.ani_opts = options.ani_opts;
	if (this.ani_opts === undefined) {
		this.ani_opts = {'duration': 250};
	}


	this.container = document.createElement('div');
	this.container.className = (this.isTooltip) ? 'ol-tooltip' : 'ol-popup';
	
	if( !this.isTooltip ) {
		this.closer = document.createElement('a');
		this.closer.className = 'ol-popup-closer';
		this.closer.href = '#';
		this.container.appendChild(this.closer);
		
		var that = this;
		this.closer.addEventListener('click', function(evt) {
			that.container.style.display = 'none';
			that.closer.blur();
			evt.preventDefault();
			}, false
		);
	}

	this.content = document.createElement('div');	
	this.content.className = ( this.isTooltip )? 'ol-tooltip-content' : 'ol-popup-content';
	this.container.appendChild(this.content);

	//events
	this.mapEventListeners = new Array();
	
	// Apply workaround to enable scrolling of content div on touch devices
	ol.Overlay.Popup.enableTouchScroll_(this.content);
	
	ol.Overlay.call(this, {
		id: this.id_, //TODO @eblondel support in ol3-popup plugin to add
		element: this.container,
		stopEvent: true,
		insertFirst: (options.hasOwnProperty('insertFirst')) ? options.insertFirst : true
		}
	);
};

ol.inherits(ol.Overlay.Popup, ol.Overlay);

/**
 * Show the popup.
 * @param {ol.Coordinate} coord Where to anchor the popup.
 * @param {String} {HTMLDivElement} html String or element of HTML to display within the popup.
 */
ol.Overlay.Popup.prototype.show = function(coord, html) {
	
	this.setPosition(coord);	
	if(html instanceof HTMLDivElement){
		this.content.innerHTML = "";
		this.content.appendChild(html);
	}else{
		this.content.innerHTML = html;
	}

	this.container.style.display = 'block';
	if(this.dynamicPosition) {
		this.setDynamicPosition_(coord);
		
		if(this.mapEventListeners.length == 0) {
			//map event in case of dynamic position (to switch dynamically position between top-bottom)
			var this_ = this;
			this.mapEventListeners.push(this.getMap().getView().on("propertychange", function(evt){
				var evtCoord = this_.getPosition();
				this_.setDynamicPosition_(evtCoord);
			}));
		}
	}
	if (this.panMapIfOutOfView) {
		this.panIntoView_(coord);
	}
	this.content.scrollTop = 0;
	return this;
};


/**
 * Hide the popup.
 */
ol.Overlay.Popup.prototype.hide = function() {
	this.container.style.display = 'none';
	return this;
};


/**
 * Indicates if the popup is in open state
 */
ol.Overlay.Popup.prototype.isOpened = function(){
	return this.container.style.display == 'block';
};

/**
 * Indicates if the popup is a tooltip
 */
ol.Overlay.Popup.prototype.isTooltip = function(){
	return this.isTooltip;
};


/**
 * @private
 */
ol.Overlay.Popup.prototype.setDynamicPosition_ = function(coord){

	this.getElement().className = (this.isTooltip)? "ol-tooltip" : "ol-popup";	
	var popClassName = (this.isTooltip)? "ol-tooltip-content" : "ol-popup-content";
	var computedStyle = getComputedStyle(this.getElement().getElementsByClassName(popClassName)[0]);
	var popSizeMaxHeight = parseInt(computedStyle.maxHeight, 10);

	if(popSizeMaxHeight) {

		var popOffset = this.getOffset();
		var popPx = this.getMap().getPixelFromCoordinate(coord);
		var diffTop = popPx[1] - popOffset[1];
		var mapTop = parseInt(getComputedStyle(this.getMap().getTargetElement()).height, 10);
		var fromTop =  mapTop - popSizeMaxHeight;
		
		if(diffTop < fromTop){
			this.getElement().className += " bottom";	
		}else{
			this.getElement().className += " top";
		}
	}else{
		console.warn("ol3-popup plugin: ol-popup-content maxHeight is required for enabling dynamic popup position");
	}
	
}


/**
 * @private
 */
ol.Overlay.Popup.prototype.panIntoView_ = function(coord) {
	
	var popSize = {
		width: this.getElement().clientWidth + 20,
		height: this.getElement().clientHeight + 20
	};
	var mapSize = this.getMap().getSize();
	
	var tailHeight = 20,
	tailOffsetLeft = 60,
	tailOffsetRight = popSize.width - tailOffsetLeft,
	popOffset = this.getOffset(),
	popPx = this.getMap().getPixelFromCoordinate(coord);
	
	var fromLeft = (popPx[0] - tailOffsetLeft),
		fromRight = mapSize[0] - (popPx[0] + tailOffsetRight);
	
	var fromTop = popPx[1] - popSize.height + popOffset[1],
		fromBottom = mapSize[1] - (popPx[1] + tailHeight) - popOffset[1];
	
	var center = this.getMap().getView().getCenter(),
		curPx = this.getMap().getPixelFromCoordinate(center),
		newPx = curPx.slice();
	
	if (fromRight < 0) {
		newPx[0] -= fromRight;
	} else if (fromLeft < 0) {
		newPx[0] += fromLeft;
	}
	
	if (fromTop < 0) {
		newPx[1] += fromTop;
	} else if (fromBottom < 0) {
		newPx[1] -= fromBottom;
	}
	
	if (this.ani && this.ani_opts) {
		this.ani_opts.source = center;
		this.getMap().beforeRender(this.ani(this.ani_opts));
	}
	
	if (newPx[0] !== curPx[0] || newPx[1] !== curPx[1]) {
		this.getMap().getView().setCenter(this.getMap().getCoordinateFromPixel(newPx));
	}
	
	return this.getMap().getView().getCenter();
	
};

/**
 * @private
 * @desc Determine if the current browser supports touch events. Adapted from
 * https://gist.github.com/chrismbarr/4107472
 */
ol.Overlay.Popup.isTouchDevice_ = function() {
	try {
		document.createEvent("TouchEvent");
		return true;
	} catch(e) {
		return false;
	}
};

/**
 * @private
 * @desc Apply workaround to enable scrolling of overflowing content within an
 * element. Adapted from https://gist.github.com/chrismbarr/4107472
 */
ol.Overlay.Popup.enableTouchScroll_ = function(elm) {
	if(ol.Overlay.Popup.isTouchDevice_()) {
		var scrollStartPos = 0;
		elm.addEventListener("touchstart", function(event) {
			scrollStartPos = this.scrollTop + event.touches[0].pageY;
			}, false
		);
		elm.addEventListener("touchmove", function(event) {
			this.scrollTop = scrollStartPos - event.touches[0].pageY;
			}, false
		);
	}
};
