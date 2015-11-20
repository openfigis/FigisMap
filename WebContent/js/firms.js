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

FV.init = function() {
	FV.setViewerPage();
};

FV.loadingPanelOptions = {
	showpanel	: false,
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
		}
};

FV.baseMapParams = function() {
	this.target = 'map';
	this.context = 'FIRMS-Viewer';
	this.projection = FV.currentProjection();
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
	this.popup = {
		resourceHandler : function(feature) {
			return '/figis/moniker.html/firmsviewerpopup/'
				+ feature.get('DOMAIN') + '/' + feature.get('FIGIS_ID')
				+ '/' + feature.get('LANG')
			;
		},
		contentHandler : function(feature, request) {
			var content = document.createElement("div");
			content.appendChild(request.responseXML.children[0]);
			return content.innerHTML;
		}
	};
	return this;
};
FV.baseMapParams.prototype.setProjection = function( p ) { if( p ) this.projection = p; };
FV.baseMapParams.prototype.setExtent = function( e ) {
	FV.lastExtent = e ? e : ( FV.myMap ? FV.myMap.getView().calculateExtent(FV.myMap.getSize()).join(',') : null );
	if ( FV.lastExtent ) this.extent = FV.lastExtent.split(',');
};
FV.baseMapParams.prototype.setZoom = function( z ) {
	FV.lastZoom = z != 1 ? z : ( FV.myMap ? FV.myMap.getView().getZoom() : 1 );
	if ( FV.lastZoom ) this.zoom = FV.lastZoom;
};
FV.baseMapParams.prototype.setLayer = function( l ) {
	if(l && l != "") {
		this.vectorLayer = {
			source: FigisMap.rnd.vars.wfs + 'firms:' + l + '_all_points',
			title: l == 'resource' ? "Marine resources" : "Fisheries",
			icon: 'img/firms/' + l + '.png', 
			cluster: true,
			clusterOptions: { distance: 30, animate: true },
			clusterIcon: 'img/firms/' + l + '_cluster.png'
		}
	}
};

/**
* FV.addViewer function.
*       extent -> The extent to zoom after the layer is rendered (optional).
*       zoom -> The zoom level of the map (optional).
*       mapProjection -> The map projection (optional).
*       layer -> the FIRMS layer to use as cluster layer
**/
FV.addViewer = function(extent, zoom, projection, layer){

	//parameters
	var pars = new FV.baseMapParams();
	
	pars.setProjection( projection );
	pars.setZoom( zoom );
	pars.setExtent( extent );
	pars.setLayer( layer );
	
	FV.myMap = FigisMap.draw( pars );
};

/**
* FV.setViewer function.
*       extent -> The extent to zoom after the layer is rendered (optional).
*       zoom -> The zoom level of the map (optional).
*       mapProjection -> The map projection (optional).
**/
FV.setViewer = function(extent, zoom, projection){
	if ( ! projection ) projection = FV.currentProjection();
	if (!zoom || zoom == 0) zoom = 1;
	FV.addViewer(extent, zoom, projection,FV.currentLayer());
};

FV.currentProjection = function( p ) {
	//FV.lastExtent
	var cp;
	if ( document.getElementById('SelectSRS4326').checked ) cp = '4326';
	if ( ! cp ) if ( document.getElementById('SelectSRS3349').checked ) cp = '3349';
	if ( ! cp ) {
		document.getElementById('SelectSRS4326').checked = true;
		cp = '4326';
	}
	if ( ! p ) return cp;
	p = String( p )
	if ( p != cp ) {
		document.getElementById('SelectSRS4326').checked = ( p == '4326');
		document.getElementById('SelectSRS3349').checked = ( p == '3349');
		FV.lastExtent = null;
	}
	return p;
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

/**
* FV.setViewerPage function. Load the base FIRMS Map applying the user request parameters, if any
*/
FV.setViewerPage = function() {
	
	var layer, extent, zoom, prj;
	
	if ( location.search.indexOf("layer=") != -1 ){
		
		// Parsing the request to get the parameters
		var params = location.search.replace(/^\?/,'').replace(/&amp;/g,'&').split("&");
		
		for (var j=0; j < params.length; j++) {
			var param = params[j].split("=");
			switch ( param[0] ) {
				case "layer"	: layer = param[1]; break;
				case "extent"	: extent = param[1]; break;
				case "zoom"	: zoom = parseInt(param[1]); break;
				case "prj"	: prj = param[1]; break;
			}
		}
		
		if ( layer && layer != "" ) FV.currentLayer( layer );
		if ( extent == "" ) extent = null;
		if ( extent != null ) extent = extent.split(",");
		if ( zoom == '' ) zoom = null;
		if ( zoom != null ) zoom = parseInt( zoom );
		if ( prj == '' ) prj = null;
		if ( prj != null ) FV.currentProjection( prj );
	} else {
		zoom = 1;
		FV.currentLayer('resource');
		layer = 'resource';
	}
	
	//Load the Viewer using the request parameters
	FV.addViewer( extent, zoom, prj, layer);
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
		+ "&zoom=" + FV.myMap.getView().getZoom()
		+ "&prj=" + FV.currentProjection();
	var urle = url + '&embed=y';
	
	//Setting the input fields of the embed-link div
	document.getElementById('firms-link').value = url;
	document.getElementById('firms-html').value = '<iframe src ="' + urle + ' width="800" height="600" frameborder="0" marginheight="0"></iframe>';
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
	var popup = FigisMap.rnd.getPopupOverlay(FV.myMap);
	FigisMap.rnd.showPopupForFeature(popup, feature);
};


