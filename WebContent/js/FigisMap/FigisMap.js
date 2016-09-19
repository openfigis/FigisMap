/**
*	FigisMap API
*	Description: Generalized map call facility for the FIGIS application and factsheet maps
*	Authors: M. Balestra, E. Blondel, A. Gentile, A. Fabiani, T. Di Pisa.
*	UFT-8 glyph: ?
*/


/**
 * FigisMap Root object
 * 
 */
var FigisMap = {
	version		: "1.1-OL3-SNAPSHOT",
	parser		: new Object(), // parsing methods collection
	fs		: new Object(), // specific fact sheets methods collection
	rfb		: new Object(), // specific RFB methods collection
	rnd		: new Object(), // FigisMap.renderer specific collection of methods and variabes
	ol		: new Object(), // OpenLayers related utilities
	isDeveloper	: ( document.domain.indexOf( '192.168.' ) == 0 || document.domain == 'localhost'),
	isRemoteDeveloper : ( document.domain == 'localhost' ),
	lastMap		: null,
	renderedMaps	: new Object(),
	isTesting	: ( document.domain.indexOf('figisapps')==0 || document.domain.indexOf('figis02')==0 ||document.domain.indexOf('168.202.')==0||document.domain.indexOf('www-data.fao.org')==0 ),
	currentSiteURI	: location.href.replace(/^([^:]+:\/\/[^\/]+).*$/,"$1"),
	scripts		: [],
	scriptsReqs	: [],
	scriptsLoaded	: true,
	debugLevel	: 1 // 0|false|null: debug off, 1|true:console, 2: console + error alert
};

/**
 * --------------------------------------------------------------------------------------
 * FigisMap layer definitions
 * --------------------------------------------------------------------------------------
 */
FigisMap.fifao = {
	cbs : 'fifao:country_bounds',
	cnt : 'fifao:UN_CONTINENT2',
	CNT : 'fifao:gebco1_cont',
	SEA : 'fifao:gebco1',
	lab : 'fifao:MarineAreas',
	div : 'fifao:FAO_DIV',
	gsu : 'fifao:GFCM_SUB_AREA',
	eez : 'fifao:EEZ',
	ics : 'fifao:ICCAT_SMU',
	lme : 'fifao:LME',
	maj : 'fifao:FAO_MAJOR_Lines',
	ma2 : 'fifao:FAO_MAJOR',
	nma : 'fifao:limit_200nm',
	cmp : 'fifao:ISO3_COUNTRY',
	obl : 'fifao:OB_LR',
	ptr : 'fifao:PAC_TUNA_REP',
	RFB : 'fifao:RFB_COMP',
	rfb : 'fifao:RFB_COMP',
	sdi : 'fifao:FAO_SUB_DIV',
	spd : 'fifao:SPECIES_DIST',
	sub : 'fifao:FAO_SUB_AREA',
	sun : 'fifao:FAO_SUB_UNIT',

	//VME layers
	vmc : 'vme:closures', // VME closed areas
    	vmo : 'vme:other_areas', // Other access regulated areas    
    	vmb : 'vme:bottom_fishing_areas', // Bottom fishing areas
    	vmr : 'fifao:RFB_COMP_CLIP', // VME regulatory areas
	guf : 'fifao:gebco_underseafeatures', //undersea features
    	gbi : 'vme:gebco_isobath2000', //isobath -2000m
    	vnt : 'vme:vents_InterRidge_2011_all', // Hidrotermal
    	ccr : 'vme:WCMC-001-ColdCorals2005', //ColdCorals


};

/**
 * FigisMap style definitions (otherwise default sytles are applied)
 * 
 */
FigisMap.fifaoStyles = {
	cmp : 'countries_stars'
};

/**
 * FigisMap.isFaoArea
 * @param layername
 * 
 */
FigisMap.isFaoArea = function( layerName ) {
	switch ( layerName ) {
		case FigisMap.fifao.maj : return true; break;
		case FigisMap.fifao.ma2 : return true; break;
		case FigisMap.fifao.div : return true; break;
		case FigisMap.fifao.sdi : return true; break;
		case FigisMap.fifao.sub : return true; break;
		default	 : return false;
	}
};


/**
 * --------------------------------------------------------------------------------------
 * FigisMap default configurations
 * --------------------------------------------------------------------------------------
 */
FigisMap.defaults = {
	lang		: document.documentElement.getAttribute('lang') ? document.documentElement.getAttribute('lang').toLowerCase() : 'en',
	//TODO OL3 - support of multiple baselayers
	baseLayerC : { layer: FigisMap.fifao.SEA, cached: true, label: 'Continents', label: 'Continents', filter:'*' },
	defaultBaseLayer	: { layer: FigisMap.fifao.cnt, cached: true, remote:false, label : "Continents" },
	baseLayers	: [
		{ layer: FigisMap.fifao.obl, cached: true, label : "Oceans imagery",format: "image/jpeg"},
		{ layer: FigisMap.fifao.cnt, cached: true, label : "Continents"}],
	basicsLayers	: true,
	context		: 'default',
	drawDataRect	: false,
	global		: false,
	landMask	: true,
	mapSize		: 'S',
	layerFilter	: '',
	layerStyle	: '*',
	layerStyles	: { distribution : 'all_fao_areas_style', intersecting : '*', associated : '*' }
};

/**
 * --------------------------------------------------------------------------------------
 * FigisMap environment configurations
 * --------------------------------------------------------------------------------------
 */

//configure environments and set-up various URL variable
FigisMap.geoServerAbsBase = FigisMap.isDeveloper ? (FigisMap.isRemoteDeveloper ? 'http://www.fao.org' : 'http://192.168.1.106:8484') : ( FigisMap.isTesting ? 'http://168.202.3.223:8484' : ('http://' + document.domain ) );
FigisMap.geoServerBase = FigisMap.isRemoteDeveloper ? 'http://www.fao.org' : '';
FigisMap.localPathForGeoserver = "/figis/geoserver";

//TODO OL3 - for VME path is "/fishery/vme-db/"
FigisMap.httpBaseRoot = FigisMap.isRemoteDeveloper ? '' : FigisMap.geoServerBase + ('/figis/geoserver/factsheets/');

//assets
FigisMap.assetsRoot = "assets/";

FigisMap.rnd.vars = {
	geoserverURL		: FigisMap.geoServerBase + FigisMap.localPathForGeoserver,
	geowebcacheURL		: FigisMap.geoServerBase + FigisMap.localPathForGeoserver + "/gwc/service",
	logoURL			: FigisMap.assetsRoot + "common/img/FAOwatermarkSmall.png",
	logoURLFirms		: FigisMap.assetsRoot + "firms/img/logoFirms60.gif",
	FAO_fishing_legendURL	: FigisMap.assetsRoot + "common/img/FAO_fishing_legend.png",
	EEZ_legendURL		: FigisMap.assetsRoot + "common/img/EEZ_legend.png",
	VME_legendURL		: FigisMap.assetsRoot + "vme/img/VME_legend.png",
	VME_FP_legendURL	: FigisMap.assetsRoot + "vme/img/VME_FP_legend.png",
	RFB_legendURL		: FigisMap.assetsRoot + "vme/img/RFB_legend.png",
	wms			: FigisMap.geoServerBase + FigisMap.localPathForGeoserver + "/wms",
	gwc			: FigisMap.geoServerBase + FigisMap.localPathForGeoserver + "/gwc/service" + "/wms",
	ows			: FigisMap.geoServerBase + FigisMap.localPathForGeoserver + "/ows", //TODO OL3 to see where it is used for VME
	Legend_Base_Request	: FigisMap.geoServerBase + FigisMap.localPathForGeoserver + "/wms" + "?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&FORMAT=image%2Fpng&WIDTH=30&HEIGHT=20",
	wfs			: FigisMap.geoServerBase + FigisMap.localPathForGeoserver + '/wfs?request=GetFeature&version=1.0.0&typename=',
	absWfs			: FigisMap.geoServerAbsBase + FigisMap.localPathForGeoserver + '/wfs?request=GetFeature&version=1.0.0&typename=',
};

//Path for FigisMapData
FigisMap.data = (FigisMap.isRemoteDeveloper ? 'http://figisapps.fao.org' : '') + "/figis/moniker.jsonp.FigisMap.loadStaticMapData/figismapdata";

//proxy configuration
FigisMap.useProxy = false;
if ( ( FigisMap.currentSiteURI.indexOf(':8282') > 1 ) || ( FigisMap.currentSiteURI.indexOf(':8383') > 1 ) || FigisMap.isRemoteDeveloper) FigisMap.useProxy = true;
if ( FigisMap.useProxy ) FigisMap.rnd.vars.wfs = ( FigisMap.isRemoteDeveloper ? '' : FigisMap.currentSiteURI + '/figis/proxy/' ) +'/cgi-bin/proxy.cgi?url=' + escape( FigisMap.rnd.vars.absWfs );

/**
 * --------------------------------------------------------------------------------------
 * FigisMap loader functions
 * --------------------------------------------------------------------------------------
 */

/**
 * FigisMap.loadStaticMapData
 * @param md
 */
FigisMap.loadStaticMapData = function(md) {
	FigisMap.rfbLayerSettings = new Object();
	FigisMap.rfbLayerCountries = new Object();
	FigisMap.rfbLayerDescriptors = new Object();
	FigisMap.staticLabels = new Object();
	for ( var i = 0; i < md.rfbs.rfb.length; i++ ) {
		try {
			var r = md.rfbs.rfb[i];
			var n = r.name;
			var s = new Object();
			if ( r.type ) s.type = r.type;
			if ( r.style ) s.style = r.style;
			if ( r.srs ) s.srs = r.srs;
			if ( r.centerCoords ) s.centerCoords = r.centerCoords;
			if ( r.zoomExtent ) s.zoomExtent = r.zoomExtent;
			s.skip = r.skip ? eval(r.skip): false;
			s.isMasked = r.isMasked ? eval(r.isMasked) : false
			s.globalZoom = r.globalZoom ? eval(r.globalZoom) : false;
			FigisMap.rfbLayerSettings[n] = s;
			FigisMap.rfbLayerDescriptors[n] = r.descriptor ? r.descriptor : new Object();
			FigisMap.rfbLayerCountries[n] = ( r.members && r.members.country) ? r.members.country : [];
		} catch(e) {
			FigisMap.error( ['FigisMap.loadStaticMapData ERROR: ', e, r ] );
		}
	}
	for ( var i = 0; i < md.statics['static'].length; i++ ) {
		var s = md.statics['static'][i];
		var n = s.name;
		if ( s.value ) {
			FigisMap.staticLabels[n] = s.value;
		} else {
			var o = new Object();
			for ( var p in s )  if ( p != 'name' ) o[p] = s[p];
			FigisMap.staticLabels[n] = o;
		}
		FigisMap.staticLabels.defined = true;
	}
};

/**
 * Simple function to load a javascript resource
 * @param path - the javascript resource path (mandatory)
 * @param charset (optional)
 */
FigisMap.loadScript = function(url, charset) {
	FigisMap.scriptsLoaded  = false;
	if (typeof charset != 'string') charset = false;
	FigisMap.scripts.push([url, charset]);
};
FigisMap.loadAllScripts = function() {
	FigisMap.scriptsLoaded = ! FigisMap.scripts[0];
	if ( FigisMap.scriptsLoaded ) {
		if ( FigisMap.scriptTempPars ) {
			for ( var i = 0; i < FigisMap.scriptTempPars.length; i++ ) {
				var pars = FigisMap.scriptTempPars[i];
				FigisMap.draw( pars );
			}
			FigisMap.scriptTempPars = undefined;
		}
		if ( FigisMap.scriptTempCallback ) {
			for ( var i = 0; i < FigisMap.scriptTempCallback.length; i++ ) {
				var callback = FigisMap.scriptTempCallback[i];
				setTimeout( callback, 10 );
			}
			FigisMap.scriptTempCallback = undefined;
		}
		FigisMap.scriptsAreLoading = false;
	} else {
		var s = FigisMap.scripts.shift();
		FigisMap.scriptsReqs.push( s );
		var head = document.getElementsByTagName('head')[0];
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = s[0];
		if (typeof s[1] == 'string') script.charset = s[1];
		script.onreadystatechange = FigisMap.loadAllScripts;
		script.onload = FigisMap.loadAllScripts;
		head.appendChild(script);
	}
};
FigisMap.drawInit = function( pars ) {
	if ( FigisMap.scriptsLoaded ) return true;
	if ( ! FigisMap.scriptTempPars ) FigisMap.scriptTempPars = [];
	FigisMap.scriptTempPars.push( pars );
	return FigisMap.init();
};
FigisMap.init = function( callback ) {
	if ( FigisMap.scriptsLoaded ) {
		if ( callback ) setTimeout( callback, 10 );
		return true;
	}
	if ( ! FigisMap.scriptsAreLoading ) {
		FigisMap.scriptsAreLoading = true;
		setTimeout( FigisMap.loadAllScripts, 10 );
	}
	if ( typeof callback != 'undefined' ) {
		if ( ! FigisMap.scriptTempCallback ) FigisMap.scriptTempCallback = [];
		FigisMap.scriptTempCallback.push( callback );
	}
	return false;
};

/**
 * --------------------------------------------------------------------------------------
 * FigisMap console utils
 * --------------------------------------------------------------------------------------
 */

/**
 * FigisMap.console
 * @param args
 * @param doAlert
 * 
 */
FigisMap.console = function( args, doAlert ) {
	var e;
	if ( doAlert == null ) doAlert = ( FigisMap.debugLevel && FigisMap.debugLevel > 1 );
	try {
		args.length;
		args.join;
	} catch( e ) {
		args = [ args ];
	}
	try {
		for ( var i = 0; i < args.length; i++ ){ console.log( args[i] ) }	
	} catch( e ) {
		if ( doAlert ) {
			var txt = '';
			for ( var i = 0; i < args.length; i++ ) {
				txt += args[i] + "\r\n";
				if ( args[i].message ) txt += args[i].message + "\r\n";
			}
			alert( txt );
		}
	}
}


/**
 * FigisMap.debug
 */
FigisMap.debug = function() {
	if ( FigisMap.debugLevel ) {
		var args = [' --- DEBUG information --- '].concat( Array.prototype.slice.call(arguments) );
		FigisMap.console( args );
	}
}


/**
 * FigisMap.error
 */
FigisMap.error = function() {
	var args = [' --- ERROR information --- '].concat( Array.prototype.slice.call(arguments) );
	FigisMap.console( args, (FigisMap.isTesting || FigisMap.isDeveloper) );
}

/**
 * --------------------------------------------------------------------------------------
 * FigisMap general utils
 * --------------------------------------------------------------------------------------
 */

/**
 * PolyFill - browser compatibility utils
 */

if (!('remove' in Element.prototype)) {
    Element.prototype.remove = function() {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    };
}

/**
 * FigisMap.getXMLHttpRequest
 * Configures an XMLHttpRequest
 * @return the request
 * 
 */
FigisMap.getXMLHttpRequest = function() {
	var e, req = false;

	if (window.XMLHttpRequest) {
		try {
			req = new XMLHttpRequest();
		}catch(e){
			FigisMap.error('FigisMap.getXMLHttpRequest failure', e);
			return false;
		}
	} else {
  		if (window.ActiveXObject) {
    			try {
 				xmlHttp = new ActiveXObject('MSXML2.XMLHTTP.3.0');
			}catch(e){
				try {
					req = new ActiveXObject("Microsoft.XMLHTTP");
				}catch(e) {
					FigisMap.error('FigisMap.getXMLHttpRequest failure', e);
					return false;
	
				}
			}
		}
  	}

	try { req.overrideMimeType("text/xml"); } catch(e) { };
	try { xhr.responseType = "msxml-document"; } catch(e) { };
	return req;
};


/**
 * FigisMap.label
 * @param label
 * @param p -> a FigisMap parameters object
 * @return the label
 */
FigisMap.label = function( label, p ) {
	var lang = p && p.lang ? p.lang : ( FigisMap.lang ? FigisMap.lang : FigisMap.defaults.lang );
	var defLang = ( lang == FigisMap.defaults.lang ) ? 'en' : FigisMap.defaults.lang;
	if ( ! label ) return '';
	var l = label.toUpperCase();
	if ( p && p.staticLabels && p.staticLabels[l] ) {
		switch ( typeof p.staticLabels[l] ) {
			case 'string'	: return p.staticLabels[l]; break;
			case 'object'	: return ( typeof p.staticLabels[l][lang] ) == 'string' ? p.staticLabels[l][lang] : p.staticLabels[l][defLang]; break;
		}
	}
	if ( FigisMap.staticLabels && FigisMap.staticLabels[l] ) {
		switch ( typeof FigisMap.staticLabels[l] ) {
			case 'string'	: return FigisMap.staticLabels[l]; break;
			case 'object'	: return ( typeof FigisMap.staticLabels[l][lang] ) == 'string' ? String(FigisMap.staticLabels[l][lang]) : FigisMap.staticLabels[l][defLang]; break;
		}
	}
	return label;
}


/**
 * --------------------------------------------------------------------------------------
 * FigisMap script dependencies
 * --------------------------------------------------------------------------------------
 */

//FigisMap dependencies
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/vendor/proj4js/proj4.js');
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/vendor/proj4js/defs/4326.js');
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/vendor/proj4js/defs/3031.js');
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/vendor/proj4js/defs/900913.js');
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/vendor/proj4js/defs/54009.js');
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/vendor/ol3/ol3' + ((FigisMap.debugLevel > 0)? '-debug' : '') + '.js');
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/vendor/ol3/ol3-layerswitcher.js');
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/vendor/ol3/ol3-zoomtomaxextent.js');
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/vendor/ol3/ol3-loadingpanel.js');

//FigisMap data
FigisMap.loadScript(FigisMap.data, "UTF-8");



/**
 * --------------------------------------------------------------------------------------
 * FigisMap OpenLayers functions
 * --------------------------------------------------------------------------------------
 */
 
/**
* FigisMap OL constants
*/
FigisMap.ol.imageFormat = 	"image/png";
FigisMap.ol.overlaysLabel = "Overlays";
FigisMap.ol.baselayersLabel = "Base Layer";
 
/**
 * FigisMap.ol.getDefaultOverlayGroup
 * @param pars
 * @return the default overlay group name
 */
FigisMap.ol.getDefaultOverlayGroup = function(pars){
	var overlayGroup = {name:FigisMap.ol.overlaysLabel, infoUrl:false};
	if (pars.options){
		if(pars.options.layerSwitcherOptions){
			if(pars.options.layerSwitcherOptions.overlayGroups){
				overlayGroup = (pars.options.layerSwitcherOptions.defaultOverlayGroup)?
					pars.options.layerSwitcherOptions.defaultOverlayGroup : pars.options.layerSwitcherOptions.overlayGroups[0];
			}
		}
	}
	return overlayGroup;
}


/**
 * FigisMap.ol.reBound
 * Function to reproject geographic boundaries
 * 
 * @param proj0
 * @param proj1
 * @param bounds
 * 
 */
FigisMap.ol.reBound = function( proj0, proj1, bounds ) {
	proj0 = parseInt( String( proj0.projCode ? proj0.projCode : proj0 ).replace(/^EPSG:/,'') );
	proj1 = parseInt( String( proj1.projCode ? proj1.projCode : proj1 ).replace(/^EPSG:/,'') );
	if ( bounds == null ) {
		proj0 = 4326;
		bounds = [-180, -90, 180, 90]
	}
	var ans = false;
	if ( proj0 == 3349 ) proj0 = 900913;
	if ( proj1 == 3349 ) proj1 = 900913;
	if ( proj0 == proj1 ) ans = bounds;
	if ( proj1 == 3031 ){
		return [-12400000,-12400000, 12400000,12400000];
	}
	if ( ! ans ) {
		var source = new ol.proj.get('EPSG:'+proj0);
		var target = new ol.proj.get('EPSG:'+proj1);
		var extentGeom = ol.geom.Polygon.fromExtent(bounds);
		extentGeom.transform(source, target);
		ans = extentGeom.getExtent();
	}
	if ( proj1 == 4326 ) ans = FigisMap.ol.dateline( ans );
	return ans;
};


/**
 * FigisMap.ol.dateline
 * @param b (a bounds array)
 * @return an object representing a geographic extent (a bounds array)
 */
FigisMap.ol.dateline = function( a ) {
	var b = { left: a[0], top: a[1], right: a[2], bottom: a[3] };
	if ( b.left < 0 && b.right > 0 && ( b.right - b.left ) < 300  ) {
		// do nothing
	} else {
		if ( b.left > b.right ) {
			var t = b.left;
			b.left = b.right;
			b.right = t;
		} else {
			var diff = b.right - b.left;
			if ( ( diff > 300 ) && ( diff < 359 ) ) {
				var t = b.left;
				b.left = b.right -360;
				b.right = t;
			}
		}
	}
	//return b;
	return [ b.left, b.top, b.right, b.bottom ];
};

/**
 * FigisMap.ol.reCenter
 * Function used to reproject a center coordinates
 * @param proj0 -> the source projection
 * @param proj1 -> the target projection
 * @param center -> the center coordinates
 * @return the projected center
 */
FigisMap.ol.reCenter = function( proj0, proj1, center ) {
	proj0 = parseInt( String( proj0.projCode ? proj0.projCode : proj0 ).replace(/^EPSG:/,'') );
	proj1 = parseInt( String( proj1.projCode ? proj1.projCode : proj1 ).replace(/^EPSG:/,'') );
	if ( proj0 == 3349 ) proj0 = 900913;
	if ( proj1 == 3349 ) proj1 = 900913;
	if ( center == null ) {
		if( proj1 == 900913 ) return [20037508.34, 4226661.92];
		proj0 = 4326;
		center = [0,0];
	}
	if ( proj0 == proj1 ) return center;
	
	if( proj1 == 3031 ) return [156250.0, 703256.0];
	
	var newCenter;
	var source = new ol.proj.get('EPSG:'+proj0);
	var dest = new ol.proj.get('EPSG:'+proj1);
	var centerPoint = new ol.geom.Point(center, 'XY');
	centerPoint.transform(source, dest);
	newCenter = centerPoint.getCoordinates();
	
	return newCenter;
	
};

/**
 * FigisMap.ol.extend
 * @param bounds1
 * @param bounds2
 * @return an array representing the extended geographic bounds
 */
FigisMap.ol.extend = function( bounds1, bounds2 ) {
	
	var b1 = { left: bounds1[0] +180, bottom: bounds1[1], right: bounds1[2] +180, top: bounds1[3] };
	var b2 = { left: bounds2[0] +180, bottom: bounds2[1], right: bounds2[2] +180, top: bounds2[3] };
	
	var ans = new Object();
	ans.bottom = b1.bottom > b2.bottom ? b2.bottom : b1.bottom;
	ans.top = b1.top < b2.top ? b2.top : b1.top;
	var leftMin = Math.min( b1.left, b2.left );
	var leftMax = Math.max( b1.left, b2.left );
	var rightMin = Math.min( b1.right, b2.right );
	var rightMax = Math.max( b1.right, b2.right );
	var wAtl = rightMax - leftMin;
	var wPac = 360 + rightMin - leftMax;
	if ( wAtl < wPac ) {
		ans.left = ((leftMin+720)%360) -180;
		ans.right = ((rightMax+720)%360) -180;
	} else {
		ans.left = ((leftMax+720)%360) -180;
		ans.right = ((rightMin+720)%360) -180;
	}
// 	if ( ans.right > 180 ) ans.right -= 360;
	if ( ans.left > ans.right ) ans.left -= 360;
// 	FigisMap.debug('Extend:', { b1_in : bounds1, b1_calc: b1}, { b2_in: bounds2, b2_calc: b2 }, ans );
// 	FigisMap.debug( 'Widths', { leftMin: leftMin, leftMax: leftMax, rightMin: rightMin, rightMax: rightMax, wAtl: wAtl, wPac: wPac } );

	return [ans.left, ans.bottom, ans.right, ans.top];
};


/**
 * FigisMap.ol.readFeatures
 * Function to read Features from WFS (default GML2 format)
 * @param xml
 * @return an array of features
 */
FigisMap.ol.readFeatures = function( xmlDoc ) {
	
	FigisMap.debug('FigisMap.ol.gmlBbox - XML:', xmlDoc);
	var gml = new ol.format.WFS({gmlFormat : new ol.format.GML2()});
	
	var features = gml.readFeatures( xmlDoc );
	FigisMap.debug('FigisMap.ol.gmlbbox - Features', features);
	return features;
}

/**
 * FigisMap.ol.gmlBbox
 * Extracts the bounding box from a GML document
 * @param xmlDoc
 * @return an array representing the bbox
 */
FigisMap.ol.gmlBbox = function( xmlDoc ) {
	var e;
	try {
		var features = FigisMap.ol.readFeatures( xmlDoc )
		var extent;
		for ( var i = 0; i < features.length; i++ ) {
			var feature = features[i];
			var fb = feature.getProperties().boundedBy;
			var bounds = [fb[1], fb[0], fb[3], fb[2]]; //hack required to have right ordered bbox (investigate if it's not a bug in OL3)
			if ( i == 0) {
				extent = bounds;
			} else {
				extent = FigisMap.ol.extend(extent, bounds);
			}
		}
		FigisMap.debug('FigisMap.ol.gmlbbox - Extent', extent);
		return extent;
	} catch(e) {
		FigisMap.debug('FigisMap.ol.gmlBbox exception:', e, e.message, 'XML document:',xmlDoc );
		return false;
	}
};


/**
 * Convenience method to refit an extent that might not be valid
 * @param bounds
 * @param the new bounds
 * 
 */
FigisMap.ol.reFit = function(myMap, bounds) {
	
	var from = bounds;

	var v = myMap.getView();
	var maxExtent = v.getProjection().getExtent();

	if ( maxExtent[0]>bounds[0] ) bounds[0] = maxExtent[0];
	if ( maxExtent[1]>bounds[1] ) bounds[1] = maxExtent[1];
	if ( maxExtent[2]<bounds[2] ) bounds[2] = maxExtent[2];
	if ( maxExtent[3]<bounds[3] ) bounds[3] = maxExtent[3];
	var hasExtent = false;
	for ( var i = 0; i < bounds.length; i++ ) hasExtent = hasExtent || ( bounds[i] != maxExtent[i] );
	if ( hasExtent ) hasExtent = FigisMap.ol.isValidExtent( bounds );
	if ( ! hasExtent ) bounds = maxExtent;

	FigisMap.debug('FigisMap.ol.reFit - from', from);
	FigisMap.debug('FigisMap.ol.reFit - to', bounds);

	return bounds;
}


/**
 * Convenience method to zoom to a given extent
 * @param map
 * @param bounds
 * @param validateExtent
 * 
 */
FigisMap.ol.zoomToExtent = function( myMap, bounds, validateExtent ) {
	var v = myMap.getView();
	var maxExtent = v.getProjection().getExtent();
	if (( ! bounds ) || (typeof bounds == 'undefined') || ! ( bounds.constructor === Array) ) {
		bounds = maxExtent;
	}

	if (validateExtent) bounds = FigisMap.ol.reFit(myMap, bounds);
	
	v.fit( bounds, myMap.getSize() );
};

FigisMap.ol.isValidExtent = function( bounds ) {
	if ( bounds[0] >= bounds[2] || bounds[1] >= bounds[3] ) return false;
	for ( var i = 0; i < bounds.length; i++ ) if ( ( ! bounds[i] ) || ! isFinite( bounds[i] ) ) return false;
	return true;
};

/**
 * Convenience method to optimize the center of a map (e.g. Pacific view)
 * @param map
 * @param bounds
 * @param projsToExclude
 * @param force if true, eventual threshold rules to optimize center (such as for Mercator) will be ignored
 */
FigisMap.ol.optimizeCenter = function( myMap, bounds, projsToExclude, force){

	if(!projsToExclude) projsToExclude = new Array();	
	var mapProj = myMap.getView().getProjection();
	var proj = parseInt( mapProj.getCode().replace(/^EPSG:/,'') );
	var projBounds = mapProj.getExtent();
	
	if(projsToExclude.indexOf(proj) == -1){
		var nc = false;
		switch(proj) {
			case 3031:
				// center to south pole in polar projection
				//note: unchanged from FigisMap 1.0-OL3
				nc = FigisMap.ol.reCenter( 4326, proj );
				break;
			case 900913:
				// center to Pacific centre in Mercator - only if larger than 35k km (whole world)
				//note: unchanged from FigisMap 1.0-OL3
				var nbw = Math.abs( bounds[0] - bounds[2]);
				if ( nbw > 35000000 || force) {
					nc = FigisMap.ol.reCenter( 4326, proj );
					nc[1] = ( bounds[3] + bounds[1] )/2;			
				}
				break;
			case 3349: 
				// center to Pacific centre in Mercator - only if larger than 35k km (whole world)
				// note: unchanged from FigisMap 1.0-OL3
				var nbw = Math.abs( bounds[0] - bounds[2]);
				if ( nbw > 35000000 || force) {
					nc = FigisMap.ol.reCenter( 4326, proj );
					nc[1] = ( bounds[3] + bounds[1] )/2;			
				}
				break;

			case 4326:
				// center to Pacific in WFS84
				//note: new for FigisMap 1.1-OL3
				ncx =  parseInt(bounds[2] + (projBounds[2]*2 - bounds[2] + bounds[0])/2);
				if(ncx > projBounds[2]) ncx = ncx - projBounds[2]*2;
				ncy = parseInt((bounds[1] + bounds[3])/2);
 				nc = [ ncx , ncy ];
				break;

			case 54009:
				// center to Pacific in Mollweide?
				//note: new for FigisMap 1.1-OL3
				ncx =  parseInt(bounds[2] + (projBounds[2]*2 - bounds[2] + bounds[0])/2);
				if(ncx > projBounds[2]) ncx = ncx - projBounds[2]*2;
				ncy = parseInt((bounds[1] + bounds[3])/2);
 				nc = [ ncx , ncy ];
				break;

		}
		if ( nc ) myMap.getView().setCenter( nc );
	}
}


/**
 * FigisMap.ol.configureBaseLayer
 * @param obj
 * @param boundsOrigin
 * @returns an object of class {ol.layer.Tile}
 */
FigisMap.ol.configureBaseLayer = function(obj, boundsOrigin){
	return new ol.layer.Tile({
					title : obj.title,
					type: 'base',
					source : new ol.source.TileWMS({
						url : obj.cached ? FigisMap.rnd.vars.gwc : FigisMap.rnd.vars.wms, 
						params : { 
							'LAYERS' : obj.layer,
							'VERSION': '1.1.1',
							'FORMAT' : FigisMap.ol.imageFormat,
							'TILED'	 : true,
							'TILESORIGIN': boundsOrigin.join(',')
						},
						wrapX: true,
						serverType : obj.cached ? undefined : 'geoserver',
						attributions: obj.attribution ? [ 
							new ol.Attribution({
								html : obj.attribution
							})] : []
						})
				});
}

/**
 * FigisMap.ol.configureOverlayLayer
 * @param obj
 * @param boundsOrigin
 * @returns an object of class {ol.layer.Tile}
 */
FigisMap.ol.configureOverlayLayer = function(obj, boundsOrigin){
	
	var wp = new Object();	
	wp.name = obj.lsTitle;
	wp.url = ( obj.cached ? FigisMap.rnd.vars.gwc : FigisMap.rnd.vars.wms );

	//params
	wp.params = {
			'LAYERS' : obj.layer,
			'VERSION': '1.1.1',
			'FORMAT' : FigisMap.ol.imageFormat,
			'TILED'	 : true,
			'TILESORIGIN' : boundsOrigin.join(',')
	}
	if ( obj.style && obj.style != '*' && obj.style != 'default' ) wp.params.STYLES = obj.style;
	if ( obj.filter && obj.filter != '*' ) wp.params.CQL_FILTER = obj.filter;
	
	//layer config
	var layer = new ol.layer.Tile({
		title : obj.hideInSwitcher? undefined : wp.name, //implicit way to hide a layer from layerswitcher
		source : new ol.source.TileWMS({
			url : wp.url,
			params : wp.params,
			wrapX: true,
			serverType : 'geoserver'
		}),
		opacity : ( obj.opacity )? obj.opacity : 1.0,
		visible : ( obj.hidden )? false : true
	});
	FigisMap.ol.setLegendGraphic(layer);
	layer.showLegendGraphic = obj.showLegendGraphic ? obj.showLegendGraphic : false; //to make the param accessible to layerswitcher
	layer.overlayGroup = (obj.overlayGroup)? obj.overlayGroup: {name:FigisMap.ol.overlaysLabel, infoUrl:false};

	return layer;
}

/**
 * FigisMap.ol.getLayer
 * @param map
 * @param layerProperty value of the property (by default layer name as in Geoserver 'namespace:layername')
 * @param by property name to use for searching default is false, in which case search is done by source "LAYERS" param (WMS)
 */
FigisMap.ol.getLayer = function(map, layerProperty, by){
		
	if(!by) byTitle = false;

	var target = undefined;
	for(var i=0;i<map.getLayerGroup().getLayersArray().length;i++){
		var layer = map.getLayerGroup().getLayersArray()[i];
		var condition  = by? (layer[by] === layerProperty) : (layer.getSource().getParams()["LAYERS"] === layerProperty);
		if(condition){
			target = map.getLayerGroup().getLayersArray()[i];
			break;
		}
	}
	return target;
}

/**
 * FigisMap.ol.toggleLayer
 * @param map
 * @param layername (layer name as in Geoserver 'namespace:layername')
 * @param visible
 */
FigisMap.ol.toggleLayer = function(map, layername, visible){
	var layer = FigisMap.ol.getLayer(map, layername);
	if(layer) layer.setVisible(visible);
}

/** 
 * FigisMap.refreshLayer
 * Refresh a layer with acronym/time filters
 * @param layer name of the layer as in Geoserver ('namespace:layername')
 */
FigisMap.ol.refreshLayer = function(layer, newParams){
	
	var olLayer = FigisMap.ol.getLayer(VME.myMap, layer);
	var source = olLayer.getSource();
	var params = source.getParams();
	
	var targetKeys = Object.keys(newParams);
	for(var i=0;i<targetKeys.length;i++){
		var key = targetKeys[i];
		params[key] = newParams[key];
	}

	source.updateParams(params);
	FigisMap.ol.setLegendGraphic(olLayer); //update legend graphic (required)	
}

/**
 * FigisMap.ol.getSource
 * @param map
 * @param layername (layer name as in Geoserver 'namespace:layername')
 */
FigisMap.ol.getSource = function(map, layername){
	var source = undefined;
	var layer = FigisMap.ol.getLayer(map, layername);
	if(layer) source = layer.getSource();
	return source;
}


/**
 * Builds a SetLegendGraphic WMS request to handle layer legend
 * @param {ol.layer.TileWMS} lyr WMS Layer
 * 
 */
FigisMap.ol.setLegendGraphic = function(lyr) {
	
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
	
	lyr.legendGraphic = request
}


/**
 * Utility function to update the layer switcher from FigisMap
 */
FigisMap.ol.updateLayerSwitcher = function(map){
	var controls = map.getControls().getArray();
	for(var i=0;i<controls.length;i++){
		var control = controls[i];
		if(control instanceof ol.control.LayerSwitcher){
			control.renderPanel();
			break;
		}		
	}
}


/**
 * --------------------------------------------------------------------------------------
 * FigisMap Parser functions
 * --------------------------------------------------------------------------------------
 */

/**
 * FigisMap.parser.layer
 * @param obj
 * @param setProperties
 * @return a layer object
 */
FigisMap.parser.layer = function( obj, setProperties ) {
	if ( typeof ( obj ) == 'string' ) obj = { 'layer' : String( obj ) };
	if ( typeof setProperties == 'object' ) for ( var i in setProperties ) obj[i] = setProperties[i];
	switch ( typeof ( obj.filter ) ) {
		case 'string'		: break;
		case 'object'		: obj.filter = obj.filter.join(' OR '); break;
		default			: obj.filter = FigisMap.defaults.layerFilter;
	}
	if ( ! obj.style ) switch ( obj.type ) {
		case 'base'	: break;
		default		: obj.style = FigisMap.defaults.layerStyle;
	}
	return obj;
};

/**
 * FigisMap.parser.layers
 * @param obj
 * @param setProperties
 * @return an array of layer objects
 */
FigisMap.parser.layers = function( obj, setProperties ) {
	if ( typeof obj == 'undefined' || typeof obj == 'boolean' ) return false;
	if (typeof obj == 'string') {
		if ( ( obj.indexOf('/') > -1 ) || ( obj.indexOf('-') > -1 ) ) {
			var v = obj.indexOf('/') > -1 ? obj.split('/') : new Array( String(obj) );
			obj = new Array();
			for ( var i = 0; i < v.length; i++ ) {
				var theLayer = String(v[i]);
				if ( theLayer != '' ) {
					if ( theLayer.indexOf('-') > -1 ) {
						var lf = theLayer.split('-');
						var l = { 'layer' : lf[0] };
						if ( lf[1] != '' ) l.filter = lf[1];
						obj[ obj.length ] = l;
					} else {
						obj[ obj.length ] = { 'layer' : theLayer };
					}
				}
			}
		} else {
			 obj = new Array( { 'layer' : String(obj) } );
		}
	} else if ( typeof ( obj.length ) == 'undefined' ) {
		obj = new Array( obj );
	}
	
	var ls = new Array();
	for ( var i = 0; i < obj.length; i++ ) {
		var l = FigisMap.parser.layer( obj[i], setProperties );
		if ( l.filter && l.filter.length > 150 && l.filter.indexOf(' OR ') > 0 ) {
			var fs = l.filter.split(' OR ');
			while ( fs.length > 0 ) {
				var newfs = fs.splice(0,50);
				var nl = new Object();
				for ( var p in l ) nl[p] = l[p];
				nl.filter = newfs.join(' OR ');
				if ( ls[0] ) nl.skipLegend = true;
				ls.push( nl );
			}
		} else {
			ls.push( l );
		}
	}
	
	return ls;
};

/**
 * FigisMap.parser.layersHack
 * @param p
 * 
 */
FigisMap.parser.layersHack = function( p ) {
	// if a layer in distribution already appears in intersecting, then a style is attributed by default
	/*
	if ( p.distribution && p.intersecting && ( ! p.skipStyles ) ) {
		for ( var i = 0; i < p.distribution.length; i++ ) {
			var l = p.distribution[i];
			var isInIntersecting = false;
			for ( var j = 0; j < p.intersecting.length; j++ ) if ( p.intersecting[j].layer == l.layer ) { isInIntersecting = true; break; }
			if ( isInIntersecting ) l.style = FigisMap.defaults.layerStyles[ l.type ];
		}
	}
	*/
	if ( p.distribution && ( ! p.skipStyles ) ) {
		for ( var i = 0; i < p.distribution.length; i++ ) {
			var l = p.distribution[i];
			if ( FigisMap.isFaoArea( l.layer ) ) l.style = FigisMap.defaults.layerStyles.distribution;
		}
	}
};

/**
 * FigisMap.parser.div
 * @param d
 * 
 */
FigisMap.parser.div = function( d ) {
	if ( ! d ) return { 'div': false, 'id': false };
	if ( typeof d == 'string' ) {
		d = { 'div' : document.getElementById( d ), 'id' : String( d ) };
	} else if ( typeof d == 'object' ) {
		if ( typeof d.div == 'string' ) {
			d.id = String( d.div );
			d.div = document.getElementById( d.id );
		} else if ( ! ( d.div ) ) {
			d = { 'div' : d, 'id' : d.getAttribute('id') };
		}
	} else {
		return { 'div': false, 'id': false };
	}
	return ( !! d.div ) ? d : { 'div': false, 'id': false };
};

/**
 * FigisMap.parser.projection
 * @param p
 * @return the EPSG numeric code of the projection
 * 
 */
FigisMap.parser.projection = function( p ) {
	var proj = p.projection;
	if ( proj ) {
		proj = parseInt( proj );
	} else {
		if ( p.rfb && p.rfb == 'ICES' ) proj = 900913;
	}
	switch ( proj ) {
		case 3349	: break;
		case 900913	: break;
		case 3031	: break;
		case  54009 : break;
		default			: proj = 4326;
	}
	return proj;
};

/**
 * FigisMap.parser.watermark
 * @param p
 * @return a watermark object
 */
FigisMap.parser.watermark = function( p ) {
	var w = {
		src : FigisMap.rnd.vars.logoURL,
		title : FigisMap.label('Powered by FIGIS', p),
		width : 176,
		height : 44,
		wclass : 'ol-powered-by'
	};
	if ( p && p.context.indexOf('FIRMS') == 0 ) {
		w.src = FigisMap.rnd.vars.logoURLFirms;
		w.width = 60;
		w.height = 29;
	};
	if ( p && p.watermark != null ) {
		if ( typeof p.watermark == 'object' ) {
			for ( var i in p.watermark ) w[i] = p.watermark[i];
		} else {
			w = p.watermark;
		}
	}
	return w;
};

/**
 * FigisMap.parser.countries
 * @param p
 * @return the countries
 */
FigisMap.parser.countries = function( p ) {
	var cnt = p.countries;
	var isRFB = ( p.rfb && p.rfb != '' );
	if ( ! cnt || ! cnt[0] ) cnt = false;
	if ( ! cnt && isRFB ) cnt = FigisMap.rfb.getCountries( p.rfb, p );
	if ( cnt && cnt.length > 0 ) {
		var newLayer = { layer: FigisMap.fifao.cbs };
		if ( isRFB ) newLayer.title = FigisMap.label('Members', p);
		var filters = new Array();
		for (var i=0; i < cnt.length; i++) filters.push( "ISO_"+ cnt[i].length + "='" + cnt[i] + "'" );
		newLayer.filter = filters.join(' OR ');
		var layerType = p.distribution ? 'associated' : 'distribution';
		newLayer.type = layerType;
		if ( p.options.colors ) newLayer.style = 'country_boundaries_colors';
		p[ layerType ] = FigisMap.parser.layers( p[ layerType ] );
		if ( ! p[ layerType ] ) p[ layerType ] = new Array();
		p[ layerType ].push( newLayer );
		p[ layerType ] = FigisMap.parser.layers( p[ layerType ], { type : layerType } );
	}
	return cnt;
};

/**
 * FigisMap.parser.checkLayerTitles
 * @param layers
 * @param pars
 * 
 */
FigisMap.parser.checkLayerTitles = function( layers, pars ) {
	if ( layers ) for (var i = 0; i < layers.length; i++) if ( layers[i].title == null ) {
		var t = '';
		if ( layers[i].type == 'intersecting' ) t += FigisMap.label( layers[i].type, pars );
		t += FigisMap.label( layers[i].layer.replace(/^[^:]+:(.+)/,"$1"), pars );
		layers[i].title = t;
	}
}

/**
 * FigisMap.parser.parse
 * @param p
 * @return the parameters for the FigisMap
 * 
 */
FigisMap.parser.parse = function( p ) {
	
	if ( typeof p != 'object' ) return { 'parserError' : 'Params object is missing - type: ' + ( typeof p ) };
	
	if ( ! p.context ) p.context = FigisMap.defaults.context;
	
	if ( typeof p.isFIGIS == 'undefined' ) p.isFIGIS = ( p.context.indexOf( 'Viewer' ) < 0 );
	if ( typeof p.isViewer == 'undefined' ) p.isViewer = ! p.isFIGIS;
	if ( typeof p.isRFB == 'undefined' ) p.isRFB = ( p.rfb != null );
	if ( typeof p.isVME == 'undefined' ) p.isVME = ( p.context.indexOf( 'FI-vme' ) == 0 );
	
	p.mapSize = ( typeof p.mapSize == 'string' ) ? p.mapSize.toUpperCase() : FigisMap.defaults.mapSize;
	p.lang = ( typeof p.lang == 'string' ) ? p.lang.toLowerCase() : FigisMap.defaults.lang;
	
	if ( typeof p.target == 'undefined' ) {
		p.parserError = "'target' mandatory param is undefined.";
		return p;
	}
	p.target = FigisMap.parser.div( p.target );
	if ( ! p.target.div ) {
		p.parserError = "target element not found in document";
		return p;
	}
	p.projection = FigisMap.parser.projection( p );
	if ( typeof p.options == 'undefined' ) p.options = new Object();
	if ( typeof p.options.colors == 'undefined' ) p.options.colors = false;
	if ( typeof p.options.skipLayerSwitcher == 'undefined' ) p.options.skipLayerSwitcher = !! p.isVME;
	if ( typeof p.options.skipLoadingPanel == 'undefined' ) p.options.skipLoadingPanel = false;
	if ( typeof p.options.skipNavigation == 'undefined' ) p.options.skipNavigation = false;
	if ( p.projection != 4326 ) p.options.colors = false;
	if ( typeof p.options.labels == 'undefined' ) p.options.labels = p.options.colors;
	if ( typeof p.options.baseMarineLabels == 'undefined' ) p.options.baseMarineLabels = false;
	if ( typeof p.options.baseMask == 'undefined' ) p.options.baseMask = false;
	
	//baselayers management
	//TODO test compatibility with other viewers
	if ( ! p.base ) {
		p.base = (p.baseLayerC)? [p.baseLayerC] : FigisMap.defaults.baseLayers;
	}
	
	p.defaultBase = FigisMap.defaults.defaultBaseLayer;
	if ( p.base ) {
		for(var i=0;i<p.base.length;i++){
			p.base[i] = FigisMap.parser.layer( p.base[i], { 'type' : 'base'} );
			if (p.attribution) p.base[i].attribution = p.attribution;
			if ( ! p.base[i].title ) p.base[i].title = FigisMap.label( p.base[i].label ? p.base[i].label : p.base[i].layer, p );
		}
	}
	if ( p.defaultBase ) {		
			p.defaultBase = FigisMap.parser.layer( p.defaultBase, { 'type' : 'base'} );
			if ( ! p.defaultBase.title ) p.defaultBase.title = FigisMap.label( p.defaultBase.label ? p.defaultBase.label : p.defaultBase.layer, p );		
	}
	
	p.distribution = FigisMap.parser.layers( p.distribution, { 'type' : 'distribution'} );
	FigisMap.parser.checkLayerTitles( p.distribution, p );
	
	p.intersecting = FigisMap.parser.layers( p.intersecting, { 'type' : 'intersecting'} );
	FigisMap.parser.checkLayerTitles( p.intersecting, p );
	
	p.associated = FigisMap.parser.layers( p.associated, { 'type' : 'associated'} );
	FigisMap.parser.checkLayerTitles( p.associated, p );
	
	p.countries = FigisMap.parser.countries( p );
	
	FigisMap.parser.layersHack( p );
	
// 	if ( ! p.distribution ) {
// 		p.parserError = "'distribution' mandatory parameter is missing or malformed.";
// 		return p;
// 	}
	
	if ( p.isFIGIS ) FigisMap.fs.parse( p );
	
	//p.projection = FigisMap.parser.projection( p );
	
	if ( ! p.dataProj ) p.dataProj = p.extent ? p.projection : 4326;
	
	p.legend = FigisMap.parser.div( p.legend );
	
	p.countriesLegend = FigisMap.parser.div( p.countriesLegend );
	
	if ( p.legend.div || p.countriesLegend.div ) {
		 if ( typeof p.legendType == 'string' ) {
		 	p.legendType = p.legendType.toUpperCase();
		 } else {
		 	p.legendType = ( p.isRFB && ! p.isViewer ) ? 'D' : 'T';
		 	if ( p.isViewer || p.isRFB ) p.legendType += 'P';
		 }
	}
	
	p.watermark = FigisMap.parser.watermark( p );
	
	if ( p.landMask == null ) p.landMask = FigisMap.defaults.landMask;
	if ( p.global == null ) p.global = FigisMap.defaults.global;
	if ( p.basicsLayers == null ) p.basicsLayers = FigisMap.defaults.basicsLayers;
	if ( p.drawDataRect == null ) p.drawDataRect = FigisMap.defaults.drawDataRect;
	if ( location.search.indexOf('debugLevel=') > -1 ) {
		FigisMap.debugLevel = parseInt( location.search.replace(/^.*debugLevel=([0-9]+).*$/,"$1") );
		if ( isNaN( FigisMap.debugLevel ) || FigisMap.debugLevel == 0 ) FigisMap.debugLevel = false;
		p.debug = FigisMap.debugLevel;
	} else if ( p.debug == null ) {
		p.debug = FigisMap.debugLevel;
	}
	
	return p;
}


/**
 * --------------------------------------------------------------------------------------
 * FigisMap factsheet specific methods
 * --------------------------------------------------------------------------------------
 */

/**
 * FigisMap.fs.parse
 * @param p
 * 
 */
FigisMap.fs.parse = function( p ) {
	if ( ! p.staticLabels ) p.staticLabels = new Object();
	if ( ! p.RFBName ) if ( FigisMap.staticLabels['MEMBERS_FS'] && ! p.staticLabels['MEMBERS'] ) p.staticLabels['MEMBERS'] = FigisMap.staticLabels['MEMBERS_FS'];
	var hasdist = ( p.distribution[0] && typeof p.distribution[0] == 'object' );
	if ( hasdist ) {
		var autoZoom = false;
		var dtype = new Object();
		for ( var i = 0; i < p.distribution.length; i++ ) {
			var l = p.distribution[i];
			if ( l.autoZoom ) autoZoom = true;
			if ( ! dtype[ l.layer ] ) dtype[ l.layer ] = new Array();
			dtype[ l.layer ].push( i );
		}
		if ( p.associated ) for ( var i = 0; i < p.associated.length; i++ ) if ( p.associated[i].autoZoom ) autoZoom = true;
		if ( p.intersecting ) for ( var i = 0; i < p.intersecting.length; i++ ) if ( p.intersecting[i].autoZoom ) autoZoom = true;
		
		if ( ! autoZoom ) autoZoom = FigisMap.fs.setAutoZoom( p, dtype );
		
		if ( dtype[ FigisMap.fifao.eez ] ) FigisMap.fs.eezHack( p, dtype );
		
		if ( ! p.rfb ) FigisMap.fs.dsort( p, dtype );
	}
};

/**
 * FigisMap.fs.setAutoZoom
 * @param p
 * @param dtype
 * 
 */
FigisMap.fs.setAutoZoom = function( p, dtype ) {
	var prio = false;
	if ( ! prio ) if ( dtype[ FigisMap.fifao.rfb ] ) prio = dtype[ FigisMap.fifao.rfb ][0];
	if ( ! prio ) if ( dtype[ FigisMap.fifao.eez ] ) prio = dtype[ FigisMap.fifao.eez ][0];
	if ( ! prio ) if ( dtype[ FigisMap.fifao.cbs ] ) prio = dtype[ FigisMap.fifao.cbs ][0];
	if ( ! prio ) if ( dtype[ FigisMap.fifao.maj ] ) prio = dtype[ FigisMap.fifao.maj ][0];
	if ( ! prio ) prio = 0;
	p.distribution[ prio ].autoZoom = true;
	return true;
};

/**
 * FigisMap.fs.eezHack
 * @param p
 * @param dtype
 * 
 */
FigisMap.fs.eezHack = function( p, dtype ) {
	// associate a countrybound to every eez, if any (and if not countrybounds)
	/* disable as per Marc's request, 21/02/2013
	if ( dtype[ FigisMap.fifao.eez ] && ! dtype[ FigisMap.fifao.cbs ] ) {
		dtype[ FigisMap.fifao.cbs ] = new Array();
		if ( ! p.associated ) p.associated = new Array();
		for ( var i = 0; i < dtype[ FigisMap.fifao.eez ].length; i++ ) {
			var curLayer = p.distribution[ dtype[FigisMap.fifao.eez][i] ];
			var newLayer = new Object();
			for ( var k in curLayer ) {
				switch ( String( k ) ) {
					case 'autoZoom' : break;
					case 'title'	: break;
					case 'type'	: newLayer.type = 'associated'; break;
					case 'layer'	: newLayer.layer = FigisMap.fifao.cbs; break;
					case 'filter'	: newLayer.filter = curLayer.filter.replace( /ISO([0-9])_CODE/g, "ISO_$1"); break;
					default		: newLayer[ k ] = curLayer[ k ];
				}
			}
			p.associated.push( newLayer );
		}
	}
	*/
	if (false) if ( p.context == 'FIRMS-Fishery' ) {
		if ( dtype[ FigisMap.fifao.eez ] && ! dtype[ FigisMap.fifao.cbs ] ) {
			dtype[ FigisMap.fifao.cbs ] = new Array();
			if ( ! p.associated ) p.associated = new Array();
			for ( var i = 0; i < dtype[ FigisMap.fifao.eez ].length; i++ ) {
				var curLayer = p.distribution[ dtype[FigisMap.fifao.eez][i] ];
				var newLayer = new Object();
				for ( var k in curLayer ) {
					switch ( String( k ) ) {
						case 'autoZoom' : break;
						case 'title'	: break;
						case 'type'	: newLayer.type = 'associated'; break;
						case 'layer'	: newLayer.layer = FigisMap.fifao.cmp; break;
						case 'filter'	: newLayer.filter = curLayer.filter.replace( /ISO([0-9])_CODE/g, "ISO_$1"); break;
						default		: newLayer[ k ] = curLayer[ k ];
					}
				}
				newLayer.style = FigisMap.fifaoStyles.cmp;
				p.associated.push( newLayer );
			}
		}
	}
};


/**
 * FigisMap.fs.dsort
 * @param p
 * @param dtype
 * 
 */
FigisMap.fs.dsort = function( p, dtype ) {
	if ( p.distribution && p.distribution[0] ) {
		var lowers = new Array();
		var highers = new Array();
		var inters = new Array();
		while ( p.distribution[0] ) {
			var l = p.distribution.shift();
			if ( l.layer == FigisMap.fifao.spd && p.context == 'FIRMS' ) {
				lowers.push( l );
			} else if ( l.layer == FigisMap.fifao.rfb && dtype[ FigisMap.fifao.div ] ) {
				lowers.push( l );
			} else if ( l.layer == FigisMap.fifao.cbs ) {
				highers.push( l );
			} else if ( l.layer == FigisMap.fifao.cmp ) {
				highers.push( l );
			} else {
				inters.push( l );
			}
		}
		p.distribution = highers.concat( inters, lowers );
		p.distribution.reverse();
	}
};


/**
 * --------------------------------------------------------------------------------------
 * FigisMap RFB specific methods
 * --------------------------------------------------------------------------------------
 */

/**
 * FigisMap.rfb.list
 * 
 */
FigisMap.rfb.list = function() {
	var ans = new Array();
	if ( FigisMap.rfbLayerSettings ) for ( var i in FigisMap.rfbLayerSettings ) if ( ! FigisMap.rfbLayerSettings[i].skip ) ans.push( i );
	return ans;
};

/**
 * FigisMap.rfb.getSettings
 * @param rfb
 * @param pars
 * 
 */
FigisMap.rfb.getSettings = function( rfb, pars ) {
	if ( pars && ! ( pars.isViewer || pars.rfb )  ) return null;
	var v = FigisMap.rfbLayerSettings[ rfb ];
	if ( ! v ) return null;
	if ( v.centerCoords ) v.centerCoords = FigisMap.rfb.evalOL( v.centerCoords );
	if ( v.zoomExtent ) v.zoomExtent = FigisMap.rfb.evalOL( v.zoomExtent );
	v.name = rfb;
	return v;
};

/**
 * FigisMap.rfb.evalOL
 * Supports string values for both OL2 and OL3 Bounds/LonLat syntax
 * @param value
 * @returns parsed value
 */
FigisMap.rfb.evalOL = function( str ) {
	if ( (typeof str)=='string' ) {
		if ( str.indexOf(' OpenLayers.') > 0 ) str = str.replace(/^.+\((.+)\).*$/,"$1");
		str = str.replace(/[^0-9,.+-]/g,'');
		if ( str === '' ) return null;
		str = eval( '[' + str + ']' );
	}
	return str;
};

/**
 * FigisMap.rfb.getDescriptor
 * @param layerName
 * @param pars
 * 
 */
FigisMap.rfb.getDescriptor = function( layerName, pars ) {
	if ( ! FigisMap.rfbLayerDescriptors ) return '';
	var ldn = layerName.replace(/[' ]/g,'');
	var ld = FigisMap.rfbLayerDescriptors[ldn];
	if ( ! ld ) return '';
	if ( typeof ld == 'string' ) return ld;
	var title = ld.label ? FigisMap.label( ld.label, pars ) : ld.title;
	if ( ld.link ) return '<a href="' + ld.link + '" title="' + title + '" target="_blank"><b>' + title + '</b></a>';
	if ( title ) return '<b>'+ title + '</b>';
	return '';
}

/**
 * FigisMap.rfb.getCountries
 * @param layerName
 * 
 */
FigisMap.rfb.getCountries = function( layerName ) {
	if ( ! FigisMap.rfbLayerCountries ) return null;
	layerName = layerName.replace(/[' ]/g,'').toUpperCase();
	if ( layerName.indexOf("_DEP") > 0) layerName = layerName.replace(/_DEP$/,'');
	return FigisMap.rfbLayerCountries[ layerName ];
}

/**
 * FigisMap.rfb.preparse
 * @param pars
 */
FigisMap.rfb.preparse = function( pars ) {
	if ( pars.rfbPreparsed || pars.rfb == null ) return false;
	pars.distribution = FigisMap.parser.layers( pars.distribution );
	if ( ! pars.distribution ) pars.distribution = new Array();
	var sett = FigisMap.rfb.getSettings( pars.rfb );
	if ( sett ) {
		var type = new Object();
		if ( ! sett.type ) sett.type = 'MI';
		type.m = ( sett.type.toLowerCase().indexOf('m') != -1 );
		type.i = ( sett.type.toLowerCase().indexOf('i') != -1 );
		type.r = ( sett.type.toLowerCase().indexOf('r') != -1 );
		type.a = ( sett.type.toLowerCase().indexOf('a') != -1 );
		var title = FigisMap.getStyleRuleDescription( sett.style, pars );
		var baseTitle = FigisMap.label('Area of competence', pars );
		var skipTitle = ( title == '' );
		if ( type.m ) {
			var ttitle = skipTitle ? baseTitle : title;
			if ( type.i ) ttitle += ' ' + FigisMap.label('(marine)', pars);
			pars.distribution.push( { rfb: pars.rfb, settings: sett, layer: FigisMap.fifao.RFB,
				filter: "RFB = '" + pars.rfb + "' AND DISPORDER = '1'",
				dispOrder : 1,
				style: sett.style,
				hideInSwitcher: false,
				showLegendGraphic:false,
				overlayGroup: FigisMap.ol.getDefaultOverlayGroup(pars),
				title: ttitle,
				skipTitle: skipTitle
			} );
		}
		if ( type.i ) {
			var ttitle = skipTitle ? baseTitle : title;
			if ( type.m ) ttitle += ' ' + FigisMap.label('(inland)', pars);
			pars.distribution.push( { rfb: pars.rfb, settings: sett, layer: FigisMap.fifao.RFB,
				filter: "RFB = '" + pars.rfb + "' AND DISPORDER = '2'",
				dispOrder : 2,
				style: sett.style,
				hideInSwitcher: false,
				showLegendGraphic:false,
				overlayGroup: FigisMap.ol.getDefaultOverlayGroup(pars),
				title: ttitle,
				skipTitle: skipTitle
			} );
		}
		if ( type.r ) {
			var ttitle = FigisMap.label('Regulatory area', pars );;
			pars.distribution.push( { rfb: pars.rfb, settings: sett, layer: FigisMap.fifao.RFB,
				filter: "RFB = '" + pars.rfb + "' AND DISPORDER = '2'",
				dispOrder : 2,
				style: sett.style,
				hideInSwitcher: false,
				showLegendGraphic:false,
				overlayGroup: FigisMap.ol.getDefaultOverlayGroup(pars),
				title: ttitle,
				skipLegend: true
			} );
		}
		if ( type.a ) {
			var ttitle = FigisMap.label('Established limits of the area of competence', pars );;
			pars.distribution.push( { rfb: pars.rfb, settings: sett, layer: FigisMap.fifao.RFB,
				filter: "RFB = '" + pars.rfb + "_DEP'",
				style: '',
				hideInSwitcher: false,
				showLegendGraphic:false,
				overlayGroup: FigisMap.ol.getDefaultOverlayGroup(pars),
				title: ttitle,
				skipLegend: true
			} );
		}
		if ( pars.attribution == null ) pars.attribution = FigisMap.rfb.getDescriptor( pars.rfb, pars );
		if ( ! pars.projection ) pars.projection =  sett.srs ? sett.srs : FigisMap.defaults.projection(pars);
		if ( pars.global == null && sett.globalZoom != null ) pars.global = sett.globalZoom;
		if ( pars.extent == null ) {
			if ( sett.zoomExtent ) pars.extent = sett.zoomExtent;
			if ( sett.zoomLevel ) pars.zoom = sett.zoomLevel;
			if ( sett.centerCoords ) pars.center = sett.centerCoords;
			if ( ! pars.dataProj ) pars.dataProj =  sett.srs ? sett.srs : FigisMap.defaults.projection(pars);
		} else {
			if ( ! pars.dataProj ) pars.dataProj =  pars.projection;
			if ( pars.center == null ) pars.center = false;
		}
	}
	if ( ! pars.mapSize ) pars.mapSize = 'L';
	if ( pars.landMask == null ) pars.landMask = true;
	return ( pars.rfbPreparsed = true );
};



/**
 * --------------------------------------------------------------------------------------
 * FigisMap Rendering methods
 * --------------------------------------------------------------------------------------
 */

/**
 * FigisMap.rnd.maxResolution
 * @param proj
 * @param pars
 * 
 */
FigisMap.rnd.maxResolution = function( proj, pars ) {
	proj = parseInt( proj );
	var size = String(pars.mapSize).toUpperCase();
	switch ( size ) {
		case 'XS': break; // width = 280
		case 'S' : break; // width = 400
		case 'M' : break; // width = 640
		case 'L' : break; // width = 810
		default  : size = FigisMap.defaults.mapSize;
	}
	var base, offset;
	if ( proj == 3031 ) {
		base = 48828.125;
		switch ( size ) {
			case 'XS'	: return base * 4; break;
			case 'S'	: return base * 2; break;
			case 'M'	: return base * 2; break;
			case 'L'	: return base;  break;
		}
	} else if ( proj == 900913 ) {
		base = 156543.03390625;
		switch ( size ) {
			case 'XS'	: return base; break;
			case 'S'	: return base / 2; break;
			case 'M'	: return base / 2; break;
			case 'L'	: return base / 4; break;
		}
	} else if (proj == 54009){
		//mollweide
		base = 281876.4952525812;
		switch ( size ) {
			case 'XS'	: return base; break;
			case 'S'	: return base / 2; break;
			case 'M'	: return base / 2; break;
			case 'L'	: return base / 8; break; //original value "return base / 4". adapted for figis-vme
		}
	} else {
// 		base = 0.703125;
// 		offset = 0.1171875;
// 		switch ( size ) {
// 			case 'S'	: return ( base /2 + offset) * 2; break;
// 			case 'M'	: return base /2 + offset; break;
// 			case 'L'	: return base /2 + offset; break;
// 		}
		base = 1.40625;
		switch ( size ) {
			case 'XS'	: return base; break;
			case 'S'	: return base /2; break;
			case 'M'	: return base /4; break;
			case 'L'	: return base /4; break;
		}
	}
};

/**
 * FigisMap.rnd.watermarkControl
 * @param map
 * @param pars
 * 
 */
FigisMap.rnd.watermarkControl = function( map, pars ) {
	if ( ! pars.watermark ) return;
	
	//create base attribution for handling the watermark
	var baseAttribution = new ol.control.Attribution({
		className: 'ol-attribution-map',
		collapsible: false
	});
	map.addControl(baseAttribution);
	
	//generate html for watermark
	var mapsize = map.getSize();
	var poweredByHtml = '<img' +
		( pars.watermark.src ? ' src="' + pars.watermark.src + '"' : '' ) +
		( pars.watermark.width ? ' width="' + pars.watermark.width + '"' : '' ) +
		( pars.watermark.height ? ' height="' + pars.watermark.height + '"' : '' ) +
		( pars.watermark.wclass ? ' class="' + pars.watermark.wclass + '"' : '' ) +
		( pars.watermark.id ? ' id="' + pars.watermark.id + '"' : '' ) +
		( pars.watermark.title ? ' title="' + pars.watermark.title + '"' : '' ) +
		'/>';
	
	//manage the display of watermark (logo)
	var attMaps = map.getTargetElement().getElementsByClassName("ol-attribution-map");
	if( attMaps.length > 0) attMaps[0].getElementsByTagName("li")[0].innerHTML = poweredByHtml;
	
	//hack to remove the baselayer attribution that for some reason is also added to the ol-attribution-map
	//while explicitely referenced on ol-attribution-baselayer (to investigate if there is a cleaner solution)
	map.on('postrender', function() {
		var attMaps = this.getTargetElement().getElementsByClassName("ol-attribution-map");
		if( attMaps.length > 0){
			var attLis = attMaps[0].getElementsByTagName("li");
			if( attLis.length > 1) attLis[1].remove();
		}
	});
	
};

/**
 * FigisMap.rnd.mouseControl
 * @param map
 * @param pars
 * 
 */
FigisMap.rnd.mouseControl = function( map, pars ) {

	var mouseControl = new ol.control.MousePosition({
		coordinateFormat: function(coord){
			return 'lon: '+coord[0].toFixed(2)+', lat: '+coord[1].toFixed(2);
		},
		projection: new ol.proj.get('EPSG:4326')
	});
	map.addControl(mouseControl);
};

/**
 * FigisMap.rnd.initLayers
 * @param pars
 * 
 */
FigisMap.rnd.initLayers = function( pars ) {
	var input = new Array();
	var output = new Array();
	if ( pars.associated ) input = input.concat( pars.associated );
	if ( pars.intersecting ) input = input.concat( pars.intersecting );
	if ( pars.distribution ) input = input.concat( pars.distribution );
	for ( var i = 0; i < input.length; i++ ) {
		var l = input[i];
		if ( l.layer != '' && l.filter != '' ) {
			var nl = new Object();
			for ( var j in l ) nl[j] = l[j];
			if ( nl.rfb && nl.rfb != '' && ! nl.settings ) nl.settings = FigisMap.rfb.getSettings( nl.rfb )
			if ( nl.dispOrder == null && nl.filter.toLowerCase().indexOf("disporder") != -1 ) {
				nl.dispOrder = parseInt( l.filter.replace(/^.*DispOrder[^0-9]+([0-9]+).*$/i,"$1") );
				if ( isNaN( nl.dispOrder ) ) nl.dispOrder = false;
			}
			output.push( nl );
		}
	}
	return output;
};

/**
 * FigisMap.rnd.addAutoLayers
 * @param layers
 * @param pars
 * 
 */
FigisMap.rnd.addAutoLayers = function( layers, pars ) {
	var layerTypes = new Object();
	for ( var i = 0; i < layers.length; i++ ) layerTypes[ layers[i].layer ] = true;
	
	
	var overlayGroup = FigisMap.ol.getDefaultOverlayGroup(pars);
	
	//add default auto layers if pars.basicLayers = true
	//---------------------------------------------------
	if ( pars.basicsLayers ) {

		var hideBasicLayers = (pars.options.hideBasicLayers)? pars.options.hideBasicLayers : false;
	
		//WMS 200 nautical miles arcs
		if ( ! layerTypes[ FigisMap.fifao.nma ] && ! pars.options.skipNauticalMiles ) {
			layers.unshift({ //TODO check why Unshift
				layer	: FigisMap.fifao.nma,
				label	: '200 nautical miles arcs',
				overlayGroup: overlayGroup,
				filter	:'*',
				opacity	: 0.3,
				hidden	: ( pars.isFIGIS && ! pars.rfb && ! (pars.context == 'FI-facp') ) || hideBasicLayers,
				type	: 'auto',
				skipLegend	: false,
				hideInSwitcher	: false,
				showLegendGraphic: true
			});
		}
		//WMS FAO Areas
		if ( pars.projection != 3031 ) if ( ! pars.options.skipFishingAreas ) if ( ! ( layerTypes[ FigisMap.fifao.ma2 ] || layerTypes[ FigisMap.fifao.maj ] ) ) {
			layers.unshift( { //TODO check why Unshift
				layer	: FigisMap.fifao.maj,
				label	: 'FAO fishing areas',
				overlayGroup: overlayGroup,
				filter	:'*',
				type	:'auto',
				skipLegend	: false,
				hidden: hideBasicLayers,
				hideInSwitcher	: false,
				showLegendGraphic: true
			} );
		}
	}

	//continent land mask
	//-------------------
	if ( pars.landMask && ! layerTypes[ FigisMap.fifao.cnt ] && ! layerTypes[ FigisMap.fifao.CNT ] ) {
		layers.push( {
			layer		: FigisMap.fifao[ pars.options.colors ? 'CNT' : 'cnt' ], //FigisMap.fifao.cnt,
			overlayGroup: overlayGroup,
			cached		: true,
			filter		: '*',
			type		: 'auto',
			style		: '*',
			skipLegend	: true,
			isMask	: true,
			hideInSwitcher	: true,
			showLegendGraphic:false
		} );
	}

	//marine labels
	//-------------
	if ( pars.basicsLayers ) {	
		// marine areas
		layers.push( {
			layer		: FigisMap.fifao.lab,
			label	: 'Oceans and sea names',
			overlayGroup: overlayGroup,
			cached		: true,
			filter		: '*',
			type		: 'auto',
			style		: 'MarineAreasLabelled',
			skipLegend	: true,
			hideInSwitcher	: false,
			showLegendGraphic: false
		} );
	}

	
	//add contextual layers if pars.contextLayers = true
	//---------------------------------------------------
	if( pars.contextLayers ) {
		for( var i = 0; i < pars.contextLayers.length; i++) {
			var contextLayer = pars.contextLayers[i];
			if(! layerTypes[contextLayer.layer] ){
				contextLayer.type = 'auto';
				contextLayer.overlayGroup = (contextLayer.overlayGroup)? contextLayer.overlayGroup : overlayGroup;
				layers.push(contextLayer);
			}
		}
	}
	
	return layers;
};

/**
 * FigisMap.rnd.addGraticule
 * An function to configure a graticule (based on OpenLayers 3 API, which sligthly
 * differs from OpenLayers 2, in the sense the graticule is not anymore a vecto layer,
 * this means the graticule is drawn each time the map is recomposed, on top of all
 * layers)
 * 
 * UNDER INVESTIGATION
 *
 * @param {ol.Map} the current map
 */
FigisMap.rnd.addGraticule = function(map) {

	var lonFormatter = function(lon) {
		var formattedLon = Math.abs(Math.round(lon * 100) / 100);
  		formattedLon += "°00'";
  		formattedLon += (lon < 0) ? 'W' : ((lon > 0) ? 'E' : '');
  	return formattedLon;
	};

	var latFormatter = function(lat) {
  		var formattedLat = Math.abs(Math.round(lat * 100) / 100);
  		formattedLat += "°00'";
  		formattedLat += (lat < 0) ? 'S' : ((lat > 0) ? 'N' : '');
  		return formattedLat;
	};

	var graticule = new ol.Graticule({
		strokeStyle: new ol.style.Stroke({
			color: 'rgba(51,51,51,0.5)',
			width: 1,
			opacity: 0.5
		}),
  		lonLabelStyle: new ol.style.Text({
    			font: '10px Verdana',
    			fill: new ol.style.Fill({
      				color: 'rgba(0,0,0,1)'
    			})
  		}),
  		latLabelStyle: new ol.style.Text({
    			font: '10px Verdana',
			offsetX: -2,
    			textBaseline: 'bottom',
    			fill: new ol.style.Fill({
      				color: 'rgba(0,0,0,1)'
    			})
  		}),
  		showLabels: true,
  		lonLabelFormatter: lonFormatter,
  		latLabelFormatter: latFormatter,
	});
	graticule.setMap(map);
};

/**
 * FigisMap.rnd.sort4map
 * @param layers
 * @param p
 * 
 */
FigisMap.rnd.sort4map = function( layers, p ) {
	var normalLayers = new Array();
	var topLayers = new Array();
	var higherLayers = new Array();
	var frontLayers = new Array();
	var countryLayers = new Array();
	
	for (var i = 0; i < layers.length; ++i) {
		var l = layers[i];
		if (l.isMask && p.options.baseMask){
			normalLayers.push( l );
		}
		if ( l.layer == FigisMap.fifao.cbs ) {
			countryLayers.push( l );
		} else if ( l.layer ==  FigisMap.fifao.lab ) {
			if(p.options.baseMarineLabels){
				normalLayers.push( l);
			}else{
				topLayers.push( l );
			}
		} else if ( l.layer ==  FigisMap.fifao.cmp ) {
			topLayers.push( l );
		} else if ( l.dispOrder && l.dispOrder > 1 ) {
			if ( l.settings && ! l.settings.isMasked ) {
				frontLayers.push( l );
			} else {
				higherLayers.push( l );
			}
		} else {
			normalLayers.push( l );
		}
	}
	return normalLayers.concat( higherLayers, frontLayers, countryLayers, topLayers );
};


/**
 * FigisMap.rnd.sort4legend
 * @param layers
 * @param p
 * 
 */
FigisMap.rnd.sort4legend = function( layers, p ) {
	var ans = new Array();
	var ord = [
		{ type:'distribution', label:'Main layers' },
		{ type:'associated', label:'Associated layers' },
		{ type:'intersecting', label:'Intersecting layers' },
		{ type:'auto', label:'Base layers' }
	];
	for ( var i = 0; i < ord.length; i++ ) {
		var div = new Array();
		for ( var j = 0; j < layers.length; j++ )  if ( ! layers[j].skipLegend ) if ( layers[j].type == ord[i].type ) div.push( layers[j] );
		if ( div.length != 0 ) {
			ans.push( { division: ord[i].type, start: true, label: ord[i].label } );
			ans = ans.concat( div );
			ans.push( { division: ord[i].type, end: true, label: ord[i].label } );
		}
	}
	return ans;
};

/**
 * FigisMap.rnd.legend
 * @param layers
 * @param pars
 * 
 */
FigisMap.rnd.legend = function( layers, pars ) {
	if ( pars.legend.div ) pars.legend.div.innerHTML = FigisMap.rnd.mainLegend( layers, pars );
	if ( pars.countriesLegend.div ) pars.countriesLegend.div.innerHTML = FigisMap.rnd.countriesLegend( pars );
};

/**
 * FigisMap.rnd.mainLegend
 * @param layers
 * @param pars
 * 
 */
FigisMap.rnd.mainLegend = function( layers, pars ) {
	var LegendHTML = "";
	var hasFaoAreas = false;
	var legendDispLayers = new Object();
	var useTables = ( pars.legendType.indexOf('T') != -1 );
	var useSections = ( pars.legendType.indexOf('P') < 0 );
	var llayers = FigisMap.rnd.sort4legend( layers, pars );
	if ( useTables && ! useSections ) LegendHTML += '<table cellpadding="0" cellspacing="0" border="0">';
	
	//add basic legend for vector layer (if existing)
	//warning: for now not supported when useSections = true
	if( pars.vectorLayer ) LegendHTML += FigisMap.rnd.addVectorLayerLegend(pars.vectorLayer);
	
	for (var i = 0; i < llayers.length; i++) {
		var l = llayers[ i ];
		if ( useSections && l.division ) {
			if ( l.start ) {
				LegendHTML += '<div class="legendSection legendSection-' + l.type + '">' +
					'<div class="legendSectionTitle">' + FigisMap.label( l.label, pars ) + '</div>' +
					'<div class="legendSectionContent">';
				if ( useTables ) LegendHTML += '<table cellpadding="0" cellspacing="0" border="0">';
			} else if ( l.end ) {
				if ( useTables ) LegendHTML += '</table>';
				LegendHTML += '</div></div>';
			}
		}
		if ( ! l.layer || ! l.inMap || l.skipLegend ) continue;
		var wms_name = "";
		if ( l.type != 'intersecting' && l.type != 'auto' && FigisMap.isFaoArea( l.layer ) ) {
			if ( hasFaoAreas ) continue;
			wms_name = FigisMap.label( 'All FAO areas', pars );
			hasFaoAreas = true;
		}
		var STYLE = ( l.style && l.style != '*' ) ? l.style : null;
		
		if ( wms_name == '' && ! l.skipTitle ) wms_name = l.title != null ? l.title : l.wms.name;
		if ( l.dispOrder ) {
			var k = l.layer + '-' + ( STYLE ? STYLE.replace(/^(rfb|rfmo)_.*$/,"*") : '*' );
			if ( legendDispLayers[ k ] ) continue;
			wms_name = wms_name.replace(/ \([^\)]+\).*$/,'');
			legendDispLayers[ k ] = true;
		}
		if ( ! l.icon ) {
			if ( ! l.iconSrc ) l.iconSrc = FigisMap.rnd.vars.Legend_Base_Request + "&LAYER=" + l.wms.getSource().getParams().LAYERS + "&STYLE=" + (STYLE != null ? STYLE : "");
			l.icon = '<img src="' + l.iconSrc +'"' + ( l.iconWidth ? ' width="' + l.iconWidth + '"' : '' ) + ( l.iconHeight ? ' height="' + l.iconHeight + '"' : '') + '/>';
		}
		if ( useTables ) {
			if( l.layer == FigisMap.fifao.spd ) {
				LegendHTML += '<tr><td colspan="2"><b>' + wms_name + '</b></td></tr>';
				LegendHTML += '<tr><td colspan="2">' + l.icon + '</td></tr>';
			} else if ( l.skipTitle || wms_name == '' ) {
				LegendHTML += '<tr><td colspan="2">' + l.icon + '</td></tr>';
			} else {
				LegendHTML += '<tr><td>' + l.icon + '</td><td><span>' + wms_name + '</span></td></tr>';
			}
		} else {
			if( l.layer == FigisMap.fifao.spd ) {
				LegendHTML += '<div><b>'+wms_name+'</b></div>';
				LegendHTML += '<div>' + l.icon + '</div></div> ';
			} else {
				LegendHTML += '<div>' + l.icon;
				if ( wms_name != '' && ! l.skipTitle ) LegendHTML += '<span>' + wms_name + '</span>';
				LegendHTML += '</div> ';
			}
		}
		l.inLegend = true;
	}
	if ( useTables && ! useSections ) LegendHTML += '</table>';
	return LegendHTML;
};


/**
 * FigisMap.rnd.countriesLegend
 * @param pars
 * 
 */
FigisMap.rnd.countriesLegend = function( pars ) {
	var ans = '';
	var cList = pars.countries;
	var layerName = pars.rfb && pars.rfb != '' ? pars.rfb : false;
	if ( ! cList && layerName ) cList = FigisMap.rfb.getCountries( layerName );
	if ( cList != undefined && cList.length > 0 ) {
		var cLabels = new Array();
		var c, prefix;
		for (var i = 0; i < cList.length; i++) {
			c = cList[i];
			switch ( c.length ) {
				case 3	: prefix = 'COUNTRY_ISO3_'; break;
				case 2	: prefix = 'COUNTRY_ISO2_'; break;
				default	: prefix = 'COUNTRY_';
			}
			var label = FigisMap.label( prefix + c, pars );
			if ( label.indexOf( prefix ) != 0 ) cLabels.push( label );
		}
		cLabels.sort();
		for ( var i = 0; i < cLabels.length; i++ ) ans += '<div>' + cLabels[i] + '</div>';
	}
	if ( layerName ) {
		var noteLabel = FigisMap.label('LEGEND_NOTE_' + layerName, pars );
		if ( noteLabel.indexOf('LEGEND_NOTE_') != 0 ) ans += '<div>' + noteLabel + '</div>';
	}
	return ans;
};

/**
 * FigisMap.getStyleRuleDescription
 * @param SYTLE
 * @param pars
 * 
 */
FigisMap.getStyleRuleDescription = function(STYLE, pars) {
	/**
	* Available Styles:
	* 3.  rfb_inland_noborder
	* 9.  rfb_marine_noborder
	* 15. rfb_unspecified_noborder 
	**/
	var l = FigisMap.label( STYLE, pars );
// 	if ( pars.isFIGIS ) l = l.replace(/&nbsp;/g,' ');
	if ( l == STYLE ) return '';
	return l;
}

/*
	Drawing function: FigisMap.draw( pars );
		pars --> map parameters, an object with properties:
			
			target		: (String or reference to HTML node) the DIV where the map will be actually stored.
			context		: (String) the name of actual map context, sometimes used for defaults (Optional, defaults to 'default')
			contextLayers : (Array) a list of context layer definitions to add as autolayers
			base		: (boolean (false) String | Object | Array) The base layer, has default (optional)
			distribution	: A "layer list" property, see below.
			intersecting	: A "layer list" property, see below.
			associated	: A "layer list" property, see below.
			projection	: (Integer/string) The projection of the map (optiona, defaults to 4326).
			dataProj	: (Integer/string) The projection used for source data (optional, defaults to 4326).
			rfb		: (String) name of RFB to be included (optional)
			countries	: (Array) An array of ISO3 country codes, automatic country_bounds is built in associated (optional, if pars.rfb defaults to RFB settings)
			legend		: (String or HTML node) the id of the legend DIV or a reference to the DIV (optional).
			legendType	: (String) the type of legend on display. Optional, defaults to autodetection
						if contains 'T' legend items will be in table(s)
						if contains 'P' (plain) no legend sections will be used
			countriesLegend	: (String or HTML node) the id of the legend DIV or a reference to the DIV (optional).
			watermark	: (Object) to set the map watermark (optional, defaults to FAO logo).
			landMask	: (boolean) true if the layer must be covered by the mask. Optional, defaults true.
			global		: (boolean) true to apply a global extent. Optional, defaults false.
			basicsLayers	: (boolean) true to add the FAO basic layers in the map. Optional, defaults false.
			drawDataRect	: (boolean) to draw a data rectangle around the species layer. Optional, defaults false.
			extent		: (String) the map max extent. Optional, autoZoom on default.
			zoom		: (Number) the map initial zoom level. Optional, autoZoom on default.
			staticLabels	: (false) additional object of staticLabels to be made available to FigisMap.label function
			options		: (Object) (optional), all keys default to false:
				colors			: (boolean) use color map background
				labels			: (boolean) use labels - defaults to options.colors
				baseMarineLabels	: (boolean) display marine labels layer on top of basic auto layers (in map and layerswitcher)
				baseMask : (boolean) display continent mask just above baselayers (before any other overlay)
				hideBasicLayers : (boolean) hide the basic auto layers FAO areas and EEZ
				skipLayerSwitcher	: (boolean) omit layer switcher if true
				skipLoadingPanel	: (boolean) omit Loading panel (spinning wheel) if true
				loadingPanelOptions	: (Object) object of options passed to LoadingPanel
				layerSwitcherOptions : (Object) object of options passed to LayerSwitcher
				skipNavigation		: (boolean) omit Navigation panel (arrows) if true
				skipWatermark		: (boolean) omit Watermark if true
				skipMouse		: (boolean) omit shift-mouse drag for zoom if true
				skipScale		: (boolean) omit scale if true
		
		Returns --> a reference to the OpenLayers map object
	
	A "layer list" property can be:
		- null
		- a boolean (false) value
		- a string (name of layer)
		- a string in the old format "layername-filter/layername-filter/layername-filter"
		- an object with properties:
			- layer (string, name of intersecting layer). This is the only mandatory property.
			- filter (string or array) cql string of conditions, or a vector of "or" conditions.
			- style (string) layer style name
			- title (string) the title in legend and layer switcher, valued by layer label/name if missing
			- label (string) a Label to be used for title, with a FigisMap.label( label, pars ) multilanguage lookup
			- autoZoom (boolean) if true the map performs automatic zoom on this layer
			- skipTitle (boolean, default false) don't show title in legend, used when labels come from GeoServer
			- hidden (boolean, default false) hide in map by default
			- hideInSwitcher (boolean, default false) hide in Layer Switcher
			- showLegendGraphic (boolean, default false) show the legend graphic in the layer switcher
			- dispOrder (integer) automatically detected if in filter, also changes layer disposition
			- rfb (string) A layer representing a RFB layer, the value is the name
			- wms (OpenLayers.Layer.WMS object) Automatically valued by default
		- an array of objects as described above.
		
		Once checked, it will be an array of { 'layer': '..', 'filter': ... }
		The filter property, if missing, will be false (boolean).
		
		In case no valid layers are found, the property will be valued with false.
	
*/
FigisMap.draw = function( pars ) {
	
	if ( ! FigisMap.drawInit( pars ) ) return void(0);
	
	FigisMap.rfb.preparse( pars );
	pars = FigisMap.parser.parse( pars );
	if ( pars.parserError ) {
		alert( pars.parserError );
		return false;
	}
	
	FigisMap.lang = pars.lang;
	
	if ( FigisMap.renderedMaps[ pars.target.id ]) try {
		FigisMap.renderedMaps[ pars.target.id ].destroy();
		FigisMap.renderedMaps[ pars.target.id ] = null;
	} catch(e) {
		FigisMap.renderedMaps[ pars.target.id ] = false;
	}
	if ( pars.debug ) pars.options.debug = pars.debug;
	var rnd = new FigisMap.renderer( pars.options );
	var theMap = rnd.render( pars );
	
	FigisMap.lastMap = ( theMap && theMap.getTarget() ) ? theMap : false;
	FigisMap.renderedMaps[ pars.target.id ] = FigisMap.lastMap;

	return FigisMap.lastMap;
};


/**
 * FigisMap.renderer
 * @param options
 */
FigisMap.renderer = function(options) {
	var toBoundArray = new Array();
	var boundsArray = new Array();
	var myMap = false;
	var p = new Object();
	var debug = options ? options.debug : false;
	var myBounds, boundsOrigin, boundsBox;
	var target, projection, extent, center, zoom;
	var olLayers = new Array();
	var xmlHttp = false;
	var xmlHttpTimeout = false;
	
	//!OL2 var olImageFormat = OpenLayers.Util.alphaHack() ? "image/gif" : "image/png"; //TODO ? OL3
	
	// pink tile avoidance
	//OpenLayers.IMAGE_RELOAD_ATTEMPTS = 5; //TODO ? OL3
	//OpenLayers.DOTS_PER_INCH = 25.4 / 0.28; //TODO ? OL3
	//OpenLayers.Util.onImageLoadErrorColor = 'transparent'; //TODO ? OL3

	this.render = function( pars ) {
		
		FigisMap.debug( 'FigisMap.renderer render pars:', pars );
		//FigisMap.debug('OpenLayer Version:', OpenLayers.VERSION_NUMBER ); //TODO ? OL3
		
		projection = pars.projection;
		p = pars;
		
		if (projection == 3349) projection = 900913; // use google spherical mercator ...
		
		var mapMaxRes = FigisMap.rnd.maxResolution( projection, p );
		
		switch ( projection ) {
			case	3031 : myBounds = [-25000000, -25000000, 25000000, 25000000]; break;
			case	900913 : myBounds = [-20037508.34, -20037508.34, 20037508.34, 20037508.34]; break;
			case 	54009	: myBounds = [-18040095.6961652, -9020047.847897789, 18040095.6961652, 9020047.847897789]; break;
			default     : projection = 4326; myBounds =  [-180, -90, 180, 90];
		}
		boundsOrigin = [myBounds[0], myBounds[1]];
		boundsBox =  myBounds;
		
		// empty map DIV - the map, if any, is destroyed before calling
		while ( p.target.div.firstChild ) { p.target.div.removeChild(p.target.div.firstChild) }
		
		target = p.target.id;
		
		var myMapControls = undefined;
		if (pars.options.skipLayerSwitcher) myMapControls = [];
		if (pars.options.skipLoadingPanel) myMapControls = [];
		if (pars.options.skipNavigation) myMapControls = [];

		//manage base layers
		//------------------
		//baselayer
		var baselayerList = new Array();
		
		if(projection == 4326 || projection == 900913){
			for(var i=0;i<p.base.length;i++){
				baselayerList.push(FigisMap.ol.configureBaseLayer(p.base[i], boundsOrigin));
			}
		}else{
			baselayerList.push(FigisMap.ol.configureBaseLayer(p.defaultBase, boundsOrigin));
		}
		//baselayer group
		var baselayers = new ol.layer.Group({
			'title': FigisMap.ol.baselayersLabel + ((baselayerList.length > 1)? "s" : ""),
			layers: baselayerList,
		});
		
		//manage overlays
		//---------------
		//overlays group(s)	
		var overlays = new Array();
		var defaultOverlay = new ol.layer.Group({
				'title': FigisMap.ol.overlaysLabel,
				layers: [ ],
			});
		if(pars.options){
			if(pars.options.layerSwitcherOptions){
				if(pars.options.layerSwitcherOptions.overlayGroups){
					if(pars.options.layerSwitcherOptions.overlayGroups.length > 0){
						for(var i=0;i<pars.options.layerSwitcherOptions.overlayGroups.length;i++){
							var overlay = new ol.layer.Group({
								'title': pars.options.layerSwitcherOptions.overlayGroups[i].name,
								layers: [ ],
							});
							overlay.infoUrl = pars.options.layerSwitcherOptions.overlayGroups[i].infoUrl;
							overlays.push( overlay );
						}
					}else{
						console.warn("Invalid overlayGroups object. Must be an array of group names");
					}
				}else{
					overlays.push( defaultOverlay );
				}
			}else{
				overlays.push( defaultOverlay );
			}
		}else{
			overlays.push( defaultOverlay );
		}
		
		
		//Map widget
		//----------
		var viewProj = new ol.proj.get('EPSG:' + projection);
		if(projection != 3031) viewProj.setGlobal(true); //in case, to properly wrap the date line (when wrapX is true)
		viewProj.setExtent(myBounds);
		
		myMap = new ol.Map({
			target : p.target.id,
			layers: [baselayers].concat(overlays),
			view : new ol.View({
				projection : viewProj,
				center : ol.extent.getCenter(boundsBox),
				extent: boundsBox,
				zoom : 0,
				minZoom: 0,
				zoomFactor: 2, //(projection == 4326 && ! p.isFIGIS ) ? 3 : 2,
				maxResolution : mapMaxRes
			}),
			controls: [],
			logo: false
		});
		if ( ! myMap.zoomToExtent ) myMap.zoomToExtent = function( boundsArray, validateExtent ) {  return FigisMap.ol.zoomToExtent( this, boundsArray, validateExtent) };
		if ( ! myMap.zoomToMaxExtent ) myMap.zoomToMaxExtent = function() {  return FigisMap.ol.zoomToExtent( this, false, true ) };
		if ( ! myMap.optimizeCenter ) myMap.optimizeCenter = function( boundsArray, projsToExclude, force) { return FigisMap.ol.optimizeCenter( this, boundsArray, projsToExclude, force) };
		
		// Managing OL controls
		//---------------------
		//default controls (explicitly added for information and possible customization with options)
		if ( ! pars.options.skipLoadingPanel ) myMap.addControl( new ol.control.LoadingPanel( pars.options.loadingPanelOptions ? pars.options.loadingPanelOptions : null ) );
		if ( ! pars.options.skipNavigation ) {
			myMap.addControl( new ol.control.Zoom() );
			myMap.addControl( new ol.control.ZoomToMaxExtent({ extent: boundsBox, zoom: 0 } ));
		}
// 		myMap.addControl( new ol.control.ZoomToMaxExtent({ extent: boundsBox, zoom: ((p.isFIGIS)? 0 : myMap.getView().getZoom())}) );
		myMap.addControl( new ol.control.Rotate() );
		myMap.addControl( new ol.control.Attribution({collapsible : false, className : 'ol-attribution-baselayer'}) );
		
		//optional controls
		if (! pars.options.skipLayerSwitcher ) myMap.addControl( new ol.control.LayerSwitcher( pars.options.layerSwitcherOptions ? pars.options.layerSwitcherOptions : null ) );
		if (! pars.options.skipWatermark ) FigisMap.rnd.watermarkControl( myMap, p );
		if (! pars.options.skipMouse ) FigisMap.rnd.mouseControl( myMap, p );
		if ( ! pars.options.skipScale ) if (projection != 3031) {
			myMap.addControl( new ol.control.ScaleLine({className: 'ol-scale-line-metric', units: 'metric', maxWidth: 180}) );
			myMap.addControl( new ol.control.ScaleLine({className: 'ol-scale-line-nautical', units: 'nautical', maxWidth: 180}) );
		}
		
		//Managing graticule
		//------------------	
		if ( projection == 4326 && !!p.isVME ){
			FigisMap.rnd.addGraticule(myMap);
		}
		
		//Managing layers 
		//---------------
		var layers = FigisMap.rnd.addAutoLayers( FigisMap.rnd.initLayers( p ), p );
		for ( var i = 0; i < layers.length; i++ ) {
			var l = layers[i];
			
			// check title and lsTitle (layer switcher title)
			if ( ! l.title ) l.title = FigisMap.label( l.label ? l.label : l.layer.replace(/^[^:]+:/,''), p);
			if ( ! l.lsTitle ) l.lsTitle = l.title;
			
			// determine source of the layer
			if ( (!! l.filter)  && ( l.filter != '*' ) ) {
				l.cached = false;
			} else {
				switch ( l.layer ) {
					case FigisMap.fifao.cnt : l.cached = true; break;
					case FigisMap.fifao.CNT : l.cached = true; break;
					case FigisMap.fifao.ma2 : l.cached = true; break;
					case FigisMap.fifao.nma : l.cached = true; break;
					default : l.cached = false;
				}
			}
			
			// Add wms to layers missing it
			if ( ! l.wms ) l.wms = FigisMap.ol.configureOverlayLayer(l, boundsOrigin);
		}
		
		layers = FigisMap.rnd.sort4map( layers, p );
		
		// FILLING THE MAP
		for (var i = 0; i < layers.length; i++) {
			var l = layers[i];
			if ( l.inMap ) continue;
			if ( ! l.wms ) continue;
			
			olLayers.push( l.wms );
			l.inMap = true;
		}
		FigisMap.debug( 'FigisMap.renderer layers array, after filling map:', layers );
		
		// handlig the zoom/center/extent
		if ( p.global ) {
			myMap.zoomToMaxExtent();
			FigisMap.debug('Render for p.global');
				
		} else if ( p.extent || p.center || p.zoom ) {

			if(p.extent){
				myMap.zoomToExtent(FigisMap.ol.reBound(p.dataProj, projection, p.extent), true);
			}else{
				myMap.zoomToMaxExtent();
			}
			
			if( p.zoom ) myMap.getView().setZoom(p.zoom);
			
			if ( p.center ) myMap.getView().setCenter( FigisMap.ol.reCenter( p.dataProj, projection, p.center) );
			
			FigisMap.debug('Render for Extent', p.extent, 'zoomLevel', p.zoom, 'Center', p.center );

		} else {
			autoZoom( layers );
		}
		
		//Finalize Mapsingle call introduced by @eblondel 06/11/2015
		//removed finalizeMap function to easy call of overlays
		FigisMap.debug('Finalizing map:', myMap, 'olLayers:',olLayers);
		myMap.updateSize();
		for(var i = 0; i < overlays.length;i++){ //manage multiple groups
			var group = overlays[i];
			for (var j = 0; j < olLayers.length; j++) {
				var layer = olLayers[j];
				if(group.get('title') === layer.overlayGroup.name){
					overlays[i].getLayers().push(layer);
				}
			}
		}
		
		//Add eventual vector layer
		if( pars.vectorLayer ) {
			FigisMap.debug('FigisMap - vector layer', pars.vectorLayer);
			pars.vectorLayer.overlayGroup = FigisMap.ol.getDefaultOverlayGroup(pars);
			for(var i = 0;i < overlays.length;i++){
				if(group.get('title') === pars.vectorLayer.overlayGroup.name){
					FigisMap.rnd.addVectorLayer(myMap, overlays[i], pars.vectorLayer);
					break;
				}
			}
		}
		
		//Testing popup & tooltip
		if( pars.popups ) {			

			for(var i = 0;i<pars.popups.length;i++){
				var popupConfig = pars.popups[i];
				if(popupConfig.strategy){
					switch(popupConfig.strategy){
						case "getfeature":
							popupConfig.id = pars.vectorLayer.id;
							FigisMap.rnd.configurePopup(myMap, popupConfig);
							break;
						case "getfeature-tooltip":
							popupConfig.id = pars.vectorLayer.id+'-tooltip';
							FigisMap.rnd.configureTooltipPopup(myMap, popupConfig);
							break;
						case "getfeatureinfo":
							if(typeof popupConfig.multiple == "undefined") popupConfig.multiple = false;
							FigisMap.rnd.configurePopup(myMap, popupConfig);
							break;
					}
				}else{
					alert("Invalid popup. Missing 'strategy' property.");
				}
		
			}
				
		}

		
		// BUILDING THE LEGEND
		FigisMap.rnd.legend( layers, p );
		
		FigisMap.debug('myMap:', myMap );
		return myMap;
		
	} //function ends
	
	function autoZoom( layers ) {
		FigisMap.debug('Check autoZoom on:', layers, 'toBoundArray:', toBoundArray);
		for (var i = 0; i < layers.length; i++) {
			var l = layers[i];
			if ( l.autoZoom ) {
				var url = FigisMap.rnd.vars.wfs + l.layer;
				if ( l.filter != "*" ) {
// 					var flt = String( l.filter );
// 					flt = '&cql_filter=' + escape('(' + flt + ')');
// 					flt = '&cql_filter=(' + flt.replace(/ /g,'%20') + ')';
// 					flt += '&propertyName=' + String( l.filter ).replace(/^[^a-z0-9]*([^ =]+).*/i,"$1");
					var flt_in = String( l.filter );
					var flt = '&service=wfs';
					var flt_in = String( l.filter );
					if ( flt_in.length != 0 ) {
						flt += '&cql_filter=(' + flt_in.replace(/ /g,'%20') + ')';
						flt += '&propertyName=' + flt_in.replace(/^[^a-z0-9]*([^ =]+).*/i,"$1");
					}
					url += FigisMap.useProxy ? escape( flt ) : flt.replace(/ /g,'%20');
				}
				FigisMap.debug('autoZoom on:', l, 'url:', url );
				toBoundArray.push( url );
			}
		}
		if ( toBoundArray.length != 0 ) {
			FigisMap.debug('toBoundArray:', (new Array()).concat(toBoundArray) );
			autoZoomStep();
		} else {
			FigisMap.debug('No autozoom layers found');
			//!OL2 myMap.zoomToMaxExtent();
			//myMap.getView().fit(myMap.getView().get('extent'), myMap.getSize()); TODO OL3
		}
	}
	
	function autoZoomStep( req ) {
		if ( req  && req.status ) {
			var bounds = false;
			if ( xmlHttpTimeout ) {
				clearTimeout( xmlHttpTimeout );
				xmlHttpTimeout = false;
			}
			if (req.status == 200) {
				bounds = FigisMap.ol.gmlBbox( req.responseXML );
				FigisMap.debug( 'autoZoomStep Bounds:', bounds );
				boundsArray.push(bounds);
				xmlHttp = false;
			}
		}
		if ( toBoundArray[0] ) {
			xmlHttp = FigisMap.getXMLHttpRequest();
			var url = toBoundArray.shift();
			if ( xmlHttp ) {
				xmlHttp.onreadystatechange = function() {
					if ( xmlHttp.readyState != 4 ) return void(0);
					autoZoomStep( xmlHttp );
				};
				xmlHttp.open('GET', url, true);
				xmlHttp.send('');
				xmlHttpTimeout = setTimeout( autoZoomStepTimeout, 3000 );
			} else {
				autoZoomStep();
			}
		} else {
			autoZoomEnd();
		}
	}
	
	function autoZoomStepTimeout(){
		xmlHttp.abort();
		xmlHttp = false;
		xmlHttpTimeout = false;
		autoZoomStep();
	}
	
	function autoZoomEnd() {
		if ( myMap.getSize()[0] == 0 ) {
			var te = myMap.getTargetElement();
			myMap.setSize( [ parseInt(te.style.width.replace(/[^0-9]/g,'') ),parseInt(te.style.height.replace(/[^0-9]/g,'') )] );
		}
		var bounds, gbounds = new Array();
		for ( var i = 0; i < boundsArray.length; i++ ) if( boundsArray[i] ) gbounds.push( boundsArray[i] );
		if ( gbounds.length != 0 ) {
			bounds = gbounds[0];
			for (var i = 1; i < gbounds.length; i++) bounds = FigisMap.ol.extend( bounds, gbounds[i] );
		} else {
			//bounds = myMap.getMaxExtent(); TODO OL3
		}
		if ( bounds ) {
			
			var proj = parseInt( myMap.getView().getProjection().getCode().replace(/^EPSG:/,'') );

			/* Fix for centering limitations to circularity in OL3 with 4326 */
			if ( proj == 4326 ) {
				while ( bounds[0]>180 ) {
					bounds[0] -= 360;
					bounds[2] -= 360;
				}
				while ( bounds[2]<-180 ) {
					bounds[0] += 360;
					bounds[2] += 360;
				}
			}
			
			var nb = FigisMap.ol.reBound( p.dataProj, proj, bounds );

			// 02/02/2016 - @eblondel - reconfigure ZoomToMaxExtent control?
			// in principle, not to be applied (zoomToMaxExtent is different from reset)
			/*var controls = myMap.getControls().getArray();
			for(var i=0; i< controls.length; i++) {
				var control = controls[i];
				if(control instanceof ol.control.ZoomToMaxExtent) {
					myMap.getControls().getArray()[i].setExtent(nb);
				}
			}*/

			//zoom to extent
			myMap.zoomToExtent( nb, false );

			//apply specific center rules
			myMap.optimizeCenter(nb, [4326, 54009]);
			
			FigisMap.debug( 'FigisMap.renderer autoZoom values:', { bounds: bounds, boundsSize: ol.extent.getSize(bounds), nb: nb, nc : myMap.getView().getCenter(), mapSize: myMap.getSize() } );
		}
	}
	
	
} //FigisMap.renderer Class Ends
