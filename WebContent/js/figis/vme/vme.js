/**
 * VME Map viewer Javascript
 * Authors: Geosolutions, E. Blondel
 * 
 */

var VME = new Object();



/**
 * ===========================================================================
 *	MAP component methods
 * ===========================================================================
 */

VME.myMap = false;

VME.init = function() {
	setVMEPage('embed-link','embed-url', 'embed-iframe');
};

 
/**
* function setZoom
*
**/
VME.setZoom = function() {
	var settings = FigisMap.ol.getSettings( document.getElementById("FilterRFB").value );
	//Close popup when RFB change
	FigisMap.ol.clearPopupCache(); //TODO OL3
	VME.zoomTo(settings);
}

/**
* function zoomTo
*
**/
VME.zoomTo = function(settings,geom,zoom,closest) {
	if (settings != null){
		var bbox = geom ? geom : settings.zoomExtent.split(",");
		var curr_proj = VME.myMap.getView().getProjection(); 
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
				VME.myMap.zoomToExtent(bbox);
			}else{
                if(bboxproj == 'EPSG:3031'){
                    // WORKAROUND TO FIX STRANGE BEHAVIOUR BOUNDS TRANSFORMATION FROM 4326 TO 3031. BOUND NOW IS HARCODED
                    bbox = [-3465996.97,-3395598.49,5068881.53,4524427.45]; 
                    VME.myMap.getView().setCenter(ol.extent.getCenter(bbox)); 
                }else{
                    VME.myMap.getView().setCenter(ol.extent.getCenter(bbox)); 
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
			
			VME.setViewer(bbox, null, newproj, 'embed-link','embed-url', 'embed-iframe');
			
		    if(zoom){
				//TODO OL3 'closest' parameter?
				VME.myMap.zoomToExtent(bbox);
			}
					    
			VME.setProjection(newproj);		
		}
    }else{
    	VME.myMap.zoomToMaxExtent();
    }
}



/**
* Resets the VME viewer
*
*/
VME.reset = function(){
	
	var params = location.search.replace(/^\?/,'').replace(/&amp;/g,'&').split("&");
	
	var year;
	for (var j=0; j < params.length; j++) {
		var param = params[j].split("=");
		switch ( param[0] ) {
			case "year"	: year = param[1]; break;
		}
	}
	
	this.resetByYear(year);
}

/**
* Resets the VME viewer by year
* @param year
*/
VME.resetByYear = function(year){
	document.getElementById("FilterRFB").text = FigisMap.label('SELECT_AN_AREA');
	document.getElementById("FilterRFB").value = "";
	document.getElementById("SelectRFB").value = "";
    
    VME.resetRFBCheckBox();
    closeRfbPanel();
    closeYearsPanel();
    
	VME.setProjection('3349');
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
	
	VME.update();	
	VME.myMap.zoomToMaxExtent();
	if ( FigisMap.defaults.mapCenter ){
        VME.myMap.setCenter( FigisMap.ol.reCenter( FigisMap.defaults.mapCenterProjection, VME.myMap.getView().getProjection() , FigisMap.defaults.mapCenter) ); //TODO OL3
    }
	
	// Ensure that rfb.js is included AFTER vmeData.js, so theese are initialized
	Vme.form.panels.SearchForm.getForm().reset();
	Vme.form.panels.SearchPanel.layout.setActiveItem('searchcard-0');
	
	// Restore toggle
	VME.restoreToggleButtons();
	
	// Collapse the side panel
	var sidePanel = Ext.getCmp("side-panel").collapse();
}

VME.update = function(){
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
    
    var rfbComboTop = VME.getRFBCheckBoxValue();
    var rfmoComboSearch = Ext.getCmp("RFMOCombo").getRawValue();

    if(rfbComboTop == ""){
        acronym = rfmoComboSearch;
    }else{
        acronym = rfbComboTop;
    }
    
    FigisMap.ol.clearPopupCache(); //TODO OL3
    VME.refreshLayers(acronym);
	
	// //////////////////////////////
	// Remove layer for hilighting
	// //////////////////////////////
	//TODO @eblondel what is that????
	/*var hilayer = VME.myMap.getLayersByName("highlight")[0];
	if(hilayer ){
		VME.myMap.removeLayer(hilayer);
	}*/
}

/** 
 * VME.refreshLayer
 * Refresh a layer with acronym/time filters
 * @param layer name of the layer as in Geoserver ('namespace:layername')
 * @param year
 * @param acronym
 */
VME.refreshLayer = function(layer, year, acronym){

	var RFBFilter = (typeof(acronym) == 'undefined' || acronym == 'undefined' || acronym == "") ? false : true; 

	//source params
	var source = FigisMap.ol.getSource(VME.myMap, layer);
	var params = source.getParams();
	
	if(layer == FigisMap.fifao.vme_regarea){
		//case of RFB layer
		params.CQL_FILTER = (RFBFilter ? "RFB = '" + acronym + "'" : "RFB <> '*'");
	}else{
		//cases of VME layers
		var styleId = undefined;
		switch(layer) {
			case FigisMap.fifao.vme:
				styleId = "VME";
				break;
			case FigisMap.fifao.vme_oara:
				styleId = "OTHER";
				break;
			case FigisMap.fifao.vme_bfa:
				styleId = "BTM_FISH";
				break;
		}
		var style = "MEASURES_" + styleId;
		var styleForRfb = style + "_for_" + acronym;
		var styleToApply = (RFBFilter ?  styleForRfb : style);
		params.CQL_FILTER = (RFBFilter ? "YEAR <= " + year + " AND END_YEAR >= "+ year+" AND OWNER ='"+acronym+"'" : "YEAR <= " + year + " AND END_YEAR >= "+ year);
		params.STYLES = styleToApply;
		params.STYLE = styleToApply;
		params.legend_options = "forcelabels:on;forcerule:True;fontSize:12";
	}
	source.updateParams(params);
}

/** 
 * VME.refreshLayers
 * refresh filters when year/filter are changes
 * 
 */
VME.refreshLayers = function (acronym){
	var year = FigisMap.time.getSelectedYear();
    VME.refreshLayer(FigisMap.fifao.vme_regarea, year, acronym);
	VME.refreshLayer(FigisMap.fifao.vme, year, acronym);
	VME.refreshLayer(FigisMap.fifao.vme_oara, year, acronym);
	VME.refreshLayer(FigisMap.fifao.vme_bfa, year, acronym);
};

/**
 * ===========================================================================
 *	LAYOUT Toggle methods
 * ===========================================================================
 */


/**
* function toggleVMEs
* @param el the button DOM element
* Enables/Disables 'vme:closures' layer in LayerSwitcher 
**/	
VME.toggleVMEs = function(el) {
	var layer = FigisMap.fifao.vme;
	if(el.className ==  "lblVMEs figisButtonVMEs"){
		FigisMap.ol.toggleLayer(VME.myMap, layer, true);
		el.className = "lblVMEs figisButtonToggleVMEs"
	}else if(el.className == "lblVMEs figisButtonToggleVMEs"){
		FigisMap.ol.toggleLayer(VME.myMap, layer, false);
		el.className =  "lblVMEs figisButtonVMEs"
	}
	FigisMap.ol.updateLayerSwitcher(VME.myMap);
}

/**
* function toggleOARAs
* @param el the button DOM element
* Enables/Disables 'vme:other_areas' layer in LayerSwitcher 
**/	
VME.toggleOARAs = function(el){
	var layer = FigisMap.fifao.vme_oara;
	if(el.className ==  "lblOARAs figisButtonOARAs"){
		FigisMap.ol.toggleLayer(VME.myMap, layer, true);
		el.className = "lblOARAs figisButtonToggleOARAs"
	}else if(el.className == "lblOARAs figisButtonToggleOARAs"){
		FigisMap.ol.toggleLayer(VME.myMap, layer, false);
		el.className = "lblOARAs figisButtonOARAs"
	}
	FigisMap.ol.updateLayerSwitcher(VME.myMap);
}

/**
* function toggleBFAs
* @param el the button DOM element
* Enables/Disables 'vme:bottom_fishing_areas' layer in LayerSwitcher 
**/	
VME.toggleBFAs = function(el){
	var layer = FigisMap.fifao.vme_bfa;
	if(el.className ==  "lblBFAs figisButtonBFAs"){
		FigisMap.ol.toggleLayer(VME.myMap, layer, true);
		el.className = "lblBFAs figisButtonToggleBFAs"
	}else if(el.className == "lblBFAs figisButtonToggleBFAs"){
		FigisMap.ol.toggleLayer(VME.myMap, layer, false);
		el.className =  "lblBFAs figisButtonBFAs"
	}
	FigisMap.ol.updateLayerSwitcher(VME.myMap);
}

/**
* function restoreToggleButtons
*
* Restore toggle buttons status for VME layers
**/
VME.restoreToggleButtons = function(){
	var el = document.getElementById("lblVMEs");	
	if(el){
		var vme = FigisMap.ol.getLayer(VME.myMap, FigisMap.fifao.vme);
		
		// ///////////////////////////////////////////////
		// If there are Embed URL params concerning VME 
		// these should be maintained for the status 
		// (see also FigisMap.finalizeMap).
		// ///////////////////////////////////////////////
		if(vme.getVisible()){
			el.className = "lblVMEs figisButtonToggleVMEs";
		}else{
			el.className = "lblVMEs figisButtonVMEs";
		}							
	}		
	
	el = document.getElementById("lblBFAs");										
    if(el){
		var bfa = FigisMap.ol.getLayer(VME.myMap, FigisMap.fifao.vme_bfa);
			
		// /////////////////////////////////////////////////////
		// If there are Embed URL params concerning Bottom fishing areas 
		// these should be maintained for the status 
		// (see also FigisMap.finalizeMap).
		// /////////////////////////////////////////////////////	
		if(bfa.getVisible()){
			el.className = "lblBFAs figisButtonToggleBFAs";
		}else{
			el.className = "lblBFAs figisButtonBFAs";
		}					
	}

	el = document.getElementById("lblOARAs");										
    if(el){
		var oara = FigisMap.ol.getLayer(VME.myMap, FigisMap.fifao.vme_oara);
			
		// /////////////////////////////////////////////////////
		// If there are Embed URL params concerning Bottom fishing areas 
		// these should be maintained for the status 
		// (see also FigisMap.finalizeMap).
		// /////////////////////////////////////////////////////	
		if(oara.getVisible()){
			el.className = "lblOARAs figisButtonToggleOARAs";
		}else{
			el.className = "lblOARAs figisButtonOARAs";
		}					

	}    
}

/**
 * ===========================================================================
 *	LAYOUT Projection component methods
 * ===========================================================================
 */
 
/**
* Get projection
* @returns the EPSG code
*/
VME.getProjection = function(radioObj) {
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

/**
* Get projection
* @param the EPSG code
*/
VME.setProjection = function(newValue) {
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

/**
 * ===========================================================================
 *	LAYOUT RFB component methods
 * ===========================================================================
 */


/**
 * VME.getSelectedOwner returns the selected value in the Authority combo box
 */
VME.getSelectedOwner= function(){
	return	document.getElementById("SelectRFB").value;
};

 
 /**
* Resets the checkbox value
*/
VME.resetRFBCheckBox = function(){
    var rfbCombo = Ext.getCmp('RFBCombo');
    if(rfbCombo){
		rfbCombo.reset();
		for (var i = 0;i<rfbCombo.panel.items.items.length;i++){
			for (var c = 0;c<rfbCombo.panel.items.items[i].items.items.length;c++){
				rfbCombo.panel.items.items[i].items.items[c].checked = false;
				rfbCombo.panel.items.items[i].items.items[c].el.dom.checked = false;
			}
		}
	}
}      

/**
* Get the RFB check box value
* @returns the checkbox value (RFB acronym)
*/
VME.getRFBCheckBoxValue = function(){
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
/**
* Set the RFB check box value
* @params rfb acronym
*/
VME.setRFBCheckBoxValue = function(rfb){
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


/**
* function setViewer
*       extent -> The extent to zoom after the layer is rendered (optional).
*       zoom -> The zoom level of the map (optional).
*       mapProjection -> The map projection (optional).
*       elinkDiv -> The embed-link id  (optional if not using the embed link div).
*       urlLink -> The id of the url input field of the embed-link (optional if not using the embed link div).
*       htmlLink -> The id of the html input field of the embed-link (optional if not using the embed link div).
*       refresh -> set to false to manage VME.refreshLayers() function when user change projection.
**/
VME.setViewer = function( extent, zoom, mapProjection, elinkDiv, urlLink, htmlLink, filter, refresh) {
	if ( ! mapProjection ) {
		var settings = FigisMap.rfb.getSettings( VME.getProjection());
		VME.setProjection(settings && settings.srs ? settings.srs : '4326');
	}
	
	// Close popup when RFB change
	FigisMap.ol.clearPopupCache(); //TODO OL3
	VME.addViewer( extent, zoom, mapProjection, elinkDiv, urlLink, htmlLink, filter);

    var acronym;

    var rfbComboTop = VME.getRFBCheckBoxValue();
    var rfmoComboSearch = Ext.getCmp("RFMOCombo").getRawValue();

    if(rfbComboTop == ""){
        acronym = rfmoComboSearch;
    }else{
        acronym = rfbComboTop;
    }
	
    // REFRESH IS FALSE WHEN USER CHANGE PROJECTION
    if(refresh){
        VME.resetRFBCheckBox();
        VME.refreshLayers();
    }else{
        VME.refreshLayers(acronym);
    }
	
	// Restore toggle
	VME.restoreToggleButtons();
}


/**
 * Set EmbeddedElementClass
 * 
 */
VME.setEmbeddedElementClass = function(elementsDiv, mapSize){
	if(elementsDiv && elementsDiv.length > 0){
		for(var i=0; i<elementsDiv.length; i++){
			var target = elementsDiv[i];
			var div = document.getElementById(target);
			div.className = target + "_" + mapSize;
		}
	}
}	

/**
* VME draw method
* @param pars
*/
VME.draw = function(pars){
	VME.myMap = FigisMap.draw( pars );
	VME.lastPars = pars;
	VME.lastExtent = null;
	VME.lastCenter = null;
	VME.lastZoom = null;
}

/**
* function addViewer
*       extent -> The extent to zoom after the layer is rendered (optional).
*       zoom -> The zoom level of the map (optional).
*       elinkDiv -> The embed-link id  (optional if not using the embed link div).
*       urlLink -> The id of the url input field of the embed-link (optional if not using the embed link div).
*       htmlLink -> The id of the html input field of the embed-link (optional if not using the embed link div).
**/
VME.addViewer = function(extent, zoom, projection, elinkDiv, urlLink, htmlLink, filter, center, layers, year, rfb, mapSize) {
	
	//sets the zoom dropdown to default values when the area selection and the selection of projection change
	//populateZoomAreaOptions('FilterRFB');
	
	//time handlers
	if(typeof year == "undefined") year = FigisMap.time.getSelectedYear();
	FigisMap.time.incrementHandler = function(newyear){
		VME.update();
        Ext.get('yearCurrent').update(FigisMap.time.selectedYear);
	}
	FigisMap.time.decrementHandler = function(newyear){
		VME.update();
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
	
	var embeddedIframe = location.href.indexOf("vme_e.html") != -1 ? true : false;

	//overlay groups (reverse order of the layerswitcher appearance)
	var overlayGroups = ["Additional features", "Managed areas related to UNGA Res. 61-105"];
	 
	//params
	var pars = {
		rfb		    : '',
		target		: embeddedIframe ? 'map_e' : 'map',
		context		: 'vmeViewer',
		contextLayers : [
			//main VME layers
			{
				layer	: FigisMap.fifao.vme,
				label	: 'VME closed areas', //'Area types',
				overlayGroup: overlayGroups[1],
				style: "MEASURES_VME",
				filter	: "YEAR <= " + year + " AND END_YEAR >= "+ year,
				opacity	: 1.0,
				hideInSwitcher	: false,
				showLegendGraphic: true, 
				legend_options: "forcelabels:on;forcerule:True;fontSize:12"
			},
			{
				layer	: FigisMap.fifao.vme_oara,
				label	: 'Other access regulated areas', //'Area types',
				overlayGroup: overlayGroups[1],
				style: "MEASURES_OTHER",
				filter	: "YEAR <= '" + year + "' AND END_YEAR >="+ year,
				opacity	: 1.0,
				hideInSwitcher	: false,
				showLegendGraphic: true,
				legend_options: "forcelabels:on;forcerule:True;fontSize:12"
			},
			{
				layer	: FigisMap.fifao.vme_bfa,
				label	: 'Bottom fishing areas', //'Area types',
				overlayGroup: overlayGroups[1],
				style: "MEASURES_BTM_FISH",
				filter	: "YEAR <= '" + year + "' AND END_YEAR >="+ year,
				opacity	: 1.0,
				hideInSwitcher	: false, 
				showLegendGraphic: true, 
				legend_options: "forcelabels:on;forcerule:True;fontSize:12"
			},
			//additional VME layers
			{
				layer		: FigisMap.fifao.guf,
				label	: 'Gebco Undersea Features',
				overlayGroup: overlayGroups[0],
				cached		: true,
				filter		: '*',
				style		: '',
				skipLegend	: true,
				hideInSwitcher	: false,
				showLegendGraphic: false
			},
			{
				layer		: FigisMap.fifao.gbi,
				label	: 'Gebco Isobath 2000',  
				overlayGroup: overlayGroups[0],
				cached		: true,
				filter		: '*',
				style		: '',    
				skipLegend	: true,
				hidden	: true,
				hideInSwitcher	: false, 
				showLegendGraphic: true
			},
			{
				layer		: FigisMap.fifao.vnt,
				label	: 'Hydrothermal Vents',
				overlayGroup: overlayGroups[0],
				cached		: true,
				filter		: '*',
				style		: 'vents_InterRidge_2011_all',
				skipLegend	: true,
				hidden	: true,
				hideInSwitcher	: false, 
				showLegendGraphic: true
			},
			{
				layer		: FigisMap.fifao.vme_regarea,
				label	: 'RFB Competence Areas',
				overlayGroup: overlayGroups[0],
				cached		: true,
				filter		: '*',
				style		: '',
				skipLegend	: true,
				hidden	: true,
				hideInSwitcher	: false,
				showLegendGraphic: true
			}
		],
		legend		: 'legend',
		projection	: projection,
		fullWindowMap: !embeddedIframe,
		center : center ? center : (embeddedIframe ? [14, -26] : [-2.46, 18.23]),
		base: FigisMap.defaults.baseLayers.reverse(),
		options : {
			labels: true,
			layerSwitcherOptions: { id: "layerswitcherpanel",
									displayLegend: true ,
									toggleLegendGraphic : true,
									overlayGroups : overlayGroups,
									defaultOverlayGroup: overlayGroups[0]}
		}
	};
	
	if(embeddedIframe){
		pars.mapSize = mapSize ? mapSize : "L";
		var elementsDiv = [pars.target, 'main_e', 'page_e', 'wrapper_e', 'disclaimer_e'];
		VME.setEmbeddedElementClass(elementsDiv, pars.mapSize);		
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
	VME.draw(pars); //TODO OL3 manage visible layers FigisMap.draw( pars);
	
	if ( VME.myMap ) {	

		//TODO OL3
		if ( document.getElementById(elinkDiv) ) {
			VME.myMap.on(
				'moveend',
				function(){
					setVMEEmbedLink(urlLink, htmlLink);
				}
			);
		}
        if(rfb && rfb != '')
            VME.refreshLayers(rfb); //TODO OL3
        
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
			VME.myMap.zoomIn();
		}	
		
		setVMEEmbedLink('embed-url', 'embed-iframe');
	}
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
		
		VME.setProjection( prj);
		
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
		VME.setProjection('3349');
		prj = '3349';
	}
	
	/*
	* Load the RFB using the request parameters.
	*/
	VME.addViewer(extent, zoom, prj, elinkDiv, urlLink, htmlLink, null, center, layers, year, rfb, mapSize);
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
	
	var allLayers = VME.myMap.getLayers();
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
	var crs = VME.getProjection();
	
	// //////////////////////////////////////////
	// Get the current extent, center and zoom
	// //////////////////////////////////////////
	var extent = VME.myMap.getView().calculateExtent(VME.myMap.getSize());
	var zoom = VME.myMap.getView().getZoom();
	var center = VME.myMap.getView().getCenter().join(",");

	var year = FigisMap.time.getSelectedYear();
    
    var comboRfb = Ext.getCmp("RFBCombo");
    var rfb;
    
    if (comboRfb)
        rfb = VME.getRFBCheckBoxValue();
	
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
