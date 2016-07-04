var myMap = false;


function resetRFBCheckBox(){
    var rfbCombo = Ext.getCmp('RFBCombo');
    rfbCombo.reset();
    
    for (var i = 0;i<rfbCombo.panel.items.items.length;i++){
        for (var c = 0;c<rfbCombo.panel.items.items[i].items.items.length;c++){
            rfbCombo.panel.items.items[i].items.items[c].checked = false;
            rfbCombo.panel.items.items[i].items.items[c].el.dom.checked = false;
        }
    }
}      

function getRFBCheckBoxValue(){
    var rfbCombo = Ext.getCmp('RFBCombo');
    var rfbValue;
	
	if(rfbCombo){
	    for (var i = 0;i<rfbCombo.panel.items.items.length;i++){
			for (var c = 0;c<rfbCombo.panel.items.items[i].items.items.length;c++){
				var checkbox = rfbCombo.panel.items.items[i].items.items[c];
				if(checkbox.checked == true && checkbox.el.dom.checked == true){
					rfbValue = checkbox.acronym;
				}
			}
		}
	}

    return rfbValue;
}

function setRFBCheckBoxValue(rfb){
    var rfbCombo = Ext.getCmp('RFBCombo');
    //var rfbValue;
    for (var i = 0;i<rfbCombo.panel.items.items.length;i++){
        for (var c = 0;c<rfbCombo.panel.items.items[i].items.items.length;c++){
            var checkbox = rfbCombo.panel.items.items[i].items.items[c];
            if(checkbox.acronym == rfb){
                checkbox.checked = true;
                checkbox.el.dom.checked = true;
                //toggleRfbPanel();
            }
        }
    }
    //return rfbValue;
}     

function getProjection(radioObj) {
    var radioObj = document.getElementsByName("srs");
	if(!radioObj)
		return "";
	var radioLength = radioObj.length;
	if(radioLength == undefined)
		if(radioObj.checked)
			return radioObj.value;
		else
			return "";
	for(var i = 0; i < radioLength; i++) {
		if(radioObj[i].checked) {
			return radioObj[i].value;
		}
	}
	return "";
}

function setProjection(newValue) {
    var radioObj =document.getElementsByName("srs");
	if(!radioObj)
		return;
	var radioLength = radioObj.length;
	if(radioLength == undefined) {
		radioObj.checked = (radioObj.value == newValue.toString());
		return;
	}
	for(var i = 0; i < radioLength; i++) {
		radioObj[i].checked = false;
		if(radioObj[i].value == newValue.toString()) {
			radioObj[i].checked = true;
		}
	}
}

function resetVME(){
	var params = location.search.replace(/^\?/,'').replace(/&amp;/g,'&').split("&");
	
	var year;
	for (var j=0; j < params.length; j++) {
		var param = params[j].split("=");
		switch ( param[0] ) {
			case "year"	: year = param[1]; break;
		}
	}
	
	reset(year);
}

function reset(year){
	document.getElementById("FilterRFB").text = FigisMap.label('SELECT_AN_AREA');
	document.getElementById("FilterRFB").value = "";
	document.getElementById("SelectRFB").value = "";
    
    resetRFBCheckBox();
    closeRfbPanel();
    closeYearsPanel();
    
	setProjection('3349');
    //setProjection('4326');
    closeProjectionPanel();
	//TODO OL3
	FigisMap.ol.clearPopupCache();
	setVMEPage('embed-link','embed-url', 'embed-iframe');
	
    /*
    var years = Ext.getCmp('years-slider');
    years.setValue(0, FigisMap.time.getFullYear());	
	Ext.getCmp('years-min-field').setValue(FigisMap.time.getFullYear());
	*/
	
	
	var y = year ? year : FigisMap.time.getFullYear(); 
	FigisMap.time.setSelectedYear(y);
	
	updateVme();	
	myMap.zoomToMaxExtent();
	if ( FigisMap.defaults.mapCenter ){
        myMap.setCenter( FigisMap.ol.reCenter( FigisMap.defaults.mapCenterProjection, myMap.getView().getProjection() , FigisMap.defaults.mapCenter) ); //TODO OL3
    }
	
	// Ensure that rfb.js is included AFTER vmeData.js, so theese are initialized
	Vme.form.panels.SearchForm.getForm().reset();
	Vme.form.panels.SearchPanel.layout.setActiveItem('searchcard-0');
	
	// Restore toggle
	restoreToggleButtons();
	
	// Collapse the side panel
	var sidePanel = Ext.getCmp("side-panel").collapse();
}

/**
* function toggleStyle
*
* Manages toggle buttons style and enables/disables visibility interacting LayerSwitcher
**/
function toggleStyle(el, isButton){
	if(isButton){
		if(el.className ==  "lblVME figisButtonVME") {
			toogleWME(false);
		}else if(el.className ==  "lblFootprints figisButtonBOTTOM"){
			toogleFootprints(false);            
		}else if(el.className ==  "lblVMEOther figisButtonOTHER"){
			toogleWMEOther(false);
		}else if(el.className ==  "lblVME figisButtonToggleVME"){
			toogleWME(true);
		}else if(el.className ==  "lblFootprints figisButtonToggleBOTTOM"){
			toogleFootprints(true);
		}else if(el.className ==  "lblVMEOther figisButtonToggleOTHER"){
			toogleWMEOther(true);            
		}
	}else{
		if(el.className ==  "lblVME figisButtonVME") {
			el.className = "lblVME figisButtonToggleVME";
		}else if(el.className ==  "lblFootprints figisButtonBOTTOM"){
			el.className = "lblFootprints figisButtonToggleBOTTOM";
		}else if(el.className ==  "lblVMEOther figisButtonOTHER"){
			el.className = "lblVMEOther figisButtonToggleOTHER";            
		}else if(el.className ==  "lblVME figisButtonToggleVME"){
			el.className = "lblVME figisButtonVME";
		}else if(el.className ==  "lblFootprints figisButtonToggleBOTTOM"){
			el.className = "lblFootprints figisButtonBOTTOM";
		}else if(el.className ==  "lblVMEOther figisButtonToggleOTHER"){
			el.className = "lblVMEOther figisButtonOTHER";
        }
	}
}
	
/**
* function toogleWME
*
* Enables/Disables 'VME closed areas' layer in LayerSwitcher 
**/	
function toogleWME(pressed){
	var vme = myMap.getLayersByName('VME closed areas')[0];
	vme.setVisibility(!pressed);
}

/**
* function toogleWMEOther
*
* Enables/Disables 'Other access regulated areas' layer in LayerSwitcher 
**/	
function toogleWMEOther(pressed){
	var vme = myMap.getLayersByName('Other access regulated areas')[0];
	vme.setVisibility(!pressed);
}

/**
* function toogleFootprints
*
* Enables/Disables 'Bottom fishing areas' layer in LayerSwitcher 
**/	
function toogleFootprints(pressed){
	var footprint = myMap.getLayersByName('Bottom fishing areas')[0];
	footprint.setVisibility(!pressed);
}

function updateVme(){
    /* TODO: maybe block year changes ?
    Ext.getCmp('years-slider').disable();
    Ext.getCmp("year-min-largestep").disable(); 
    Ext.getCmp("year-min-littlestep").disable(); 
    Ext.getCmp("year-max-littlestep").disable(); 
    Ext.getCmp("year-max-largestep").disable();
    Ext.getCmp("last-year").disable(); 
    Ext.getCmp("first-year").disable(); 
    */
    
    var acronym;
    
    var rfbComboTop = getRFBCheckBoxValue();
    var rfmoComboSearch = Ext.getCmp("RFMOCombo").getRawValue();

    if(rfbComboTop == ""){
        acronym = rfmoComboSearch;
    }else{
        acronym = rfbComboTop;
    }
    
    FigisMap.ol.clearPopupCache(); //TODO OL3
    FigisMap.ol.refreshFilters(acronym); //TODO OL3
	
	// //////////////////////////////
	// Remove layer for hilighting
	// //////////////////////////////
	var hilayer = myMap.getLayersByName("highlight")[0];
	if(hilayer ){
		myMap.removeLayer(hilayer);
	}
}
/**
* function setZoom
*
**/
function setZoom() {
	var settings = FigisMap.ol.getSettings( document.getElementById("FilterRFB").value );
	//Close popup when RFB change
	FigisMap.ol.clearPopupCache(); //TODO OL3
	zoomTo(settings);
}

/**
* function zoomTo
*
**/
function zoomTo(settings,geom,zoom,closest) {
	if (settings != null){
		var bbox = geom ? geom : settings.zoomExtent.split(",");
		var curr_proj = myMap.getView().getProjection(); 
		var bboxproj = settings.srs || "EPSG:3349";
		
		//check 
		var projcode = curr_proj.split(":")[1];
		var valid = FigisMap.ol.checkValidBbox(projcode,settings); //TODO OL3

		if(valid){
			if(!geom){
				bbox = bbox.clone().transform(
					new ol.proj.get(bboxproj),
					new ol.proj.get(curr_proj)
				);			
			}
			
			if(zoom){
				//TODO OL3 'closest' parameter?
				myMap.zoomToExtent(bbox);
			}else{
                if(bboxproj == 'EPSG:3031'){
                    // WORKAROUND TO FIX STRANGE BEHAVIOUR BOUNDS TRANSFORMATION FROM 4326 TO 3031. BOUND NOW IS HARCODED
                    bbox = [-3465996.97,-3395598.49,5068881.53,4524427.45]; 
                    myMap.getView().setCenter(ol.extent.getCenter(bbox)); 
                }else{
                    myMap.getView().setCenter(ol.extent.getCenter(bbox)); 
                }
			}
		}else{
			var newproj = bboxproj.split(":")[1];
            
            // uncomment this if default projection is 4326
			/*bbox = bbox.clone().transform(
				newproj == "4326" ? new ol.projection.get(newproj) : new ol.projection.get(curr_proj),
                new ol.projection.get(bboxproj)
			);*/	

			//TODO OL3
			bbox = bbox.clone().transform(
				new ol.projection.get(curr_proj),
				new ol.projection.get(bboxproj == "EPSG:3349" ? "EPSG:900913" : bboxproj)
			);
			
			setVME(bbox, null, newproj, 'embed-link','embed-url', 'embed-iframe');
			
		    if(zoom){
				//TODO OL3 'closest' parameter?
				myMap.zoomToExtent(bbox);
			}
					    
			setProjection(newproj);		
		}
    }else{
    	myMap.zoomToMaxExtent();
    }
}

/**
* function setVME
*       extent -> The extent to zoom after the layer is rendered (optional).
*       zoom -> The zoom level of the map (optional).
*       mapProjection -> The map projection (optional).
*       elinkDiv -> The embed-link id  (optional if not using the embed link div).
*       urlLink -> The id of the url input field of the embed-link (optional if not using the embed link div).
*       htmlLink -> The id of the html input field of the embed-link (optional if not using the embed link div).
*       refresh -> set to false to manage FigisMap.ol.refreshFilters() function when user change projection.
**/
function setVME( extent, zoom, mapProjection, elinkDiv, urlLink, htmlLink, filter, refresh) {
	if ( ! mapProjection ) {
		var settings = FigisMap.rfb.getSettings( getProjection());
		setProjection(settings && settings.srs ? settings.srs : '4326');
	}
	
	// Close popup when RFB change
	FigisMap.ol.clearPopupCache(); //TODO OL3
	addVME( extent, zoom, mapProjection, elinkDiv, urlLink, htmlLink, filter);

    var acronym;

    var rfbComboTop = getRFBCheckBoxValue();
    var rfmoComboSearch = Ext.getCmp("RFMOCombo").getRawValue();

    if(rfbComboTop == ""){
        acronym = rfmoComboSearch;
    }else{
        acronym = rfbComboTop;
    }
	
    // REFRESH IS FALSE WHEN USER CHANGE PROJECTION
    if(refresh){
        resetRFBCheckBox();
        FigisMap.ol.refreshFilters(); //TODO OL3
    }else{
        FigisMap.ol.refreshFilters(acronym); //TODO OL3
    
    }
	
	// Restore toggle
	restoreToggleButtons();
}

/**
* function restoreToggleButtons
*
* Restore toggle buttons status for VMW areas and footprints. 
**/
function restoreToggleButtons(){
	var el = document.getElementById("lblVME");	
	if(el){
		var vme = myMap.getLayersByName('VME closed areas')[0]; //TODO OL3
		
		// ///////////////////////////////////////////////
		// If there are Embed URL params concerning VME 
		// these should be maintained for the status 
		// (see also FigisMap.finalizeMap).
		// ///////////////////////////////////////////////
		if(vme.getVisibility()){ //TODO OL3
			el.className = "lblVME figisButtonToggleVME";
		}else{
			el.className = "lblVME figisButtonVME";
		}							

		//el.className = "lblVME figisButtonToggle";
	}		
	
	el = document.getElementById("lblFootprints");										
    if(el){
		var footprints = myMap.getLayersByName('Bottom fishing areas')[0]; //TODO OL3
			
		// /////////////////////////////////////////////////////
		// If there are Embed URL params concerning Bottom fishing areas 
		// these should be maintained for the status 
		// (see also FigisMap.finalizeMap).
		// /////////////////////////////////////////////////////	
		if(footprints.getVisibility()){
			el.className = "lblFootprints figisButtonToggleBOTTOM";
		}else{
			el.className = "lblFootprints figisButtonBOTTOM";
		}					
	
		//el.className = "lblFootprints figisButton";
	}

	el = document.getElementById("lblVMEOther");										
    if(el){
		var footprints = myMap.getLayersByName('Other access regulated areas')[0]; //TODO OL3
			
		// /////////////////////////////////////////////////////
		// If there are Embed URL params concerning Bottom fishing areas 
		// these should be maintained for the status 
		// (see also FigisMap.finalizeMap).
		// /////////////////////////////////////////////////////	
		if(footprints.getVisibility()){ //TODO OL3
			el.className = "lblVMEOther figisButtonToggleOTHER";
		}else{
			el.className = "lblVMEOther figisButtonOTHER";
		}					
	
		//el.className = "lblFootprints figisButton";
	}    
}

function setEmbeddedElementClass(elementsDiv, mapSize){
	if(elementsDiv && elementsDiv.length > 0){
		for(var i=0; i<elementsDiv.length; i++){
			var target = elementsDiv[i];
			var div = document.getElementById(target);
			div.className = target + "_" + mapSize;
		}
	}
}	

/**
* function addVME
*       extent -> The extent to zoom after the layer is rendered (optional).
*       zoom -> The zoom level of the map (optional).
*       elinkDiv -> The embed-link id  (optional if not using the embed link div).
*       urlLink -> The id of the url input field of the embed-link (optional if not using the embed link div).
*       htmlLink -> The id of the html input field of the embed-link (optional if not using the embed link div).
**/
function addVME(extent, zoom, projection, elinkDiv, urlLink, htmlLink, filter, center, layers, year, rfb, mapSize) {
	//sets the zoom dropdown to default values when the area selection and the selection of projection change
	//populateZoomAreaOptions('FilterRFB');
	
	var embeddedIframe = location.href.indexOf("index_e.html") != -1 ? true : false;
	
	//time
	FigisMap.time.incrementHandler = function(newyear){
		updateVme();
        Ext.get('yearCurrent').update(FigisMap.time.selectedYear);
	}
	FigisMap.time.decrementHandler = function(newyear){
		updateVme();
        Ext.get('yearCurrent').update(FigisMap.time.selectedYear);
	}
	FigisMap.time.selectionHandler = function(newyear){
		if(newyear <= FigisMap.time.maxYear && newyear >= FigisMap.time.minYear && newyear != FigisMap.time.selectedYear){
        Ext.get('yearCurrent').update(FigisMap.time.selectedYear);
		}
		if(newyear == FigisMap.time.minYear){
			Ext.get('yearLess').addClass('nobackground');
			Ext.get('yearMore').removeClass('nobackground');
		}
		else if( newyear == FigisMap.time.maxYear){
			Ext.get('yearMore').addClass('nobackground');
			Ext.get('yearLess').removeClass('nobackground');
		}else{
			Ext.get('yearMore').removeClass('nobackground');
			Ext.get('yearLess').removeClass('nobackground');
		}
	}
	
	/*
	 * target: where to create the map
	 * center: where to center the map after the creation (OpenLayers.LonLat object with values in 'EPSG:4326' projection)
	 */
	var pars = {
		rfb		    : '',
		target		: embeddedIframe ? 'map_e' : 'map',
		context		: 'rfbViewer',
		legend		: 'legend',
		projection	: projection,
		fullWindowMap: !embeddedIframe,
		//center : center ? center : new OpenLayers.LonLat(14, -26)
		center : center ? center : (embeddedIframe ? [14, -26] : [-2.46, 18.23])
	};
	
	if(embeddedIframe){
		pars.mapSize = mapSize ? mapSize : "L";
		var elementsDiv = [pars.target, 'main_e', 'page_e', 'wrapper_e', 'disclaimer_e'];
		setEmbeddedElementClass(elementsDiv, pars.mapSize);		
	}
	
	// Use this if you want to change the center at the embebbed reset
	//FigisMap.defaults.mapCenter = embeddedIframe ? new OpenLayers.LonLat(14, -26) : new OpenLayers.LonLat(-2.46, 18.23);

    if ( zoom != null ) pars.zoom = zoom;
	
	if ( extent != null ) pars.extent = extent;
	pars.filter = filter;
	
	//if ( document.getElementById(elinkDiv) ) document.getElementById(elinkDiv).style.display = "none";
	
	if(layers){
		layers = decodeURIComponent(layers);
	}	
	myMap = FigisMap.draw( pars, layers );
	
	if ( myMap ) {	
		//
		// IMPORTANT: Graticule map's events management for current resolution value.
		//
		setMapEventsForGraticule(myMap); //TODO OL3
		
		//TODO OL3
		if ( document.getElementById(elinkDiv) ) {
			myMap.events.register(
				'moveend',
				this,
				function(){
					//document.getElementById(elinkDiv).style.display = "none";
					//document.getElementById(urlLink).value = "";
					//document.getElementById(htmlLink).value = "";
					setVMEEmbedLink(urlLink, htmlLink);
				}
			);
		}
        if(rfb && rfb != '')
            FigisMap.ol.refreshFilters(rfb); //TODO OL3
        
		var l = document.getElementById('legendLegendTitle');
		if ( l ) l.innerHTML = FigisMap.label( 'Legend', pars );
		l = document.getElementById('legendMembersTitle');
		if ( l ) {
			if ( document.getElementById('MemberCountries').innerHTML == '' ) {
				l.style.display = 'none';
			} else {
				l.innerHTML = FigisMap.label('List of Members');
				l.style.display = '';
			}
		}
		
		if(projection == "3031" && !layers && !year){
			myMap.zoomIn();
		}	
		
		setVMEEmbedLink('embed-url', 'embed-iframe');
	}
}

/**
 * "Coordinates Grid" needs a zoomIn if the resolutions 
 * is greater than or equal to 0.3515625 in order to 
 * allow to openlayers to correctly draw the control 
 * (wrapdateline issue).
 **/
//TODO OL3
function setMapEventsForGraticule(map){
	map.events.register(
		'zoomend',
		this,
		function(){
			var graticule = map.getLayersByName("Coordinates Grid")[0];
			if(graticule && graticule.visibility){
				var mapResolution = map.getResolution();
				var resRef = 0.3515625/2;
				if(mapResolution > resRef){
					graticule.setVisibility(false);
				}		
			}
		}
	);
	
	map.events.register(
		'changelayer',
		this,
		function(){
			var graticule = map.getLayersByName("Coordinates Grid")[0];
			if(graticule && graticule.visibility){
				var mapResolution = map.getResolution();
				var resRef = 0.3515625/2;
				if(mapResolution > resRef){
					var zoom = map.getZoomForResolution(resRef);
					map.zoomTo(zoom);
				}			
			}
		}
	);
}

function populateRfbOptions(id) {
	var tgt = document.getElementById(id);
	var opt, e, cv = '';
	if ( tgt.options.length != 0 || tgt.value ) cv = tgt.value;
	var opts = new Array();
	var rfbs = FigisMap.rfb.list(); //TODO OL3
	for ( var i = 0; i < rfbs.length; i++ ) {
		opt = document.createElement('OPTION');
		opt.value = rfbs[i];
		opt.text = FigisMap.label( opt.value );
		opts.push( opt );
	}
	opt = document.createElement('OPTION');
	opt.text = FigisMap.label('SELECT_AN_RFB');
	opt.value = '';
	opt = new Array( opt );
	opts = opt.concat( opts.sort( function(a,b) { return a.text > b.text ? 1 : ( a.text < b.text ? -1 : 0 ); } ) );
	while ( tgt.options.length > 0 ) tgt.remove( 0 );
	for ( var i = 0; i < opts.length; i++ ) {
		try {
			tgt.add( opts[i], null );
		} catch(e) {
			tgt.add( opts[i] );
		}
	}
	tgt.value = cv;
}

function populateZoomAreaOptions(id) {
	var tgt = document.getElementById(id);
	var opt, e, cv = '';
	//if ( tgt.options.length != 0 || tgt.value ) cv = tgt.value;
	var opts = [];
	
	for ( var i in georeferences_data ) {
		opt = document.createElement('OPTION');
		opt.value = i;
		opt.text = FigisMap.label( opt.value );
		opts.push( opt );
	}
	opt = document.createElement('OPTION');
	opt.text = FigisMap.label('SELECT_AN_AREA');
	opt.value = '';
	opt = new Array( opt );
	opts = opt.concat( opts.sort( function(a,b) { return a.text > b.text ? 1 : ( a.text < b.text ? -1 : 0 ); } ) );
	while ( tgt.options.length > 0 ) tgt.remove( 0 );
	for ( var i = 0; i < opts.length; i++ ) {
		try {
			tgt.add( opts[i], null );
		} catch(e) {
			tgt.add( opts[i] );
		}
	}
	
	tgt.value = cv;
}

/*
* setVMEPage function. Load the base RFB Map applying the user request parameters, if any, to load the rfbs in to the map.  
*       elinkDiv -> The embed-link id  (optional if not using the embed link div).
*       urlLink -> The id of the url input field of the embed-link (optional if not using the embed link div).
*       htmlLink -> The id of the html input field of the embed-link (optional if not using the embed link div).
*/
function setVMEPage(elinkDiv, urlLink, htmlLink) {
	// populateRfbOptions('SelectRFB'); TDP: mandatory ?
	
	var layers, extent, zoom, prj, center, year, rfb, mapSize;
	
	if ( location.search.indexOf("embed=true") != -1 ){
		
		// Parsing the request to get the parameters
		
		var params = location.search.replace(/^\?/,'').replace(/&amp;/g,'&').split("&");
		
		for (var j=0; j < params.length; j++) {
			var param = params[j].split("=");
			switch ( param[0] ) {
				case "layers"	: layers = param[1]; break;
				case "extent"	: extent = param[1]; break;
				case "zoom"	: zoom = parseInt(param[1]); break;
				case "prj"	: prj = param[1]; break;
				case "center"	: center = param[1]; break;
				case "year"	: year = param[1]; break;
                case "rfb"	: rfb = param[1]; break;
				case "mapSize"	: mapSize = param[1]; break;
			}
		}
		
		if ( !layers || layers == '' ) layers = null;
		
		if ( year && year != '' ){
			year = parseInt(year);
			
			// ///////////////////////////////////////////
			// Set layers visibility if 'layers' in URL
			// ///////////////////////////////////////////
			//FigisMap.ol.selectedYear = year;
			//Ext.get('yearCurrent').update(FigisMap.time.selectedYear);
			FigisMap.time.setSelectedYear(year);
		}else{
			year = null;
			//TODO OL3
			FigisMap.time.setSelectedYear(FigisMap.time.getFullYear());
		}
		
		if ( extent == "" ) extent = null;
		if ( extent != null ) {
			var bbox = extent.split(",");
			extent = [bbox[0], bbox[1], bbox[2], bbox[3]]
		}
		
		if ( center == "" ) center = null;
		if ( center != null ) {
			var c = center.split(",");
			center = c;
		}
		
		if ( zoom == '' ) zoom = null;
		if ( zoom != null ) zoom = parseInt( zoom );
		
		if ( prj == '' ) prj = null;
		
		setProjection( prj);
		
	}else{	
		FigisMap.time.setSelectedYear(FigisMap.time.getFullYear());
		
		// //////////////////////////////////////////////////
		// WGS84 Radio Button checked as default.
		// //////////////////////////////////////////////////
		
		/*var WGS84Radio = document.getElementById("WGS84Radio");
		WGS84Radio.checked = true;*/

		// //////////////////////////////////////////////////
		// mercatorRadio Radio Button checked as default.
		// //////////////////////////////////////////////////
        
        var mercatorRadio = document.getElementById("mercatorRadio");
		mercatorRadio.checked = true;
        
	}
	
	/*
	* Load the RFB using the request parameters.
	*/
	addVME(extent, zoom, prj, elinkDiv, urlLink, htmlLink, null, center, layers, year, rfb, mapSize);
}

/*
* setVMEEmbedLink function. Manage the expand/collapse of the Embed-Link div.
*       embedUrl -> The id of the url input field of the embed-link.
*       embedIframe -> The id of the html input field of the embed-link.
*/
function setVMEEmbedLink(embedUrl, embedIframe) {

	// /////////////////////////////////
	// Get involved layers in the map
	// /////////////////////////////////
	var visibleLayers = [];
	
	var allLayers = myMap.layers;
	var size = allLayers.length;
	
	for(var i=0; i<size; i++){
		var layer = allLayers[i];
		if(layer && layer.getVisibility()){
			var layerName = layer.name;
			visibleLayers.push(layerName);
		}
	}
	
	// ////////////////////////
	// Get the current CRS
	// ////////////////////////
	var crs = getProjection();
	
	// //////////////////////////////////////////
	// Get the current extent, center and zoom
	// //////////////////////////////////////////
	var extent = myMap.getExtent().toBBOX();
	var zoom = myMap.getZoom();
	var center = myMap.getCenter().toShortString();
	center = center.replace(/ /g, '');

	var year = FigisMap.time.getSelectedYear();
    
    var comboRfb = Ext.getCmp("RFBCombo");
    var rfb;
    
    if (comboRfb)
        rfb = getRFBCheckBoxValue();
	
	// ///////////////////////////////////////////////////
	// Building the request url containing the map status.
	// ///////////////////////////////////////////////////
	var baseURL = location.href.replace(/#.*$/,'').replace(/\?.*$/,'');
	
	baseURL += "?embed=" + true 
		+ "&extent=" + extent
		+ "&prj=" + crs
		+ "&zoom=" + zoom
		+ "&center=" + center
		+ "&year=" + year
		+ "&layers=" + encodeURIComponent(visibleLayers.join(";"))
        + "&rfb=" + rfb;
		
	//baseURL = baseURL.replace(/ /g, '');
	
	// //////////////////////////
	// Fill embed link fields 
	// //////////////////////////
	
	if ( ! ( document.getElementById ) ) return void(0);
	
	var linkId = Ext.getCmp(embedUrl);
	var htmlId = Ext.getCmp(embedIframe);
	
	linkId.setValue(baseURL);
    
    var newHref = window.location.origin + window.location.pathname;

	//
	// Set the Regular Size Embedded 
	//	
	var regularSizeBaseURL = baseURL + "&mapSize=L";
    var htmlFrame = '<iframe src="' + regularSizeBaseURL.replace(newHref, newHref + 'index_e.html') + '" width="962" height="670" frameborder="0" marginheight="0">';
		htmlFrame += "</iframe>";
		
	htmlId.setValue(htmlFrame);
	
	//
	// Set the Small Size Embedded 
	//
	var htmlId = Ext.getCmp(embedIframe + "-small");
	
    var smallSizeBaseURL = baseURL + "&mapSize=M";
    htmlFrame = '<iframe src="' + smallSizeBaseURL.replace(newHref,newHref + 'index_e.html') + '" width="720" height="500" frameborder="0" marginheight="0">';
	htmlFrame += "</iframe>";
		
	htmlId.setValue(htmlFrame);
	
	//alert(baseURL);
}


/* GUI changes - TODO move it in a separeate file */

function toggleProjectionPanel(){
    var el = Ext.get('SelectSRS');
    el.getHeight()==0 ? el.setHeight(50,true):el.setHeight(0,true);
    Ext.get('lblSRS').toggleClass('open');
    closeRfbPanel();
    closeYearsPanel();
}
function closeProjectionPanel(){
    var el = Ext.get('SelectSRS');
	if(el){
		el.setHeight(0,true);
	}
	
	el = Ext.get('lblSRS');	
	if(el){
		el.removeClass('open');
	}
}

function toggleRfbPanel(){
    var el = Ext.get('RFBCombo');
    el.getHeight()==0 ? el.setHeight(90,true):el.setHeight(0,true);
    Ext.get('selectionRFB').toggleClass('open');
    closeProjectionPanel();
    closeYearsPanel();
}
function closeRfbPanel(){
    var el = Ext.get('RFBCombo');
	if(el){
		el.setHeight(0,true);
	}
	
	el = Ext.get('selectionRFB');	
	if(el){
		el.removeClass('open');
	}
}

function toggleYearsPanel(){
    var el = Ext.get('yearsContent');
    el.getHeight()==0 ? el.setHeight(50,true):el.setHeight(0,true);
    Ext.get('selectionYears').toggleClass('open');
    closeProjectionPanel();
    closeRfbPanel();
}
function closeYearsPanel(){
    var el = Ext.get('yearsContent');
	if(el){
		el.setHeight(0,true);
	}
	
	el = Ext.get('selectionYears');	
	if(el){
		el.removeClass('open');
	}
}

/**
In Internet Explorer (up to at least IE8) clicking a radio button or checkbox to 
change its value does not actually trigger the onChange event until the the input loses focus.
Thus you need to somehow trigger the blur event yourself.
*/
function radioClick(radio){
	if(Ext.isIE){
		radio.blur();  
		radio.focus();  
	}
}
