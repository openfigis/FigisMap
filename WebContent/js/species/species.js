MAX_SPECIES = 10;
var myMap = false;

var performAutoZoom = true;

COLORS = ["852D36", "A60314", "FF031C", "FA485B", "F58E98", "CC8914", "FAA616", "FAC002", 
"F0E92E", "FAFA5F", "dcdef2","f4d5b7", "f2dcc9", "f2f2bc", "d9f4be", "b6edd0", "bff2d7", 
"c4dbf2", "c2d7ed", "c0c0ea", "d5c0ed", "efc6ef", "f2bad5", "edc4c4", "edc4c4", "b9eab9", 
"b7e8e8", "bdd6ef", "d3beea", "eac2ea", "f2c9dc", "efc9c9", "ead2bb", "efefc2", "e8e8c5", 
"d0e0c0", "d1e1c1", "beddcd", "c7eaea", "b3c9e0", "c0c0e8", "cbbed8", "d3a7d3", "e5c7d6", 
"d8becb", "e5c5c5", "ddccbc", "eaeac2", "cee2ba", "cee5b7", "bdedbd", "aae2c5", "a6eaea", 
"aac6e2", "cbb8e0", "c9a5c9", "e0b1c8", "a7b5d6", "c2eaad", "e5d0f4", "f4bacb", "c9d2db"];

function buildMap (pars, elinkDiv, urlLink, htmlLink) {
	
	var doElink = ( elinkDiv && document.getElementById(elinkDiv) );
	
	if ( doElink ) document.getElementById(elinkDiv).style.display = "none";
	
	if ( document.getElementById('mapWrapper') && pars ) {
		if ( ! pars.distribution || pars.distribution.length == 0 ) {
			document.getElementById('mapWrapper').style.display = 'none';
			document.getElementById("SelectSRS").disabled = true;
			document.getElementById("EmbedLink").style.opacity = .5;
			return;
		} else {
			document.getElementById('mapWrapper').style.display = '';
			document.getElementById("SelectSRS").disabled = false;
			document.getElementById("EmbedLink").style.opacity = '';
		}
	}
	
	myMap = FigisMap.draw(pars);
	
	if ( myMap && doElink ) {
		/*!OL2 myMap.events.register(
			'moveend',
			this,
			function(){
				document.getElementById(elinkDiv).style.display = "none";
				document.getElementById(urlLink).value = "";
				document.getElementById(htmlLink).value = "";
			}
		);*/
		myMap.on('moveend',
				function(){
					document.getElementById(elinkDiv).style.display = "none";
					document.getElementById(urlLink).value = "";
					document.getElementById(htmlLink).value = "";
				});
				
	}
}

/*
* loadme function. Load the base Species Map. 
*       elinkDiv -> The embed-link id  (optional if not using the embed link div).
*       urlLink -> The id of the url input field of the embed-link (optional if not using the embed link div).
*       htmlLink -> The id of the html input field of the embed-link (optional if not using the embed link div).
*/
function loadme(elinkDiv, urlLink, htmlLink){
	
	/*
		Parse base properties:
			'target' --> map div id,
			'projection' --> special Projections
			'countrieslegend' --> list of members
			'legend' --> layer legend
			'distribution' --> array of layer object
	*/
	var pars = {
		target		: 'map',
		projection	: document.getElementById("SelectSRS").value,
		mapSize		: 'L',
		legend		: 'legend',
		legendType	: location.href.indexOf('species_e.html')>0 ? 'DP' : 'TP',
		context		: 'speciesViewer',
		global		: true,
		options		: {colors: false, labels: true, majorAreasAsLines: true},
		distribution	: []
	};
	
	buildMap( pars, elinkDiv, urlLink, htmlLink );
	
}

function getColor(count){ return COLORS[count]; }

function getStyle(count){ return 'species_style_' + getColor(count); }


/**
* function addSpecies
*       extent -> The extent to zoom after the layer is rendered (optional).
*	center -> The center to zoom on after the layer is rendered (optional).
*       zoom -> The zoom level of the map (optional).
**/
function addSpecies(extent, center, zoom, elinkDiv, urlLink, htmlLink){
		
	if (RS.prop.qtFields == 0) {
		loadme();
		return;
	}
	var species = RS.getFieldArray('species');
	
	if (species.length > MAX_SPECIES) {
		//debugger;
		alert("Please select less than "+ MAX_SPECIES);
		return;
	}
	var layername = FigisMap.fifao.spd;
	
	var selectedProjectionIndex = document.getElementById("SelectSRS").selectedIndex;
	var selectedProjection = document.getElementById("SelectSRS").options[selectedProjectionIndex];
	var projection = selectedProjection.value;
	
// 	var layers = "";
// 	var styles = [];
// 	var titles = [];
// 	
// 	var count = 0;
	
	/*
		Parse base properties:
			'target' --> map div id,
			'projection' --> special Projections
			'countrieslegend' --> list of members
			'legend' --> layer legend
			'distribution' --> array of layer object
	*/
	var pars = {
		target		: 'map',
		projection	: document.getElementById("SelectSRS").value,
		legend		: 'legend',
		legendType	: location.href.indexOf('species_e.html')>0 ? 'DP' : 'TP',
		context		: 'speciesViewer',
		mapSize		: 'L',
		global		: ! performAutoZoom,
		options		: {colors: false, labels: true , topMarineLabels: true, majorAreasAsLines: true},
		distribution	: new Array(),
		base : [
			{ layer: FigisMap.fifao.cnt, cached: true, remote:false, label : "Continents"}
		]
	};
	
	for (var count = 0; count < species.length; count++) {
		var fullCode = species[count];
		var code = fullCode.split('-')[0];
		var flags= fullCode.split('-')[1];
		var hasMarine = ( flags.indexOf('m') > -1 );
		var hasInland = ( flags.indexOf('i') > -1 );
		//layers = layers  + layername+"-ALPHACODE='"+ code +"'/";
// 		styles.push( getStyle(count) );
		
		var specTitle = "UNDEFINED";
		var o = 0;
		for (o = 0; o < RS.spc.opts.length; o++) {
			if (RS.spc.opts[o].getAttribute('alt') == fullCode) {
				specTitle = RS.spc.opts[o].innerHTML;
				specTitle = specTitle.substring(0, specTitle.indexOf(" - "));
			}
		}
// 		titles.push( specTitle );
		if (hasMarine) pars.distribution.push( { layer: layername, filter: "ALPHACODE='"+ code +"' AND DISPORDER = '1'", title: specTitle + ( hasInland ? ' (marine)' : ''), style: getStyle(count), autoZoom: performAutoZoom, overlayGroup: FigisMap.ol.getDefaultOverlayGroup(pars) } );
		if (hasInland) pars.distribution.push( { layer: layername, filter: "ALPHACODE='"+ code +"' AND DISPORDER = '2'", title: specTitle + ( hasMarine ? ' (inland)' : ''), style: getStyle(count), autoZoom: performAutoZoom, overlayGroup: FigisMap.ol.getDefaultOverlayGroup(pars) } );
	};
	
	/* -------------------------------------COMMENT---------------------------------------------*/
	/*$('option:selected',$("#SelectSpecsScientific")).each( function() { 
	   layers = layers  + layername+"-ALPHACODE='"+ this.value.substring(0, this.value.indexOf("-")) +"'/";
	   count = count +1;
	   styles.push( getStyle(count) ); 
	   titles.push( this.innerHTML );
	} 
	);
	$('option:selected',$("#SelectSpecsCommon")).each( function() { 
	   layers = layers  + layername+"-ALPHACODE='"+ this.value.substring(0, this.value.indexOf("-")) +"'/";
	   count = count +1;
	   styles.push( getStyle(count) ); 
	   titles.push( this.innerHTML );
	} 
	);*/
	
	  //document.getElementById("txtCql").value = "";
	  //document.getElementById("command").value = "";
	  /* -----------------------------------------------------------------------------------------*/
	
	  //var options = {landMask:true, global:true, drawDataRectangle:false, styles: styles, titles: titles, horizLegend: false};
	  //var jma = new JMA(options);
	  //jma.mapGeneratorFS(layers, 'map', 'FigisMapN10086-legend', null, projection);
	  
	/**
	* 1. Special extent
	**/
	if(extent != null || extent != undefined || extent != ""){
		pars.extent = extent;
		pars.global = false;
	}
	
	/**
	* 2. center
	**/
	if(center != null || center != undefined || center != ""){
		pars.center = center;
	}

	/**
	* 3. Special map zoom
	**/
	if(zoom != null || zoom != undefined || zoom != ""){
		pars.zoom = zoom;
		pars.global = false;
	}
	/*
	Parsing the 'layers' string to build the 'distribution' parameter 
	*/
// 		var layersArray = layers.split("/");
// 		
// 		var size = layersArray.length;
// 		for(var y = 0; y < size; y++){
// 			if(layersArray[y] != null && layersArray[y] != undefined && layersArray[y] != ""){
// 				dists = layersArray[y].split("-");
// 				
// 				pars.distribution.push({ 'layer'  : dists[0], 'filter' : dists[1] });
// 			}
// 		}
	
	buildMap( pars, elinkDiv, urlLink, htmlLink );
}

/*
* setSpeciesPage function. Load the base Species Map applying the user request parameters, if any, to load the species in to the map.  
*       elinkDiv -> The embed-link id  (optional if not using the embed link div).
*       urlLink -> The id of the url input field of the embed-link (optional if not using the embed link div).
*       htmlLink -> The id of the html input field of the embed-link (optional if not using the embed link div).
*/
function setSpeciesPage(elinkDiv, urlLink, htmlLink){

	var mapExtent, mapCenter, mapZoom;
	
	if(location.search.indexOf("?") != -1 && (location.search.indexOf("species") != -1 
		|| location.search.indexOf("extent") != -1 || location.search.indexOf("zoom") != -1 || location.search.indexOf("prj") != -1)){
		
		/* Parsing the request to get the parameters */
		var params = location.search.replace(/^\?/,'').replace(/&amp;/g,'&').split("&");
		
		var layers, extent, zoom, prj;
		
		for (var j=0; j < params.length; j++) {
			var param = params[j].split("=");
			switch ( param[0] ) {
				case "species"	: layers = param[1]; break;
				case "extent"	: extent = param[1]; break;
				case "center"	: center = param[1]; break;
				case "zoom"	: zoom = param[1]; break;
				case "prj"	: prj = param[1]; break;
			}
		}
		if(layers != null && layers != undefined && layers != ""){
			var species = layers.split(",");
			for(var i=0; i<species.length; i++){
				RS.spc.add(species[i]);
			}
		}
		if(extent != null && extent != undefined && extent != ""){
			//OL2 mapExtent = new OpenLayers.Bounds(bbox[0], bbox[1], bbox[2], bbox[3]);
			var bbox = extent.split(",");
			for (var i=0; i<bbox.length; i++) {
    				bbox[i] = parseFloat(bbox[i]);
			}
			mapExtent = [bbox[0], bbox[1], bbox[2], bbox[3]]
		} 
		if(center != null && center != undefined && center != ""){
			mapCenter = center.split(",");
			mapCenter[0] = parseFloat(mapCenter[0]);
			mapCenter[1] = parseFloat(mapCenter[1]); 
		}
		if(zoom != null && zoom != undefined && zoom != ""){
			mapZoom = zoom;
		}
		if(prj != null && prj != undefined && prj != ""){
			document.getElementById("SelectSRS").value = prj;
		}
		/* Load the Species using the request parameters. */
		addSpecies(mapExtent, mapCenter, mapZoom, elinkDiv, urlLink, htmlLink);
	} else {
		/* Initializing the basis species page (map and properties and options) */ 
		loadme(elinkDiv, urlLink, htmlLink);
	}
}

/*
* setSpeciesEmberLink function. Manage the expand/collapse of the Embed-Link div.
*       targetId -> The embed-link div id.
*       specLinkId -> The id of the url input field of the embed-link.
*       specHtmlId -> The id of the html input field of the embed-link.
*/
function setSpeciesEmbedLink(targetId, specLinkId, specHtmlId){
	
	if ( ! myMap ) return void(0);
	
	var divId = document.getElementById(targetId);
	var linkId = document.getElementById(specLinkId);
	var htmlId = document.getElementById(specHtmlId);
	
	if (divId.style.display == "none" || divId.style.display == "") {
	
		/*	Show the embed-link div */
		divId.style.display = "block";
		var baseURL = location.href.replace(/#.*$/,'').replace(/\?.*$/,'');
		
		/* Building the request url containing the map status. */
		var species = RS.getFieldArray('species');
		var prj = document.getElementById("SelectSRS").value;
		
		baseURL += "?species=" + species.join(',');
		baseURL += "&extent=" + myMap.getView().calculateExtent(myMap.getSize()).join(',');
		baseURL += "&center=" + myMap.getView().getCenter().join(',');
		baseURL += "&zoom=" + myMap.getView().getZoom();
		baseURL += "&prj=" + prj;
		
		/* Setting the input fields of the embed-link div */
		linkId.value = baseURL;
		
		var htmlFrame = '<iframe src ="' + baseURL.replace(/species\.html/,'species_e.html') + '" width="800" height="600" frameborder="0" marginheight="0">';
		htmlFrame += "</iframe>";
		htmlId.value = htmlFrame;
	} else {
		/* Hide the embed-link div */
		divId.style.display = "none";
		linkId.value = "";
		htmlId.value = "";
	}
}

