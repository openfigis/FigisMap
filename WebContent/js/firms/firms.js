/**
 * FIRMS Map viewer Javascript
 * Authors: M. Balestra, E. Blondel
 * 
 * [unicode glyph: ]
 */

//Load dependencies
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/vendor/ol3/ol3-animatedclusterlayer.js');
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/vendor/ol3/ol3-selectclusterinteraction.js');
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/FigisMap/FigisMap-vector.js'); //manage vector and cluster sources

FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/vendor/ol3/ol3-popup.js');
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/FigisMap/FigisMap-popup.js');

/** 
 * FIRMS map viewer namespace
 * @namespace
 */
var FV = new Object();

/** ------------------------------------------------------------------------------------------- */
/**   					Global variables					*/
/** ------------------------------------------------------------------------------------------- */

/**
 * Convenience to access
 * @returns {ol.Map} the map object
 */
FV.myMap = false;
FV.isViewerEmbedded = false;



/** ------------------------------------------------------------------------------------------- */
/**   					FV.baseMapParams					*/
/** ------------------------------------------------------------------------------------------- */

/**
 * FV.baseMapParams
 * Creates a set of default baseMapParams for the FIRMS map viewer
 */
FV.baseMapParams = function() {
	this.target = 'map';
	this.attribution = false;
	this.context = 'FAO-FIRMSViewer';
	this.mapSize = 'L';
	this.projection = FV.currentProjection();
	this.watermark = {
		src: FigisMap.assetsRoot + 'common/img/FAOwatermarkSmall.png',
		title : 'Powered by FIGIS',
		width : 176,
		height : 48,
		wclass : 'ol-powered-by'
	};
	this.options = {
		skipScale: true,
		labels: true,
		topMarineLabels: true,
		majorAreasAsLines: true,
		loadingPanelOptions : {
			showPanel: false,
			onstart	: function() {
				var d = this.getMap().getTargetElement().ownerDocument;
				d.getElementById('progressIndicatorValue').style.width='0px';
				d.getElementById('progressIndicator').style.display='block';
			},
			onprogress: function(i,j) {
				var d = this.getMap().getTargetElement().ownerDocument;
				d.getElementById('progressIndicatorValue').style.width=String(parseInt(100 * i / j))+'%';
			},
			onend: function() {
				var d = this.getMap().getTargetElement().ownerDocument;
				d.getElementById('progressIndicator').style.display='none';
				var w = d.defaultView || d.parentWindow;
				if ( w.FV.onDrawEnd ) {
					w.FV.onDrawEnd.call(w);
					w.FV.onDrawEnd = false;
				}
			}
		},
		layerSwitcherOptions: { displayLegend: true }
	};
	
	//baselayers
	var baselayers = FigisMap.defaults.baseLayers.slice();
	baselayers.reverse();
	this.base = baselayers;

	//associated layers
	//this.associated = [ FigisMap.fifao.rfb ];

	//main vector layer
	this.vectorLayer = {};
	this.onVectorLayerEnd = function(){

		//setViewerResource
		var feat = FV.lastPars.getFeature(); 
		if ( feat) {
			if( FV.lastPars.vectorLayer.source.getFeatures().filter(function(sf) { return sf.get('FIGIS_ID') === feat }).length > 0 ) {
				FV.setViewerResource(feat);
			} else {
				FV.lastPars.setFeature(null);
			}
		}

		//zoom on filtered dataset
		var kvpFilters = FV.lastPars.getKvpFilters();
		if( kvpFilters ) if(kvpFilters.length > 0){
					
			//try to inherit RFB settings
					
			var acronym = kvpFilters[0].value;
			var rfbSetting = FigisMap.rfbLayerSettings[acronym];

			if(FV.lastPars.vectorLayer.source.getFeatures().length > 1) {
				var dataExtent = FV.lastPars.vectorLayer.source.getExtent();
				FV.myMap.zoomToExtent(dataExtent);
						
				//optimize view
				var rfbCenter;
				if( rfbSetting.centerCoords ) {
					if(kvpFilters.length == 1){
						//in case of single agency
						rfbCenter = FigisMap.ol.reCenter( rfbSetting.srs, FV.myMap.getView().getProjection().getCode(), FigisMap.rfb.evalOL( rfbSetting.centerCoords ) );
					} else{
						//TODO something in case of multiple agency values?	
					}	
				}
				if( rfbCenter ) {
					if( rfbCenter[1] >= dataExtent[1] && rfbCenter[1] <= dataExtent[3] ) {
						FV.myMap.getView().setCenter( rfbCenter );
					}
				}
						
				//optimize zoom
				if(FV.myMap.getView().getZoom() >= 3) FV.myMap.getView().setZoom(FV.myMap.getView().getZoom()-1);
			}else{
				//not used at now (rely on combined above approach)
				if( rfbSetting ) {				
					var bounds = FigisMap.rfb.evalOL( rfbSetting.zoomExtent );
					var proj0 = "EPSG:"+rfbSetting.srs;
					var proj1 = FV.myMap.getView().getProjection().getCode();
					var newBounds = (proj0 === proj1)? bounds : FigisMap.ol.reFit(FV.myMap, FigisMap.ol.reBound(proj0, proj1, bounds));
					FV.myMap.zoomToExtent( newBounds );
				}
			}
		}				
	};

	//filters
	this.categoryFilters = null;
	this.kvpFilters = null;
	
	//selected features/map
	this.feature = null;
	this.featureMap = null;

	//popup configuration
	this.popups = [
		//vector popup
		//------------
		{
			strategy: "getfeature",
			resourceHandler : function(feature) {
				return '/figis/moniker.html/firmspopup/'
				+ feature.get('DOMAIN') + '/' + feature.get('FIGIS_ID')
				+ '/' + feature.get('LANG');
			},
			contentHandler : function(feature, request) {
				var content = document.createElement("div");
				//content.appendChild(FV.popupAdjust(request.responseXML.documentElement));
				//return content.innerHTML;
				content.appendChild(request.responseXML.documentElement);
				return FV.popupAdjust(content.innerHTML);
			},
			onopen: function( feature ){
				FV.lastPars.setFeature( feature.get('FIGIS_ID') );
			},
			onclose: function( feature ){
				FV.lastPars.setFeature( null );
				FigisMap.ol.clearSelectCluster(FV.myMap);
			}
		},
		//tooltip popup
		//-------------
		{
			strategy: "getfeature-tooltip",
			tooltipHandler : function(feature){
				return ((feature.get('DOMAIN') == 'fishery')? (feature.get('GEOREF') + ' ') : '') + feature.get('TITLE');
			}
		}];

	return this;
};


/** ------------------------------------------------------------------------------------------- */
/**   				FV.baseMapParams Setter methods 				*/
/** ------------------------------------------------------------------------------------------- */

/*
	FV.baseMapParams.prototype.setProjection
	@param p {Number}
*/
FV.baseMapParams.prototype.setProjection = function( p ) { if( p ) this.projection = p; };


/*
	FV.baseMapParams.prototype.setExtent
	@param e: extent, as array or string
	Uses and sets FV.lastExtent
	In case FV.lastExtent is boolean (false) doesn't set any extent.
*/
FV.baseMapParams.prototype.setExtent = function( e ) {
	if ( e ) {
		if ( e.constructor === Array ) FV.lastExtent = e;
	}
	if ( typeof FV.lastExtent == 'boolean' ) {
		FV.lastExtent = null;
		this.extent = null;
		this.global = true;
		return false;
	}
	if ( ! FV.lastExtent ) {
		if ( FV.myMap ) {
			FV.lastExtent = FV.getExtent();
		} else {
			FV.lastExtent = null;
		}
	}
	this.extent = FV.lastExtent ? FV.lastExtent : null;
	return true;
};

/*
	FV.baseMapParams.prototype.setCenter
	@param c: center, as array
	Uses and sets FV.lastCenter
	In case FV.lastCenter is boolean (false) doesn't set any center.
*/
FV.baseMapParams.prototype.setCenter = function( c ) {
	if ( c ) {
		if ( c.constructor === Array ) FV.lastCenter = c;
	}
	if ( typeof FV.lastCenter == 'boolean' ) {
		FV.lastCenter = null;
		this.center = null;
		return false;
	}
	if ( ! FV.lastCenter ) {
		if ( FV.myMap ) {
			FV.lastCenter = FV.getCenter();
		} else {
			FV.lastCenter = null;
		}
	}
	this.center = FV.lastCenter ? FV.lastCenter : null;
	return true;
};



/*
	FV.baseMapParams.prototype.setZoom
	@param z: zoom, integer
	Uses and sets FV.lastZoom
	In case FV.lastZoom is boolean (false) resets it to 1.
*/
FV.baseMapParams.prototype.setZoom = function( z ) {
	if ( z && (z != 1) ) {
		FV.lastZoom = z;
		this.zoom = z;
		return true;
	}
	if ( typeof FV.lastZoom == 'boolean' ) {
		this.zoom = FV.lastExtent ? FV.myMap.getView().getZoom() : 1;
		return false;
	}
	FV.lastZoom = FV.myMap ? FV.myMap.getView().getZoom() : 1;
	this.zoom = FV.lastZoom;
	return true;
};


/*
	FV.baseMapParams.prototype.getLayerUrl
	@param l: layer, string
	Gets layer Url
*/
FV.baseMapParams.prototype.getLayerUrl = function( l ) {
	return FigisMap.rnd.vars.wfs + 'firms:' + l + '_all_points';
}

/*
	FV.baseMapParams.prototype.setVectorLayer
	@param l: layer, string
	Uses and sets layer
*/
FV.baseMapParams.prototype.setVectorLayer = function( l ) {
	if(l && l != "") {

		var sourceUrl = this.getLayerUrl( l );
		this.layer = l;
		this.vectorLayer = {
			id: l,
			source: FigisMap.rnd.configureVectorSource(sourceUrl, FV.getCQLFilter( l ), null, false, this.onVectorLayerEnd),
			title: l == 'resource' ? "Marine Resources" : "Marine Fisheries",
			icon: FigisMap.assetsRoot + 'firms/img/' + l + '.png',
			iconHandler: function(feature) {
				var imgRef = l;

				//distinguish cluster exploded icons vs. non-clustered resources
				//if(feature) if(feature.get('features')) imgRef += '_cluster';
				if(feature) if(feature.get('features')) imgRef += '_detail';
				
				//manage fishery special cases
				var specialCases = ["472","473","474"];
				if(feature) if(specialCases.indexOf(feature.get('FIGIS_ID')) != -1) imgRef = 'fishery_production_system';
			
				return FigisMap.assetsRoot + 'firms/img/' + imgRef + '.png';
			},
			showLegendGraphic : true,
			cluster: true,
			clusterOptions: { distance: 30, animate: true, singlecount: false, icon: FigisMap.assetsRoot + 'firms/img/' + l + '_cluster.png' }
		}

	}
};

/*
	FV.baseMapParams.prototype.setFeature
	@param f {String} a string corresponding to a FIGIS factsheet ID
*/
FV.baseMapParams.prototype.setFeature = function( f ) {
	this.feature = f;
	return true;
};

/*
	FV.baseMapParams.prototype.setFeatureMap
	@param fm {String} a string corresponding to a FIGIS factsheet ID
*/
FV.baseMapParams.prototype.setFeatureMap = function( fm ) {
	this.featureMap = fm;
	return true;
};

/** ------------------------------------------------------------------------------------------- */
/**   				FV.baseMapParams Getter methods 				*/
/** ------------------------------------------------------------------------------------------- */

FV.baseMapParams.prototype.getProjection = function() { return this.projection };
FV.baseMapParams.prototype.getExtent = function() { return this.extent };
FV.baseMapParams.prototype.getCenter = function() { return this.center };
FV.baseMapParams.prototype.getZoom = function() { return this.zoom };
FV.baseMapParams.prototype.getLayer = function() { return this.vectorLayer };
FV.baseMapParams.prototype.getCategoryFilters = function() { return this.categoryFilters };
FV.baseMapParams.prototype.getKvpFilters = function() { return this.kvpFilters };
FV.baseMapParams.prototype.getFeature = function() { return this.feature };
FV.baseMapParams.prototype.getFeatureMap = function() { return this.featureMap };


/** ------------------------------------------------------------------------------------------- */
/**   				FV.baseMapParams Other methods 				*/
/** ------------------------------------------------------------------------------------------- */

/*
	FV.baseMapParams.prototype.updateLayerSource
	@param l: layer, string
	Updates the layer source
*/
FV.baseMapParams.prototype.updateLayerSource = function( l , filter) {
	if(l && l != "") {
		var feat = FV.lastPars.getFeature();
		if( feat != null ) {
			var p = FigisMap.rnd.getPopupOverlay( FV.myMap, l );
			if( p ) if ( p.isOpened() ) {
				p.hide();
				FigisMap.ol.clearSelectCluster(FV.myMap);
			}
		}
		var sourceUrl = this.getLayerUrl( l );
		this.vectorLayer.source = FigisMap.rnd.configureVectorSource(sourceUrl, filter, null, false, this.onVectorLayerEnd);
		FigisMap.rnd.updateVectorLayer(FV.myMap, this.vectorLayer);
	}
}


/*
	FV.baseMapParams.prototype.setCategoryFilters
	@param parent {String} the parent ('resource'/'fishery')
	@param items {Array} an array of string categories
*/
FV.baseMapParams.prototype.setCategoryFilters = function( parent, items ) {

	if(this.categoryFilters == null ) this.categoryFilters = new Object();
	this.categoryFilters[parent] = [];

	if( items ) if (items.length > 0) {
		for(var i=0;i<items.length;i++) {
			this.categoryFilters[parent].push( items[i] );
		}
	} else {
		return false;
	}
	return true;
}

/*
	FV.baseMapParams.prototype.setKvpFilters
	@param kvps {Array} an array of kvp objects
*/
FV.baseMapParams.prototype.setKvpFilters = function( kvps ) {
	this.kvpFilters = kvps;
}


FV.setKvpFilters = function( kvps ) {
	FV.kvpFilters = kvps;
}




/** ------------------------------------------------------------------------------------------- */
/**   				FV methods to set/get map/view properties				*/
/** ------------------------------------------------------------------------------------------- */


FV.getExtent = function() {
	return ( FV.myMap ) ? FV.myMap.getView().calculateExtent(FV.myMap.getSize()) : null;
};

FV.getCenter = function() {
	return ( FV.myMap ) ? FV.myMap.getView().getCenter() : null;
};

FV.getZoom = function() {
	return ( FV.myMap ) ? FV.myMap.getView().getZoom() : null;
};



/** ------------------------------------------------------------------------------------------- */
/**   				Main viewer methods to draw / arrange map			*/
/** ------------------------------------------------------------------------------------------- */


FV.internal = {};

FV.init = function() {
	FV.setViewerPage();
};


/**
 * Main function to draw the map
 * @param pars {Object} an object giving the list of parameters to pass to the map
 */
FV.internal.draw = function( pars ) {

	//parameters (initially handled in addViewer)
	if( typeof FV.lastPars == "undefined"){
		FV.lastPars = new FV.baseMapParams();
	}

	//always start with a params with no autoMaps
	FV.lastPars.distribution = [];
	FV.lastPars.associated = [];
	FV.lastPars.intersecting = [];
	FV.lastPars.attribution = false;

	if( pars ) {

		//extend FV.lastPars with pars
		var newProps = Object.keys( pars );
		for(var i=0;i<newProps.length;i++){
			var propToUpdate = newProps[i];
			if(pars[propToUpdate]) console.log(propToUpdate);
			FV.lastPars[propToUpdate] = pars[propToUpdate];
		}
		console.log(FV.lastPars);
		if ( ! pars.layer ) {
			pars.layer = FV.currentLayer();
		} else {
			if(pars.layer != FV.currentLayer()) {
				FV.currentLayer( pars.layer );
			}
		}
		if ( pars.layer && pars.categoryFilters){
			FV.filterReload( pars.layer, pars.categoryFilters);
		}
		if ( pars.kvpFilters ) FV.lastPars.setKvpFilters( pars.kvpFilters );
		FV.lastPars.setVectorLayer( pars.layer );

	} else {
		FV.lastPars.setVectorLayer( FV.currentLayer() );
	}
	if ( ! FV.lastPars.distribution ) if ( ! FV.lastPars.associated  ) if ( ! FV.lastPars.intersecting ) if (! FV.lastPars.extent) FV.lastPars.global = true;
	console.log( FV.lastPars );
	FV.myMap = FigisMap.draw( FV.lastPars );
	FV.lastExtent = null;
	FV.lastCenter = null;
	FV.lastZoom = null;
};
FV.onDrawEnd = false;





/**
 * FV.internal.arrangeMap function redraws the map, decideng whether it should be changed or re-drawn.
 * @param p {Object} a set of parameters for arranging the map accordingly
 */
FV.internal.arrangeMap = function(p) {
	var finalize = [];
	var keepMap = true;
	//var newPars = FV.lastPars;
	//if ( newPars == null) {
	//	newPars = new FV.baseMapParams();
	//	keepMap = false;
	//}
	var newPars = new Object();

	if( !p ) {
		console.log("No parameters to arrange map");
		p = {};
	}

	if( p ) {
		console.info("Parameters to arrange map: " + JSON.stringify(p));

		newPars.projection = p.projection ? p.projection : FV.currentProjection() ;	
		newPars.extent = p.extent ? p.extent : FV.getExtent() ;
		newPars.center = p.center ? p.center : FV.getCenter() ;
		newPars.zoom = p.zoom ? p.zoom : FV.getZoom();
		
		if ( !p.layer ) {
			newPars.layer = FV.currentLayer();
		}

		//inherit filters
		newPars.categoryFilters = FV.lastPars.getCategoryFilters();
		newPars.kvpFilters = FV.lastPars.getKvpFilters();
			
		//feature / featureMap	
		newPars.feature = (typeof p.feature != "undefined")? p.feature : FV.lastPars.getFeature() ;
		newPars.featureMap = (typeof p.featureMap != "undefined")? p.featureMap : ( (typeof p.layer != "undefined" && p.layer != FV.currentLayer())? undefined : FV.lastPars.getFeatureMap() );

		//set new automaps / attribution
		newPars.distribution = (p.featureMap != null && p.distribution)? p.distribution : ( newPars.featureMap? FV.lastPars.distribution : [] );
		newPars.associated = (p.featureMap != null && p.associated)? p.associated : ( newPars.featureMap? FV.lastPars.associated : [] );
		newPars.intersecting = (p.featureMap != null && p.intersecting)? p.intersecting : ( newPars.featureMap? FV.lastPars.intersecting : [] );
		newPars.attribution = (p.featureMap != null && p.attribution)? p.attribution : ( newPars.featureMap? FV.lastPars.attribution : null );

		//additional rules to decide if map should be redrawn instead
		if ( keepMap && typeof p.layer != "undefined" && p.layer != FV.currentLayer() && typeof p.featureMap != "undefined" && typeof newPars.featureMap == "undefined") keepMap = false;
		console.log("Keeping map? "+keepMap);
		if ( keepMap && ( typeof p.featureMap != "undefined" || FV.lastPars.getFeatureMap() != null ) ) keepMap = false; //in case of loading feature map & having previously featureMap loaded, always redrawn the page
		console.log("Keeping map? "+keepMap);
		if ( keepMap && p.feature && p.featureMap ) if ( p.featureMap != p.feature ) keepMap = false;
		console.log("Keeping map? "+keepMap);
		//if ( keepMap && p.projection ) if ( FV.currentProjection() != p.projection ) keepMap = false;
		console.log("Keeping map? "+keepMap);	

		//map redraw finalizers
		if ( !keepMap ) {
			if ( p.feature ) finalize.push('FV.setViewerResource(\''+p.feature+'\')');
			if ( p.featureMap ) finalize.push('FV.zoomViewerResource(\''+p.featureMap+'\')');
		} else {
			if ( p.feature ) FV.lastPars.setFeature( p.feature );
		}
		if ( finalize.length > 0 ) {
			finalize = finalize.join(';');
		} else {
			finalize = false;
		}
	}

	//before arranging the map
	closeSearch();
	FV.hideRelateds();

	//arranging the map
	if ( keepMap ) {
		//Behavior 1: we keep the map, and arrange the map components accordingly
		if ( p.layer) {
			//layer has changed, switch to new layer
			FV.internal.switchLayer(p.layer);
		} else {
			FV.internal.applyFilters();
		}
	}

	if ( !keepMap ) {
		//Behavior 2: Draw the map
		FV.onDrawEnd =  function() { setTimeout( finalize, 10); };
		console.log("Redraw with parameters = " + JSON.stringify(newPars) );
		FV.internal.draw( newPars );
	}
};


/**
 * FV.internal.switchLayer, Switch the layer
 * @param l {String} the layer String identifier ("resource" or "fishery")
 */
FV.internal.switchLayer = function( l ) {
	
	//@eblondel under test without redrawing strategy
	var src = FV.lastPars.vectorLayer;
	//close popup if there is one opened
	var p = FigisMap.rnd.getPopupOverlay( FV.myMap, src.id );
	if ( p.isOpened() ) {
		p.hide();
		FigisMap.ol.clearSelectCluster(FV.myMap);
	}
	FV.currentLayer( l );
	FV.lastPars.setVectorLayer( FV.currentLayer() );
	var trg = FV.lastPars.vectorLayer;
	FigisMap.rnd.updateVectorLayer(FV.myMap, src, trg);
	FigisMap.rnd.setPopupOverlayId(FV.myMap, src.id, trg.id);
};


FV.internal.applyFilters = function(l) {
	FV.setCategories( l );
	var parent = typeof l == 'undefined' ? FV.currentLayer() : l;
	FV.lastPars.updateLayerSource( parent, FV.getCQLFilter(parent));
};


/** ------------------------------------------------------------------------------------------- */
/**   				Methods to be triggered	by the main HTML Viewer			*/
/** ------------------------------------------------------------------------------------------- */


/**
 * FV.switchLayer, Switch the layer
 * @param l {String} the layer String identifier ("resource" or "fishery")
 */
FV.switchLayer = function( l ) {
	FV.internal.arrangeMap({layer: l, feature: null});
}

/**
 * FV.applyFilter
 */
FV.applyFilter = function() {
	FV.internal.arrangeMap();	
}

/**
 * FV.switchProjection, Trigger switching the map projection
 * @param p {String} 
 */
FV.switchProjection = function( p ) {
	var op = FV.lastPars.getProjection();
	var np = FV.currentProjection( p );
	var oe = FV.getExtent();
	var ne = FigisMap.ol.reBound(op, np, oe);
	
	//params to adjust the map
	var pars = {
		projection: p,
		feature: FV.lastPars.getFeature(),
		featureMap: FV.lastPars.getFeatureMap()
	}
	if(FigisMap.ol.isValidExtent(ne)) {
		pars.extent = ne;
		pars.center = ol.extent.getCenter(ne);
	}

	FV.internal.arrangeMap( pars );
};




/** ------------------------------------------------------------------------------------------- */
/**   				Methods dealing with Viewer Resource				*/
/** ------------------------------------------------------------------------------------------- */


/**
 * Focus on a given factsheet resource. The focus is done by:
 * - recentering map to its coordinates (TODO investigate map animation with OL3)
 * - opening automatically its popup.
 * @param {Integer}{String} FIGIS factsheet id, provided as integer or string 
 */
FV.setViewerResource = function(id) {
	console.info("Setting viewer resource = "+ id);
	var feature = FigisMap.ol.getVectorLayerFeatureById(FV.myMap, 'FIGIS_ID', id);
	//testing spin animation for setCenter
	/*var duration = 2000;
	var start = +new Date();
	var pan = ol.animation.pan({
		duration: duration,
		source: (FV.myMap.getView().getCenter()),
		start: start
	});
	FV.myMap.beforeRender(pan);*/
	
	//setCenter
	//@eblondel deactivate setCenter with popup dynamicPosition (to discuss further)
	/* FV.myMap.getView().setCenter(feature.getGeometry().getCoordinates()); */
	//open popup
	if( feature ) {
		
		//check agencies and remove filter in case
		var kvpFilters = FV.lastPars.getKvpFilters();
		if(kvpFilters) if(kvpFilters.length > 0) {
			if(kvpFilters[0].value.indexOf(feature.get('AGENCY')) == -1) {
				console.warn("Feature for FIGIS_ID = '"+id+"' does not match current agency filter, adding agency '"+feature.get('AGENCY')+"' to current filter");
			}
		}
		//emulate popup for feature
		FigisMap.rnd.emulatePopupForFeature(FV.myMap, FV.currentLayer(), feature);
	} else {
		console.warn("No feature found for FIGIS_ID = '"+id+"'! Factsheet data should be checked...");
	}
};
FV.zoomViewerResource = function(id) {
	console.info("Zooming viewer resource = "+ id);
	var e = FV.getExtent();
	var c = FV.getCenter();
	if( e && c ) if ( ( c[1] < e[1] ) || ( c[1] > e[3] ) ) {
		var feature = FigisMap.ol.getVectorLayerFeatureById(FV.myMap, 'FIGIS_ID', id);
		FV.myMap.getView().setCenter(feature.getGeometry().getCoordinates());
	}
};
FV.triggerViewerResource = function(id){
	console.info("Triggering viewer resource = "+ id);
	var p = FigisMap.rnd.getPopupOverlay( FV.myMap, FV.currentLayer() );
	if ( p.isOpened() ) {
		p.hide();
		FV.lastPars.setFeature(null);
		FigisMap.ol.clearSelectCluster(FV.myMap);
	} else {
		FV.setViewerResource(id);
	}
};


/** ------------------------------------------------------------------------------------------- */
/**   				Methods dealing Factsheet Auto map				*/
/** ------------------------------------------------------------------------------------------- */

/**
 * FV.fsAutoMap, Triggers loading of factsheet auto maps 
 * @param fid {String} a FIGIS factsheet ID
 * @param ftitle {String} optional title
 * @param fpars {Object} optional params
 */
FV.fsAutoMap = function( fid, ftitle, fpars ) {

	if ( typeof ftitle == 'undefined' ) ftitle = document.getElementById('fsAutoMapTitle').innerHTML;
	if ( typeof fpars == 'undefined' ) fpars = document.getElementById('FVParametersMapParams').innerHTML.replace(/^ *\(/,'').replace(/\) *;? *$/,'');
	if ( typeof fpars == 'string' ) eval( ' fpars = ' + fpars );

	FV.lastExtent = false;
	FV.lastCenter = false;

	if ( fpars.distribution ) {
		if ( !( fpars.distribution.constructor === Array ) ) fpars.distribution = [ fpars.distribution ];
		for ( var i = 0; i < fpars.distribution.length; i++ ) {
			fpars.distribution[i].showLegendGraphic = true;
			//pars.distribution.push( fpars.distribution[i] );
		}
	}
	if ( fpars.intersecting ) {
		if ( !( fpars.intersecting.constructor === Array ) ) fpars.intersecting = [ fpars.intersecting ];
		for ( var i = 0; i < fpars.intersecting.length; i++ ) {
			fpars.intersecting[i].showLegendGraphic = true;
			//pars.intersecting.push( fpars.intersecting[i] );
		}
	}
	if ( fpars.associated ) {
		if ( !( fpars.associated.constructor === Array ) ) fpars.associated = [ fpars.associated ];
		for ( var i = 0; i < fpars.associated.length; i++ ) {
			fpars.associated[i].showLegendGraphic = true;
			//pars.associated.push( fpars.associated[i] );
		}
	}
	if ( ftitle ) fpars.attribution = '<span class="buttons"><a href="javascript:FV.fsRemoveAutoMap()" title="Close the resource">✖</a> <a href="javascript:FV.triggerViewerResource('+fid+')" title="Information popup">❖</a></span> <span class="rtitle">'+ftitle+'</span>';

	FV.internal.arrangeMap({
		feature: fid,
		featureMap: fid,
		distribution: fpars.distribution,
		associated: fpars.associated,
		intersecting: fpars.intersecting,
		attribution: fpars.attribution
	});
};

/**
 * FV.fsRemoveAutoMap, Triggers remove factsheet auto maps
 */
FV.fsRemoveAutoMap = function() {
	FV.internal.arrangeMap({feature: null, featureMap: null});
}



/** methods to filter layer - probably to harmonize under baseMapParams */
/** ------------------------------------------------------------------- */


FV.getCQLFilter = function(parent) {
	var cqlFilter = "";
	var categories = FV.lastPars ? FV.lastPars.getCategoryFilters() : undefined;
	if ( categories ) if( categories[parent]) if( categories[parent].length > 0 ){
		var filterCategories = "('" + categories[parent].join("','") + "')";
		cqlFilter = "CATEGORY IN " + filterCategories;
	}

	var kvpFilters = FV.lastPars ? FV.lastPars.getKvpFilters() : undefined;
	if(kvpFilters) if (kvpFilters.length > 0) {
		for(var i=0;i<kvpFilters.length;i++){
			var kvp = kvpFilters[i];
			if (cqlFilter != "") cqlFilter += " AND ";
			cqlFilter += kvp["property"] + " IN ('" + kvp["value"].join("','") + "')";
		}
	}
	console.log(cqlFilter);
	return cqlFilter;
}



/** ------------------------------------------------------------------------------------------- */
/**   			Methods dealing with the HTML View / DOM manipulation			*/
/** ------------------------------------------------------------------------------------------- */


FV.currentProjection = function( p ) {
	/*var cp;
	if ( document.getElementById('SelectSRS4326').checked ) cp = '4326';
	if ( ! cp ) if ( document.getElementById('SelectSRS3349').checked ) cp = '3349';
	if ( ! cp ) if ( document.getElementById('SelectSRS54009').checked ) cp = '54009';
	if ( ! cp ) if ( document.getElementById('SelectSRS3031').checked ) cp = '3031';

	if ( ! cp ) {
		document.getElementById('SelectSRS4326').checked = true;
		cp = '4326';
	}
	FV.lastProjection = parseInt( cp );
	if ( ! p ) return FV.lastProjection;
	p = String( p )
	if ( p != cp ) {
		document.getElementById('SelectSRS4326').checked = ( p == '4326');
		document.getElementById('SelectSRS3349').checked = ( p == '3349');
		document.getElementById('SelectSRS54009').checked = ( p == '54009');
		document.getElementById('SelectSRS3031').checked = ( p == '3031');
	}
	FV.lastProjection = parseInt( p );
	return FV.lastProjection;*/

	//testing approach
	if ( p ) {
		document.getElementById('SelectSRS4326').checked = ( p == '4326');
		document.getElementById('SelectSRS3349').checked = ( p == '3349');
		document.getElementById('SelectSRS54009').checked = ( p == '54009');
		document.getElementById('SelectSRS3031').checked = ( p == '3031');
	} else {
		var cp;
		if ( document.getElementById('SelectSRS4326').checked ) cp = '4326';
		if ( ! cp ) if ( document.getElementById('SelectSRS3349').checked ) cp = '3349';
		if ( ! cp ) if ( document.getElementById('SelectSRS54009').checked ) cp = '54009';
		if ( ! cp ) if ( document.getElementById('SelectSRS3031').checked ) cp = '3031';
		if ( ! cp ) {
			document.getElementById('SelectSRS4326').checked = true;
			cp = '4326';
		}
		p = cp;
	}
	return parseInt(p);
};

FV.currentLayer = function( l ) {
	if ( l ) {
		l = String(l);
		FV.setLayerStatus('resource', (l == 'resource') );
		FV.setLayerStatus('fishery', (l == 'fishery') );

	} else {
		if ( document.getElementById('resourceSwitcher-resource').checked ) l = 'resource';
		if ( ! l ) if ( document.getElementById('resourceSwitcher-fishery').checked ) l = 'fishery';
		if ( ! l ) {
			FV.setLayerStatus('resource',true);
			FV.setLayerStatus('fishery',false);
			l = 'resource';
		}
	}
	return l;
};
FV.setLayerStatus = function( l, mode ) {
	with ( document.getElementById('resourceSwitcher-' + l ) ) {
		checked = mode;
		parentNode.className= mode ? 'active' : 'inactive';
		parentNode.setAttribute('class', mode ? 'active' : 'inactive' );
	}
};


/** Filtering stuff - to document */

FV.getFilterCheckboxes = function(l) {
	var parent = typeof l == 'undefined' ? FV.currentLayer() : l;
	var theDiv = document.getElementById('resourceSwitcher-'+parent).parentNode;
	return theDiv.getElementsByTagName('ul')[0].getElementsByTagName('input');
};


FV.setCategories = function( l ) {
	var parent = typeof l == 'undefined' ? FV.currentLayer() : l;
	var chks = FV.getFilterCheckboxes( parent );
	var tmp = [];
	for ( var i = 0; i < chks.length; i++ ) {
		if ( chks[i].checked ) tmp.push(chks[i].value);
	}

	if ( tmp.length == 0 ) {
		for ( var i = 0; i < chks.length; i++ ) chks[i].checked = true;
	}

	if ( tmp.length < chks.length ) {
		FV.lastPars.setCategoryFilters( parent, tmp );
	}else{
		FV.lastPars.setCategoryFilters( parent, [] );
	}
};


FV.isFilterActive = function( chks ) {
	if ( typeof chks == 'undefined' ) chks = FV.getFilterCheckboxes();
	var tot = chks.length;
	var qtc = 0;
	for ( var i = 0; i < tot; i++ ) if ( chks[i].checked ) qtc++;
	return ( ( qtc > 0 ) && ( qtc < tot ) );
};

FV.filterReload = function( l, cats ) {

	var chks = FV.getFilterCheckboxes( l );
	for ( var i = 0; i < chks.length; i++ ) chks[i].checked = false;
	for ( var i = 0; i < cats.length; i++ ) chks[cats[i]].checked = true;
	FV.setCategories( l );
};



/** methods dealing with related items */
/** -----------------------------------*/


FV.popupAdjust = function(d) {
	FV.hideRelateds();
	var h = '<div class="bIcon"><div><table cellpadding="0" cellspacing="0" border="0"><tr>' +
		'<td id="tdIconMap"><img border="0" src="'+FigisMap.assetsRoot+ 'firms/img/icon-map.png" alt="" /></td>' +
		'<td id="tdIconRels"><img border="0" src="'+FigisMap.assetsRoot+ 'firms/img/icon-rels.png" alt="" /></td>' +
		'<td id="tdIconFS"><img border="0" src="'+FigisMap.assetsRoot+ 'firms/img/icon-fs.png" alt="" /></td>' +
		'</tr></table></div></div>';
	setTimeout( 'FV.popupAdjustPost()', 10 );
	return d.replace(/(<[^<]+id="FVParametersBox")/,h+"$1");;
};
FV.popupAdjustPost = function() {
	var d, td, tb, sd, target = FV.isViewerEmbedded ? '_top' : 'firms';
	sd = document.querySelectorAll('.FVPmain a[href]');
	for ( d = 0; d < sd.length; d++ ) sd[d].setAttribute('target',target);
	d = document.getElementById('FVParametersBox');
	tb = document.querySelector( '.FVPmain .bIcon table' );
	td = tb.querySelector('#tdIconMap');
	sd = d.querySelector('#FVParametersMap a[href]');
	if ( sd ) {
		td.innerHTML = '<a href="' + sd.getAttribute('href') + '" title="'+sd.innerHTML+'">' + td.innerHTML + '</a>';
	} else {
		td.className = 'disabled';
		td.querySelector('img').title = "No map is available";
	}
	td = tb.querySelector('#tdIconRels');
	sd = d.querySelectorAll('#FVParametersRelateds span').length;
	if ( sd > 0 ) {
		td.innerHTML = '<a href="javascript:FV.showRelateds()" title="See related items (' +sd+')">'+td.innerHTML+'</a>'+sd;
	} else {
		td.className = 'disabled';
		td.querySelector('img').title = "No related items are available";
	}
	td = tb.querySelector('#tdIconFS');
	sd = d.querySelector('#FVParametersURL a[href]');
	if ( sd ) {
		td.innerHTML = '<a href="'+sd.getAttribute('href')+'" target="'+target+'" title="'+sd.innerHTML+'">'+td.innerHTML+'</a>';
	} else {
		td.className = 'disabled';
		td.querySelector('img').title ="Associated Fact Sheet isn’t available";
	}
};
FV.getRelatedsArea = function() { return document.getElementById('relsArea'); };
FV.showRelateds = function() {
	if ( FV.relatedsAreShown() ) {
		FV.hideRelateds();
		return void(0);
	}
	var ra = FV.getRelatedsArea();
	var rels = document.querySelectorAll('#FVParametersRelateds span');
	var h = '';
	for ( var i = 0; i < rels.length; i++ ) {
		var r = rels[i];
		h += '<a href="javascript:FV.relsGoto('+r.getAttribute('title')+')">'+r.innerHTML+'</a>';
	}
	ra.querySelector('#relsAreaContent').innerHTML = h;
	ra.className='';
};
FV.relatedsAreShown = function() { return ! ( FV.getRelatedsArea().className=='disabled' ); };
FV.hideRelateds = function() { FV.getRelatedsArea().className='disabled'; };

FV.relsGoto = function(r) {
	FV.internal.arrangeMap({layer: r.domain, feature: r.fid});
};


/** ------------------------------------------------------------------------------------------- */
/**   				FV Embedded Link Decoder/Encoder				*/
/** ------------------------------------------------------------------------------------------- */


/**
* FV.setViewerPage function. Load the base FIRMS Map applying the user request parameters, if any
*/
FV.setViewerPage = function() {
	var layer, extent, center, zoom, prj, featureid, cats, agency, kvps;
	var pars = new Object();
	var finalize = [];
	if ( location.search.indexOf("?") != -1 ){
		// Parsing the request to get the parameters
		var params = location.search.replace(/^\?/,'').replace(/&amp;/g,'&').split("&");
		for (var j=0; j < params.length; j++) {
			var param = params[j].split("=");
			switch ( param[0] ) {
				case "layer"	: layer = param[1]; break;
				case "extent"	: extent = param[1]; break;
				case "center"	: center = param[1]; break;
				case "zoom"	: zoom = parseInt(param[1]); break;
				case "prj"	: prj = param[1]; break;
				case "feat"	: featureid = param[1]; break;
				case "cat"	: cats = param[1].split(",").map(function(item){return parseInt(item,10)}); break;
				case "agency"	: agency = param[1].split(","); break;
			}
		}
		if ( layer && layer != "" ) {
			FV.currentLayer( layer );
		} else {
			FV.currentLayer('resource');
			layer = 'resource';
		}
		if ( extent == "" ) extent = null;
		if ( extent != null ) {
			extent = extent.split(",");
			for (var i=0; i<extent.length; i++) {
				extent[i] = parseFloat(extent[i]);
			}
		}
		if( center == "") center = null;
		if( center != null) {
			center = center.split(",");
			center[0] = parseFloat(center[0]);
			center[1] = parseFloat(center[1]);
		}
		if ( zoom == '' ) zoom = null;
		if ( zoom != null ) zoom = parseInt( zoom );
		if ( prj == '' ) prj = null;
		if ( prj != null ) FV.currentProjection( prj );
		
		//filters
		if ( agency == '') agency = null;
		if ( agency != null) {
			kvps = [{property: "AGENCY", value: agency}];

			//search is deactivated when filtering by agency
			document.getElementById('ftsContainer').style.display='none';
		}
		//on finalize
		if ( featureid ) {
			finalize.push('FV.setViewerResource(\''+featureid+'\')');
		}

	} else {
		FV.currentLayer('resource');
		layer = 'resource';
	}
	if ( location.search.indexOf("embed=y") != -1 ) FV.isViewerEmbedded = true;
	if ( finalize.length > 0 ) {
		finalize = finalize.join(';');
		FV.onDrawEnd = function() { setTimeout( finalize, 10) };
	}
	//Load the Viewer using the request parameters
	if( extent ) pars.extent = extent;
	if( center ) pars.extent = center;
	if( zoom ) pars.zoom = zoom;
	if( prj ) pars.projection = prj;
	if( layer ) pars.layer = layer;
	if( cats ) pars.categoryFilters = cats;
	if( kvps ) pars.kvpFilters = kvps;
	FV.internal.draw( pars );
};

/**
* setFirmsViewerEmberLink function. Manage the expand/collapse of the Embed-Link div.
*/
FV.setViewerEmbedLink = function(){
	if ( ! ( document.getElementById ) ) return void(0);
	if ( ! FV.myMap ) FV.myMap = FigisMap.lastMap;
	//Building the request url containing the map status.
	var l = FV.currentLayer();
	var url = location.href.replace(/#.*$/,'').replace(/\?.*$/,'')
		+ "?layer=" + l
		+ "&extent=" + FV.myMap.getView().calculateExtent(FV.myMap.getSize()).join(',')
		+ "&center=" + FV.myMap.getView().getCenter().join(',')
		+ "&zoom=" + FV.myMap.getView().getZoom()
		+ "&prj=" + FV.currentProjection();
	
	var kvpFilters = FV.lastPars.getKvpFilters();
	if ( kvpFilters ) if (kvpFilters.length > 0) url += "&agency=" + kvpFilters[0].value.join(',');
	if ( FV.lastPars.feature ) url += '&feat=' + FV.lastPars.getFeature();
	if ( FV.isFilterActive() ) {
		var chks = FV.getFilterCheckboxes( l );
		var acf = [];
		for ( var i = 0; i < chks.length; i++ ) if ( chks[i].checked ) acf.push(i);
		url += '&cat=' + acf.join(',');
	}
	var urle = url + '&embed=y';
	//Setting the input fields of the embed-link div
	document.getElementById('firms-link').value = url;
	document.getElementById('firms-html').value = '<iframe src ="' + urle + '" width="800" height="600" frameborder="0" marginheight="0"></iframe>';
	document.getElementById('firms-embed').value = urle;
};


/** ------------------------------------------------------------------------------------------- */
/**   					FV Search Component				*/
/** ------------------------------------------------------------------------------------------- */


/*
* FirmsViewer Full Text Search - FV.fts object
*/
FV.fts = {
	timeout : false,
	lastValue: '',
	inputField: false,
	showResult: false,
	progress: false,
	minLength : 3
};

FV.fts.init = function(){
	FV.fts.inputField = document.getElementById('ftsText');
	FV.fts.showResult = document.getElementById('ftsResult');
}

FV.fts.filter = function(force) {
	if (FV.fts.timeout) clearTimeout( FV.fts.timeout );
	if ( force ) {
		FV.fts.execute();
	} else {
		var text = String( FV.fts.inputField.value );
		if ( text == FV.fts.lastValue ) return void(0);
		FV.fts.lastValue = text;
		FV.fts.timeout = setTimeout( FV.fts.execute, 500);
	}
}

FV.fts.execute = function() {
	FV.fts.timeout = false;
	var text = FV.fts.inputField.value;
	if ( text.length < FV.fts.minLength ) {
		FV.fts.deliveryClose( 'Enter at least '+ FV.fts.minLength +' characters');
	} else {
		if ( FV.fts.progress ) FV.fts.progress.style.visibility = 'visible';
		var xmlHttp = FigisMap.getXMLHttpRequest();
		var url = FigisMap.currentSiteURI + "/figis/moniker/firmssearch/" + FV.currentLayer() + '/'+ escape(text);
		if ( xmlHttp ) {
			xmlHttp.onreadystatechange = function() {
				if ( xmlHttp.readyState != 4 ) return void(0);
				FV.fts.delivery( xmlHttp );
			};
			xmlHttp.open('GET', url, true);
			xmlHttp.send('');
		}
	}
};

FV.fts.delivery = function( xmlHttp ) {
	if ( FV.fts.inputField.value != FV.fts.lastValue) return;
	if ( FV.fts.progress ) FV.fts.progress.style.visibility = 'hidden';
	var doc = xmlHttp.responseXML;
	if ( ! doc ) return void(0);
	if ( ! doc.documentElement ) return void(0);
	var resultnodes = doc.documentElement.getElementsByTagName('output');
	var hasResult = ( resultnodes && resultnodes.length && resultnodes.length > 0 );
	var results = hasResult ? resultnodes[0].getElementsByTagName('arrayitem') : [];
	var tot = results.length;
	var hasResults = ( tot > 0 );
	FV.fts.deliveryClean();
	FV.fts.showResult.className = 'haveResults';
	var c = '';
	if ( tot == 0 ) {
		c =  'No matching results.';
	} else {
		if ( tot == 1 ) {
			c = 'One result found';
		} else {
			c = '' + tot + ' matching results';
		}
		c += ' - [<a target="firmssearchresults" href="'+FigisMap.currentSiteURI+'/figis/moniker/firmssearch/';
		c += doc.documentElement.getAttribute('dataset')+'/'+doc.documentElement.getAttribute('txt')+'">Export</a>]';
	}
	FV.fts.deliveryComment( c );
	if ( hasResults ) {
		FV.fts.showResult.className = 'haveResults';
		var dom = FV.currentLayer();
		var found = 0;
		for ( var i = 0; i < results.length; i++ ) {
			var p = FV.fts.deliveryParseLine( results[i] );
			if ( p ) {
				FV.fts.deliveryAppend( p );
				found++;
			}
		}
		var tot = parseInt(resultnodes[0].getAttribute('numFound'));
		if ( ! isNaN(tot) ) {
			var c = '';
			if ( tot == found ) {
				c = tot == 1 ? 'One result found.' : 'All '+tot+' matching results are listed.';
			} else {
				c = '' + found + ' out of ' + tot + ' total results are listed.';
			}
			FV.fts.deliveryComment( c );
		}
	}
};

FV.fts.deliveryClose = function( comment ) {
	FV.fts.deliveryClean();
	FV.fts.showResult.className = 'noResults';
	if ( FV.fts.progress ) FV.fts.progress.style.visibility = 'hidden';
	if ( comment ) FV.fts.deliveryComment( comment );
};

FV.fts.deliveryAppend = function( node ) { FV.fts.showResult.appendChild( node ) };

FV.fts.deliveryComment = function( c ) {
	var p = document.createElement('p');
	p.setAttribute('class','ftsComment');
	p.innerHTML = c;
	FV.fts.deliveryAppend( p );
};

FV.fts.deliveryClean = function() {
	while ( FV.fts.showResult.firstChild ) {
		FV.fts.showResult.removeChild( FV.fts.showResult.firstChild );
	}
};

FV.fts.deliveryParseLine = function( node ) {
	var p = document.createElement('p');
	var t = node.getAttribute('name').toString().replace(/ : [0-9]{4}$/,'');
	var fid = node.getAttribute('fid').toString();
	if ( fid !== '' ) t = '<a href="javascript:FV.setViewerResource(' + fid + ')">' + t + '</a>';
	p.innerHTML = t;
	return p;
};
