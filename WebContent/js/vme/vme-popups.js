/*
	vme-popups.js
	Resource and content handlers used for the VME layer popups	
	Author: Emmanuel Blondel (emmanuel.blondel at fao.org)
*/

var VMEPopup = new Object();


/**
 * VMEPopup.utils
 * Utility functions for handling VME popup content
 */
VMEPopup.utils = {
	/**
	 * generateDownloadLink: function to generate WFS download link
	 * @param ows url for the OWS service
	 * @param types array of typeNames
	 * @param filters array of filters
	 * @param format the WFS output format
	 * @param otherparams
	 * @return a string giving the Download link
	 */
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
	/**
	 * generateFidFilter: function to generate a CQL filter based on FID
	 * @param fids
	 * @deprecated
	 * @return the filter
	 */
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
	/**
	 * generateVMEFilter: function to generate a CQL filter based on VME_ID
	 * @param vme_id
	 * @return the filter
	 */
	generateVMEFilter:function(vme_id){
		if (vme_id ==undefined) return ;
		return "VME_ID = '" +vme_id +"'";
	},
	/**
	 * surfaceUoMConverter: function to format a feature surface (previously
	 * handled as feature "SURFACE" attribute)
	 * @param feature
	 * @param uom "ha" or "sqkm"
	 * @return the formatted surface
	 */
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

/**
 * VMEPopup.vmeResourceHandler
 * Resource handler function to be used for VME closures GetFeatureInfo postprocessing
 */
VMEPopup.vmeResourceHandler = function(feature){
	var inventoryIdentifier = feature.getProperties()["VME_ID"];
	var vmeUrl = FigisMap.geoServerBase + '/figis/ws/vme/webservice/vme/' + inventoryIdentifier + '/specificmeasure';
	return vmeUrl;
}


/**
 * VMEPopup.vmeResponse
 * Function to post process the response obtained from VME Web-Services
 * (Limited to VME closures type)
 * @param resource {XMLHttpRequest}
 */
VMEPopup.vmeResponse = function(resource){
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

/**
 * VMEPopup.vmeFeatureTemplate
 * Specific template to be used for VMEs (VME closures)
 * @param layer (name of the layer)
 * @param feature object of class {ol.Feature} 
 * @param resource object of class XMLHttpRequest in ready state
 */
VMEPopup.vmeFeatureTemplate = function(layer, feature, resource){
	
	var vme = VMEPopup.vmeResponse(resource);
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
				html += '</em><span>' + measureArray[i] + '</span> <a  target="_blank" href="' + pdf + '"><img title="Download pdf" src="assets/vme/img/icons/download_pdf.png"></a><br/>';
			}
		}
		return html;
	};
	
	var p = feature.getProperties();
	var geom = feature.getGeometry();
	var extent = geom.getExtent();
	var trgGeom = (VME.getProjection() == "4326")? geom : geom.transform(new ol.proj.get("EPSG:4326"),VME.myMap.getView().getProjection());
	var trgExtent = trgGeom.getExtent();
	
	var downloadLink = VMEPopup.utils.generateDownloadLink(FigisMap.rnd.vars.ows, layer, VMEPopup.utils.generateVMEFilter(vmeId),"shape-zip",{format_options:"filename:VME-DB_"+vmeId+".zip"});


	var tpl = '<div class="popup-result">' +
			'<h3>'+vme.localName+'</h3>'+
			'<em>Management Body/Authority: </em><span class="own">'+vme.owner+'</span><br/>'+
			'<em>Closed since </em><span>'+vme.validityPeriodFrom+'</span> '+vme.checkUntilYear()+''+vme.checkYearReview()+
			'<em>Measure: </em>'+vme.formatMeasure()+
			'<em>Area Type: </em><span>'+vme.vmeType+'</span> <br/> '+
                        '<em>Surface: </em><span>'+VMEPopup.utils.surfaceUoMConverter(feature, "sqkm")+'</span><span> km&#178;</span> <br/> '+
                        '<br/>' +
			'<div>'+
				'<div style="text-align:right;float:right;">' +
					'<a class="" target="_blank" href="'+downloadLink+'">'+
						'<img title="Download as shapefile" src="assets/vme/img/icons/download.png">'+
					'</a>&nbsp;&nbsp;' +
					'<a class="" onClick="VMESearch.clickOnFeature(\''+p["VME_AREA_TIME"]+'\','+FigisMap.time.getSelectedYear()+',true)">'+
						'<img title="Zoom to area" src="assets/vme/img/icons/buttonzoom.png">'+
					'</a>&nbsp;&nbsp;' + 
					'<a href="javascript:void(0);" onClick="VMESearch.factsheetRel(\''+vme.factsheetURL+'\');">'+
						'<img title="View fact sheet" src="assets/vme/img/icons/buttonfactsheet.png" />'+
					'</a>' +
                        	'</div>'+
				'<div style="text-align:left;">' +
					'<u>'+
						'<a href="javascript:void(0);" onClick="VMESearch.factsheetRel(\''+vme.factsheetURL+'\');" >Access the VME Factsheet</a><br/>'+
						'<a href="javascript:void(0);" onClick="VMEInfo.infoHandler(VMESearch.factsheetUrl[\''+p["OWNER"]+'\'], true)" >Access the Regional Factsheet</a>'+
					'</u>' +
                        	'</div>'+                          
                    	'</div>';
				    

	return tpl;
}

/**
 * VMEPopup.genericFeatureTemplate
 * Generic template to be used for OARAs and BFAs layer types
 * @param layer (name of the layer)
 * @param feature object of class {ol.Feature} 
 * @param resource object of class XMLHttpRequest in ready state
 */
VMEPopup.genericFeatureTemplate = function(layer, feature, resource){
	
	var p = feature.getProperties();
	var vmeId = p["VME_ID"];

	var geom = feature.getGeometry();
	var extent = geom.getExtent();
	var trgGeom = (VME.getProjection() == "4326")? geom : geom.transform(new ol.proj.get("EPSG:4326"),VME.myMap.getView().getProjection());
	var trgExtent = trgGeom.getExtent();

	var downloadLink = VMEPopup.utils.generateDownloadLink(FigisMap.rnd.vars.ows,layer,VMEPopup.utils.generateVMEFilter(vmeId),"shape-zip",{format_options:"filename:VME-DB_"+vmeId+".zip"});

	var tpl = '<div class="popup-result">' +
					'<h3>'+p["LOCAL_NAME"]+'</h3>'+
					'<em>Year: </em>'+p["YEAR"]+'<br/> '+
					'<em>Management Body/Authority: </em><span class="own">'+p["OWNER"]+'</span><br/>'+
					'<!-- On 24/03/2017 disabled geographic reference (because empty) -->'+
					'<!--<em>Geographical reference: </em><span class="geo_ref" >'+((p["GEOREF"])? p["GEOREF"]:"")+'</span> <br/>-->'+
                    			'<em>Surface: </em>'+VMEPopup.utils.surfaceUoMConverter(feature, "sqkm")+'</span><span> km&#178;</span> <br/> '+                         
					'<br/>' +
					'<div>'+
						'<div style="text-align:right;float:right;">' +
							'<a class="" target="_blank" href="'+downloadLink+'">'+
								'<img title="Download as shapefile" src="assets/vme/img/icons/download.png">'+
							'</a>' +
							'<a class="" onClick="VMESearch.clickOnFeature(\''+p["VME_AREA_TIME"]+'\','+FigisMap.time.getSelectedYear()+',true)">'+

								'<img title="Zoom to area" src="assets/vme/img/icons/buttonzoom.png">'+
							'</a>' +
						'</div>'+
						'<div style="text-align:left;">' +
							'<u><a href="javascript:void(0);" onClick="VMEInfo.infoHandler(VMESearch.factsheetUrl[\''+p["OWNER"]+'\'], true)" >Access the Regional Factsheet</a></u>' +
                        			'</div>'+                         
					'</div>'+
			'</div>'; 
	return tpl;
}


/**
 * VMEPopup.contentHandler
 * Content handler function used for filling the VME layer popup
 * @param features array of {ol.Feature} 
 * @param requests array of {XMLHttpRequest} in ready state
 */
VMEPopup.contentHandler = function(features, requests){

	var container = document.createElement("div");
	container.className = "popup-container";
					
	//tab header
	//----------
	var layers = Object.keys(features);
	for(var i=0;i<layers.length;i++){
		var layer = layers[i];
		var tabTitle = "";
		switch(layer){
    			case FigisMap.fifao.vmc :
      				tabTitle = "VME closed areas";break;
    			case FigisMap.fifao.vmo :
      				tabTitle = "Other access regulated areas";break;     
    			case FigisMap.fifao.vmb : 
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
				case FigisMap.fifao.vmc:
					layerResults += VMEPopup.vmeFeatureTemplate(layer, fc[j], resources[j]); break;
				default:
					layerResults += VMEPopup.genericFeatureTemplate(layer, fc[j], null); break;
			}
			
		}
	
		layerContent.innerHTML = layerResults;
		content.appendChild(layerContent);
	}
	container.appendChild(content);
	return container;
	
}

/**
 * VMEPopup.remove
 * Removes the current popup displayed
 * 
 */
VMEPopup.remove = function(){
	FigisMap.rnd.getPopupOverlay(VME.myMap, "vmelayers");
}

