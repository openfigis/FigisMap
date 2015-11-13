/**
 * FIRMS Map viewer Javascript
 * Authors: M. Balestra, E. Blondel
 * 
 */

var myMap = false;

var performAutoZoom = true;

/**
* addViewer function.
*       extent -> The extent to zoom after the layer is rendered (optional).
*       zoom -> The zoom level of the map (optional).
*       mapProjection -> The map projection (optional).
*       elinkDiv -> The embed-link id  (optional if not using the embed link div).
*       urlLink -> The id of the url input field of the embed-link (optional if not using the embed link div).
*       htmlLink -> The id of the html input field of the embed-link (optional if not using the embed link div).
*       layer -> the FIRMS layer to use as cluster layer
**/
function addViewer(extent, zoom, projection, elinkDiv, urlLink, htmlLink, layer){

	//parameters
	var pars = {
		target		: 'map',
		context		: 'firmsViewer',
		projection	: projection,
		legend		: 'legend',
		projection	: projection,
		options		: {labels: true },
		base		: {
			cached: true,
			filter: "",
			label: "Oceans basemap",
			layer: "fifao:OB_LR",
			title: "Oceans basemap",
			type: "base"
		}
	};
	if ( zoom != null ) pars.zoom = zoom;
	if ( extent != null ) pars.extent = extent;
	
	//vector cluster layer
	if(layer && layer != "") {
		pars.vectorLayer = {
			source: 'all_points_' + layer,
			title: layer == 'resource' ? "Marine resources" : "Fisheries",
			icon: 'img/firms/' + layer + '.png', 
			cluster: true,
			clusterOptions: {distance: 30, animate: true},
			clusterIcon: 'img/firms/' + layer + '_cluster.png'
		}
	}
	
	if ( document.getElementById(elinkDiv) ) document.getElementById(elinkDiv).style.display = "none";
	
	myMap = FigisMap.draw( pars );
	
	if ( myMap ) {
		if ( document.getElementById(elinkDiv) ) {
			myMap.on('moveend',
					function(){
						document.getElementById(elinkDiv).style.display = "none";
						document.getElementById(urlLink).value = "";
						document.getElementById(htmlLink).value = "";
					}
			);
		}
	}
}

/**
* setViewer function.
*       extent -> The extent to zoom after the layer is rendered (optional).
*       zoom -> The zoom level of the map (optional).
*       mapProjection -> The map projection (optional).
*       elinkDiv -> The embed-link id  (optional if not using the embed link div).
*       urlLink -> The id of the url input field of the embed-link (optional if not using the embed link div).
*       htmlLink -> The id of the html input field of the embed-link (optional if not using the embed link div).
**/
function setViewer(extent, zoom, projection, elinkDiv, urlLink, htmlLink){
	
	if ( ! projection ) {
		document.getElementById("SelectSRS").value = '4326';
	}
	
	if(!zoom || zoom == 0) zoom = 1;
	var layer = document.getElementById("SelectLayer").value;
	
	addViewer(extent, zoom, projection, elinkDiv, urlLink, htmlLink, layer);
}

/**
* setViewerPage function. Load the base FIRMS Map applying the user request parameters, if any
* @param elinkDiv -> The embed-link id  (optional if not using the embed link div).
* @param urlLink -> The id of the url input field of the embed-link (optional if not using the embed link div).
* @param htmlLink -> The id of the html input field of the embed-link (optional if not using the embed link div).
*/
function setViewerPage(elinkDiv, urlLink, htmlLink) {
	
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
		
		if ( layer && layer != "" ) document.getElementById("SelectLayer").value = layer;
		
		if ( extent == "" ) extent = null;
		if ( extent != null ) extent = extent.split(",");
		if ( zoom == '' ) zoom = null;
		if ( zoom != null ) zoom = parseInt( zoom );
		if ( prj == '' ) prj = null;
		if ( prj != null ) document.getElementById("SelectSRS").value = prj;
	}else{
		zoom = 1;
		document.getElementById("SelectLayer").value = 'resource';
		layer = 'resource';
	}
	
	/*
	* Load the Viewer using the request parameters
	*/
	addViewer( extent, zoom, prj, elinkDiv, urlLink, htmlLink, layer);
}

/**
* setFirmsViewerEmberLink function. Manage the expand/collapse of the Embed-Link div.
* @param targetId -> The embed-link div id.
* @param viewerLinkId -> The id of the url input field of the embed-link.
* @param viewerHtmlId -> The id of the html input field of the embed-link.
*/
function setViewerEmbedLink(targetId, viewerLinkId, viewerHtmlId){
	
	if ( ! ( document.getElementById ) ) return void(0);
	
	var divId = document.getElementById(targetId);
	var linkId = document.getElementById(viewerLinkId);
	var htmlId = document.getElementById(viewerHtmlId);
	if (divId.style.display == "none" || divId.style.display == "") {
		
		//Show the embed-link div
		divId.style.display = "block";
		var baseURL = location.href.replace(/#.*$/,'').replace(/\?.*$/,'');
		
		//Building the request url containing the map status.
		baseURL += "?layer=" + document.getElementById("SelectLayer").value
			+ "&extent=" + myMap.getView().calculateExtent(myMap.getSize()).join(',')
			+ "&zoom=" + myMap.getView().getZoom()
			+ "&prj=" + document.getElementById("SelectSRS").value;
		
		//Setting the input fields of the embed-link div
		linkId.value = baseURL;
		
		var htmlFrame = '<iframe src ="' + baseURL.replace(/firms\.html/,'firms_e.html') + '" width="800" height="600" frameborder="0" marginheight="0">';
		htmlFrame += "</iframe>";
		
		htmlId.value = htmlFrame;
	} else {

		//Hide the embed-link div
		divId.style.display = "none";
		
		linkId.value = "";
		htmlId.value = "";
	}
}

