/**
 * FIRMS Map viewer Javascript
 * Authors: M. Balestra, E. Blondel
 * 
 * [unicode glyph: ]
 */

var performAutoZoom = true;

//Load dependencies
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/vendor/ol3/ol3-animatedclusterlayer.js');
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/vendor/ol3/ol3-selectclusterinteraction.js');
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/FigisMap/FigisMap-vector.js'); //manage vector and cluster sources

FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/vendor/ol3/ol3-popup.js');
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/FigisMap/FigisMap-popup.js');

var FV = new Object();

FV.myMap = false;
FV.currentFeatureID = false;
FV.isViewerEmbedded = false;

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
		loadingPanelOptions : FV.loadingPanelOptions,
		layerSwitcherOptions: { displayLegend: true }
	};
	
	//baselayers
	this.base = [{
		cached: true,
		filter: "",
		label: "Oceans basemap",
		layer: FigisMap.fifao.obl,
		title: "Oceans basemap",
		type: "base"
	}];
	
// 	this.associated = [ FigisMap.fifao.rfb ];
	this.vectorLayer = {};
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
				content.appendChild(request.responseXML.documentElement);
				var h = content.innerHTML;
				if ( ! FV.isViewerEmbedded ) h = h.replace(/ target="_top"/g,' target="firms"');
				return h;
			},
			onopen: function( feature ){
				FV.currentFeatureID = feature.get('FIGIS_ID');
			},
			onclose: function( feature ){
				FV.currentFeatureID = false;
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
	FV.baseMapParams.prototype.setLayer
	@param l: layer, string
	Uses and sets layer
*/
FV.baseMapParams.prototype.setLayer = function( l ) {
	if(l && l != "") {

		var sourceUrl = FV.baseMapParams.prototype.getLayerUrl( l );

		this.vectorLayer = {
			id: l,
			source: FigisMap.rnd.configureVectorSource(sourceUrl, FV.getCQLFilterByCategory( l ), null, false, function(){

				if(FV.kvpFilters) if(FV.kvpFilters.length > 0){
					
					//criteria to decide either to use zoomToExtent based on the vector Source extent or the FigisMap.rfbLayerSettings
					var layerZoomingRule = FV.kvpFilters[0].value  == "DG MARE" || FV.kvpFilters[0].value == "BNP" || FV.kvpFilters[0].value == "WECAFC";
					//var layerZoomingRule = FV.lastPars.vectorLayer.source.getFeatures().length < 25;

					if(FV.kvpFilters[0].value.length > 1 || layerZoomingRule) {
						FV.myMap.zoomToExtent(FV.lastPars.vectorLayer.source.getExtent());
					}else{
						var acronym = FV.kvpFilters[0].value;
						if( FigisMap.rfbLayerSettings[acronym] ) {				
							var bounds = FigisMap.rfb.evalOL( FigisMap.rfbLayerSettings[acronym].zoomExtent );
							var proj0 = "EPSG:"+FigisMap.rfbLayerSettings[acronym].srs;
							var proj1 = FV.myMap.getView().getProjection().getCode();
							var newBounds = (proj0 === proj1)? bounds : FigisMap.ol.reFit(FV.myMap, FigisMap.ol.reBound(proj0, proj1, bounds));
							FV.myMap.zoomToExtent( newBounds );
						}
					}
				}
				
			}),
			title: l == 'resource' ? "Marine resources" : "Fisheries",
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
	FV.baseMapParams.prototype.updateLayerSource
	@param l: layer, string
	Updates the layer source
*/
FV.baseMapParams.prototype.updateLayerSource = function( l , filter) {
	if(l && l != "") {

		var sourceUrl = FV.baseMapParams.prototype.getLayerUrl( l );

		this.vectorLayer.source = FigisMap.rnd.configureVectorSource(sourceUrl, filter);

		FigisMap.rnd.updateVectorLayer(FV.myMap, this.vectorLayer);
		
	}
}

/*
	FV.baseMapParams.prototype.addFilterCategory
	@param parent: the parent ('resource'/'fishery')
	@param category: the resource/fishery category, string
	Updates the layer source
*/
FV.baseMapParams.prototype.addFilterCategory = function( parent, category ) {
	if( category ) {
		FV.categories[parent].push(category);
		if(typeof this.category == "undefined") this.categories = new Object();
		this.categories[parent] = FV.categories[parent];
	} else {
		return false;
	}
	return true;
}


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
FV.addViewer = function(extent, center, zoom, projection, layer ){

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
	FV.lastPars = pars;
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
	if ( ! cp ) if ( document.getElementById('SelectSRS54009').checked ) cp = '54009';
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
	if(FV.lastExtent) FV.lastCenter = ol.extent.getCenter(FV.lastExtent);
	FV.lastZoom = false;
	FV.setViewer();
};

FV.currentLayer = function( l ) {
	if ( l ) {
		if(typeof FV.categories == "undefined"){
			FV.categories = new Object();
		}
		if(typeof FV.categories[l] == "undefined") FV.categories[l] = [];
		l = String(l);
		FV.setLayerStatus('resource', (l == 'resource') );
		FV.setLayerStatus('fishery', (l == 'fishery') );
		if ( typeof FV.lastPars != 'undefined') FV.filterByCategory( l );
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


FV.getCQLFilterByCategory = function(parent) {
	var cqlFilter = "";
	if( FV.categories[parent].length > 0 ){
		var filterCategories = "('" + FV.categories[parent].join("','") + "')";
		cqlFilter = "CATEGORY IN " + filterCategories;
	}

	if(FV.kvpFilters) if (FV.kvpFilters.length > 0) {
		for(var i=0;i<FV.kvpFilters.length;i++){
			var kvp = FV.kvpFilters[i];
			if (cqlFilter != "") cqlFilter += " AND ";
			cqlFilter += kvp["property"] + " IN ('" + kvp["value"].join("','") + "')";
		}
	}
	console.log(cqlFilter);
	return cqlFilter;
}
FV.getFilterCheckboxes = function(l) {
	var parent = typeof l == 'undefined' ? FV.currentLayer() : l;
	var theDiv = document.getElementById('resourceSwitcher-'+parent).parentNode;
	return theDiv.getElementsByTagName('ul')[0].getElementsByTagName('input');
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
FV.setCategories = function( l ) {
	var parent = typeof l == 'undefined' ? FV.currentLayer() : l;
	var chks = FV.getFilterCheckboxes( parent );
	var tmp = [];
	for ( var i = 0; i < chks.length; i++ ) {
		if ( chks[i].checked ) tmp.push(chks[i].value);
	}
	FV.categories[parent] = [];
	if ( tmp.length == 0 ) {
		for ( var i = 0; i < chks.length; i++ ) chks[i].checked = true;
	} else if ( tmp.length < chks.length ) {
		FV.categories[parent] = tmp;
	}
};
FV.setKvpFilters = function( kvps ) {
	FV.kvpFilters = kvps;
}

FV.filterByCategory = function(l) {	
	FV.setCategories( l );
	var parent = typeof l == 'undefined' ? FV.currentLayer() : l;
	FV.lastPars.updateLayerSource( parent, FV.getCQLFilterByCategory(parent));
};
// FV.filterLayerByCategory = function( id, parent, category ) {
// 	if( document.getElementById(id).checked ){
// 		FV.lastPars.addFilterCategory( parent, category );
// 	} else {
// 		FV.categories[parent] = FV.categories[parent].filter(function(i) {
// 			return i != category;
// 		});
// 	}
// 	FV.lastPars.updateLayerSource( FV.currentLayer(), FV.getCQLFilterByCategory(parent));
// };
// 
// FV.filterResourcesByCategory = function(id, category){
// 	FV.filterLayerByCategory(id, "resource", category);
// }
// 
// FV.filterFisheriesByCategory = function(id, category){
// 	FV.filterLayerByCategory(id, "fishery", category);
// }


/**
* FV.setViewerPage function. Load the base FIRMS Map applying the user request parameters, if any
*/
FV.setViewerPage = function() {
	var layer, extent, center, zoom, prj, featureid, cats, agency;
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
		if ( layer && cats ) FV.filterReload( layer, cats);
		if ( agency == '') agency = null;
		if ( agency != null) FV.setKvpFilters( [{property: "AGENCY", value: agency}] );	

		//on finalize
		if ( featureid ) finalize.push('FV.setViewerResource('+featureid+')');
		//if ( agency != null) finalize.push('FV.myMap.zoomToExtent('+FV.lastPars.vectorLayer.source.getExtent()+')');		
	} else {
		zoom = 1;
		FV.currentLayer('resource');
		layer = 'resource';
	}
	if ( location.search.indexOf("embed=y") != -1 ) FV.isViewerEmbedded = true;
	if ( finalize.length > 0 ) {
		finalize = finalize.join(';');
		FV.onDrawEnd = function() { setTimeout( finalize, 10) };
	}
	//Load the Viewer using the request parameters
	FV.addViewer( extent, center, zoom, prj, layer );
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
	if ( FV.kvpFilters ) if (FV.kvpFilters.length > 0) url += "&agency=" + FV.kvpFilters[0].value.join(',');
	if ( FV.currentFeatureID ) url += '&feat=' + FV.currentFeatureID;
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
	//@eblondel deactivate setCenter with popup dynamicPosition (to discuss further)
	/* FV.myMap.getView().setCenter(feature.getGeometry().getCoordinates()); */
	//open popup
	FigisMap.rnd.emulatePopupForFeature(FV.myMap, FV.currentLayer(), feature);
};
FV.zoomViewerResource = function(id) {
	var feature = FigisMap.ol.getVectorLayerFeatureById(FV.myMap, 'FIGIS_ID', id);
	FV.myMap.getView().setCenter(feature.getGeometry().getCoordinates());
};
FV.triggerViewerResource = function(id){
	var p = FigisMap.lastMap.getOverlayById( FV.currentLayer() );
	if ( p.isOpened() ) {
		p.hide();
		FigisMap.lastMap.getInteractions().getArray().filter(function(i){return i instanceof ol.interaction.SelectCluster})[0].clear();
	} else {
		FV.setViewerResource(id);
	}
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
			fpars.distribution[i].showLegendGraphic = true;
			pars.distribution.push( fpars.distribution[i] );
		}
	}
	if ( fpars.intersecting ) {
		if ( ! pars.intersecting ) pars.intersecting = [];
		if ( !( pars.intersecting.constructor === Array ) ) pars.intersecting = [ pars.intersecting ];
		if ( !( fpars.intersecting.constructor === Array ) ) fpars.intersecting = [ fpars.intersecting ];
		for ( var i = 0; i < fpars.intersecting.length; i++ ) {
			fpars.intersecting[i].showLegendGraphic = true;
			pars.intersecting.push( fpars.intersecting[i] );
		}
	}
	if ( fpars.associated ) {
		if ( ! pars.associated ) pars.associated = [];
		if ( !( pars.associated.constructor === Array ) ) pars.associated = [ pars.associated ];
		if ( !( fpars.associated.constructor === Array ) ) fpars.associated = [ fpars.associated ];
		for ( var i = 0; i < fpars.associated.length; i++ ) {
			fpars.associated[i].showLegendGraphic = true;
			pars.associated.push( fpars.associated[i] );
		}
	}
	if ( ftitle ) pars.attribution = '<span class="buttons"><a href="javascript:FV.addViewer()" title="Close the resource">✖</a> <a href="javascript:FV.triggerViewerResource('+fid+')" title="Information popup">❖</a></span> <span class="rtitle">'+ftitle+'</span>';
	//FV.onDrawEnd = function() { setTimeout('FV.setViewerResource('+fid+')',10) };
	FV.onDrawEnd = function() { setTimeout('FV.fsAutoMapPostCheck('+fid+')',10) };
	FV.draw( pars );
	setTimeout('FV.currentFeatureID = '+fid,10);
};
FV.fsAutoMapPostCheck = function(fid) {
	var e = FV.getExtent();
	var c = FV.getCenter();
	if( e && c ) if ( ( c[1] < e[1] ) || ( c[1] > e[3] ) ) FV.zoomViewerResource(fid);
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
		//var url = FigisMap.currentSiteURI + "/figis/firmsviewersearch/" + FV.currentLayer() + '/'+ escape(text);
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
