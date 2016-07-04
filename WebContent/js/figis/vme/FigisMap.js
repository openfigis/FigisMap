/*
	Generalized map call facility
	Authors: M. Balestra, A. Fabiani, A. Gentile, T. Di Pisa.
	Status: Beta.
	Build: 20110310-001
*/

// if ( console == null ) var console = new Object();
// if ( ! console.log ) console.log = function(){};

var FigisMap = {
	parser		: new Object(), // parsing methods collection
	fs		: new Object(), // specific fact sheets methods collection
	rfb		: new Object(), // specific RFB methods collection
	rnd		: new Object(), // FigisMap.renderer specific collection of methods and variabes
	ol		: new Object(), // OpenLayers related utilities
	isDeveloper	: ( document.domain.indexOf( '192.168.' ) == 0 ),
	lastMap		: null,
	renderedMaps	: new Object(),
	isTesting	: ( (document.domain.indexOf('figis02')==0 ||document.domain.indexOf('193.43.36.238')==0||document.domain.indexOf('www-data.fao.org')==0) ),
	currentSiteURI	: location.href.replace(/^([^:]+:\/\/[^\/]+).*$/,"$1"),
//    proxy : '/http_proxy/proxy/?url=',
    proxy : '/figis/proxy/cgi-bin/proxy.cgi?url=',
	debugLevel	: 0 // 0|false|null: debug off, 1|true:console, 2: console + error alert
};

//layer names
FigisMap.fifao = {
	cbs : 'fifao:country_bounds',
	cnt : 'fifao:UN_CONTINENT2',
	div : 'fifao:FAO_DIV',
	//eez : 'fifao:EEZ',
	//maj : 'fifao:FAO_MAJOR', AFTER WORKSHOP
	maj : 'fifao:FAO_MAJOR_Lines',
	ma2 : 'fifao:FAO_MAJOR2',
	mal : 'fifao:MarineAreas',
    //gup : 'fifao:gebco_underseafeatures_points', PRE WORKSHOP
    guf : 'fifao:gebco_underseafeatures',
    gbi : 'vme:gebco_isobath2000', //AFTER WORKSHOP
    vnt : 'vme:vents_InterRidge_2011_all', // Hidrotermal
    ccr : 'vme:WCMC-001-ColdCorals2005', //ColdCorals
	//nma : 'fifao:eez2',
	nma : 'fifao:limit_200nm',
	RFB : 'fifao:RFB',
	rfb : 'fifao:RFB_COMP',
	sdi : 'fifao:FAO_SUB_DIV',
	spd : 'fifao:SPECIES_DIST', 
	sub : 'fifao:FAO_SUB_AREA',
	vme : 'fifao:VMEAREAS',
    
    // start after workshop
    vme_cl : 'vme:closures', // VME closed areas
    vme_oa : 'vme:other_areas', // Other access regulated areas    
    vme_bfa : 'vme:bottom_fishing_areas', // Bottom fishing areas
    vme_regarea : 'fifao:RFB_COMP_CLIP', // VME regulatory areas
    //end after workshop
    
	vme_fp : 'fifao:vme-db_footprints',
    //vme_en : 'fifao:Encounters2',
    //vme_sd : 'fifao:SurveyData2',
    //vme_agg_en : 'fifao:AggregatedEncounters',    
	//vme_agg_sd : 'fifao:AggregatedSurveyData',  
	//bathimetry: 'fifao:color_etopo1_ice_full' //etopo
	bathimetry: 'fifao:OB_LR'				//natural earth ocean bottom
	
}; 

FigisMap.infoGroupsSources = {
    vme      : "index_vme.html",
    overlays : "index_ovl.html"
};

FigisMap.defaults = {
	lang		: document.documentElement.getAttribute('lang') ? document.documentElement.getAttribute('lang').toLowerCase() : 'en',
	defaultBaseLayer	: { layer: FigisMap.fifao.cnt, cached: true, remote:false, label : "Continents" },//FigisMap.fifao.maj,
	baseLayers	: [{ layer: FigisMap.fifao.bathimetry, cached: true, remote:false, label : "Oceans imagery",format: "image/jpeg"},
				   { layer: FigisMap.fifao.cnt, cached: true, remote:false, label : "Continents"}],
	basicsLayers	: true,
	context		: 'default',
	drawDataRect	: false,
	global		: false,
	landMask	: true,
	mapSize		: 'S',
	layerFilter	: '',
	layerStyle	: '*',
	layerStyles	: { distribution : 'all_fao_areas_style', intersecting : '*', associated : '*' },
	mapCenter : new OpenLayers.LonLat(-2.46, 18.23),
	mapCenterProjection : 4326
};

FigisMap.useProxy = FigisMap.isDeveloper ? false : ( FigisMap.isTesting ? FigisMap.currentSiteURI.indexOf(':8484') < 1 : ( FigisMap.currentSiteURI.indexOf('http://www.fao.org') != 0 ) );

FigisMap.geoServerAbsBase = FigisMap.isDeveloper ? 'http://192.168.1.122:8484' : ( FigisMap.isTesting ? 'http://193.43.36.238:8484' : 'http://www.fao.org' );

FigisMap.geoServerBase = FigisMap.currentSiteURI.indexOf('localhost') != -1 ? "http://figisapps.fao.org" : "http://" + window.location.hostname;
//FigisMap.geoServerBase = "http://www.fao.org";
//FigisMap.geoServerBase = "http://" + window.location.hostname;

FigisMap.geoServerResource = "/figis/geoserver";
//FigisMap.geoServerResource = "/figis/geoserverprod";
//FigisMap.geoServerResource = "/figis/geoserver" +
//		(window.location.hostname.indexOf('figisapps')==0 ? 'dv' : 'prod' );

FigisMap.httpBaseRoot = FigisMap.geoServerBase + "/fishery/vme-db/";

//FigisMap.httpBaseRoot = FigisMap.geoServerBase + ( FigisMap.isDeveloper ? '/figis/figis-vme/' : '/figis/geoserverdv/figis-vme/' );

FigisMap.rnd.vars = {
	geoserverURL		: FigisMap.geoServerBase + FigisMap.geoServerResource,  //unused
	geowebcacheURL		: FigisMap.geoServerBase + FigisMap.geoServerResource + "/gwc/service",
	//logoURL			: FigisMap.httpBaseRoot + "theme/img/FAO_blue_20.png",
	//logoURL			    : FigisMap.httpBaseRoot + "theme/img/FAO_logo_Blue_3lines_en_200x55.png",
	logoURL			    : FigisMap.httpBaseRoot + "theme/img/new_watermark.png",
	//logoURL			: "http://localhost:8080/vme/theme/img/new_watermark.png",
	logoURLFirms		: FigisMap.httpBaseRoot + "theme/img/logoFirms60.gif",
	FAO_fishing_legendURL	: FigisMap.httpBaseRoot + "theme/img/FAO_fishing_legend.png",
	EEZ_legendURL		: FigisMap.httpBaseRoot + "theme/img/EEZ_legend.png",
	VME_legendURL		: FigisMap.httpBaseRoot + "theme/img/VME_legend.png",
	VME_FP_legendURL	: FigisMap.httpBaseRoot + "theme/img/VME_FP_legend.png",
	RFB_legendURL		: FigisMap.httpBaseRoot + "theme/img/RFB_legend.png",
	wms			: FigisMap.geoServerBase + FigisMap.geoServerResource + "/wms",
	gwc			: FigisMap.geoServerBase + FigisMap.geoServerResource + "/gwc/service" + "/wms",
	ows			: FigisMap.geoServerBase + FigisMap.geoServerResource + "/ows",
	remote:{
		//http://hqldvfigis2:8584/geoserver
		//wms: "http://figisapps.fao.org/figis/geoserver/wms",
		//gwc: "http://figisapps.fao.org/figis/geoserver/gwc/service/wms"
		wms: FigisMap.geoServerBase + FigisMap.geoServerResource + "/wms",
		gwc: FigisMap.geoServerBase + FigisMap.geoServerResource + "/gwc/service/wms"
	},
	Legend_Base_Request	: FigisMap.geoServerBase + FigisMap.geoServerResource + "/wms" + "?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&FORMAT=image%2Fpng&WIDTH=30&HEIGHT=20",
	wfs			: FigisMap.geoServerBase + FigisMap.geoServerResource + '/wfs?request=GetFeature&version=1.0.0&typename=',
	absWfs			: FigisMap.geoServerAbsBase + FigisMap.geoServerResource + '/wfs?request=GetFeature&version=1.0.0&typename=',
    // Change after WORKSHOP 2014
	vmeSearchZoomTo: {
		wfsUrl: FigisMap.geoServerBase + FigisMap.geoServerResource + "/wfs",
		wfsVersion: "1.1.0",
		filterProperty: "RFB",
	    featureType: "RFB_COMP_CLIP",
	    featurePrefix: "fifao",
	    srsName: "EPSG:4326"
	}    
};

if ( FigisMap.useProxy ) FigisMap.rnd.vars.wfs = FigisMap.currentSiteURI + FigisMap.proxy + encodeURIComponent( FigisMap.rnd.vars.absWfs );

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
		for ( var i = 0; i < args.length; i++ ) console.log( args[i] );
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
};

FigisMap.debug = function() {
	if ( FigisMap.debugLevel ) {
		var args = new Array(' --- debug information --- ');
		for ( var i = 0; i < arguments.length; i++ ) args.push( arguments[i] );
		FigisMap.console( args );
	};
};

FigisMap.error = function() {
	var args = new Array(' --- error information --- ');
	for ( var i = 0; i < arguments.length; i++ ) args.push( arguments[i] );
	FigisMap.console( args, (FigisMap.isTesting || FigisMap.isDeveloper) );
};

FigisMap.label = function( label, p ) {
	var lang = p && p.lang ? p.lang : ( FigisMap.lang ? FigisMap.lang : FigisMap.defaults.lang );
	if ( ! label ) return '';
	var l = label.toUpperCase();
	if ( p && p.staticLabels && p.staticLabels[l] ) {
		switch ( typeof p.staticLabels[l] ) {
			case 'string'	: return p.staticLabels[l]; break;
			case 'object'	: return p.staticLabels[l][lang] ? p.staticLabels[l][lang] : p.staticLabels[l][FigisMap.defaults.lang]; break;
		}
	}
	if ( staticLabels && staticLabels[l] ) {
		switch ( typeof staticLabels[l] ) {
			case 'string'	: return staticLabels[l]; break;
			case 'object'	: return staticLabels[l][lang] ? staticLabels[l][lang] : staticLabels[l][FigisMap.defaults.lang]; break;
		}
	}
	return label;
};

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

FigisMap.ol.reBound = function( proj0, proj1, bounds ) {
	proj0 = parseInt( String( proj0.projCode ? proj0.projCode : proj0 ).replace(/^EPSG:/,'') );
	proj1 = parseInt( String( proj1.projCode ? proj1.projCode : proj1 ).replace(/^EPSG:/,'') );
	if ( bounds == null ) {
		proj0 = 4326;
		bounds = new OpenLayers.Bounds(-180, -90, 180, 90);
	}
	var ans = false;
	if ( proj0 == 3349 ) proj0 = 900913;
	if ( proj1 == 3349 ) proj1 = 900913;
	if ( proj0 == proj1 ) ans = bounds;
	if ( proj1 == 3031 ) return new OpenLayers.Bounds(-12400000,-12400000, 12400000,12400000);
	if ( ! ans ) {
		var source = new Proj4js.Proj( 'EPSG:' + proj0 );
		var dest   = new Proj4js.Proj( 'EPSG:' + proj1 );
		
		var min = new OpenLayers.Geometry.Point(bounds.left, bounds.bottom);
		var max = new OpenLayers.Geometry.Point(bounds.right, bounds.top);
		var minpt = Proj4js.transform(source, dest, min);
		var maxpt = Proj4js.transform(source, dest, max);
		ans = new OpenLayers.Bounds(minpt.x, minpt.y, maxpt.x, maxpt.y);
	}
	if ( proj1 == 4326 ) ans = FigisMap.ol.dateline( ans );
	return ans;
};
FigisMap.ol.dateline = function( b ) {
	if ( b.left < 0 && b.right > 0 && ( b.right - b.left ) < 300  ) {
		// do nothing
	} else {
		if ( b.left < 0 ) b.left += 360;
		if ( b.right < 0 ) b.right += 360;
		if ( b.left > b.right ) {
			var t = b.left;
			b.left = b.right;
			b.right = t;
		} else {
			var diff = b.right - b.left;
			if ( ( diff > 300 ) && ( diff < 360 ) ) {
				var t = b.left;
				b.left = b.right -360;
				b.right = t;
			}
		}
	}
	return b;
};
FigisMap.ol.reCenter = function( proj0, proj1, center ) {
	proj0 = parseInt( String( proj0.projCode ? proj0.projCode : proj0 ).replace(/^EPSG:/,'') );
	proj1 = parseInt( String( proj1.projCode ? proj1.projCode : proj1 ).replace(/^EPSG:/,'') );
	if ( proj0 == 3349 ) proj0 = 900913;
	if ( proj1 == 3349 ) proj1 = 900913;
	if ( center == null ) {
		if ( proj1 == 900913 ) return new OpenLayers.LonLat(20037508.34, 4226661.92);
		proj0 = 4326;
		center = new OpenLayers.LonLat( 0, 0 );
	}
	if ( proj0 == proj1 ) return center;
	if ( proj1 == 3031 ) return new OpenLayers.LonLat(0.0, -72.4999999868);
	var newCenter;
	var source = new Proj4js.Proj( 'EPSG:' + proj0 );
	var dest   = new Proj4js.Proj( 'EPSG:' + proj1 );
	
	var centerPoint = new OpenLayers.Geometry.Point( center.lon, center.lat );
	var newCenterPoint = Proj4js.transform(source, dest, centerPoint);
	return new OpenLayers.LonLat( newCenterPoint.x, newCenterPoint.y );
};

FigisMap.ol.extend = function( bounds1, bounds2 ) {
	var b1 = { left: bounds1.left, bottom: bounds1.bottom, right: bounds1.right, top: bounds1.top };
	var b2 = { left: bounds2.left, bottom: bounds2.bottom, right: bounds2.right, top: bounds2.top };
// 	if ( b1.left < 0 ) b1.left += 360;
// 	if ( b1.right < 0 ) b1.right += 360;
// 	if ( b2.left < 0 ) b2.left += 360;
// 	if ( b2.right < 0 ) b2.right += 360;
	if ( b1.left > b2.left ) b1.left = b2.left;
	if ( b1.bottom > b2.bottom ) b1.bottom = b2.bottom;
	if ( b1.right < b2.right ) b1.right = b2.right;
	if ( b1.top < b2.top ) b1.top = b2.top;
	if ( b1.left > b1.right ) {
		b2 = b1.right;
		b1.right = b1.left;
		b1.left = b2;
	}
	return FigisMap.ol.dateline( new OpenLayers.Bounds( b1.left, b1.bottom, b1.right, b1.top ) );
};
FigisMap.ol.gmlBbox = function( xmlDoc ) {
	var e;
	try {
		var g = new OpenLayers.Format.GML();
		var feat = g.read( xmlDoc );
		var b;
		for ( var i = 0; i < feat.length; i++ ) {
			if ( i == 0) {
				b = FigisMap.ol.dateline( feat[i].bounds );
			} else {
				b = FigisMap.ol.extend( b, feat[i].bounds );
			}
		}
		return b;
	} catch(e) {
		FigisMap.debug('FigisMap.ol.gmlBbox exception:', e, e.message, 'XML document:',xmlDoc );
		return false;
	}
};
/*
FigisMap.ol.gmlBbox = function( xmlDoc ) {
	var cnode, e;
	try {
		cnode = xmlDoc.documentElement.getElementsByTagName('boundedBy')[0].getElementsByTagName('Box')[0].getElementsByTagName('coordinates')[0];
	} catch( e ) {
		try {
			cnode = xmlDoc.documentElement.getElementsByTagNameNS('*','boundedBy')[0].getElementsByTagNameNS('*','Box')[0].getElementsByTagNameNS('*','coordinates')[0];
		} catch(e) {
			cnode = false;
		}
	}
	if ( cnode ) {
		var ctext = cnode.firstChild.nodeValue.split(' ');
		var lbrt = ctext[0].split(cnode.getAttribute('cs')).concat( ctext[1].split(cnode.getAttribute('cs')) );
		for ( var i = 0; i < 4; i++ ) lbrt[i] = parseFloat( lbrt[i].split( cnode.getAttribute('decimal') ).join('.') );
		return new OpenLayers.Bounds( lbrt[0], lbrt[1], lbrt[2], lbrt[3] );
	} else {
		try {
			var g = new OpenLayers.Format.GML();
			var feat = g.read( xmlDoc );
			if ( ! feat && feat[0] && feat[0].bounds ) return false;
			var bounds = feat[0].bounds;
			for ( var i = 1; i < feat.length; i++ ) if ( feat[i].bounds) bounds.extend( feat[i].bounds );
			return bounds;
		} catch(e) {
			FigisMap.debug('FigisMap.ol.gmlBbox exception:', e, e.message, 'XML document:',xmlDoc );
			return false;
		}
	}
};
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

FigisMap.parser.projection = function( p ) {
	var proj = p.projection;
	if ( proj ) {
		proj = parseInt( proj );
	} else {
		if ( p.rfb && p.rfb == 'ICES' ) proj = 3349;
	}
	switch ( proj ) {
		case   3349	: break;
		case 900913	: break;
		case   3031	: break;
		//case  54012 : break;
		case  54009 : break;
        case 4326:break;

		default		: proj = 900913;
		//default		: proj = 4326;
	}
	return proj;
};

FigisMap.parser.watermark = function( p ) {
	//if ( p && p.context.indexOf('FIRMS') == 0 ) return false;
	var w = { src: FigisMap.rnd.vars.logoURL, width: 176/*60*/, height: 48/*60*/, wclass: 'olPoweredBy', title:FigisMap.label(''/*'Powered by FIGIS'*/, p) };
	if ( p && p.context.indexOf('FIRMS') == 0 ) {
		w.src = FigisMap.rnd.vars.logoURLFirms;
		w.width = 176;//60;
		w.height = 48;//29;
	}else{
        w.displayClass = "olFAOLogo";
		w.displayClass = p.fullWindowMap != true ? w.displayClass + " olFAOLogo_e" : w.displayClass;
    }
	if ( p && p.watermark != null ) {
		if ( typeof p.watermark == 'object' ) {
			for ( var i in p.watermark ) w[i] = p.watermark[i];
		} else {
			w = p.watermark;
		}
	}
	return w;
};

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
		p[ layerType ] = FigisMap.parser.layers( p[ layerType ] );
		if ( ! p[ layerType ] ) p[ layerType ] = new Array();
		p[ layerType ].push( newLayer );
		p[ layerType ] = FigisMap.parser.layers( p[ layerType ], { type : layerType } );
	}
	return cnt;
};

FigisMap.parser.checkLayerTitles = function( layers, pars ) {
	if ( layers ) for (var i = 0; i < layers.length; i++) if ( layers[i].title == null ) {
		var t = '';
		if ( layers[i].type == 'intersecting' ) t += FigisMap.label( layers[i].type, pars );
		t += FigisMap.label( layers[i].layer.replace(/^[^:]+:(.+)/,"$1"), pars );
		layers[i].title = t;
	}
};

FigisMap.parser.parse = function( p ) {
	
	if ( typeof p != 'object' ) return { 'parserError' : 'Params object is missing - type: ' + ( typeof p ) };
	
	if ( ! p.context ) p.context = FigisMap.defaults.context;
	
	if ( typeof p.isFIGIS == 'undefined' ) p.isFIGIS = ( p.context.indexOf( 'Viewer' ) < 0 );
	if ( typeof p.isViewer == 'undefined' ) p.isViewer = ! p.isFIGIS;
	if ( typeof p.isRFB == 'undefined' ) p.isRFB = ( p.rfb != null );
	
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
	
	if ( ! p.base ) if ( FigisMap.defaults.baseLayers ) p.base = FigisMap.defaults.baseLayers;
	p.defaultBase = FigisMap.defaults.defaultBaseLayer;
	if ( p.base ) {
		for(var i=0;i<p.base.length;i++){
			p.base[i] = FigisMap.parser.layer( p.base[i], { 'type' : 'base'} );
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
	
	//p.countries = FigisMap.parser.countries( p );
	
	FigisMap.parser.layersHack( p );
	
// 	if ( ! p.distribution ) {
// 		p.parserError = "'distribution' mandatory parameter is missing or malformed.";
// 		return p;
// 	}
	
	if ( p.isFIGIS ) FigisMap.fs.parse( p );
	
	p.projection = FigisMap.parser.projection( p );
	
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
};

FigisMap.fs.parse = function( p ) {
	if ( ! p.staticLabels ) p.staticLabels = new Object();
	if ( ! p.RFBName ) if ( staticLabels['MEMBERS_FS'] && ! p.staticLabels['MEMBERS'] ) p.staticLabels['MEMBERS'] = staticLabels['MEMBERS_FS'];
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

FigisMap.fs.eezHack = function( p, dtype ) {
	// associate a countrybound to every eez, if any (and if not countrybounds)
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
};

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
			} else {
				inters.push( l );
			}
		}
		p.distribution = highers.concat( inters, lowers );
		p.distribution.reverse();
	}
};

FigisMap.rnd.maxResolution = function( proj, pars ) {
	proj = parseInt( proj );
	var size = String(pars.mapSize).toUpperCase();
	switch ( size ) {
		case 'XS': break; // width ≤ 280
		case 'S' : break; // width ≤ 400
		case 'M' : break; // width ≤ 640
		case 'L' : break; // width ≤ 810
		default  : size = FigisMap.defaults.mapSize;
	}
	var base, offset;
	if ( proj == 3031 ) {
		base = 48828.125;
		switch ( size ) {
			case 'XS'	: return base * 4; break;
			case 'S'	: return base * 2; break;
			case 'M'	: return base * 2; break;
			case 'L'	: return base / 2;  break; //original value "return base". adapted for figis-vme
		}
	} else if ( proj == 900913 ) {
		base = 156543.03390625;
		switch ( size ) {
			case 'XS'	: return base; break;
			case 'S'	: return base / 2; break;
			case 'M'	: return base / 2; break;
			case 'L'	: return base / 4; break;
		}
	} else if(proj == 4326){
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
	} else if (proj == 54009){
		//mollweide
		
		base = 281876.4952525812;
		switch ( size ) {
			case 'XS'	: return base; break;
			case 'S'	: return base / 2; break;
			case 'M'	: return base / 2; break;
			case 'L'	: return base / 8; break; //original value "return base / 4". adapted for figis-vme
		}
	}
};

FigisMap.rnd.watermarkControl = function( map, pars ) {
	if ( ! pars.watermark ) return false;
 	var poweredByControl = new OpenLayers.Control();
     
 	OpenLayers.Util.extend(
 		poweredByControl,
 		{
 			draw: function () {
                 
 				OpenLayers.Control.prototype.draw.apply(this, arguments);
                this.div.className+= ' ' + pars.watermark.displayClass;
 				this.div.innerHTML = '<img' +
 					( pars.watermark.src ? ' src="' + pars.watermark.src + '"' : '' ) +
 					( pars.watermark.width ? ' width="' + pars.watermark.width + '"' : '' ) +
 					( pars.watermark.height ? ' height="' + pars.watermark.height + '"' : '' ) +
 					( pars.watermark.wclass ? ' class="' + pars.watermark.wclass + '"' : '' ) +
 					( pars.watermark.id ? ' id="' + pars.watermark.id + '"' : '' ) +
 					( pars.watermark.title ? ' title="' + pars.watermark.title + '"' : '' ) +
 					//' style="position:fixed;right:5px;bottom:5px;"' +
					( (pars.watermark.width && pars.watermark.height) ? ( ' style="position:absolute;left:' + (this.map.size.w - pars.watermark.width - 5) + 'px;top:' + (this.map.size.h - pars.watermark.height - 5) + 'px;"' ) : '' ) +
 					//' onClick="javascript:window.location.href = \'' + FigisMap.httpBaseRoot + '\'"/>';
					//' onClick="javascript:window.open(\'' + FigisMap.httpBaseRoot + '\', \'_blank\')"/>';
					' onClick="javascript:window.open(\'' + FigisMap.httpBaseRoot + '\')"/>';
					
					this.map.events.register('updatesize', this, function(){						
						var img = this.div.firstChild;						
						if(img){						
							img.style.position = "absolute";
							img.style.left = (this.map.size.w - pars.watermark.width - 5) + "px";
							img.style.top = (this.map.size.h - pars.watermark.height - 5) + "px";
						}
					});
					
 				return this.div;
 			}
		}
 	);
 	map.addControl(poweredByControl);
 	return true;
};

FigisMap.rnd.mouseControl = function( map, pars ) {
	map.addControl(
		new OpenLayers.Control.MousePosition( {
			prefix		: "lon: ",
			separator	: ", lat: ",
			numDigits	: 2,
			granularity	: 1000,
			displayProjection : new OpenLayers.Projection("EPSG:4326")
		} )
	);
};

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
			if ( nl.rfb && nl.rfb != '' && ! nl.settings ) nl.settings = FigisMap.rfb.getSettings( nl.rfb );
			if ( nl.dispOrder == null && nl.filter.toLowerCase().indexOf("disporder") != -1 ) {
				nl.dispOrder = parseInt( l.filter.replace(/^.*DispOrder[^0-9]+([0-9]+).*$/i,"$1") );
				if ( isNaN( nl.dispOrder ) ) nl.dispOrder = false;
			}
			output.push( nl );
		}
	}
	return output;
};

FigisMap.rnd.addAutoLayers = function( layers, pars ) {
	var layerTypes = new Object();
	for ( var i = 0; i < layers.length; i++ ) layerTypes[ layers[i].layer ] = true;
	if ( pars.basicsLayers ) {
		var owner = FigisMap.ol.getSelectedOwner();
		var year = FigisMap.ol.getSelectedYear();
    
        // VME closed areas
		if ( ! layerTypes[ FigisMap.fifao.vme_cl ] ) {
			layers.unshift({
				layer	: FigisMap.fifao.vme_cl,
				label	: 'VME closed areas', //'Area types',
				group: "Managed areas related to UNGA Res. 61-105",
                showLegendGraphic: true,
                wrapDateLine: false,    
                singleTile: false,
				style: "MEASURES_VME",
				filter	: "YEAR <= '" + year + "' AND END_YEAR >="+ year /*+ (owner ? " AND OWNER ='" + owner +"'" :"") (FigisMap.rnd.status.logged ?  "" : " AND OWNER <> 'NPFC'")*/ ,
				//icon	: '<img src="' + FigisMap.rnd.vars.VME_legendURL + '" width="30" height="20" />',
				opacity	: 1.0,
				hidden	: pars.isFIGIS,
				type	: 'auto',
				hideInSwitcher	: false,
                dispOrder: 2,
				isMasked: false,
                //infoGroupsSources: FigisMap.infoGroupsSources.vme,
                legend_options: "forcelabels:on;forcerule:True;fontSize:12"
			});
		}       

        // Other access regulated areas
		if ( ! layerTypes[ FigisMap.fifao.vme_oa ] ) {
			layers.unshift({
				layer	: FigisMap.fifao.vme_oa,
				label	: 'Other access regulated areas', //'Area types',
				group: "Managed areas related to UNGA Res. 61-105",
                showLegendGraphic: true,
                wrapDateLine: false,    
                singleTile: false,
				style: "MEASURES_OTHER",
				filter	: "YEAR <= '" + year + "' AND END_YEAR >="+ year /*+ (owner ? " AND OWNER ='" + owner +"'" :"") (FigisMap.rnd.status.logged ?  "" : " AND OWNER <> 'NPFC'")*/ ,
				//icon	: '<img src="' + FigisMap.rnd.vars.VME_legendURL + '" width="30" height="20" />',
				opacity	: 1.0,
				hidden	: pars.isFIGIS,
				type	: 'auto',
				hideInSwitcher	: false,
                dispOrder: 2,
				isMasked: false,
                //infoGroupsSources: FigisMap.infoGroupsSources.vme,
                legend_options: "forcelabels:on;forcerule:True;fontSize:12"
			});
		}   
        
		//WMS Vme PRE WORKSHOP
		/*if ( ! layerTypes[ FigisMap.fifao.vme ] ) {
			layers.unshift({
				layer	: FigisMap.fifao.vme,
				label	: 'Area types', //'Area types',
				group: "Managements regulations related to UNGA RES. 61-105",
                showLegendGraphic: true,
                wrapDateLine: false,    
                singleTile: false,
				style: "VMEAREAS_Public",
				filter	: "YEAR <= '" + year + "' AND END_YEAR >="+ year,
				icon	: '<img src="' + FigisMap.rnd.vars.VME_legendURL + '" width="30" height="20" />',
				opacity	: 1.0,
				hidden	: pars.isFIGIS,
				type	: 'auto',
				hideInSwitcher	: false,
                dispOrder: 2,
				isMasked: false
			});
		}*/	   
        
		//WMS Encounters		
		/*if ( ! layerTypes[ FigisMap.fifao.vme_agg_en ] ) {
			layers.unshift({
				layer	: FigisMap.ol.getAuthLayer('encounters'),
				label	: 'Encounters',
				group: "Managements regulations related to UNGA RES. 61-105",
                showLegendGraphic: true,				
				filter	:"YEAR = '"+ year + "'",
                skipLegend	: true,
				singleTile	:false,
				opacity	: 1.0,
				hidden	: true,
				type	: 'auto',
                dispOrder: 2,
				hideInSwitcher	: false
			});
		}        
			//WMS SurveyData
		if ( ! layerTypes[ FigisMap.fifao.vme_sd ] ) {
			layers.unshift({
				layer	: FigisMap.ol.getAuthLayer('survey'),
				label	: 'Survey Data',
				singleTile	:false,
				group: "Managements regulations related to UNGA RES. 61-105",
                showLegendGraphic: true,
				filter	:"YEAR = '"+ year + "'",
                skipLegend	: true,
				opacity	: 1.0,
				hidden	: true,
				type	: 'auto',
                dispOrder: 2,
				hideInSwitcher	: false
			});
		}*/        
        
        // Bottom fishing areas
		if ( ! layerTypes[ FigisMap.fifao.vme_bfa ] ) {
			layers.unshift({
				layer	: FigisMap.fifao.vme_bfa,
				label	: 'Bottom fishing areas', //'Area types',
				group: "Managed areas related to UNGA Res. 61-105",
                showLegendGraphic: true,
                wrapDateLine: false,    
                singleTile: false,
				style: "MEASURES_BTM_FISH",
				//filter	: "YEAR <= '" + year + "' AND END_YEAR >="+ year /*+ (owner ? " AND OWNER ='" + owner +"'" :"") (FigisMap.rnd.status.logged ?  "" : " AND OWNER <> 'NPFC'")*/ ,
                filter	:"YEAR <= '"+ year + "'", // + (FigisMap.rnd.status.logged ?  "" : " AND OWNER <> 'NPFC'"),
				//icon	: '<img src="' + FigisMap.rnd.vars.VME_legendURL + '" width="30" height="20" />',
				opacity	: 1.0,
				hidden	: pars.isFIGIS,
				type	: 'auto',
				//hideInSwitcher	: false,
                dispOrder: 1,
				isMasked: false,
                //infoGroupsSources: FigisMap.infoGroupsSources.vme,
                legend_options: "forcelabels:on;forcerule:True;fontSize:12"
			});
		} 
        
		//WMS Footprints PRE WORKSHOP
		/*if ( ! layerTypes[ FigisMap.fifao.vme_fp ] ) {
			layers.unshift({
				layer	: FigisMap.fifao.vme_fp,
				label	: 'Footprints',
				group: "Managements regulations related to UNGA RES. 61-105",
                showLegendGraphic: true,					
				//filter	:'*',
				filter	:"Year <= '"+ year + "'" + (FigisMap.rnd.status.logged ?  "" : " AND Owner <> 'NPFC'"),
				icon	: '<img src="' + FigisMap.rnd.vars.VME_FP_legendURL + '" width="30" height="20" />',
				opacity	: 1.0,
				hidden	: true,
				type	: 'auto',
                dispOrder: 1,
				hideInSwitcher	: false
			});
		}*/
        
		//WMS Footprints
		/*if ( ! layerTypes[ FigisMap.fifao.vme_fp ] ) {
			layers.unshift({
				layer	: FigisMap.fifao.vme_fp,
				label	: 'Footprints',
				group: "Managements regulations related to UNGA RES. 61-105",
                showLegendGraphic: false,					
				//filter	:'*',
				filter	:"Year = '"+ year + "'",
				icon	: '<img src="' + FigisMap.rnd.vars.VME_FP_legendURL + '" width="30" height="20" />',
				opacity	: 1.0,
				hidden	: true,
				type	: 'auto',
                dispOrder: 1,
				hideInSwitcher	: true
			});
		}*/   		   
        /*
		//WMS Area of competence
		if ( ! layerTypes[ FigisMap.fifao.rfb ] ) {
			layers.unshift({
				layer	: FigisMap.fifao.rfb,
				label	: 'RFB regulatory area in high-seas',
				filter	: "RFB = 'CCAMLR' OR RFB = 'NAFO' OR RFB = 'NEAFC'",
				icon	: '<img src="' + FigisMap.rnd.vars.RFB_legendURL + '" width="30" height="20" />',
				opacity	: 0.8,
				hidden	: false,
				type	: 'auto'
			});
		}
        */
		//WMS FAO Areas
		if ( ! ( layerTypes[ FigisMap.fifao.ma2 ] || layerTypes[ FigisMap.fifao.maj ] ) ) {
			layers.push( {
				layer	: FigisMap.fifao.maj,
				label	: 'FAO fishing areas',
                showLegendGraphic: true,	  
                group: "Additional features",
				filter	:'*',
				remote  : false, 
				icon	:'<img src="'+FigisMap.rnd.vars.FAO_fishing_legendURL+'" width="30" height="20" />',
                hidden	: true,
				type	:'auto',
                infoGroupsSources: FigisMap.infoGroupsSources.overlays
			} );
		}       
		//WMS 200 nautical miles arcs
		//if ( ! layerTypes[ FigisMap.fifao.eez ] ) {
		if ( ! layerTypes[ FigisMap.fifao.nma ] ) {
			layers.push({
				layer	: FigisMap.fifao.nma,
				label	: '200 nautical miles arcs',
                showLegendGraphic: true,
                group: "Additional features",
				filter	:'*',
				icon	: '<img src="' + FigisMap.rnd.vars.EEZ_legendURL + '" width="30" height="20" />',
				opacity	: 0.3,
				//hidden	: pars.isFIGIS,
				hidden	: true,
				remote  : false,
				type	: 'auto',
                infoGroupsSources: FigisMap.infoGroupsSources.overlays
			});
		}        
	}
	if ( pars.landMask && ! layerTypes[ FigisMap.fifao.cnt ] ) {
		layers.push( {
			layer		: FigisMap.fifao.cnt,
			filter		: '*',
			type		: 'auto',
			style		: '*',
			remote		: false,
			skipLegend	: true,
			hideInSwitcher	: true
		} );
	}
	// marine areas
	layers.push( {
			layer		: FigisMap.fifao.mal,
			cached		: true,
			filter		: '*',
			type		: 'auto',
			style		: 'MarineAreasLabelled',
            group: "Additional features",
            label	: 'Oceans and sea names',
			remote		: false,
            showLegendGraphic: false,	            
			skipLegend	: true,
			hideInSwitcher	: false,
            infoGroupsSources: FigisMap.infoGroupsSources.overlays
		} );
    layers.push( {
			layer		: FigisMap.fifao.guf,
			cached		: true,
			filter		: '*',
			type		: 'auto',
			style		: '',
            group: "Additional features",
            label	: 'Gebco Undersea Features',
			remote		: false,
            showLegendGraphic: false,	            
			skipLegend	: true,
            hidden	: false,
			hideInSwitcher	: false,
            infoGroupsSources: FigisMap.infoGroupsSources.overlays
		} );
    layers.push( {
			layer		: FigisMap.fifao.gbi,
			cached		: true,
			filter		: '*',
			type		: 'auto',
			style		: '',
            group: "Additional features",
            label	: 'Gebco Isobath 2000',
			remote		: false,
            showLegendGraphic: true,	            
			skipLegend	: true,
            hidden	: true,
			hideInSwitcher	: false,
            infoGroupsSources: FigisMap.infoGroupsSources.overlays
		} );        
    layers.push( {
			layer		: FigisMap.fifao.vnt,
			cached		: true,
			filter		: '*',
			type		: 'auto',
			style		: 'vents_InterRidge_2011_all',
            group: "Additional features",
            label	: 'Hydrothermal Vents',
			remote		: false,
            showLegendGraphic: true,	            
			skipLegend	: true,
            hidden	: true,
			hideInSwitcher	: false,
            infoGroupsSources: FigisMap.infoGroupsSources.overlays
		} );   
    /*layers.push( {
			layer		: FigisMap.fifao.ccr,
			cached		: true,
			filter		: '*',
			type		: 'auto',
			style		: '',
            group: "Layers of interest",
            label	: 'Cold Corals 2005',
			remote		: false,
            showLegendGraphic: true,	            
			skipLegend	: true,
            hidden	: true,
			hideInSwitcher	: false,
                infoGroupsSources: FigisMap.infoGroupsSources.overlays
		} );*/    
    layers.push( {
			layer		: FigisMap.fifao.vme_regarea,
			cached		: true,
			filter		: '*',
			type		: 'auto',
			style		: '',
            group: "Additional features",
            label	: 'RFB Competence Areas',
			remote		: false,
            showLegendGraphic: true,	            
			skipLegend	: true,
            hidden	: true,
			hideInSwitcher	: false,
            dispOrder: 3,
            isMasked: false,
                infoGroupsSources: FigisMap.infoGroupsSources.overlays
		} );        
	return layers;
};

FigisMap.rnd.sort4map = function( layers, p ) {
	var normalLayers = new Array();
	var higherLayers = new Array();
	var frontLayers = new Array();
	var countryLayers = new Array();
	
	for (var i = 0; i < layers.length; ++i) {
		var l = layers[i];
		if ( l.layer == FigisMap.fifao.cbs ) {
			countryLayers.push( l );
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
	return normalLayers.concat( higherLayers, frontLayers, countryLayers );
};

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
		for ( var j = 0; j < layers.length; j++ ) if ( layers[j].type == ord[i].type ) div.push( layers[j] );
		if ( div.length != 0 ) {
			ans.push( { division: ord[i].type, start: true, label: ord[i].label } );
			ans = ans.concat( div );
			ans.push( { division: ord[i].type, end: true, label: ord[i].label } );
		}
	}
	return ans;
};

FigisMap.rnd.legend = function( layers, pars ) {
	if ( pars.legend.div ) pars.legend.div.innerHTML = FigisMap.rnd.mainLegend( layers, pars );

	if ( pars.countriesLegend.div ) pars.countriesLegend.div.innerHTML = FigisMap.rnd.countriesLegend( pars );
};

FigisMap.rnd.mainLegend = function( layers, pars ) {
	var LegendHTML = "";
	var hasFaoAreas = false;
	var legendDispLayers = new Object();
	var useTables = ( pars.legendType.indexOf('T') != -1 );
	var useSections = ( pars.legendType.indexOf('P') < 0 );
	var llayers = FigisMap.rnd.sort4legend( layers, pars );
	if ( useTables && ! useSections ) LegendHTML += '<table cellpadding="0" cellspacing="0" border="0">';
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
			var k = l.layer + '-' + ( STYLE ? STYLE.replace(/^rfb_.*$/,"*") : '*' );
			if ( legendDispLayers[ k ] ) continue;
			wms_name = wms_name.replace(/ \([^\)]+\).*$/,'');
			legendDispLayers[ k ] = true;
		}
		if ( ! l.icon ) {
			if ( ! l.iconSrc ) l.iconSrc = FigisMap.rnd.vars.Legend_Base_Request + "&LAYER=" + l.wms.params.LAYERS + "&STYLE=" + (STYLE != null ? STYLE : "");
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
				LegendHTML += '<div>' + l.icon + '</div></div>';
			} else {
				LegendHTML += '<div>' + l.icon;
				if ( wms_name != '' && ! l.skipTitle ) LegendHTML += '<span>' + wms_name + '</span>';
				LegendHTML += '</div>';
			}
		}
		l.inLegend = true;
	}
	if ( useTables && ! useSections ) LegendHTML += '</table>';
	return LegendHTML;
};

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

FigisMap.rfb.list = function() {
	var ans = new Array();
	if ( rfbLayerSettings ) for ( var i in rfbLayerSettings ) if ( ! rfbLayerSettings[i].skip ) ans.push( i );
	return ans;
};

FigisMap.rfb.getSettings = function( rfb, pars ) {
	if ( pars && ! ( pars.isViewer || pars.rfb )  ) return null;
	var v = rfbLayerSettings[ rfb ];
	if ( ! v ) return null;
	v.name = rfb;
	return v;
};

//returns list of zoom areas 
FigisMap.ol.list = function() {

	var ans = [];
	if ( georeferences_data ){
		for ( var i in georeferences_data ){
		  ans.push( i );
		}
	}
	return ans;
};

//check if bbox of zoom area is in bbox of projection
FigisMap.ol.checkValidBbox = function (projections,bboxs) {
	if(bboxs.srs){
		if (bboxs.srs!=myMap.getProjection()){
			return false;
		}else{
			return true;
		}
	}
	if (projections == '3031'){
	    var bbox2 = OpenLayers.Bounds.fromString(bboxs.zoomExtent,false);
		var southpolarbbox = new OpenLayers.Bounds(-180,-90,180, -60);
		return southpolarbbox.containsBounds(bbox2);			
	}else{
		return true; 		
	}
};

//returns selected zoom area
FigisMap.ol.getSettings = function( rfb, pars ) {
	if ( pars && ! ( pars.isViewer || pars.rfb )  ) return null;
	var v = georeferences_data[ rfb ];
	if ( ! v ) return null;
	v.name = rfb;
	return v;
};

FigisMap.rfb.getDescriptor = function( layerName, pars ) {
	if ( ! rfbLayerDescriptors ) return '';
	var ldn = layerName.replace(/[' ]/g,'');
	var ld = rfbLayerDescriptors[ldn];
	if ( ! ld ) return '';
	if ( typeof ld == 'string' ) return ld;
	var title = ld.label ? FigisMap.label( ld.label, pars ) : ld.title;
	if ( ld.link ) return '<a href="' + ld.link + '" title="' + title + '" target="_blank"><b>' + title + '</b></a>';
	if ( title ) return '<b>'+ title + '</b>';
	return '';
};

FigisMap.rfb.getCountries = function( layerName ) {
	if ( ! rfbLayerCountries ) return null;
	layerName = layerName.replace(/[' ]/g,'').toUpperCase();
	if ( layerName.indexOf("_DEP") > 0) layerName = layerName.replace(/_DEP$/,'');
	return rfbLayerCountries[ layerName ];
};

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
		var ttitle = skipTitle ? baseTitle : title;
		if ( type.m ) {
			var ttitle = skipTitle ? baseTitle : title;
			if ( type.i ) ttitle += ' ' + FigisMap.label('(marine)', pars);
			pars.distribution.push( { rfb: pars.rfb, settings: sett, layer: FigisMap.fifao.RFB,
				filter: "RFB = '" + pars.rfb + "' AND DispOrder = '1'",
				dispOrder : 1,
				style: sett.style,
                showLegendGraphic: true,
                group: "Layers of interest",
				rule: "Area of competence (marine waters)",
                hidden	: false,
				hideInSwitcher: false,
				title: ttitle,
				skipTitle: skipTitle
			} );
		}
		if ( type.i ) {
			var ttitle = skipTitle ? baseTitle : title;
			if ( type.m ) ttitle += ' ' + FigisMap.label('(inland)', pars);
			pars.distribution.push( { rfb: pars.rfb, settings: sett, layer: FigisMap.fifao.RFB,
				filter: "RFB = '" + pars.rfb + "' AND DispOrder = '2'",
				dispOrder : 2,
				style: sett.style,
                showLegendGraphic: true,	                
                group: "Layers of interest",
				rule: 'Established limits of the area of competence',
                hidden	: false,
				hideInSwitcher: false,
				title: ttitle,
				skipTitle: skipTitle
			} );
		}
		if ( type.r ) {
			var ttitle = FigisMap.label('Regulatory area', pars );
			pars.distribution.push( { rfb: pars.rfb, settings: sett, layer: FigisMap.fifao.RFB,
				filter: "RFB = '" + pars.rfb + "' AND DispOrder = '2'",
				dispOrder : 1,
				style: sett.style,		
                showLegendGraphic: true,	
                group: "Layers of interest",                
				rule: 'Regulatory area',
                hidden	: false,
				hideInSwitcher: false,
				title: ttitle,
				skipLegend: true
			} );
		}
		if ( type.a ) {
			var ttitle = FigisMap.label('Established limits of the area of competence', pars );
			pars.distribution.push( { rfb: pars.rfb, settings: sett, layer: FigisMap.fifao.RFB,
				filter: "RFB = '" + pars.rfb + "_DEP'",
				style: '',			
				hideInSwitcher: false,
                showLegendGraphic: true,	                
                group: "Layers of interest",
				rule: 'Established limits of the area of competence',
                hidden	: false,
				title: ttitle,
				skipLegend: true
			} );
		}
		if ( pars.attribution == null ) pars.attribution = FigisMap.rfb.getDescriptor( pars.rfb, pars );
		if ( ! pars.projection ) pars.projection =  sett.srs ? sett.srs : FigisMap.defaults.projection(pars);
		if ( pars.global == null && sett.globalZoom != null ) pars.global = sett.globalZoom;
		if ( pars.extent == null ) {
			if ( sett.zoomExtent ) pars.extent = sett.zoomExtent;
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
	//if ( pars.projection.toString() == "3349" && ( pars.rfb == 'ICES' )) pars.global = false;
};

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
};

/**
 * FigisMap.ol.getAuthLayer
 * returns proper layer for the auth level
 */
FigisMap.ol.getAuthLayer = function (type){
	/*if(type=='encounters'){
		return FigisMap.rnd.status.logged ? FigisMap.fifao.vme_en:FigisMap.fifao.vme_agg_en;
	}
	if(type=='survey'){
		return FigisMap.rnd.status.logged ? FigisMap.fifao.vme_sd: FigisMap.fifao.vme_agg_sd;
	}*/
};

/**
 * FigisMap.ol.refreshAuthorized
 * Refresh styles for encounters and Survey Data for the proper auth level (logged in)
 * 
 */
FigisMap.ol.refreshAuthorized = function(){
		/*myMap.getLayersByName('Encounters')[0].mergeNewParams({'layers':FigisMap.ol.getAuthLayer('encounters')});
        //myMap.getLayersByName('Encounters')[0].visibility = false;
        myMap.getLayersByName('Encounters')[0].redraw(true);
        
        myMap.getLayersByName('Survey Data')[0].mergeNewParams({'layers': FigisMap.ol.getAuthLayer('survey')});
        //myMap.getLayersByName('Survey Data')[0].visibility = false;
        myMap.getLayersByName('Survey Data')[0].redraw(true);*/

};

FigisMap.getFullYear = function(){
	//return new Date().getFullYear() - 1;
	return new Date().getFullYear();
}

/**
 * Stores the current selected year 
 * default: the system Date() year
 */
FigisMap.ol.selectedYear = FigisMap.getFullYear();


/**
 * Define min and max choosable year 
 * default: from 2006 to today
 */
FigisMap.ol.minYear = 2006;
FigisMap.ol.maxYear = FigisMap.getFullYear();

/*
 * Move year selector forward by 1
 */
FigisMap.ol.incrementYear = function(){
    var newyear = FigisMap.ol.selectedYear + 1;
    if(newyear <= FigisMap.ol.maxYear && newyear != FigisMap.ol.selectedYear){
        FigisMap.ol.setSelectedYear(newyear);
        updateVme();
        Ext.get('yearCurrent').update(FigisMap.ol.selectedYear);
    }
};

/*
 * Move year selector backward by 1
 */
FigisMap.ol.decrementYear = function(){
    var newyear = FigisMap.ol.selectedYear - 1;
    if(newyear >= FigisMap.ol.minYear && newyear != FigisMap.ol.selectedYear){
        FigisMap.ol.setSelectedYear(newyear);
        updateVme();
        Ext.get('yearCurrent').update(FigisMap.ol.selectedYear);
    }
};

/**
 * FigisMap.ol.getSelectedYear returns the selected year in the slider
 */
FigisMap.ol.getSelectedYear= function(){
	return FigisMap.ol.selectedYear;
};

/**
 * FigisMap.ol.getSelectedYear returns the selected year in the slider
 */
FigisMap.ol.setSelectedYear= function(newyear){
    if(newyear <= FigisMap.ol.maxYear && newyear >= FigisMap.ol.minYear && newyear != FigisMap.ol.selectedYear){
        FigisMap.ol.selectedYear = newyear;
        Ext.get('yearCurrent').update(FigisMap.ol.selectedYear);
    }
    if(newyear == FigisMap.ol.minYear){
        Ext.get('yearLess').addClass('nobackground');
        Ext.get('yearMore').removeClass('nobackground');
    }
    else if( newyear == FigisMap.ol.maxYear){
        Ext.get('yearMore').addClass('nobackground');
        Ext.get('yearLess').removeClass('nobackground');
    }else{
        Ext.get('yearMore').removeClass('nobackground');
        Ext.get('yearLess').removeClass('nobackground');
    }

};

/**
 * FigisMap.ol.getSelectedOwner returns the selected value in the Authority combo box
 */
FigisMap.ol.getSelectedOwner= function(){
	return	document.getElementById("SelectRFB").value;
};

/** 
 * FigisMap.ol.refreshFilters 
 * refresh filters when year/filter are changes
 * 
 */
FigisMap.ol.refreshFilters = function (acronym){
	var year = FigisMap.ol.getSelectedYear();
    var RFBFilter = (typeof(acronym) == 'undefined' || acronym == 'undefined' || acronym == "") ? false : true; 
	//var owner = FigisMap.ol.getSelectedOwner();

    // VME closed areas
    // Bottom fishing areas
    // Other access regulated areas

	// RFB Competence Areas
	myMap.getLayersByName('RFB Competence Areas')[0].mergeNewParams(
		{
		'CQL_FILTER': (RFBFilter ? "RFB = '" + acronym + "'" : "RFB <> '*'")
		}
	);
	
	myMap.getLayersByName('RFB Competence Areas')[0].redraw(true);
	
	// VME closed areas
	myMap.getLayersByName('VME closed areas')[0].mergeNewParams(
		{
		'CQL_FILTER': (RFBFilter ? "YEAR <= '" + year + "' AND END_YEAR >="+ year+" AND OWNER ='"+acronym+"'" : "YEAR <= '" + year + "' AND END_YEAR >="+ year),
		'STYLES': (RFBFilter ?  "MEASURES_VME_for_" + acronym : "MEASURES_VME"), 
		'STYLE': (RFBFilter ?  "MEASURES_VME_for_" + acronym : "MEASURES_VME"),
        'legend_options': "forcelabels:on;forcerule:True;fontSize:12"
		}
	);
	
	myMap.getLayersByName('VME closed areas')[0].redraw(true);   
    
	// Other access regulated areas
	myMap.getLayersByName('Other access regulated areas')[0].mergeNewParams(
		{
		'CQL_FILTER': (RFBFilter ? "YEAR <= '" + year + "' AND END_YEAR >="+ year+" AND OWNER ='"+acronym+"'" : "YEAR <= '" + year + "' AND END_YEAR >="+ year),
		'STYLES': (RFBFilter ?  "MEASURES_OTHER_for_" + acronym : "MEASURES_OTHER"), 
		'STYLE': (RFBFilter ?  "MEASURES_OTHER_for_" + acronym : "MEASURES_OTHER"),
        'LEGEND_OPTIONS': "forcelabels:on;forcerule:True;fontSize:12"
		}
	);
	
	myMap.getLayersByName('Other access regulated areas')[0].redraw(true);     
	
	/*// Encounters
	myMap.getLayersByName('Encounters')[0].mergeNewParams(
		{'CQL_FILTER': 
			"YEAR = '"+ year +"'"
		}
	);
	myMap.getLayersByName('Encounters')[0].redraw(true);
	
	// Survey Data
	myMap.getLayersByName('Survey Data')[0].mergeNewParams(
		{'CQL_FILTER':
			"YEAR = '" + year +"'"
		}
	);
	myMap.getLayersByName('Survey Data')[0].redraw(true);*/

	// Bottom fishing areas
	var m = myMap;	
	var f = m.getLayersByName('Bottom fishing areas')[0];

	f.mergeNewParams(
		{
		//'CQL_FILTER':
		//	(RFBFilter ? "YEAR <= '" + year +"'" + (FigisMap.rnd.status.logged ?  "" : " AND OWNER <> 'NPFC'") + " AND OWNER ='"+acronym+"'" : "YEAR <= '" + year +"'" + (FigisMap.rnd.status.logged ?  "" : " AND OWNER <> 'NPFC'")),
            'CQL_FILTER': (RFBFilter ? "YEAR <= '" + year + "' AND END_YEAR >="+ year+" AND OWNER ='"+acronym+"'" : "YEAR <= '" + year + "' AND END_YEAR >="+ year),
            'STYLES': (RFBFilter ?  "MEASURES_BTM_FISH_for_" + acronym: "MEASURES_BTM_FISH"), 
            'STYLE': (RFBFilter ?  "MEASURES_BTM_FISH_for_" + acronym : "MEASURES_BTM_FISH"),
            'LEGEND_OPTIONS': "forcelabels:on;forcerule:True;fontSize:12"
		}
	);
	f.redraw(true);
    
};
/*
	Drawing function: FigisMap.draw( pars );
		pars --> map parameters, an object with properties:
			
			target		: (String or reference to HTML node) the DIV where the map will be actually stored.
			context		: (String) the name of actual map context, sometimes used for defaults (Optional, defaults to 'default')
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
			watermark	: (Object) to set the map watermark (optional, defaults to FAO legend).
			landMask	: (boolean) true if the layer must be covered by the mask. Optional, defaults true.
			global		: (boolean) true to apply a global extent. Optional, defaults false.
			basicsLayers	: (boolean) true to add the FAO basic layers in the map. Optionla, defaults false.
			drawDataRect	: (boolean) to draw a data rectangle around the species layer. Optional, defaults false.
			extent		: (String) the map max extent. Optional, autoZoom on default.
			zoom		: (Number) the map initial zoom level. Optional, autoZoom on default.
		
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
			- dispOrder (integer) automatically detected if in filter, also changes layer disposition
			- rfb (string) A layer representing a RFB layer, the value is the name
			- wms (OpenLayers.Layer.WMS object) Automatically valued by default
		- an array of objects as described above.
		
		Once checked, it will be an array of { 'layer': '..', 'filter': ... }
		The filter property, if missing, will be false (boolean).
		
		In case no valid layers are found, the property will be valued with false.
	
*/
FigisMap.draw = function( pars, visibleLayers ) {
	
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
	
	var rnd = new FigisMap.renderer( { debug: pars.debug, fullWindowMap: pars.fullWindowMap } );
	var theMap = rnd.render( pars, visibleLayers );
	
	//FigisMap.lastMap = ( theMap && theMap.id && theMap.id.indexOf('OpenLayers.')==0 ) ? theMap : false;
	FigisMap.lastMap = ( theMap && theMap.id && theMap.id.indexOf('OpenLayers')==0 ) ? theMap : false;
	FigisMap.renderedMaps[ pars.target.id ] = FigisMap.lastMap;
	
	return FigisMap.lastMap;
};

FigisMap.renderer = function(options) {
	var toBoundArray = new Array();
	var boundsArray = new Array();
	var myMap = false;
	var p = new Object();
	var debug = options ? options.debug : false;
	var myBounds, boundsOrigin, boundsBox;
	var target, projection, extent, center, zoom;
	var olLayers = new Array();
	//Kiran: Changed to impage/png8 to image/png as requested by emmuaul
	var olImageFormat = OpenLayers.Util.alphaHack() ? "image/gif" : "image/png";
    var info = {controls: []};
	
	// pink tile avoidance
	OpenLayers.IMAGE_RELOAD_ATTEMPTS = 5;
	OpenLayers.DOTS_PER_INCH = 25.4 / 0.28;
	OpenLayers.Util.onImageLoadErrorColor = 'transparent';

	this.render = function( pars, visibleLayers ) {
	
	OpenLayers.Util.onImageLoad = function(){
		// //////////////////////
		// OL code
		// //////////////////////
		if (!this.viewRequestID || (this.map && this.viewRequestID == this.map.viewRequestID)) { 
			this.style.display = "";  
		}

		OpenLayers.Element.removeClass(this, "olImageLoadError");

		// //////////////////////
		// Tuna code
		// ////////////////////// 
		/*
		if(myMap.getLayersByName('Area types')[0]){        
			Ext.getCmp('years-slider').enable();
			Ext.getCmp("year-min-largestep").enable(); 
			Ext.getCmp("year-min-littlestep").enable(); 
			Ext.getCmp("year-max-littlestep").enable(); 
			Ext.getCmp("year-max-largestep").enable();
			Ext.getCmp("last-year").enable(); 
			Ext.getCmp("first-year").enable(); 
		}*/
	};
		
		FigisMap.debug( 'FigisMap.renderer render pars:', pars );
		
		projection = pars.projection;
		p = pars;
		
		if (projection == 3349) projection = 900913; // use google spherical mercator ...
		
		var mapMaxRes = FigisMap.rnd.maxResolution( projection, p );
		
		switch ( projection ) {
			case   3031 : myBounds = new OpenLayers.Bounds(-25000000, -25000000, 25000000, 25000000); break;
			case 900913 : myBounds = new OpenLayers.Bounds(-20037508.34, -20037508.34, 20037508.34, 20037508.34); break;
			//case 54012	: myBounds = new OpenLayers.Bounds(-20037508.34, -20037508.34, 20037508.34, 20037508.34); break;
			case 54009	: myBounds = new OpenLayers.Bounds(-18040095.6961652, -9020047.847897789, 18040095.6961652, 9020047.847897789); break;
			default     : projection = 4326; myBounds = new OpenLayers.Bounds(-180, -90, 180, 90);
		}
		
		boundsOrigin = new Array( myBounds.left, myBounds.bottom );
		boundsBox = new Array( myBounds.left, myBounds.bottom, myBounds.right, myBounds.top );
		
		// empty map DIV - the map, if any, is destroyed before calling
		while ( p.target.div.firstChild ) { p.target.div.removeChild(p.target.div.firstChild); }
		
		target = p.target.id;
		
		// redefine zoomworld button to zoom to default FigisMap center
		var figisPanZoom = new GlassyPanZoom({position:new OpenLayers.Pixel(10,35)});
        if ( FigisMap.defaults.mapCenter ){
            figisPanZoom.onButtonClick = function (evt) {
                OpenLayers.Control.PanZoom.prototype.onButtonClick.apply(this, arguments);
                switch (evt.buttonElement.action) {
                    case "zoomworld":
                        myMap.setCenter( FigisMap.ol.reCenter( FigisMap.defaults.mapCenterProjection, myMap.getProjection(), FigisMap.defaults.mapCenter) );
                        break;
                    default: break;
                }
 
                OpenLayers.Event.stop(evt);
            };
        }
		
		// //////////////////////////////////////////////////////////////////
		// override the adjustZoom method of OL on order to manage correctly 
		// all available zoom lavels (full window view mode)
		// //////////////////////////////////////////////////////////////////
		if(options.fullWindowMap === true){
			OpenLayers.Map.prototype.adjustZoom = function(zoom){
				return zoom;
			};
		}
		
		myMap = new OpenLayers.Map(
			p.target.id,
			{
				maxExtent: myBounds,
				restrictedExtent: ( projection == 3031 ? myBounds : null ),
				maxResolution: mapMaxRes,
				projection: new OpenLayers.Projection( 'EPSG:' + projection ),
				units: ( projection == 4326  ? 'degrees' : 'm' ),
                controls:[ new OpenLayers.Control.Navigation(),
					  new OpenLayers.Control.Button({
						displayClass: "MyButton", trigger: function(){alert("login");}
						}),
					  figisPanZoom,
					  new OpenLayers.Control.ArgParser(),
					  new OpenLayers.Control.Attribution()
                ]
			}
		);
		
		// myMap.baseLayer Backgrounds
		if(projection == 4326 || projection == 900913 ){
			for( var i=0;i<p.base.length;i++){
				myMap.addLayer( new OpenLayers.Layer.WMS(
					p.base[i].title,
					(p.base[i].remote ? (p.base[i].cached ? FigisMap.rnd.vars.remote.gwc : FigisMap.rnd.vars.remote.wms) : ( p.base[i].cached ? FigisMap.rnd.vars.gwc : FigisMap.rnd.vars.wms ) ),
					{ layers: p.base[i].layer, format: p.base[i].format ?p.base[i].format :olImageFormat, TILED: true, TILESORIGIN: boundsOrigin, BBOX: boundsBox, visibility: p.base[i].visibility  },
					{ wrapDateLine: true, buffer: 0, ratio: 1, singleTile: false}
				));
			myMap.setLayerIndex(myMap.getLayersByName(p.base[i].title)[0],0);				
			}
		}else{
			//p.defaultBase
			myMap.addLayer( new OpenLayers.Layer.WMS(
					p.defaultBase.title,
					(p.defaultBase.remote ? (p.defaultBase.cached ? FigisMap.rnd.vars.remote.gwc : FigisMap.rnd.vars.remote.wms) : ( p.defaultBase.cached ? FigisMap.rnd.vars.gwc : FigisMap.rnd.vars.wms ) ),
					{ layers: p.defaultBase.layer,  format: p.defaultBase.format ?p.defaultBase.format :olImageFormat, TILED: true, TILESORIGIN: boundsOrigin, BBOX: boundsBox },
					{ wrapDateLine: true, buffer: 0, ratio: 1, singleTile: false}
				) );
			
		}
		// add GEBCO WMS
		if(projection== 4326){
            
            //FIGIS
			/*myMap.addLayer( new OpenLayers.Layer.WMS("GEBCO imagery","http://figisapps.fao.org/figis/geoserverdv/fifao/wms",
				{layers:"fifao:gebco1",format:"image/jpeg"}, {wrapDateLine: true}
			));*/
            
            //originale
/*
			myMap.addLayer( new OpenLayers.Layer.WMS("GEBCO imagery","http://www.gebco.net/data_and_products/gebco_web_services/web_map_service/mapserv",
				{layers:"gebco_08_grid",format:"image/jpeg"}, {wrapDateLine: true}
			));
  */          
            //DEMO1
			myMap.addLayer( new OpenLayers.Layer.WMS(
				"GEBCO imagery",
				//"http://figisapps.fao.org/figis/geoserverdv/gwc/service/wms",
				FigisMap.rnd.vars.geowebcacheURL + "/wms",
				{
					layers:"fifao:gebco1",
					gridset:"EPSG:4326",
					format:"image/jpeg",
					TILED: true, 
					TILESORIGIN: boundsOrigin, 
					BBOX: boundsBox
				}, {
					wrapDateLine: true, 
					buffer: 0, 
					ratio: 1, 
					singleTile: false
				}
			));
            
			myMap.setLayerIndex(myMap.getLayersByName("GEBCO imagery")[0],1);
		}

		// Managing OL controls
		var div = OpenLayers.Util.getElement('layerswitcher');
		div.innerHTML="";
        // use custom FigisLayerSwitcher
		var lSwitcher = new FigisLayerSwitcher({div:div,ascending:false});			
		myMap.addControl( lSwitcher );
		lSwitcher.baseLbl.innerHTML = "Base layers";
        lSwitcher.dataLbl.innerHTML = "";
		
		// //////////////////////////////////////////////////////////
		// Manages toggle button for VME closed areas and Bottom fishing areas when 
		// layer is clicked on LayerSwitcher
		// //////////////////////////////////////////////////////////
		myMap.events.register("changelayer", this, function(e){
			var property = e.property;
			
			if(property == "visibility"){
				var layer = e.layer;
				var name = layer.name;
				
				var el;
				if(name == "VME closed areas"){
					el = document.getElementById("lblVME");										
				}else if(name == "Bottom fishing areas"){
					el = document.getElementById("lblFootprints");										
				}else if(name == "Other access regulated areas"){
					el = document.getElementById("lblVMEOther");										
				}
				
				if(el){
					toggleStyle(el);
				}
			}
		});

		myMap.addControl( new OpenLayers.Control.Navigation({ zoomWheelEnabled: true }) );
		myMap.addControl( new OpenLayers.Control.LoadingPanel());
		FigisMap.rnd.watermarkControl( myMap, p );

		FigisMap.rnd.mouseControl( myMap, p );
	
		if ( p.attribution ) {
			// myMap.addControl( new OpenLayers.Control.Attribution() ); // seems to be unnecessary
			myMap.baseLayer.attribution = p.attribution;
		}
		
		
		if (projection != 3031) {
			// Modification for changing unit
			myMap.addControl( new OpenLayers.Control.ScaleLine({ maxWidth: 180, bottomOutUnits: "nmi", geodesic: true }) );
		}
		
		var layers = FigisMap.rnd.addAutoLayers( FigisMap.rnd.initLayers( p ), p );
		
		for ( var i = 0; i < layers.length; i++ ) {
			var l = layers[i];
			
			// check title and lsTitle (layer switcher title)
			if ( ! l.title ) l.title = FigisMap.label( l.label ? l.label : l.layer.replace(/^[^:]+:/,''), p);
			if ( ! l.lsTitle ) l.lsTitle = l.title;
			
			// determine source of the layer
			switch ( l.layer ) {
				case FigisMap.fifao.cnt : l.cached = true; break;
				case FigisMap.fifao.ma2 : l.cached = true; break;
				case FigisMap.fifao.nma : l.cached = true; break;
				case FigisMap.fifao.mal : l.cached = true; break;
				//case FigisMap.fifao.maj : l.cached = true; break;
				default : l.cached = false;
			}
			
			// Add wms to layers missing it
			if ( ! l.wms ) {
			
				var wp = new Object(); // OpenLayers.Layer.WMS constructor Paramters
				
				wp.name = l.lsTitle;
				wp.url =  l.remote==true ? (l.cached ? FigisMap.rnd.vars.remote.gwc : FigisMap.rnd.vars.remote.wms) : ( l.cached ? FigisMap.rnd.vars.gwc : FigisMap.rnd.vars.wms );
			
				
				wp.params = { format: olImageFormat, transparent: true, TILED: true, TILESORIGIN: boundsOrigin, BBOX: boundsBox};
				wp.params.layers = l.layer;
				if ( l.filter && l.filter != '*' ) wp.params.cql_filter = l.filter;
				if ( l.rule && l.rule != '*' ) wp.params.rule = l.rule;
                if ( l.legend_options ) wp.params.legend_options = l.legend_options;
				
				
				wp.options = { wrapDateLine: true, ratio: 1, buffer: 0, singleTile: false, opacity: 1.0};
                if ( l.showLegendGraphic ) wp.options.showLegendGraphic = true;
                if ( l.infoLayersSources ) wp.options.infoLayersSources = l.infoLayersSources;
                if ( l.infoGroupsSources ) wp.options.infoGroupsSources = l.infoGroupsSources;
                if ( l.group ) wp.options.group = l.group;
				if ( l.hideInSwitcher ) wp.options.displayInLayerSwitcher = false;
				if ( l.opacity ) wp.options.opacity = l.opacity;
                if ( l.wrapDateLine ) wp.options.opacity = l.wrapDateLine;
				if ( l.hidden ) wp.options.visibility = false;
				if ( l.singleTile ) wp.options.singleTile = true;
				else{l.tiled= true; l.tilesorigin= boundsOrigin;}
				l.wms = new OpenLayers.Layer.WMS( wp.name, wp.url, wp.params, wp.options );
			}
		}
		
		layers = FigisMap.rnd.sort4map( layers, p );
		var vme = new Array();
		// FILLING THE MAP
		for (var i = 0; i < layers.length; i++) {
			var l = layers[i];

			if ( l.inMap ) continue;
			if ( ! l.wms ) continue;

			if ( l.style && l.style != '*' && l.style != 'default' ) l.wms.mergeNewParams({ STYLES: l.style, STYLE: l.style  });
			
			//myMap.addLayer( l.wms );
			olLayers.push( l.wms );
			
			//if (l.wms.name == 'Area types' || l.wms.name == 'Footprints'  || l.wms.name == 'Encounters'  || l.wms.name == 'Survey Data'){
			//if (l.wms.name == 'VME closed areas' || l.wms.name == 'Other access regulated areas' || l.wms.name == 'Bottom fishing areas'  || l.wms.name == 'Encounters'  || l.wms.name == 'Survey Data'){
			//if (l.wms.name == 'VME closed areas' || l.wms.name == 'Other access regulated areas' || l.wms.name == 'Bottom fishing areas' || l.wms.name == 'RFMO Regulatory Areas'){
            if (l.wms.name == 'VME closed areas' || l.wms.name == 'Other access regulated areas' || l.wms.name == 'Bottom fishing areas'){
				vme.push(olLayers[i]);
			}


			l.inMap = true;
		}
		
    //document.getElementById("layerswitcher").innerHTML="";  
		

		var controls = FigisMap.ol.createPopupControl(vme);		
        myMap.addControls(controls);        
        
		
		FigisMap.debug( 'FigisMap.renderer layers array, after filling map:', layers );
		
		// BUILDING THE LEGEND
		FigisMap.rnd.legend( layers, p );
		
		/** Alessio: create Stocks layer **/
		OpenLayers.Feature.Vector.style['default']['fill'] = false;
		OpenLayers.Feature.Vector.style['default']['fillOpacity'] = '0';
		OpenLayers.Feature.Vector.style['default']['strokeWidth'] = '2';
		

		
		//myMap.zoomToExtent( myBounds, true );
		if ( p.global ) {
			myMap.zoomToMaxExtent();
			FigisMap.debug('Render for p.global');
			finalizeMap(visibleLayers);
		} else if ( p.extent || p.center || p.zoom ) {
			myMap.zoomToMaxExtent();
			FigisMap.debug('Render for Extent', p.extent, 'Zoom', p.zoom, 'Center', p.center );
			if ( p.extent ) myMap.zoomToExtent( FigisMap.ol.reBound( p.dataProj, projection, p.extent ), false);
			if ( p.zoom ) myMap.zoomTo( p.zoom, true );
			if ( p.center ) myMap.setCenter( FigisMap.ol.reCenter( p.dataProj, projection, p.center) );
			finalizeMap(visibleLayers);
		} else {
			autoZoom( layers );
		}
			// handlig the zoom/center/extent
		if ( projection == 4326 ) {
            var graticule = new OpenLayers.Control.Graticule({visible: false, layerName: FigisMap.label('Coordinates Grid', p)});
            myMap.addControl(graticule);
            //graticule.gratLayer.group = "Layers of interest";
            graticule.gratLayer.group = "Additional features";
            graticule.gratLayer.infoGroupsSources = FigisMap.infoGroupsSources.overlays;
            myMap.raiseLayer(myMap.getLayersByName("Coordinates Grid")[0], layers.length+1);
        }
        
		FigisMap.debug('myMap:', myMap );
		//OpenLayers.Util.getElement()
		//Ext.get("id_box").insertBefore(Ext.get("zoom_selector"));  
		//document.getElementById("div_Overlays").insertBefore(document.getElementById("div_VME-DB layers"));
		return myMap;
		
	}; //function ends
	
	function finalizeMap(visibleLayers) {
		FigisMap.debug('Finalizing map:', myMap, 'olLayers:',olLayers);
		myMap.updateSize();
		
	    // ///////////////////////////////////////////
		// Set layers visibility if 'layers' in URL
		// ///////////////////////////////////////////
		if(visibleLayers){
			var olLayersNames = visibleLayers.split(";");
			
			//
			// hide all layers before
			//			
			var size = olLayers.length;
			
			for(var i=0; i<size; i++){
				var layer = olLayers[i];

				if(layer){
				    var layerName = layer.name;
					layer.setVisibility(false);
					
					for(var y=0; y<olLayersNames.length; y++){
						if(layerName == decodeURIComponent(olLayersNames[y])){
							layer.setVisibility(true);
						}
					}

					var el;
					if(layerName == "VME closed areas"){
						el = document.getElementById("lblVME");	
						if(layer.getVisibility()){
							el.className = "lblVME figisButtonToggleVME";
						}else{
							el.className = "lblVME figisButtonVME";
						}							
					}else if(layerName == "Bottom fishing areas"){
						el = document.getElementById("lblFootprints");				
						if(layer.getVisibility()){
							el.className = "lblFootprints figisButtonToggleBOTTOM";
						}else{
							el.className = "lblFootprints figisButtonBOTTOM";
						}					
					}else if(layerName == "Other access regulated areas"){
						el = document.getElementById("lblVMEOther");				
						if(layer.getVisibility()){
							el.className = "lblVMEOther figisButtonToggleOTHER";
						}else{
							el.className = "lblVMEOther figisButtonOTHER";
						}					
					}					
				}
			}
		}
		
		myMap.addLayers( olLayers );
        
		if ( FigisMap.isDeveloper || FigisMap.isTesting ) {
			myMap.events.register(
				'moveend',
				this,
				function(){
					FigisMap.console( [
						'Map moved/zoomed, center:', myMap.getCenter(),
						'Extent:', myMap.getExtent(),
						'Projection:', myMap.getProjection()
					], false );
				}
			);
		}
	}
	
	function autoZoom( layers ) {
		FigisMap.debug('Check autoZoom on:', layers, 'toBoundArray:', toBoundArray);
		for (var i = 0; i < layers.length; i++) {
			var l = layers[i];
			if ( l.autoZoom ) {
				var url = FigisMap.rnd.vars.wfs + l.layer;
				if (l.filter != "*") {
					var flt = String( l.filter );
					if ( l.dispOrder ) flt = flt.replace(/ and disporder.*$/i,'');
					flt = '&cql_filter=' + escape('(' + flt + ')');
// 						flt = '&cql_filter=(' + flt.replace(/ /g,'%20') + ')';
					flt += '&propertyName=' + String( l.filter ).replace(/^[^a-z0-9]*([^ =]+).*/i,"$1");
					url += FigisMap.useProxy ? escape( flt ) : flt.replace(/ /g,'%20');
				}
				FigisMap.debug('autoZoom on:', l, 'url:', url );
				toBoundArray.push( url );
			}
		}
		if ( toBoundArray.length != 0 ) {
			FigisMap.debug('toBoundArray:', (new Array()).concat(toBoundArray) );
			for ( var i = 0; i < toBoundArray.length; i++ ) {
				OpenLayers.Request.GET({ url: toBoundArray[i], callback: autoZoomStep });
			}
		} else {
			FigisMap.debug('No autozoom layers found');
			myMap.zoomToMaxExtent();
			finalizeMap();
		}
	}
	
	function autoZoomStep( req ) {
		if ( req  && req.status ) {
			var bounds = false;
			if (req.status == 200) {
				bounds = FigisMap.ol.gmlBbox( req.responseXML );
				FigisMap.debug( 'autoZoomStep Bounds:', bounds );
				boundsArray.push(bounds);
			}
		}
		if ( toBoundArray.length == boundsArray.length ) autoZoomEnd();
	}
	
	function autoZoomEnd() {
		var bounds, gbounds = new Array();
		for ( var i = 0; i < boundsArray.length; i++ ) if( boundsArray[i] ) gbounds.push( boundsArray[i] );
		if ( gbounds.length != 0 ) {
			bounds = gbounds[0];
			//for (var i = 1; i < gbounds.length; i++) bounds.extend( gbounds[i] );
			for (var i = 1; i < gbounds.length; i++) bounds = FigisMap.ol.extend( bounds, gbounds[i] );
		} else {
			bounds = myMap.getMaxExtent();
		}
		if ( bounds ) {
			var proj = parseInt( myMap.projection.projCode.replace(/^EPSG:/,'') );
			
			var nb = FigisMap.ol.reBound( p.dataProj, proj, bounds );
			
			myMap.zoomToExtent( nb, false );
			
			var nc = false;
			if ( proj == 3031 ) {
				// center to south pole in polar projection
				nc = FigisMap.ol.reCenter( 4326, proj );
			} else if ( proj == 900913 || proj == 3349 ) {
				// center to Pacific centre in Mercator - only if larger than 35k km (whole world)
				var nbw = Math.abs( nb.right - nb.left );
				if ( nbw > 35000000 ) {
					nc = FigisMap.ol.reCenter( 4326, proj );
					nc.lat = ( nb.top + nb.bottom )/2;
				}
			}
			if ( nc ) myMap.setCenter( nc );
			FigisMap.debug( 'FigisMap.renderer autoZoom values:', { bounds: bounds, boundsSize: bounds.getSize(), nb: nb, nc : nc, mapSize: myMap.getSize() } );
		}
		finalizeMap();
	}
	
	/*
	// parseDataRectangle
	function parseDataRectangle(req, theMap) {
		var options = { returnBbox: true };
		var g = new OpenLayers.Format.GML();
		features = g.read(req.responseText, options);
		
		var bounds = features.bbox;
		var minx = bounds.left;
		var miny = bounds.bottom;
		var maxx = bounds.right;
		var maxy = bounds.top;
		
		if (maxx - minx < 200) {
			var vectorLayer = new OpenLayers.Layer.Vector("Species Envelope");
			var style_polygon = {
				strokeColor: "black",
				strokeOpacity: 1,
				strokeWidth: 1,
				fillOpacity: 0
			};
			var pointList = [];
			if (maxx - minx < 12) {
				minx = minx - 2;
				miny = miny - 2;
				maxx = maxx + 2;
				maxy = maxy + 2;
			}
			var newPoint1 = new OpenLayers.Geometry.Point(minx, miny);
			pointList.push(newPoint1);
			var newPoint2 = new OpenLayers.Geometry.Point(minx, maxy);
			pointList.push(newPoint2);
			var newPoint3 = new OpenLayers.Geometry.Point(maxx, maxy);
			pointList.push(newPoint3);
			var newPoint4 = new OpenLayers.Geometry.Point(maxx, miny);
			pointList.push(newPoint4);
			
			pointList.push(pointList[0]);
			
			var linearRing = new OpenLayers.Geometry.LinearRing(pointList);
			polygonFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Polygon([linearRing]), null, style_polygon);
			theMap.addLayer(vectorLayer);
			vectorLayer.addFeatures([polygonFeature]);
		}
		//theMap.zoomToMaxExtent();
	} // function ends
	*/
	
}; //FigisMap.renderer Class Ends
Ext.onReady(function(){
    /*FigisMap.loginWin.on('login',function(user){
    		FigisMap.ol.refreshAuthorized();    
    		FigisMap.ol.clearPopupCache();  
            
            var rfb = getRFBCheckBoxValue();
		    FigisMap.ol.refreshFilters(rfb);
    });
    
    FigisMap.loginWin.on('logout',function(user){
    		for (var popupKey in FigisMap.popupCache){                
                    FigisMap.popupCache[popupKey].close();
    		}
    		
            FigisMap.ol.refreshAuthorized();
			
            var rfb = getRFBCheckBoxValue();
			FigisMap.ol.refreshFilters(rfb);
    });*/
    
});
