/**
 * VME Map viewer Javascript
 * Authors:
 *	Geosolutions (original code based on OpenLayers 2),
 *	Emmanuel Blondel (major updates to migrate to OpenLayers 3 and new FigisMap)
 * 
 */

FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/vendor/ol3/ol3-popup.js');
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/FigisMap/FigisMap-popup.js');
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/FigisMap/FigisMap-time.js');

var VME = new Object();



/**
 * ===========================================================================
 *	MAP component methods
 * ===========================================================================
 */

VME.myMap = false;
VME.mapCenter = [-2.46, 18.23];
VME.overlayGroups = [
	{name: "Additional features", infoUrl : "vme_info_ovl.html"},
	{name: "Managed areas related to UNGA Res. 61-105", infoUrl : false}
];


/**
 * Convenience method to get a label given a key string
 * @param key
 */
VME.label = function(key){
	return FigisMap.label(key, VMELabels);
}


/**
 * VME baseMapParams
 */

VME.baseMapParams = function(year){
	
	var baselayers = FigisMap.defaults.baseLayers.slice();
	baselayers.reverse();
	
	this.rfb = '';
	this.target = 'map';
	this.context = 'vmeViewer';
	this.legend = 'legend';
	this.fullWindowMap = true;
	this.base = baselayers;
	this.projection = VME.currentProjection();

	this.popups = [
		//getfeatureinfo popup
		{
			id: "vmelayers",
			strategy: "getfeatureinfo",
			multiple: true,
			refs: [
				{id: FigisMap.fifao.vmc, resourceHandler: VMEPopup.vmeResourceHandler},
				{id: FigisMap.fifao.vmb},
				{id: FigisMap.fifao.vmo}
			],
			contentHandler : VMEPopup.contentHandler,
			beforeevent : function(){
				if(VMESearch.loader.disabled){
					VMESearch.loader.enable();
					VMESearch.loader.show();
				}
			},
			afterevent : function(feature){
				if(!VMESearch.loader.disabled){
					VMESearch.loader.hide();
					VMESearch.loader.disable();
				}

			}
		}
	];

	this.staticLabels = VMELabels.staticLabels;

	this.options = {
		labels: true,
		baseMarineLabels: true,
		baseMask: true,
		majorAreasAsLines: true,
		hideBasicLayers: true,
		layerSwitcherOptions: { 
			target: "layerswitcher",
			displayLegend: true ,
			toggleLegendGraphic : true,
			collapsableGroups : true,
			overlayGroups : VME.overlayGroups,
			groupInfoHandler : function(lyr) {
				return VMEInfo.infoHandler(lyr.infoUrl, false);
			},
			defaultOverlayGroup: VME.overlayGroups[0]}
	};
	
	return this;
	
}

VME.getExtent = function() {
	return ( VME.myMap ) ? VME.myMap.getView().calculateExtent(VME.myMap.getSize()) : null;
};

VME.getCenter = function() {
	return ( VME.myMap ) ? VME.myMap.getView().getCenter() : null;
};

/*
	VME.baseMapParams.prototype.setVMELayers
	@param year: year
*/
VME.baseMapParams.prototype.setVMELayers = function(year){
	this.contextLayers = [
		//main VME layers
		{
			layer	: FigisMap.fifao.vmb,
			label	: 'Bottom fishing areas', //'Area types',
			overlayGroup: VME.overlayGroups[1],
			style: "MEASURES_BTM_FISH",
			filter	: "YEAR <= '" + year + "' AND END_YEAR >="+ year,
			opacity	: 1.0,
			hideInSwitcher	: false, 
			showLegendGraphic: true, 
			legend_options: "forcelabels:on;forcerule:True;fontSize:12"
		},
		{
			layer	: FigisMap.fifao.vmo,
			label	: 'Other access regulated areas', //'Area types',
			overlayGroup: VME.overlayGroups[1],
			style: "MEASURES_OTHER",
			filter	: "YEAR <= '" + year + "' AND END_YEAR >="+ year,
			opacity	: 1.0,
			hideInSwitcher	: false,
			showLegendGraphic: true,
			legend_options: "forcelabels:on;forcerule:True;fontSize:12"
		},
		{
			layer	: FigisMap.fifao.vmc,
			label	: 'VME closed areas', //'Area types',
			overlayGroup: VME.overlayGroups[1],
			style: "MEASURES_VME",
			filter	: "YEAR <= " + year + " AND END_YEAR >= "+ year,
			opacity	: 1.0,
			hideInSwitcher	: false,
			showLegendGraphic: true, 
			legend_options: "forcelabels:on;forcerule:True;fontSize:12"
		},
		//additional VME layers
		{
			layer		: FigisMap.fifao.guf,
			label	: 'Gebco Undersea Features',
			overlayGroup: VME.overlayGroups[0],
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
			overlayGroup: VME.overlayGroups[0],
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
			overlayGroup: VME.overlayGroups[0],
			cached		: true,
			filter		: '*',
			style		: 'vents_InterRidge_2011_all',
			skipLegend	: true,
			hidden	: true,
			hideInSwitcher	: false, 
			showLegendGraphic: true
		},
		{
			layer		: FigisMap.fifao.vmr,
			label	: 'RFB Competence Areas',
			overlayGroup: VME.overlayGroups[0],
			cached		: true,
			filter		: '*',
			style		: '',
			skipLegend	: true,
			hidden	: true,
			hideInSwitcher	: false,
			showLegendGraphic: true
		}
	];

}

/*
	VME.baseMapParams.prototype.setVMELayerVisibility
	@param layer: layer title
	@param visible: true if visible, false otherwise
*/
VME.baseMapParams.prototype.setVMELayerVisibility = function(layer, visible){
	for(var i=0;i<this.contextLayers.length;i++){
		if(layer.label === this.contextLayers[i].label){
			this.contextLayers[i].hidden = !visible;
			
			var el;
			switch(layer.layer){
				case FigisMap.fifao.vmc:
					el = document.getElementById("lblVMEs");	
					el.className = this.contextLayers[i].hidden? "lblVMEs figisButtonVMEs" : "lblVMEs figisButtonToggleVMEs";
					break;
				case FigisMap.fifao.vmb:
					el = document.getElementById("lblBFAs");	
					el.className = this.contextLayers[i].hidden? "lblBFAs figisButtonBFAs" : "lblBFAs figisButtonToggleBFAs";
					break;	
				case FigisMap.fifao.vmo:
					el = document.getElementById("lblOARAs");	
					el.className = this.contextLayers[i].hidden? "lblOARAs figisButtonOARAs" : "lblOARAs figisButtonToggleOARAs";
					break;												
			}	
			break;
		}
	}

		
}

/*
	VME.baseMapParams.prototype.setProjection
	@param p: projection
*/
VME.baseMapParams.prototype.setProjection = function( p ) { if( p ) this.projection = p; };


/*
	VME.baseMapParams.prototype.setExtent
	@param e: extent, as array or string
	Uses and sets VME.lastExtent
	In case VME.lastExtent is boolean (false) doesn't set any extent.
*/
VME.baseMapParams.prototype.setExtent = function( e ) {
	if ( e ) {
		if ( e.constructor === Array ) VME.lastExtent = e;
	}
	if ( typeof VME.lastExtent == 'boolean' ) {
		VME.lastExtent = null;
		this.extent = null;
		this.global = true;
		return false;
	}
	if ( ! VME.lastExtent ) {
		if ( VME.myMap ) {
			VME.lastExtent = VME.getExtent();
		} else {
			VME.lastExtent = null;
		}
	}
	this.extent = VME.lastExtent ? VME.lastExtent : null;
	return true;
};

/*
	VME.baseMapParams.prototype.setCenter
	@param c: center, as array
	Uses and sets VME.lastCenter
	In case VME.lastCenter is boolean (false) doesn't set any center.
*/
VME.baseMapParams.prototype.setCenter = function( c ) {
	if ( c ) {
		if ( c.constructor === Array ) VME.lastCenter = c;
	} else{
		VME.lastCenter = [-2.46, 18.23];
	}
	if ( typeof VME.lastCenter == 'boolean' ) {
		VME.lastCenter = null;
		this.center = null;
		return false;
	}
	if ( ! VME.lastCenter ) {
		if ( VME.myMap ) {
			VME.lastCenter = VME.getCenter();
		} else {
			VME.lastCenter = null;
		}
	}
	this.center = VME.lastCenter ? VME.lastCenter : null;
	return true;
};



VME.setRFB = function( rfb ){
	if(rfb){
		VME.rfb = rfb;
		VME.isRFB = true;
	}else{
		VME.removeRFB();
	}
}

VME.removeRFB = function(){
	if(VME.rfb) delete VME.rfb;
	VME.isRFB = false;
}



/**
 * VME.getRFBZoomLevel
 * @param acronym
 * @param proj
 * @return zoom level (integer)
 */
VME.getRFBZoomLevel = function(acronym, proj){
	
	if(!proj) proj = VME.myMap.getView().getProjection();
	var epsgCode = proj.getCode();

	var zoom;
	switch(acronym){
		case "CCAMLR":
			switch(epsgCode){
				case "EPSG:3031": zoom = 2;break;
				default: zoom = 1;break;	
			}
			break;
		case "GFCM":
			switch(epsgCode){
				case "EPSG:3031": zoom = 2;break;
				default: zoom = 4;break;	
			}
			break;
		case "NAFO": zoom = 2;break;
		case "NEAFC": zoom = 2;break;
		case "NPFC": zoom = 2;break;
		case "SEAFO":
			switch(epsgCode){
				case "EPSG:3031": zoom = 1;break;
				default: zoom = 2;break;	
			}
			break;
		case "SPRFMO": zoom = 1;break;
	}
	return zoom;
}


/**
 * VME.zoomTo
 * @param zoomExtent extent given in the target proj
 * @param zoomLevel zoom level to apply for the map
 * @param sourceProj source projection
 * @param targetProj target projection
 */
VME.zoomTo = function(zoomExtent, zoomLevel, sourceProj, targetProj, wrapDateLine) {

	if (zoomExtent != null && sourceProj != null && targetProj != null){

		if(sourceProj.getCode() != targetProj.getCode()){
			var newproj = targetProj.getCode().split(":")[1];
			if(targetProj.getCode() == 'EPSG:3031') zoomExtent = [-3465996.97,-3395598.49,5068881.53,4524427.45];
			VME.setViewer(zoomExtent, zoomLevel, newproj, 'embed-link','embed-url', 'embed-iframe');
			VME.setProjection(newproj);
		}
				
		VME.myMap.zoomToExtent(zoomExtent);
		//VME.myMap.getView().setCenter(ol.extent.getCenter(zoomExtent));

		if(wrapDateLine) VME.myMap.optimizeCenter(zoomExtent, null, true);
		
    	}else{
    		VME.myMap.zoomToMaxExtent();
    	}

	if(zoomLevel) VME.myMap.getView().setZoom(zoomLevel);

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
	
	VME.resetByYear(year);
}

/**
* Resets the VME viewer by year
* @param year
*/
VME.resetByYear = function(year){
	document.getElementById("FilterRFB").text = VME.label('SELECT_AN_AREA');
	document.getElementById("FilterRFB").value = "";
	document.getElementById("SelectRFB").value = "";
    
    	VME.resetRFBCheckBox();
    	VME.closeRfbPanel();
    	VME.closeYearsPanel();
    
	VME.setProjection('3349');
   	 VME.closeProjectionPanel();
	VMEPopup.remove();
	VME.setVMEPage('embed-link','embed-url', 'embed-iframe');
	
    	/*
    	var years = Ext.getCmp('years-slider');
    	years.setValue(0, FigisMap.time.getFullYear());	
	Ext.getCmp('years-min-field').setValue(FigisMap.time.getFullYear());
	*/
	
	
	var y = year ? year : FigisMap.time.getFullYear(); 
	FigisMap.time.setSelectedYear(y);
	
	VME.update();	
	VME.myMap.zoomToMaxExtent();
	if ( VME.mapCenter ){
        	VME.myMap.getView().setCenter(FigisMap.ol.reCenter('EPSG:4326',VME.myMap.getView().getProjection().getCode(),VME.mapCenter));
    	}
	
	// Ensure that rfb.js is included AFTER vmeData.js, so theese are initialized
	VMESearch.form.panels.SearchForm.getForm().reset();
	VMESearch.form.panels.SearchPanel.layout.setActiveItem('searchcard-0');
	
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
    
    	VMEPopup.remove();
   	VME.refreshLayers(acronym);
	

	//remove highlight layer if any
	VMESearch.resetHighlightVMELayer();
}

/** 
 * VME.refreshLayer
 * Refresh a layer with acronym/time filters
 * @param layer name of the layer as in Geoserver ('namespace:layername')
 * @param year
 * @param acronym
 */
VME.refreshLayer = function(layer, year, acronym){

	//prepare new params
	var RFBFilter = (typeof(acronym) == 'undefined' || acronym == 'undefined' || acronym == "") ? false : true; 
	var newParams = {};
	if(layer == FigisMap.fifao.vmr){
		//case of RFB layer
		newParams.CQL_FILTER = (RFBFilter ? "RFB = '" + acronym + "'" : "RFB <> '*'");
	}else{
		//cases of VME layers
		var styleId = undefined;
		switch(layer) {
			case FigisMap.fifao.vmc:
				styleId = "VME";
				break;
			case FigisMap.fifao.vmo:
				styleId = "OTHER";
				break;
			case FigisMap.fifao.vmb:
				styleId = "BTM_FISH";
				break;
		}
		var style = "MEASURES_" + styleId;
		var styleForRfb = style + "_for_" + acronym;
		var styleToApply = (RFBFilter ?  styleForRfb : style);
		newParams.CQL_FILTER = (RFBFilter ? "YEAR <= " + year + " AND END_YEAR >= "+ year+" AND OWNER ='"+acronym+"'" : "YEAR <= " + year + " AND END_YEAR >= "+ year);
		newParams.STYLES = styleToApply;
		newParams.STYLE = styleToApply;
		newParams.legend_options = "forcelabels:on;forcerule:True;fontSize:12";
	}

	//update layer
	FigisMap.ol.refreshLayer(VME.myMap, layer, newParams);
	
}


/** 
 * VME.refreshLayers
 * refresh filters when year/filter are changes
 * 
 */
VME.refreshLayers = function (acronym){
	var year = FigisMap.time.getSelectedYear();
    	VME.refreshLayer(FigisMap.fifao.vmr, year, acronym);
	VME.refreshLayer(FigisMap.fifao.vmc, year, acronym);
	VME.refreshLayer(FigisMap.fifao.vmo, year, acronym);
	VME.refreshLayer(FigisMap.fifao.vmb, year, acronym);
	FigisMap.ol.updateLayerSwitcher(VME.myMap);
};



//check if bbox of zoom area is in bbox of projection
VME.checkValidBbox = function (zoomExtent, zoomProj) {

};


/**
 * ===========================================================================
 *	main Viewer methods
 * ===========================================================================
 */

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
	FigisMap.time.incrementHandler = function(newyear){
		VME.update();
        	Ext.get('yearCurrent').update(FigisMap.time.selectedYear);
	}
	FigisMap.time.decrementHandler = function(newyear){
		VME.update();
        	Ext.get('yearCurrent').update(FigisMap.time.selectedYear);
	}
	FigisMap.time.selectionHandler = function(newyear){
		if(newyear <= FigisMap.time.maxYear && newyear >= FigisMap.time.minYear){
        		Ext.get('yearCurrent').update(newyear);
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
	//year
	FigisMap.time.setSelectedYear(year);
	if(typeof year == "undefined"){
		year = FigisMap.time.getSelectedYear();
	}
	
	//are we in a embedded Iframe
	var embeddedIframe = location.href.indexOf("vme_e.html") != -1 ? true : false;
	 
	//params
	var pars = new VME.baseMapParams();
	pars.setVMELayers( year );
	if(projection){
		pars.setProjection( projection )
	}else{
		if(!embeddedIframe) pars.setProjection(VME.currentProjection());
	};
	pars.setExtent( extent );
	pars.setCenter( center );
	if( zoom ) pars.zoom = zoom;
	
	if(embeddedIframe){
		pars.target = 'map_e';
		pars.fullWindowMap = false;
		pars.center = (center)? pars.center : [14, -26];
		pars.mapSize = mapSize ? mapSize : "L";
		var elementsDiv = [pars.target, 'main_e', 'page_e', 'wrapper_e', 'disclaimer_e'];
		VME.setEmbeddedElementClass(elementsDiv, pars.mapSize);		
	}
	
	// Use this if you want to change the center at the embebbed reset
	//VME.mapCenter = embeddedIframe ? new OpenLayers.LonLat(14, -26) : new OpenLayers.LonLat(-2.46, 18.23);

	
	if ( extent != null ) pars.extent = extent;
	pars.filter = filter;
	
	//if ( document.getElementById(elinkDiv) ) document.getElementById(elinkDiv).style.display = "none";
	
	if(layers){
		pars.contextLayers = layers;
	}	
	
	
	VME.draw(pars);
	
	
	if ( VME.myMap ) {	
	
		//TODO OL3
		if ( document.getElementById(elinkDiv) ) {
			VME.myMap.on(
				'moveend',
				function(){
					VME.setEmbedLink(urlLink, htmlLink);
				}
			);
		}
        if(rfb && rfb != '')
		VME.setRFB(rfb);
            	VME.refreshLayers(rfb);
		var p = (projection == 3349)? 900913 : p;
		VMESearch.run(VME.rfb, false, false, ol.proj.get("EPSG:"+p));
		VME.setEmbedLink('embed-url', 'embed-iframe');
	}
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
	if ( ! mapProjection ) mapProjection = VME.currentProjection();
	
	if ( ! zoom ) {	
		zoom = (mapProjection == 3031)? 1 : 0;
	}

	// Close popup when RFB change
	VMEPopup.remove();
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

/*
* setVMEPage function. Load the base RFB Map applying the user request parameters, if any, to load the rfbs in to the map.  
*       elinkDiv -> The embed-link id  (optional if not using the embed link div).
*       urlLink -> The id of the url input field of the embed-link (optional if not using the embed link div).
*       htmlLink -> The id of the html input field of the embed-link (optional if not using the embed link div).
*/
VME.setVMEPage = function(elinkDiv, urlLink, htmlLink) {
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

		//year
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
		
		//extent
		if ( extent == "" ) extent = null;
		if ( extent != null ) {
			extent = extent.split(",");
			for (var i=0; i<extent.length; i++) {
    				extent[i] = parseFloat(extent[i]);
			}			
		}
		
		//center
		if ( center == "" ) center = null;
		if ( center != null ) {
			var c = center.split(",");
			center = c;
		}
		
		//zoom
		if ( zoom == '' ) zoom = null;
		if ( zoom != null ) zoom = parseInt( zoom );
		
		//projection
		if ( prj == '' ) prj = null;
		if ( prj != null ) VME.setProjection( prj);


		//layers
		if ( !layers || layers == '' ) layers = null;		
		if (layers){
			layers = decodeURIComponent(layers);
			layers = layers.split(";");

			var pars = new VME.baseMapParams();
			pars.setVMELayers( year );
			for(var i=0;i<pars.contextLayers.length;i++){
				var layer = pars.contextLayers[i];
				if(layer.label != "") pars.setVMELayerVisibility(layer, (layers.indexOf(layer.label) != -1));		
			}
			layers = pars.contextLayers;
		}

		
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
        
        	var mercatorRadio = document.getElementById("RadioEPSG3349");
		if(mercatorRadio != null) mercatorRadio.checked = true;
		VME.setProjection('3349');
		prj = '3349';
	}
	
	/*
	* Load the RFB using the request parameters.
	*/
	VME.addViewer(extent, zoom, prj, elinkDiv, urlLink, htmlLink, null, center, layers, year, rfb, mapSize);
}


/**
* VME draw method
* @param pars
*/
VME.draw = function(pars){
	VME.myMap = FigisMap.draw( pars );
	if ( ! pars.distribution ) if ( ! pars.associated  ) if ( ! pars.intersecting ) if (! pars.extent) pars.global = true;
	if(pars.extent) VME.myMap.getView().fit(pars.extent, VME.myMap.getSize());
	if(pars.zoom) VME.myMap.getView().setZoom(pars.zoom);
	VME.lastPars = pars;
	VME.lastExtent = null;
	VME.lastCenter = null;
	VME.lastZoom = null;

	var VMELayer = FigisMap.ol.getLayer(VME.myMap, FigisMap.fifao.vmc);
	VMELayer.on("change:visible",function(e){
		VME.toggleVMEs();
	});

	var BFALayer = FigisMap.ol.getLayer(VME.myMap, FigisMap.fifao.vmb);
	BFALayer.on("change:visible", function(e){
		VME.toggleBFAs();
	});

	var OARALayer = FigisMap.ol.getLayer(VME.myMap, FigisMap.fifao.vmo);
	OARALayer.on("change:visible", function(e){
		VME.toggleOARAs();
	});

}


/*
	VME.init
 */
 VME.init = function() {
	VME.setVMEPage('embed-link','embed-url', 'embed-iframe');
};

/** -----------------------------------------------------------------------------------------------**/
/** 									LAYOUT FUNCTIONALITIES 									   **/
/** ---------------------------------------------------------------------------------------------- **/

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


/**
 * ===========================================================================
 *	LAYOUT Layers Toggle methods
 * ===========================================================================
 */


/**
 * VME.toggleVMELayer
 * @param layer
 * @param el the button DOM element
 * @param hiddenClass
 * @param visibleClass
 * Enables/Disables a VME layer
**/
VME.toggleVMELayer = function(layer, el, hiddenClass, visibleClass){

	if(el){
		if(el.className ==  hiddenClass){
			FigisMap.ol.toggleLayer(VME.myMap, layer, true);
			el.className = visibleClass;
		}else if(el.className == visibleClass){
			FigisMap.ol.toggleLayer(VME.myMap, layer, false);
			el.className =  hiddenClass
		}
		FigisMap.ol.updateLayerSwitcher(VME.myMap);
	}else{
		var olLayer = FigisMap.ol.getLayer(VME.myMap,layer);
		if(olLayer.getVisible()){
			el = document.getElementsByClassName(hiddenClass)[0];
			el.className = visibleClass;
		}else{
			el = document.getElementsByClassName(visibleClass)[0];
			el.className = hiddenClass;

		}
	}

}

/**
* function toggleVMEs
* @param el the button DOM element
* Enables/Disables 'vme:closures' layer in LayerSwitcher 
**/	
VME.toggleVMEs = function(el) {
	VME.toggleVMELayer(FigisMap.fifao.vmc, el, "lblVMEs figisButtonVMEs", "lblVMEs figisButtonToggleVMEs");
}

/**
* function toggleOARAs
* @param el the button DOM element
* Enables/Disables 'vme:other_areas' layer in LayerSwitcher 
**/	
VME.toggleOARAs = function(el){
	VME.toggleVMELayer(FigisMap.fifao.vmo, el, "lblOARAs figisButtonOARAs", "lblOARAs figisButtonToggleOARAs");
}

/**
* function toggleBFAs
* @param el the button DOM element
* Enables/Disables 'vme:bottom_fishing_areas' layer in LayerSwitcher 
**/	
VME.toggleBFAs = function(el){
	VME.toggleVMELayer(FigisMap.fifao.vmb, el, "lblBFAs figisButtonBFAs", "lblBFAs figisButtonToggleBFAs");
}

/**
* function restoreToggleButtons
*
* Restore toggle buttons status for VME layers
**/
VME.restoreToggleButtons = function(){
	var el = document.getElementById("lblVMEs");	
	if(el){
		var vme = FigisMap.ol.getLayer(VME.myMap, FigisMap.fifao.vmc);
		
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
		var bfa = FigisMap.ol.getLayer(VME.myMap, FigisMap.fifao.vmb);
			
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
		var oara = FigisMap.ol.getLayer(VME.myMap, FigisMap.fifao.vmo);
			
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
 *	LAYOUT Year component methods
 * ===========================================================================
 */


/*
	VME.toggleYearsPanel
	Toggles the year panel
*/
VME.toggleYearsPanel = function(){
    var el = Ext.get('yearsContent');
    el.getHeight()==0 ? el.setHeight(50,true):el.setHeight(0,true);
    Ext.get('selectionYears').toggleClass('open');
    VME.closeProjectionPanel();
    VME.closeRfbPanel();
}

/*
	VME.closeYearsPanel
	Closes the year panel
*/
VME.closeYearsPanel = function(){
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
 * ===========================================================================
 *	LAYOUT Projection component methods
 * ===========================================================================
 */
 
/*
	VME.toggleProjectionPanel
	Toggles the Projection panel
*/
VME.toggleProjectionPanel = function(){
    var el = Ext.get('SelectSRS');
    el.getHeight()==0 ? el.setHeight(50,true):el.setHeight(0,true);
    Ext.get('lblSRS').toggleClass('open');
    VME.closeRfbPanel();
    VME.closeYearsPanel();
}

/*
	VME.closeProjectionPanel
	Close the Projection panel
*/
VME.closeProjectionPanel = function(){
    var el = Ext.get('SelectSRS');
	if(el){
		el.setHeight(0,true);
	}
	
	el = Ext.get('lblSRS');	
	if(el){
		el.removeClass('open');
	}
}
 
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
    if(newValue == 900913) newValue = 3349;
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

/*
	Get VME.currentProjection
*/
VME.currentProjection = function( p ) {
	var cp;
	if(document.getElementById('RadioEPSG4326') != null) if ( document.getElementById('RadioEPSG4326').checked ) cp = '4326';
	if(document.getElementById('RadioEPSG3349') != null) if ( ! cp ) if ( document.getElementById('RadioEPSG3349').checked ) cp = '3349';
	if(document.getElementById('RadioEPSG3031') != null) if ( ! cp ) if ( document.getElementById('RadioEPSG3031').checked ) cp = '3031';
	if(document.getElementById('RadioEPSG54009') != null) if ( ! cp ) if ( document.getElementById('RadioEPSG54009').checked ) cp = '54009';
	if ( ! cp ) {
		if(document.getElementById('RadioEPSG4326') != null) document.getElementById('RadioSRS4326').checked = true;
		cp = '4326';
	}
	VME.lastProjection = parseInt( cp );
	if ( ! p ) return VME.lastProjection;
	p = String( p )
	if ( p != cp ) {
		if(document.getElementById('RadioEPSG4326') != null) document.getElementById('RadioEPSG4326').checked = ( p == '4326');
		if(document.getElementById('RadioEPSG3349') != null) document.getElementById('RadioEPSG3349').checked = ( p == '3349');
		if(document.getElementById('RadioEPSG3031') != null) document.getElementById('RadioEPSG3031').checked = ( p == '3031');
		if(document.getElementById('RadioEPSG54009') != null) document.getElementById('RadioEPSG54009').checked = ( p == '54009');
	}
	VME.lastProjection = parseInt( p );
	return VME.lastProjection;
};

/*
	VME.switchProjection
*/
VME.switchProjection = function( p ) {
	var op = VME.lastProjection;
	p = VME.currentProjection( p );
	var oe = VME.getExtent();
	var ne = FigisMap.ol.reBound(op,p,oe);
	VME.lastExtent = FigisMap.ol.isValidExtent(ne) ? ne : false;
	VME.lastZoom = false;
	
	if(VME.isRFB){
		if(p == 3349) p = 900913;
		VMESearch.run(VME.rfb, false, false, ol.proj.get("EPSG:"+p));
	}else{
		VME.setViewer();
	}
};

/**
 * ===========================================================================
 *	LAYOUT RFB component methods
 * ===========================================================================
 */


/**
 * VME.getSelectedOwner returns the selected value in the Authority combo box
 */
VME.getSelectedOwner= function(){
	return document.getElementById("SelectRFB").value;
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
		VME.removeRFB();
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
					break;
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
                VME.toggleRfbPanel();
            }
        }
    }
    //return rfbValue;
}

/*
	VME.toggleRfbPanel
	Toggles the RFB panel
*/
VME.toggleRfbPanel = function(){
    var el = Ext.get('RFBCombo');
    el.getHeight()==0 ? el.setHeight(90,true):el.setHeight(0,true);
    Ext.get('selectionRFB').toggleClass('open');
    VME.closeProjectionPanel();
    VME.closeYearsPanel();
}

/*
	VME.closeRfbPanel
	Closes the RFB panel
*/
VME.closeRfbPanel = function(){
    var el = Ext.get('RFBCombo');
	if(el){
		el.setHeight(0,true);
	}
	
	el = Ext.get('selectionRFB');	
	if(el){
		el.removeClass('open');
	}
}   

/**
*	VME.populateRfbOptions
*	@Deprecated
*/
VME.populateRfbOptions = function(id) {
	var tgt = document.getElementById(id);
	var opt, e, cv = '';
	if ( tgt.options.length != 0 || tgt.value ) cv = tgt.value;
	var opts = new Array();
	var rfbs = FigisMap.rfb.list(); //TODO OL3
	for ( var i = 0; i < rfbs.length; i++ ) {
		opt = document.createElement('OPTION');
		opt.value = rfbs[i];
		opt.text = VME.label( opt.value );
		opts.push( opt );
	}
	opt = document.createElement('OPTION');
	opt.text = VME.label('SELECT_AN_RFB');
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

/**
*	VME.populateZoomAreaOptions
*	@Deprecated
*/
VME.populateZoomAreaOptions = function(id) {
	var tgt = document.getElementById(id);
	var opt, e, cv = '';
	//if ( tgt.options.length != 0 || tgt.value ) cv = tgt.value;
	var opts = [];
	
	for ( var i in georeferences_data ) {
		opt = document.createElement('OPTION');
		opt.value = i;
		opt.text = VME.label( opt.value );
		opts.push( opt );
	}
	opt = document.createElement('OPTION');
	opt.text = VME.label('SELECT_AN_AREA');
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



/**
 * ===========================================================================
 *	Embeddes link methods
 * ===========================================================================
 */


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

/*
* VME.setEmbedLink function. Manage the expand/collapse of the Embed-Link div.
*       embedUrl -> The id of the url input field of the embed-link.
*       embedIframe -> The id of the html input field of the embed-link.
*/
VME.setEmbedLink = function(embedUrl, embedIframe) {


	// /////////////////////////////////
	// Get involved layers in the map
	// /////////////////////////////////
	var visibleLayers = [];
	
	var allLayers = VME.myMap.getLayerGroup().getLayersArray();
	
	for(var i=0; i<allLayers.length; i++){
		var layer = allLayers[i];
		if(layer && layer.getVisible() && layer.get('type') != "base"){
			var layerName = layer.get('title');
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
	var extent = VME.myMap.getView().calculateExtent(VME.myMap.getSize()).join(",");
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
    var htmlFrame = '<iframe src="' + regularSizeBaseURL.replace(newHref, newHref.replace("vme.html","") + 'vme_e.html') + '" width="962" height="670" frameborder="0" marginheight="0">';
		htmlFrame += "</iframe>";
		
	htmlId.setValue(htmlFrame);
	
	//
	// Set the Small Size Embedded 
	//
	var htmlId = Ext.getCmp(embedIframe + "-small");
	
    var smallSizeBaseURL = baseURL + "&mapSize=M";
    htmlFrame = '<iframe src="' + smallSizeBaseURL.replace(newHref,newHref.replace("vme.html","") + 'vme_e.html') + '" width="720" height="500" frameborder="0" marginheight="0">';
	htmlFrame += "</iframe>";
		
	htmlId.setValue(htmlFrame);

}
