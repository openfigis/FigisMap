/**
 * VME Map viewer Javascript
 * Authors:
 *	Geosolutions (original code based on OpenLayers 2),
 *	Emmanuel Blondel (major updates to migrate to OpenLayers 3 and new FigisMap)
 * 
 */

FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/vendor/ol3/ol3-popup.js');
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/figis/FigisMap/FigisMap-popup.js');
FigisMap.loadScript(FigisMap.httpBaseRoot + 'js/figis/FigisMap/FigisMap-time.js');


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

VME.utils = {
	generateDownloadLink :function(ows,types,filters,format,otherparams){
		try{
			var cql_filter = filters.join(";");
		}catch(e){
			cql_filter =filters;
		}
		try{
			var typeName = types.join(",");
		}catch(e){
			typeName = types;
		}
		var addParams = "";
		for (var name in otherparams){
			addParams += "&" + name + "=" + encodeURIComponent( otherparams[name] );
		}
		return ows+"?service=WFS&version=1.0.0&request=GetFeature" 
			+"&typeName="+ encodeURIComponent(typeName)
			+ "&outputFormat=" + encodeURIComponent( format )
			+ (cql_filter ? "&cql_filter=" + encodeURIComponent( cql_filter ):"")
			+ addParams;
								
	
	},
	generateFidFilter:function(fids){
		if(fids ==undefined) return ;
		var len = fids.length;
		if(!len) return ;
		
		var filter = "IN ('" +fids[0]+"'";
		for (var i=1; i<len ;i++){
			filter += ",'" +fids[i]+ "'";
		} 
		filter += ")";
		return filter;
	
	},
	generateVMEFilter:function(vme_id){
		if (vme_id ==undefined) return ;
		return "VME_ID = '" +vme_id +"'";
	},
	surfaceUoMConverter: function(feature, uom){
		var surface = feature.getProperties()["SURFACE"];
		if(uom == "ha"){
			var hectares = surface/10000;
			return Math.round(hectares);
		}else if(uom == "sqkm"){
			var sqkm = surface/1000000;
			return Math.round(sqkm);
		}
	}		
}


VME.vmeResponse = function(resource){
	var vmeDataParsed = JSON.parse(resource.responseText);
		
	// Sort year desc
	vmeDataParsed.responseList.sort(function(a,b){return b.year - a.year});
	var newYears = new Array();
	var newText = new Array();
	var newValidityPeriodStart = new Array();
	var newValidityPeriodEnd = new Array();
	var newSourceURL = new Array();
	var newFactsheetURL = new Array();

	var newReviewYear = new Array();

	var newYearsNoDate = new Array();
	var newTextNoDate = new Array();
	var newValidityPeriodStartNoDate = new Array();
	var newValidityPeriodEndNoDate = new Array();    
	var newSourceURLNoDate = new Array();
	var newFactsheetURLNoDate = new Array();

	var newReviewYearNoDate = new Array();

	// Take the firts element of array. The greatest year.
	var firstDate = vmeDataParsed.responseList[0].year;

	// Loop the responseList.
	for (var i = 0;i<vmeDataParsed.responseList.length;i++){

		
		newValidityPeriodStart.push(vmeDataParsed.responseList[i].validityPeriodStart);
		newValidityPeriodEnd.push(vmeDataParsed.responseList[i].validityPeriodEnd);
		
		newValidityPeriodStartNoDate.push(vmeDataParsed.responseList[i].validityPeriodStart);
		newValidityPeriodEndNoDate.push(vmeDataParsed.responseList[i].validityPeriodEnd);                              
		
		// if the selected year in the vme-viewer is the same that in the response list than
		if (vmeDataParsed.responseList[i].year == FigisMap.time.getSelectedYear()){
		
			newYears.push(vmeDataParsed.responseList[i].year);
			newText.push(vmeDataParsed.responseList[i].text);
			newSourceURL.push(vmeDataParsed.responseList[i].sourceURL);
			newFactsheetURL.push(vmeDataParsed.responseList[i].factsheetURL);
			newReviewYear.push(vmeDataParsed.responseList[i].reviewYear);
		
		}else{
			if(firstDate == vmeDataParsed.responseList[i].year){
				newYearsNoDate.push(vmeDataParsed.responseList[i].year);
				newTextNoDate.push(vmeDataParsed.responseList[i].text);
				newSourceURLNoDate.push(vmeDataParsed.responseList[i].sourceURL);
				newFactsheetURLNoDate.push(vmeDataParsed.responseList[i].factsheetURL);                                
				newReviewYearNoDate.push(vmeDataParsed.responseList[i].reviewYear);
			}
		
		}
	}                    

	var filterResponseListFin = new Array();

	if(newYears.length != 0){
		var measureText = newText.join("__");
		//newValidityPeriodStart.sort(function(a, b){return a-b});
		//newValidityPeriodEnd.sort(function(a, b){return a-b});

		filterResponseListFin = {
			inventoryIdentifier  : vmeDataParsed.inventoryIdentifier,
			localName            : vmeDataParsed.localName,     
			geoArea              : vmeDataParsed.geoArea,     
			owner                : vmeDataParsed.owner,     
			vmeType              : vmeDataParsed.vmeType,     
			reviewYear           : newReviewYear[0],     
			measure              : measureText,
			year                 : newYears[0],
			validityPeriodFrom  : newValidityPeriodStart[newValidityPeriodStart.length - 1], // prendo il minore
			validityPeriodTo   : newValidityPeriodEnd[0], // prendo il maggiore
			pdfURL               : newSourceURL[0],
			factsheetURL         : newFactsheetURL[0]
		}
		
	}else{

		var measureTextNoDate = newTextNoDate.join(";");
		//newValidityPeriodStartNoDate.sort(function(a, b){return a-b});
		//newValidityPeriodEndNoDate.sort(function(a, b){return a-b});
		
		newYearsNoDate.sort(function(a, b){return a-b});
		newReviewYearNoDate.sort(function(a, b){return a-b});

		filterResponseListFin = {
			inventoryIdentifier  : vmeDataParsed.inventoryIdentifier,
			localName            : vmeDataParsed.localName,     
			geoArea              : vmeDataParsed.geoArea,     
			owner                : vmeDataParsed.owner,     
			vmeType              : vmeDataParsed.vmeType,     
			reviewYear           : newReviewYearNoDate[newReviewYearNoDate.length - 1], // prendo il maggiore
			measure              : measureTextNoDate,
			year                 : newYearsNoDate[newYearsNoDate.length - 1], // prendo il maggiore
			validityPeriodFrom  : newValidityPeriodStartNoDate[newValidityPeriodStartNoDate.length - 1], // prendo il minore
			validityPeriodTo    : newValidityPeriodEndNoDate[0], // prendo il maggiore
			pdfURL               : newSourceURLNoDate[0],
			factsheetURL         : newFactsheetURLNoDate[0]
		}
	}
	return filterResponseListFin;
}

VME.vmeFeatureTemplate = function(layer, feature, resource){
	
	var vme = VME.vmeResponse(resource);
	console.log(vme);
	var vmeId = vme.inventoryIdentifier;

	vme.checkUntilYear = function(){
		var untilValue = vme.validityPeriodTo.split("-");
		if(untilValue[0] === "9999"){
				return ""; 
		}else{
				return "<em>until</em> <span>"+vme.validityPeriodTo+"</span>";
		}
	};
	vme.checkYearReview = function(){
		if(vme.reviewYear === 0 || vme.reviewYear === null){
				return "<br/>"; 
		}else{
				return ", <em>review in</em> <span>"+vme.reviewYear+"</span><br/>";
		}
	};
	vme.formatMeasure = function(){
		var pdf = vme.pdfURL;
		var measureArray = vme.measure.split("__");
		var html="";
		for (var i = 0;i<measureArray.length;i++){
			if (pdf == ""){
				html += '</em><span>' + measureArray[i] + '</span> <a  target="_blank" href="' + pdf + '"></a><br/>';
			}else{
				html += '</em><span>' + measureArray[i] + '</span> <a  target="_blank" href="' + pdf + '"><img title="Download pdf" src="assets/figis/vme/img/icons/download_pdf.png"></a><br/>';
			}
		}
		return html;
	};
	
	var p = feature.getProperties();
	var geom = feature.getGeometry();
	var extent = geom.getExtent();
	var trgGeom = (VME.getProjection() == "4326")? geom : geom.transform(new ol.proj.get("EPSG:4326"),VME.myMap.getView().getProjection());
	var trgExtent = trgGeom.getExtent();
	
	var downloadLink = VME.utils.generateDownloadLink(FigisMap.rnd.vars.ows, layer, VME.utils.generateVMEFilter(vmeId),"shape-zip",{format_options:"filename:VME-DB_"+vmeId+".zip"});


	var tpl = '<div class="popup-result">' +
			'<h3>'+vme.localName+'</h3>'+
			'<em>Management Body/Authority: </em><span class="own">'+vme.owner+'</span><br/>'+
			'<em>Closed since </em><span>'+vme.validityPeriodFrom+'</span> '+vme.checkUntilYear()+''+vme.checkYearReview()+
			'<em>Measure: </em>'+vme.formatMeasure()+
			'<em>Area Type: </em><span>'+vme.vmeType+'</span> <br/> '+
                        '<em>Surface: </em><span>'+VME.utils.surfaceUoMConverter(feature, "sqkm")+'</span><span> km&#178;</span> <br/> '+
                        '<br/>' +
			'<div>'+
				'<div style="text-align:right;float:right;">' +
					'<a class="" target="_blank" href="'+downloadLink+'">'+
						'<img title="Download as shapefile" src="assets/figis/vme/img/icons/download.png">'+
					'</a>&nbsp;&nbsp;' +
					'<a class="" onClick="VMESearch.clickOnFeature(\''+p["VME_AREA_TIME"]+'\','+FigisMap.time.getSelectedYear()+',true)">'+
						'<img title="Zoom to area" src="assets/figis/vme/img/icons/buttonzoom.png">'+
					'</a>&nbsp;&nbsp;' + 
					'<a href="javascript:void(0);" onClick="VMESearch.factsheetRel(\''+vme.factsheetURL+'\');">'+
						'<img title="View fact sheet" src="assets/figis/vme/img/icons/buttonfactsheet.png" />'+
					'</a>' +
                        	'</div>'+
				'<div style="text-align:left;">' +
					'<u><a href="javascript:void(0);" onClick="VMEInfo.infoHandler(VMESearch.factsheetUrl[\''+p["OWNER"]+'\'], true)" >Access the Regional Factsheet</a></u>' +
                        	'</div>'+                          
                    	'</div>';
				    

	return tpl;
}

VME.genericFeatureTemplate = function(layer, feature, resource){
	
	var p = feature.getProperties();
	var vmeId = p["VME_ID"];

	var geom = feature.getGeometry();
	var extent = geom.getExtent();
	var trgGeom = (VME.getProjection() == "4326")? geom : geom.transform(new ol.proj.get("EPSG:4326"),VME.myMap.getView().getProjection());
	var trgExtent = trgGeom.getExtent();

	var downloadLink = VME.utils.generateDownloadLink(FigisMap.rnd.vars.ows,layer,VME.utils.generateVMEFilter(vmeId),"shape-zip",{format_options:"filename:VME-DB_"+vmeId+".zip"});

	var tpl = '<div class="popup-result">' +
					'<h3>'+p["LOCAL_NAME"]+'</h3>'+
					'<em>Year: </em>'+p["YEAR"]+'<br/> '+
					'<em>Management Body/Authority: </em><span class="own">'+p["OWNER"]+'</span><br/>'+
					'<em>Geographical reference: </em><span class="geo_ref" >'+((p["GEOREF"])? p["GEOREF"]:"")+'</span> <br/>'+
                    			'<em>Surface: </em>'+VME.utils.surfaceUoMConverter(feature, "sqkm")+'</span><span> km&#178;</span> <br/> '+                         
					'<br/>' +
					'<div>'+
						'<div style="text-align:right;float:right;">' +
							'<a class="" target="_blank" href="'+downloadLink+'">'+
								'<img title="Download as shapefile" src="assets/figis/vme/img/icons/download.png">'+
							'</a>' +
							'<a class="" onClick="VMESearch.clickOnFeature(\''+p["VME_AREA_TIME"]+'\','+FigisMap.time.getSelectedYear()+',true)">'+

								'<img title="Zoom to area" src="assets/figis/vme/img/icons/buttonzoom.png">'+
							'</a>' +
						'</div>'+
						'<div style="text-align:left;">' +
							'<u><a href="javascript:void(0);" onClick="VMEInfo.infoHandler(VMESearch.factsheetUrl[\''+p["OWNER"]+'\'], true)" >Access the Regional Factsheet</a></u>' +
                        			'</div>'+                         
					'</div>'+
			'</div>'; 
	return tpl;
}


VME.contentHandler = function(features, requests){

	var container = document.createElement("div");
	container.className = "popup-container";
					
	//tab header
	//----------
	var layers = Object.keys(features);
	for(var i=0;i<layers.length;i++){
		var layer = layers[i];
		var tabTitle = "";
		switch(layer){
    			case FigisMap.fifao.vme :
      				tabTitle = "VME closed areas";break;
    			case FigisMap.fifao.vme_oara :
      				tabTitle = "Other access regulated areas";break;     
    			case FigisMap.fifao.vme_bfa : 
      				tabTitle = "Bottom fishing areas";break;
		}

		var input = document.createElement("input");
		input.id = "tab-"+i;
		input.type = "radio";
		input.name = "tab-group";
		if(i==0) input.checked = "checked";

		var label = document.createElement("label");
		label.setAttribute("for",input.id);
		label.className = "popup-label";
		label.innerHTML = tabTitle;
			
		container.appendChild(input);
		container.appendChild(label);
	}

	//add hidden tab
	var liner = document.createElement("div");
	liner.id = "liner";
	liner.className = "popup-liner";
	container.appendChild(liner);
		

	//tab content
	//-----------
	
	var content = document.createElement("div");
	content.className = "popup-content";
	for(var i=0;i<layers.length;i++){
		var layer = layers[i];
		var fc = features[layer].features;
		var resources = features[layer].resources;

		var layerContent = document.createElement("div");
		layerContent.id = "content-"+i;
		layerContent.className = "tab-content";

		
			
		var layerResults = "";
		for(var j=0;j<fc.length;j++){
			switch(layer){
				case FigisMap.fifao.vme:
					layerResults += VME.vmeFeatureTemplate(layer, fc[j], resources[j]); break;
				default:
					layerResults += VME.genericFeatureTemplate(layer, fc[j], null); break;
			}
			
		}
	
		layerContent.innerHTML = layerResults;
		content.appendChild(layerContent);
	}
	container.appendChild(content);
	return container;

	
}




/**
 * VME baseMapParams
 */

VME.baseMapParams = function(year){
	
	var baselayers = FigisMap.defaults.baseLayers;
	if(!VME.myMap) baselayers.reverse();
	
	this.rfb = '',
	this.target	= 'map';
	this.context = 'vmeViewer';
	this.legend	= 'legend';
	this.fullWindowMap = true;
	this.projection = VME.currentProjection();
	this.base = baselayers;
	

	this.popups = [
		//getfeatureinfo popup
		{
			id: "vmelayers",
			strategy: "getfeatureinfo",
			multiple: true,
			refs: [
				{id: FigisMap.fifao.vme,
				 resourceHandler: function(feature){
					var inventoryIdentifier = feature.getProperties()["VME_ID"];
					var vmeUrl = FigisMap.geoServerBase + '/figis/ws/vme/webservice/vme/' + inventoryIdentifier + '/specificmeasure';
					return vmeUrl;
				 }
				},
				{id: FigisMap.fifao.vme_bfa},
				{id: FigisMap.fifao.vme_oara}
			],
			contentHandler : VME.contentHandler,
			beforeopen : function(feature){
				VMESearch.loader.show();
			},
			onopen : function(feature){
				VMESearch.loader.hide();
			}
		}
	];

	this.staticLabels = VMELabels.staticLabels;

	this.options = {
		labels: true,
		baseMarineLabels: true,
		baseMask: true,
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
			layer	: FigisMap.fifao.vme_bfa,
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
			layer	: FigisMap.fifao.vme_oara,
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
			layer	: FigisMap.fifao.vme,
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
			layer		: FigisMap.fifao.vme_regarea,
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

/*
	VME.baseMapParams.prototype.setZoom
	@param z: zoom, integer
	Uses and sets VME.lastZoom
	In case VME.lastZoom is boolean (false) resets it to 1.
*/
VME.baseMapParams.prototype.setZoom = function( z ) {
	if ( z && (z != 1) ) {
		VME.lastZoom = z;
		this.zoom = z;
		return true;
	}
	if ( typeof VME.lastZoom == 'boolean' ) {
		this.zoom = VME.lastExtent ? VME.myMap.getView().getZoom() : 1;
		return false;
	}
	VME.lastZoom = VME.myMap ? VME.myMap.getView().getZoom() : 1;
	this.zoom = VME.lastZoom;
	return true;
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
		var projcode = curr_proj.getCode().split(":")[1];
		var valid = VME.checkValidBbox(projcode,settings); //TODO OL3
		console.log(settings);
		console.log(geom);
		console.log(valid);
		console.log(zoom);
		console.log(closest);
		if(valid){
			if(!geom){
				bbox = ol.proj.transformExtent(bbox,
					new ol.proj.get(bboxproj),
					curr_proj
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
			/*bbox = ol.proj.transformExtent(bbox,
				newproj == "4326" ? new ol.proj.get(newproj) : new ol.proj.get(curr_proj),
                		new ol.proj.get(bboxproj)
			);*/	

			//TODO OL3
			bbox = ol.proj.transformExtent(bbox,
				new ol.proj.get(curr_proj),
				new ol.proj.get(bboxproj == "EPSG:3349" ? "EPSG:900913" : bboxproj)
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
	//TODO OL3
	FigisMap.ol.clearPopupCache();
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
        VME.myMap.setCenter(
			FigisMap.ol.reCenter(
				new ol.proj.get('EPSG:4326'),
				VME.myMap.getView().getProjection(),
				VME.mapCenter)
			);
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
	if(layer == FigisMap.fifao.vme_regarea){
		//case of RFB layer
		newParams.CQL_FILTER = (RFBFilter ? "RFB = '" + acronym + "'" : "RFB <> '*'");
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
		newParams.CQL_FILTER = (RFBFilter ? "YEAR <= " + year + " AND END_YEAR >= "+ year+" AND OWNER ='"+acronym+"'" : "YEAR <= " + year + " AND END_YEAR >= "+ year);
		newParams.STYLES = styleToApply;
		newParams.STYLE = styleToApply;
		newParams.legend_options = "forcelabels:on;forcerule:True;fontSize:12";
	}

	//update layer
	FigisMap.ol.refreshLayer(layer, newParams);
	
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
	FigisMap.ol.updateLayerSwitcher(VME.myMap);
};



//check if bbox of zoom area is in bbox of projection
VME.checkValidBbox = function (projections,bboxs) {
	if(bboxs.srs){
		if (bboxs.srs != VME.myMap.getView().getProjection().getCode()){
			return false;
		}else{
			return true;
		}
	}
	if (projections == '3031'){
	    var bbox2 = bboxs.zoomExtent.split(",");
		var southpolarbbox = [-180,-90,180, -60];
		return ol.extent.containsExtent(southpolarbbox,bbox2);			
	}else{
		return true; 		
	}
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
	if(typeof year == "undefined"){
		FigisMap.time.setSelectedYear();
		year = FigisMap.time.getSelectedYear();
	}
	
	//are we in a embedded Iframe
	var embeddedIframe = location.href.indexOf("vme_e.html") != -1 ? true : false;
	 
	//params
	var pars = new VME.baseMapParams();
	pars.setVMELayers( year );
	pars.setProjection( projection );
	pars.setExtent( extent );
	pars.setCenter( center );
	
	if(embeddedIframe){
		pars.target = 'map_e';
		pars.fullWindowMap = false;
		pars.center = (center)? par.center : [14, -26];
		pars.mapSize = mapSize ? mapSize : "L";
		var elementsDiv = [pars.target, 'main_e', 'page_e', 'wrapper_e', 'disclaimer_e'];
		VME.setEmbeddedElementClass(elementsDiv, pars.mapSize);		
	}
	
	// Use this if you want to change the center at the embebbed reset
	//VME.mapCenter = embeddedIframe ? new OpenLayers.LonLat(14, -26) : new OpenLayers.LonLat(-2.46, 18.23);

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
					VME.setEmbedLink(urlLink, htmlLink);
				}
			);
		}
        if(rfb && rfb != '')
            VME.refreshLayers(rfb); //TODO OL3
        
		var l = document.getElementById('legendLegendTitle');
		if ( l ) l.innerHTML = VME.label( 'Legend', pars );
		l = document.getElementById('legendMembersTitle');
		if ( l ) {
			if ( document.getElementById('MemberCountries').innerHTML == '' ) {
				l.style.display = 'none';
			} else {
				l.innerHTML = VME.label('List of Members');
				l.style.display = '';
			}
		}
		
		if(projection == "3031" && !layers && !year){
			VME.myMap.zoomIn();
		}	
		
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
        
        var mercatorRadio = document.getElementById("RadioEPSG3349");
		mercatorRadio.checked = true;
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
	VME.lastPars = pars;
	VME.lastExtent = null;
	VME.lastCenter = null;
	VME.lastZoom = null;

	var VMELayer = FigisMap.ol.getLayer(VME.myMap, FigisMap.fifao.vme);
	VMELayer.on("change:visible",function(e){
		VME.toggleVMEs();
	});

	var BFALayer = FigisMap.ol.getLayer(VME.myMap, FigisMap.fifao.vme_bfa);
	BFALayer.on("change:visible", function(e){
		VME.toggleBFAs();
	});

	var OARALayer = FigisMap.ol.getLayer(VME.myMap, FigisMap.fifao.vme_oara);
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
	VME.toggleVMELayer(FigisMap.fifao.vme, el, "lblVMEs figisButtonVMEs", "lblVMEs figisButtonToggleVMEs");
}

/**
* function toggleOARAs
* @param el the button DOM element
* Enables/Disables 'vme:other_areas' layer in LayerSwitcher 
**/	
VME.toggleOARAs = function(el){
	VME.toggleVMELayer(FigisMap.fifao.vme_oara, el, "lblOARAs figisButtonOARAs", "lblOARAs figisButtonToggleOARAs");
}

/**
* function toggleBFAs
* @param el the button DOM element
* Enables/Disables 'vme:bottom_fishing_areas' layer in LayerSwitcher 
**/	
VME.toggleBFAs = function(el){
	VME.toggleVMELayer(FigisMap.fifao.vme_bfa, el, "lblBFAs figisButtonBFAs", "lblBFAs figisButtonToggleBFAs");
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
	if ( document.getElementById('RadioEPSG4326').checked ) cp = '4326';
	if ( ! cp ) if ( document.getElementById('RadioEPSG3349').checked ) cp = '3349';
	if ( ! cp ) if ( document.getElementById('RadioEPSG3031').checked ) cp = '3031';
	if ( ! cp ) if ( document.getElementById('RadioEPSG54009').checked ) cp = '54009';
	if ( ! cp ) {
		document.getElementById('SelectSRS4326').checked = true;
		cp = '4326';
	}
	VME.lastProjection = parseInt( cp );
	if ( ! p ) return VME.lastProjection;
	p = String( p )
	if ( p != cp ) {
		document.getElementById('RadioEPSG4326').checked = ( p == '4326');
		document.getElementById('RadioEPSG3349').checked = ( p == '3349');
		document.getElementById('RadioEPSG3031').checked = ( p == '3031');
		document.getElementById('RadioEPSG54009').checked = ( p == '54009');
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
	VME.setViewer();
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
