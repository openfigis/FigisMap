/*
	vme-data.js
	data model and stores for VME using Extjs
	Authors: Lorenzo Natali. Geo-Solutions
	
	Status: Beta.	
*/
function getQSParam(ParamName) {
  QS=window.location.toString(); 
  var indSta=QS.indexOf(ParamName); 
  if (indSta==-1 || ParamName=="") return null; 
  var indEnd=QS.indexOf('&amp;',indSta); 
  if (indEnd==-1) indEnd=QS.length; 
  var valore = unescape(QS.substring(indSta+ParamName.length+1,indEnd)); 
  return valore; 
}


/**
 * FigisMap.ol.clearPopupCache
 * closes all popups, if any
 */
FigisMap.ol.clearPopupCache=function(){
  if (FigisMap.popupCache){
    for (var popupKey in FigisMap.popupCache){
      var pu =FigisMap.popupCache[popupKey];
      //close popups if opened
      if (pu.opened){                 
        FigisMap.popupCache[popupKey].close();
      }
      
    }
  }
  //init
  FigisMap.popupCache ={};  
};

/**
 * FigisMap.ol.getFeatureInfoHandler
 * handler for the getFeatureInfo event
 *
 */
FigisMap.ol.getFeatureInfoHandler =  function(e) {
	var popupKey = e.xy.x + "." + e.xy.y;
	var popup;
	if (!(popupKey in FigisMap.popupCache)) {
	  popup = new GeoExt.Popup({
					title: 'Features Info',
					width: 400,
                    panIn:true,
					height: 300,
					layout: "accordion",
					map: myMap,
					location: e.xy,
					listeners: {
                        
						close: (function(key) {
							return function(panel){
								delete FigisMap.popupCache[key];
							};
						})(popupKey)
					}
			  });
				FigisMap.ol.clearPopupCache();
				FigisMap.popupCache[popupKey] = popup;
	}else{
		popup = FigisMap.popupCache[popupKey];
	}
    popup.position();
    
    alert("SS");
    popup.panIntoView();
    
	var addEncounters = function(btn){
		Ext.MessageBox.show({
			title: "Info",
			msg: "Related Encounters not implemented yet",
			buttons: Ext.Msg.OK,
			icon: Ext.MessageBox.INFO,
			scope: this
		});  
	};
	
	var addSurveyData = function(btn) {
		Ext.MessageBox.show({
			title: "Info",
			msg: "Related Survey Data not implemented yet",
			buttons: Ext.Msg.OK,
			icon: Ext.MessageBox.INFO,
			scope: this
		}); 
		
	};

	var res = e.text.match(/<body[^>]*>([\s]*)<\/body>/);

	e.object.layers[0].name;
	if(!res){
	  var oldItem;
	  if (popup.items){
		  oldItem =popup.items.get(e.object.layers[0].name);
	  }
	  if(oldItem){
		  oldItem.update(e.text);
	  }else{
		  popup.add({
			  itemId: e.object.layers[0].name,
			  title: e.object.layers[0].name,
			  layout: "fit",
			  bodyStyle: 'padding:10px;background-color:#F5F5DC',
			  html: e.text,
			  autoScroll: true,
			  autoWidth: true,
			  collapsible: false
		  });
		  popup.opened =true;
		  popup.doLayout();
		  popup.show();
	  }
	}
};

FigisMap.ol.getStore = function(layer){
  var name = layer.params.LAYERS;
  var layernames = FigisMap.fifao;
  var featureInfoStores =Vme.data.extensions.FeatureInfo;
  switch(name){
    /* PRE WORKSHOP
    case layernames.vme :
      return new featureInfoStores.VmeStore();
    case layernames.vme_fp : 
      return new featureInfoStores.FootprintStore();*/
      
    case layernames.vme_cl :
      return new featureInfoStores.VmeStore();    
    case layernames.vme_oa :
      return new featureInfoStores.VmeStore();
    case layernames.vme_bfa : 
      return new featureInfoStores.FootprintStore();

    case layernames.vme_regarea : 
      return new featureInfoStores.RfbStore();
      
    case layernames.vme_en : 
      return new featureInfoStores.EncountersStore();
    case layernames.vme_sd :   
      return new featureInfoStores.SurveyDataStore();
    case  layernames.vme_agg_en :  
	  case  layernames.vme_agg_sd : 
	     return new featureInfoStores.AggregateDataStore();
  }
  //return new Vme.data.extensions.FeatureInfo.VmeStore();
};
FigisMap.ol.getTabTitle=function(layer){
  var name = layer.params.LAYERS;
  var layernames = FigisMap.fifao;
  var templates =Vme.data.templates;
  switch(name){
    /* PRE WORKSHOP
    case layernames.vme :
      return "VME Area";
    case layernames.vme_fp : 
      return "Footprints";*/

    case layernames.vme_cl :
      return "VME closed areas";
    case layernames.vme_oa :
      return "Other access regulated areas";      
    case layernames.vme_bfa : 
      return "Bottom fishing areas";

    case layernames.vme_regarea : 
      return "RFB Competence Areas";
      
    case layernames.vme_en : 
      return "Encounters";
    case layernames.vme_sd :   
      return "Survey data";
    case  layernames.vme_agg_en : 
	   return "Encounters";	  
	case  layernames.vme_agg_sd : 
	   return "Survey data";
  }
};
FigisMap.ol.getTemplate = function(layer){
  var name = layer.params.LAYERS;
  var layernames = FigisMap.fifao;
  var templates =Vme.data.templates;
  switch(name){
    /* PRE WORKSHOP
    case layernames.vme :
      return templates.vme;
    case layernames.vme_fp : 
      return templates.footprints;*/
      
    case layernames.vme_cl :
      return templates.vme_cl;
    case layernames.vme_oa :
      return templates.vme_oa;      
    case layernames.vme_bfa : 
      return templates.footprints;      

    case layernames.vme_regarea : 
      return templates.regarea; 
      
    case layernames.vme_en : 
      return templates.encounters;
    case layernames.vme_sd :   
      return templates.surveydata;
    case  layernames.vme_agg_en :  
	  case  layernames.vme_agg_sd : 
	     return  templates.aggregate;
  }
};
/**
 *  FigisMap.ol.getFeatureInfoHandlerGML
 *  handler to parse GML response
 */
FigisMap.ol.getFeatureInfoHandlerGML =  function(e) {
	
	var layer = e.object.layers[0];
	var reader = new OpenLayers.Format.WMSGetFeatureInfo();
    var response = reader.read(e.text);
    //request to the VME service VME
    //if(layer.params.LAYERS == FigisMap.fifao.vme_cl || layer.params.LAYERS == FigisMap.fifao.vme_oa){
    if(layer.params.LAYERS == FigisMap.fifao.vme_cl){
        /*
            count the results, do an ajax call for every field,
            merge the OpenLayers object "attributes" obj with the result
        */
        var count = 0;
        for(var i = 0 ; i<response.length ; i++){
            var inventoryIdentifier= response[i].attributes["VME_ID"];
            var year = FigisMap.ol.getSelectedYear();
            
            Ext.Ajax.request({
                //url: 'http://figisapps.fao.org/figis/ws/vme/webservice/get', // OLD SERVICE
                //url: 'http://figisapps.fao.org/figis/ws/vme/webservice/vme/' + inventoryIdentifier + '/specificmeasure', // NEW SERVICE FROM 20140714
                url: FigisMap.geoServerBase + '/figis/ws/vme/webservice/vme/' + inventoryIdentifier + '/specificmeasure', // NEW SERVICE FROM 20140714
                scope:response[i],
                method:'GET',
                // OLD PARAMS FOR SERVICE 'http://figisapps.fao.org/figis/ws/vme/webservice/get'
                /*params: { 
                    inventoryIdentifier: inventoryIdentifier,
                    year: year
                },*/
                success: function(resp,opt){

                    var vmeDataParsed = Ext.decode(resp.responseText);                    
                    
                    // example test for same year
                    /*var vmeDataParsed = {
                        "uuid": "17a46f1d-a9b9-48d9-8875-90c3577d371f",
                        "note": null,
                        "vmeId": 24317,
                        "localName": "Hatton Bank",
                        "inventoryIdentifier": "VME_NEAFC_1",
                        "geoArea": "Northeast Atlantic",
                        "owner": "North East Atlantic Fisheries Commission",
                        "vmeType": null,
                        "responseList": [{
                            "text": null,
                            "year": 2014,
                            "validityPeriodStart": 2013,
                            "validityPeriodEnd": 2015,
                            "sourceURL": "http://www.neafc.org/system/files/Rec9_Rockall_VME_closure_0.pdf",
                            "factsheetURL": "http://figisapps.fao.org/fishery/vme/24317/176905/en"
                        },
                        {
                            "text": null,
                            "year": 2014,
                            "validityPeriodStart": 2007,
                            "validityPeriodEnd": 2009,
                            "sourceURL": "http://www.neafc.org/system/files/07-rec_deep_sea.pdf",
                            "factsheetURL": "http://figisapps.fao.org/fishery/vme/24317/176905/en"
                        },
                        {
                            "text": null,
                            "year": 2011,
                            "validityPeriodStart": 2012,
                            "validityPeriodEnd": 2012,
                            "sourceURL": "http://www.neafc.org/system/files/Rec_8_Hatton_extension-rev.pdf",
                            "factsheetURL": "http://figisapps.fao.org/fishery/vme/24317/176904/en"
                        },
                        {
                            "text": null,
                            "year": 2010,
                            "validityPeriodStart": 2011,
                            "validityPeriodEnd": 2011,
                            "sourceURL": "http://www.neafc.org/system/files/rec-14_2011_hatton_extension_corrected_rev3.pdf",
                            "factsheetURL": "http://figisapps.fao.org/fishery/vme/24317/176903/en"
                        },
                        {
                            "text": null,
                            "year": 2009,
                            "validityPeriodStart": 2010,
                            "validityPeriodEnd": 2010,
                            "sourceURL": "http://www.neafc.org/system/files/rec-viiil%20%20-%20Hatton%20extension%20corrected%20rev4.pdf",
                            "factsheetURL": "http://figisapps.fao.org/fishery/vme/24317/176902/en"
                        },
                        {
                            "text": null,
                            "year": 2007,
                            "validityPeriodStart": 2008,
                            "validityPeriodEnd": 2009,
                            "sourceURL": "http://www.neafc.org/system/files/16-rec_bottom_fishing_em_2008.pdf",
                            "factsheetURL": "http://figisapps.fao.org/fishery/vme/24317/176900/en"
                        }]
                    };*/
                    
                    // SORT DESCENDING
                    
                    if(vmeDataParsed.responseList.length == 0){
                      count++  
                      if(count == response.length){
                            FigisMap.ol.showPopup(e,response,layer);
                            return;
                      }                    
                    }
                    
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
                        if (vmeDataParsed.responseList[i].year == year){
                        
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
                            localName            : vmeDataParsed.localName,     
                            geoArea              : vmeDataParsed.geoArea,     
                            owner                : vmeDataParsed.owner,     
                            vmeType              : vmeDataParsed.vmeType,     
                            reviewYear           : newReviewYear[0],     
                            measure              : measureText,
                            year                 : newYears[0],
                            validityPeriodStart  : newValidityPeriodStart[newValidityPeriodStart.length - 1], // prendo il minore
                            validityPeriodEnd    : newValidityPeriodEnd[0], // prendo il maggiore
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
                            localName            : vmeDataParsed.localName,     
                            geoArea              : vmeDataParsed.geoArea,     
                            owner                : vmeDataParsed.owner,     
                            vmeType              : vmeDataParsed.vmeType,     
                            reviewYear           : newReviewYearNoDate[newReviewYearNoDate.length - 1], // prendo il maggiore
                            measure              : measureTextNoDate,
                            year                 : newYearsNoDate[newYearsNoDate.length - 1], // prendo il maggiore
                            validityPeriodStart  : newValidityPeriodStartNoDate[newValidityPeriodStartNoDate.length - 1], // prendo il minore
                            validityPeriodEnd    : newValidityPeriodEndNoDate[0], // prendo il maggiore
                            pdfURL               : newSourceURLNoDate[0],
                            factsheetURL         : newFactsheetURLNoDate[0]
                        }
                    
                    }                    

                    //Ext.apply(this.attributes,vmeDataParsed.resultList[0]);
                    Ext.apply(this.attributes,filterResponseListFin);                    

                    count++;
                    
                    if(count == response.length){
                        FigisMap.ol.showPopup(e,response,layer);
                    }
                },
                failure: function(){
                  count++; //count anyway to show the popup
                  if(count == response.length){
                        FigisMap.ol.showPopup(e,response,layer);
                  }
                }
            });
        }
        
    
    }else{
        FigisMap.ol.showPopup(e,response,layer);
    }
	
    
};
FigisMap.ol.showPopup= function(e,response,layer){
    var popupKey = e.xy.x + "." + e.xy.y;
	var store = FigisMap.ol.getStore(layer);
	//var template = FigisMap.ol.getTemplate
	store.loadData(response);
	var name = FigisMap.ol.getTabTitle(layer);
	var dv = new Ext.DataView({
		itemId: name,
		title: name,
		itemSelector: 'span.x-editable',
		autoScroll:true,
		border:false,
		store: store,
		tpl: FigisMap.ol.getTemplate(layer),
		singleSelect: true
	});
	var popup;
	if (!(popupKey in FigisMap.popupCache)){
	  popup = new GeoExt.Popup({
		//title: 'Features Info',
        border:false,
		width: 400,
		height: 300,
		layout: "fit",
		map: myMap,
		unpinnable:false,
		
		items:[new Ext.TabPanel(
			{
				itemId:'tabPanel',
				//deferredRender:false,
				activeTab: 0,
              tabPosition:'top',
              enableTabScroll: true,                
				border:false,
				layoutOnTabChange:true
				
			}
		)],
		location: e.xy,
		listeners: {
			close: (function(key) {
				return function(panel){
					delete FigisMap.popupCache[key];
				};
			})(popupKey)
		}
	  });
				FigisMap.ol.clearPopupCache();
				FigisMap.popupCache[popupKey] = popup;
	}else{
		popup = FigisMap.popupCache[popupKey];
	}
	var count =store.getCount();
	if(count> 0){
	  var oldItem,tp;
	  if (popup.items){

		  tp=popup.items.get('tabPanel');
		  oldItem =tp.items.get(name);
	  }
	  if(oldItem){
		  oldItem.removeAll();
		  oldItem.add(dv);
		  oldItem.doLayout();
		  
		  
		  
	  }else{
      
          if (name == "VME closed areas"){
              tp.insert(0,{
                  itemId: name,
                  title: name,
                  layout: "fit",
                  border:false,
                  bodyStyle: 'padding:0px;',
                  items:[dv],
                  autoWidth: true,
                  collapsible: false
              });
          }else{
              tp.add({
                  itemId: name,
                  title: name,
                  layout: "fit",
                  border:false,
                  bodyStyle: 'padding:0px;',
                  items:[dv],
                  autoWidth: true,
                  collapsible: false
              });
		  }
		 
		  popup.opened =true;
		  popup.doLayout();
		  tp.doLayout();
		  popup.show();
	  }
      tp.setActiveTab(0);
	}

};

/** 
 * FigisMap.ol.createPopupControl(layers)
 * create getFeatureInfo control to the map.
 *
 */
FigisMap.ol.createPopupControl = function(vme){
    FigisMap.ol.clearPopupCache();
    var gml = true; //getQSParam('gml');
		var info={controls : []};
		var vmeLyr;
		
    var control;
    for (var i = 0, len = info.controls.length; i < len; i++){
        control = info.controls[i];
        control.deactivate();  // TODO: remove when http://trac.openlayers.org/ticket/2130 is closed
        control.destroy();
	
    }

	var mask = new Ext.LoadMask(Ext.getBody(), {msg: "Please wait ..."});
	mask.disable();
	
    for (vmeLyr=0; vmeLyr<vme.length; vmeLyr++){
            
      //VMSGetFeatureInfo FOR FIGIS-VME PROJECT
      control = new OpenLayers.Control.WMSGetFeatureInfo({
			  autoActivate: true,
			  layers: [vme[vmeLyr]],
			  queryVisible: true,
			  maxFeatures: 10,
			  infoFormat:  gml? "application/vnd.ogc.gml" :"text/html",
			  //vendorParams: {"CQL_FILTER": "year = '" + FigisMap.ol.getSelectedYear() + "'"},
			  eventListeners: {
				  beforegetfeatureinfo: function(e) { 
					var m = mask.el.isVisible();
					if(mask.disabled){
					    mask.enable();
						mask.show();
					}	
					this.vendorParams = {"CQL_FILTER": e.object.layers[0].params.CQL_FILTER};
				  }, 
				  getfeatureinfo: function(e){
					if(!mask.disabled){
						mask.hide();
						mask.disable();
					}					
					gml ? FigisMap.ol.getFeatureInfoHandlerGML(e) : FigisMap.ol.getFeatureInfoHandler(e);
				  }
			  }
	    });
		
      info.controls.push(control);  
    };
    return info.controls;
    
};
/** 
 * Emulate the popup control on a vertext of a geom
 */
FigisMap.ol.emulatePopupFromGeom = function(geom){
	var vert = FigisMap.ol.getVertFromGeom(geom);
	FigisMap.ol.emulatePopupFromVert(vert);
};
/**
 * Get a evt with xy element from geometry to perform get feature info
 */
FigisMap.ol.getVertFromGeom = function(geom){
	return geom.getVertices()[0];
	
};
/**
 * emulate click on GetFeatureInfo control
 */
FigisMap.ol.emulatePopupFromVert=function(vert){
    var lonlat =new OpenLayers.LonLat(vert.x,vert.y);
	var evt = {
		xy: myMap.getPixelFromLonLat( lonlat )
	};
	FigisMap.ol.clearPopupCache();
	var cc = myMap.getControlsByClass('OpenLayers.Control.WMSGetFeatureInfo');
	for(var i = 0 ;i < cc.length ; i++) {cc[i].getInfoForClick(evt);}
};
