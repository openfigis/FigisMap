/**
 * FIRMS Map viewer Javascript
 * Authors: M. Balestra, E. Blondel
 * 
 */

var performAutoZoom = true;

//Load dependencies
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/vendor/ol3/ol3-animatedclusterlayer.js');
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/vendor/ol3/ol3-selectclusterinteraction.js');
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/FigisMap-cluster.js');

FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/vendor/ol3/ol3-popup.js');
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/FigisMap-popup.js');

var FV = new Object();

FV.myMap = false;
FV.currentFeatureID = false;

FV.init = function() {
	FV.setViewerPage();
};

FV.loadingPanelOptions = {
	showPanel	: false,
	onstart		: function()
		{
			var d = this.getMap().getTargetElement().ownerDocument;
			d.getElementById('progressIndicatorValue').style.width='0px';
			d.getElementById('progressIndicator').style.display='block';
		},
	onprogress	: function(i,j)
		{
			var d = this.getMap().getTargetElement().ownerDocument;
			d.getElementById('progressIndicatorValue').style.width=String(parseInt(100 * i / j))+'%';
		},
	onend		: function()
		{
			var d = this.getMap().getTargetElement().ownerDocument;
			d.getElementById('progressIndicator').style.display='none';
			var w = d.defaultView || d.parentWindow;
			if ( w.FV.onDrawEnd ) {
				w.FV.onDrawEnd.call(w);
				w.FV.onDrawEnd = false;
			}
		}
};

FV.baseMapParams = function() {
	this.target = 'map';
	this.context = 'FAO-FIRMSViewer';
	this.mapSize = 'L';
	this.projection = FV.currentProjection();
	this.watermark = {
		src: FigisMap.httpBaseRoot + 'img/firms/watermark.png',
		title : 'Powered by FIGIS',
		width : 176,
		height : 48,
		wclass : 'ol-powered-by'
	};
	this.options = {
		skipScale: true,
		labels: true,
		loadingPanelOptions : FV.loadingPanelOptions,
		layerSwitcherOptions: { displayLegend: true }
	};
	this.base = {
		cached: true,
		filter: "",
		label: "Oceans basemap",
		layer: FigisMap.fifao.obl,
		title: "Oceans basemap",
		type: "base"
	};
// 	this.associated = [ FigisMap.fifao.rfb ];
	this.popup = {
		resourceHandler : function(feature) {
			return '/figis/moniker.html/firmspopup/'
				+ feature.get('DOMAIN') + '/' + feature.get('FIGIS_ID')
				+ '/' + feature.get('LANG')
			;
		},
		contentHandler : function(feature, request) {
			var content = document.createElement("div");
			content.appendChild(request.responseXML.documentElement);
			return content.innerHTML;
		},
		onopen: function( feature ){
			FV.currentFeatureID = feature.get('FIGIS_ID');
		},
		onclose: function( feature ){
			FV.currentFeatureID = false;
		},
		tooltipHandler : function(feature){
			return ((feature.get('DOMAIN') == 'fishery')? (feature.get('GEOREF') + ' ') : '') + feature.get('TITLE');
		}
	};
	return this;
};
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
FV.baseMapParams.prototype.setLayer = function( l ) {
	if(l && l != "") {
		this.vectorLayer = {
			id: l,
			source: FigisMap.rnd.vars.wfs + 'firms:' + l + '_all_points',
			title: l == 'resource' ? "Marine resources" : "Fisheries",
			icon: 'img/firms/' + l + '.png',
			iconHandler: function(feature) {
				var imgRef = l;
				var specialCases = ["472","473","474"];
				if(feature) if(specialCases.indexOf(feature.get('FIGIS_ID')) != -1) imgRef = 'fishery_production_system';			
				return 'img/firms/' + imgRef + '.png';
			}, 
			cluster: true,
			clusterOptions: { distance: 30, animate: true, singlecount: false, icon: 'img/firms/' + l + '_cluster.png' }
		}
	}
};

FV.getExtent = function() {
	return ( FV.myMap ) ? FV.myMap.getView().calculateExtent(FV.myMap.getSize()) : null;
};

FV.getCenter = function() {
	return ( FV.myMap ) ? FV.myMap.getView().getCenter() : null;
};

/**
* FV.addViewer function.
*       extent -> The extent to zoom after the layer is rendered (optional).
* 	center -> The center to zoom on after the layer is rendered (optional).
*       zoom -> The zoom level of the map (optional).
*       mapProjection -> The map projection (optional).
*       layer -> the FIRMS layer to use as cluster layer
**/
FV.addViewer = function(extent, center, zoom, projection, layer){

	//parameters
	var pars = new FV.baseMapParams();
	
	pars.setProjection( projection );
	pars.setExtent( extent );
	pars.setCenter( center );
	pars.setZoom( zoom );
	if ( ! layer ) layer = FV.currentLayer();
	pars.setLayer( layer );
	
	FV.draw( pars );
};
FV.draw = function( pars ) {
	closeSearch();
	if ( ! pars.distribution ) if ( ! pars.associated  ) if ( ! pars.intersecting ) if (! pars.extent) pars.global = true;
	FV.myMap = FigisMap.draw( pars );
	FV.lastExtent = null;
	FV.lastCenter = null;
	FV.lastZoom = null;
	FV.currentFeatureID = false;
};
FV.onDrawEnd = false;
/**
* FV.setViewer function.
*       extent -> The extent to zoom after the layer is rendered (optional).
* 	center -> The center to zoom on after the layer is rendered (optional).
*       zoom -> The zoom level of the map (optional).
*       mapProjection -> The map projection (optional).
**/
FV.setViewer = function(extent, center, zoom, projection){
	if ( ! projection ) projection = FV.currentProjection();
	//if (! zoom || zoom == 0) zoom = 1;
	FV.addViewer(extent, center, zoom, projection,FV.currentLayer());
};

FV.currentProjection = function( p ) {
	var cp;
	if ( document.getElementById('SelectSRS4326').checked ) cp = '4326';
	if ( ! cp ) if ( document.getElementById('SelectSRS3349').checked ) cp = '3349';
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
	}
	FV.lastProjection = parseInt( p );
	return FV.lastProjection;
};
FV.switchProjection = function( p ) {
	var op = FV.lastProjection;
	p = FV.currentProjection( p );
	var oe = FV.getExtent();
	var ne = FigisMap.ol.reBound(op,p,oe);
	FV.lastExtent = FigisMap.ol.isValidExtent(ne) ? ne : false;
	FV.lastZoom = false;
	FV.setViewer();
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
FV.switchLayer = function( l ) {
	FV.currentLayer( l );
	FV.setViewer();
};

/**
* FV.setViewerPage function. Load the base FIRMS Map applying the user request parameters, if any
*/
FV.setViewerPage = function() {
	
	var layer, extent, center, zoom, prj, featureid;
	
	if ( location.search.indexOf("layer=") != -1 ){
		
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
			}
		}
		
		if ( layer && layer != "" ) FV.currentLayer( layer );
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
		if ( featureid ) FV.onDrawEnd = function() { setTimeout('FV.setViewerResource('+featureid+')',10) };
	} else {
		zoom = 1;
		FV.currentLayer('resource');
		layer = 'resource';
	}
	
	//Load the Viewer using the request parameters
	FV.addViewer( extent, center, zoom, prj, layer);
};

/**
* setFirmsViewerEmberLink function. Manage the expand/collapse of the Embed-Link div.
*/
FV.setViewerEmbedLink = function(){

	if ( ! ( document.getElementById ) ) return void(0);
	if ( ! FV.myMap ) FV.myMap = FigisMap.lastMap;
	
	//Building the request url containing the map status.
	var url = location.href.replace(/#.*$/,'').replace(/\?.*$/,'')
		+ "?layer=" + FV.currentLayer()
		+ "&extent=" + FV.myMap.getView().calculateExtent(FV.myMap.getSize()).join(',')
		+ "&center=" + FV.myMap.getView().getCenter().join(',')
		+ "&zoom=" + FV.myMap.getView().getZoom()
		+ "&prj=" + FV.currentProjection();
	if ( FV.currentFeatureID ) url += '&feat=' + FV.currentFeatureID;
	var urle = url + '&embed=y';
	
	//Setting the input fields of the embed-link div
	document.getElementById('firms-link').value = url;
	document.getElementById('firms-html').value = '<iframe src ="' + urle + '" width="800" height="600" frameborder="0" marginheight="0"></iframe>';
	document.getElementById('firms-embed').value = urle;
};


/**
 * Focus on a given factsheet resource. The focus is done by:
 * - recentering map to its coordinates (TODO investigate map animation with OL3)
 * - opening automatically its popup.
 * @param {Integer}{String} FIGIS factsheet id, provided as integer or string 
 */
FV.setViewerResource = function(id) {
	
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
	FV.myMap.getView().setCenter(feature.getGeometry().getCoordinates());
	
	//open popup
	var popup = FigisMap.rnd.getPopupOverlay(FV.myMap, FV.currentLayer());
	FigisMap.rnd.showPopupForCoordinates(popup, feature, feature.getGeometry().getCoordinates());
};

FV.fsAutoMap = function( fid, ftitle, fpars ) {
	if ( typeof fpars == 'string' ) eval( ' fpars = ' + fpars );
	FV.lastExtent = false;
	FV.lastCenter = false;
	var pars = new FV.baseMapParams();
	pars.setZoom( 1 );
	pars.setLayer( FV.currentLayer() );
	pars.zoom = null;
	if ( fpars.distribution ) {
		if ( ! pars.distribution ) pars.distribution = [];
		if ( !( pars.distribution.constructor === Array ) ) pars.distribution = [ pars.distribution ];
		if ( !( fpars.distribution.constructor === Array ) ) fpars.distribution = [ fpars.distribution ];
		for ( var i = 0; i < fpars.distribution.length; i++ ) {
			pars.distribution.push( fpars.distribution[i] );
		}
	}
	if ( fpars.intersecting ) {
		if ( ! pars.intersecting ) pars.intersecting = [];
		if ( !( pars.intersecting.constructor === Array ) ) pars.intersecting = [ pars.intersecting ];
		if ( !( fpars.intersecting.constructor === Array ) ) fpars.intersecting = [ fpars.intersecting ];
		for ( var i = 0; i < fpars.intersecting.length; i++ ) {
			pars.intersecting.push( fpars.intersecting[i] );
		}
	}
	if ( fpars.associated ) {
		if ( ! pars.associated ) pars.associated = [];
		if ( !( pars.associated.constructor === Array ) ) pars.associated = [ pars.associated ];
		if ( !( fpars.associated.constructor === Array ) ) fpars.associated = [ fpars.associated ];
		for ( var i = 0; i < fpars.associated.length; i++ ) {
			pars.associated.push( fpars.associated[i] );
		}
	}
	if ( ftitle ) pars.attribution = '<a href="javascript:FV.addViewer()">✕</a> <a href="javascript:FV.setViewerResource('+fid+')" title="Show popup">'+ftitle+'</a>';
	//FV.onDrawEnd = function() { setTimeout('FV.setViewerResource('+fid+')',10) };
	FV.draw( pars );
	setTimeout('FV.currentFeatureID = '+fid,10);
};

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
		var url = FigisMap.currentSiteURI + "/figis/firmsviewersearch/" + FV.currentLayer() + '/'+ escape(text);
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
	var resultnodes = doc.documentElement.getElementsByTagName('result');
	var results = [];
	var hasResult = ( resultnodes && resultnodes.length && resultnodes.length > 0 );
	if ( hasResult ) results = resultnodes[0].getElementsByTagName('doc');
	var hasResults = ( results.length > 0 );
	FV.fts.deliveryClean();
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
	} else {
		FV.fts.showResult.className = 'haveResults';
		FV.fts.deliveryComment( 'No matching results' );
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
	var ret = {};
	var ns = node.children;
	if ( ns.length == 0 ) return false;
	var pfx = 'fts_';
	for ( var j = 0; j < ns.length; j++ ) {
		var n = ns[j];
		ret[ pfx + n.getAttribute('name') ] = ( n.nodeName == 'arr' ) ? n.children[0].childNodes[0].nodeValue : n.childNodes[0].nodeValue;
	}
	var p = document.createElement('p');
	var t = ret[ pfx + 'title' ];
	if ( ret[ pfx + 'georeference' ] ) t = ret[ pfx + 'georeference' ] + ' ' + t;
	if ( ret[ pfx + 'figisid' ] ) {
		t = '<a href="javascript:FV.setViewerResource('+ret[ pfx + 'figisid' ] +')">' + t + '</a>';
	}
	p.innerHTML = t;
	return p;
};
