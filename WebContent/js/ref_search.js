// Javascript code to drive new search - by Marco Balestra

var RS = {
	'internal'		: new Object(),
	'obj'			: new Object(),
	'speciesLoaded'		: false,
	'speciesLoading'	: false,
	'spLinkable'		: new Object(),
	'spXmlUri'		: ( FigisMap.isRemoteDeveloper ? 'data/specieslist.xml' : '/figis/geoserver/factsheets/js/specieslist.xml'),
	'maxSpecies'		: 10,
	'prop' : {
		'tgtForm' : 'refSearchRealForm',
		'fakeForm' : 'refSearchFakeForm',
		'fakeFormMapList' : 'fakeFormMapList',
		'fakeFormMapValues' : 'fakeFormMapValues',
		'sourceSpecies' : 'sourceSpeciesList',
		'speciesFilter' : 'speciesFilterField',
		'filteredSpecies' : 'filteredSpecies',
		'jsLabelPrefix' : 'js-label-'
	},
	'label' : {
		'alertNoValue' : FigisMap.label("Please provide at least one value"),
		'allValuesSST' : '(All)',
		'allValuesWA' : '(All)',
		'allValuesSPC' : FigisMap.label('(No species selected)'),
		'deselectOne'	: FigisMap.label('Deselect the species'),
		'browseFS'	: FigisMap.label('Browse Species fact sheet'),
		'iconFS'	: 'ⓘ➤',
		'clear' : ' ✕ '
	}
};

RS.internal.init = function() {
	if ( RS.speciesLoaded ) {
		RS.internal.init2();
	} else if ( RS.speciesLoading ) {
		return void(0);
	} else {
		RS.speciesLoading = true;
		RS.loadSpecies();
	}
};

RS.internal.init2 = function() {
	if ( RS.prop.initOk ) return true;
	for ( var i in RS.prop ) RS.obj[ i ] = document.getElementById( RS.prop[ i ] ) ? document.getElementById( RS.prop[ i ] ) : false;
	for ( var i in RS.label ) if ( document.getElementById( RS.prop.jsLabelPrefix + i ) ) RS.label[ i ] = document.getElementById( RS.prop.jsLabelPrefix + i ).innerHTML;
	RS.obj.fields = new Object();
	RS.prop.qtFields = 0;
	RS.wa.init();
	RS.spc.init();
	RS.prop.initOk = true;
	setSpeciesPage('e-link', 'url-link', 'html-link');
}

RS.internal.loadSpecies = function( req, status ) {
	var xml;
	if ( req.documentElement ) {
		xml = req;
	} else if ( req.responseXML ) {
		xml = req.responseXML;
	} else {
		return;
	}
	var xitems = xml.documentElement.getElementsByTagName('item');
	var items = new Array();
	for ( var i = 0; i < xitems.length; i++ ) {
		var xitem = xitems[i];
		var item = new Object();
		item.a3c = xitem.getAttribute('a3c').toUpperCase();
		item.fid = xitem.getAttribute('FigisID');
		item.en  = xitem.getAttribute('en');
		item.lt  = xitem.getAttribute('lt');
		item.fam = xitem.getAttribute('family');
		item.ord = xitem.getAttribute('order');
		item.lnk = xitem.getAttribute('link') == '1' ? '1' : '0';
		item.flags = '';
		if ( xitem.getAttribute('mar') == '1' ) item.flags += 'm';
		if ( xitem.getAttribute('inl') == '1' ) item.flags += 'i';
		RS.spLinkable[ item.a3c ] = xitem.getAttribute('FigisID');//( xitem.getAttribute('link') == '1' );
		if ( item.en == '' ) item.en = item.lt;
		items.push( item );
	}
	items.sort( function( a, b ) { return a.en > b.en ?  1 : ( a.en < b.en ? -1 : 0 ); } );
	var html = '';
	for ( var i = 0; i < items.length; i++ ) {
		var item = items[i];
		var h = '<a onclick="RS.spc.add(\'' + item.a3c + '-' + item.flags + '\')" alt="'+ item.a3c + '-' + item.flags + '">';
		h += '<b>' + item.en + '</b> - ' + item.lt + ' - ' + item.fam + ' - ' + item.ord + ' - ' + item.a3c;
		h += '</a>';
		html += h;
	}
	document.getElementById( RS.prop.filteredSpecies ).innerHTML = html;
	var c = document.getElementById('totSpeciesAvailable');
	if (c ) c.innerHTML = String( items.length );
	RS.speciesLoading = false;
	RS.speciesLoaded = true;
	RS.internal.init2();
}

RS.loadSpecies = function() {
	//!OL2 OpenLayers.Request.GET({ url: RS.spXmlUri, callback: RS.internal.loadSpecies });
	$.ajax( {
 		async	: false,
 		type	: "GET",
 		cache	: true,
 		url	: RS.spXmlUri,
 		success	: RS.internal.loadSpecies
 	} );
};

RS.init = function() {
	RS.internal.init();
	if ( RS.speciesLoaded ) {
		RS.wa.reset();
		RS.spc.reset();
	}
	return void(0);
};

RS.submit = function() {
	if ( RS.prop.qtFields == 0 ) {
		alert( RS.label.alertNoValue );
	} else {
		RS.obj.tgtForm.submit();
	}
	return void(0);
};
RS.internal.cleanFields = function() {
	RS.internal.init();
	var qt = 0, nf = new Object();
	for ( var i in RS.obj.fields ) {
		var k = String( i );
		var v = RS.obj.fields[ k ];
		if ( (!!  v ) && ( String(v) != '' ) && ( k != '' ) ) {
			nf[ k ] = v;
			qt++;
		}
	}
	RS.obj.fields = nf;
	RS.prop.qtFields = qt;
};

RS.internal.addField = function( n, v ) {
	RS.internal.init();
	var el = document.createElement("input");
	with ( el ) {
		setAttribute('type', 'hidden');
		setAttribute('name', n);
		setAttribute('value', v );
	}
	RS.obj.tgtForm.appendChild( el );
}

RS.tgtFormClean = function() {
	RS.internal.cleanFields();
	var els = RS.obj.tgtForm.getElementsByTagName('input');
	var maxi = els.length -1;
	for ( var i = maxi; i >= 0; i-- ) {
		var el = els[ i ];
		var eln = el.getAttribute('name');
		if ( ( eln.indexOf('kv[') == 0 ) || ( eln.indexOf('kw[') == 0 ) ) RS.obj.tgtForm.removeChild( el );
	}
};

RS.tgtFormReset = function() {
	RS.tgtFormClean();
	RS.obj.fields = new Object();
};

RS.tgtFormUpdate = function() {
	RS.tgtFormClean();
	var i = 0;
	for ( var eln in RS.obj.fields ) {
		if (  RS.obj.fields[ eln ] ) {
			var k = String( eln );
			var v = RS.obj.fields[ k ];
			if ( (!!  v ) && ( String(v) != '' ) && ( k != '' ) ) {
				RS.internal.addField( 'kw['+i+']', k );
				RS.internal.addField( 'kv['+i+']', v );
				i++;
			}
		}
	}
};

RS.setField = function( k, v ) { RS.obj.fields[ k ] = v };

RS.getField = function( k ) { return RS.obj.fields[ k ] };

RS.addField = function( k, v ) { RS.setField( k, v ); RS.tgtFormUpdate(); };

RS.rmField = function( k ) { RS.setField( k, false ); RS.tgtFormUpdate(); };

RS.getFieldArray = function( k ) { var s = RS.getField( k ); return (!! s ) ? String(s).split(' ') : new Array(); };

RS.getFieldObj = function( k ) {
	var a = RS.getFieldArray( k );
	var r = new Object();
	for ( var i = 0; i < a.length; i++ ) r[ a[i] ] = i;
	return r;
};

RS.wa = new Object();

RS.wa.init = function() {
	RS.wa.status = document.getElementById('searchByWAStatus');
	RS.wa.fieldName = RS.obj.fakeFormMapValues.getAttribute('name');
};
RS.wa.reset = function() {
	RS.obj.fakeFormMapValues.setAttribute('value', '' );
	if ( RS.obj.fakeFormMapList ) while ( RS.obj.fakeFormMapList.firstChild ) RS.obj.fakeFormMapList.removeChild( RS.obj.fakeFormMapList.firstChild );
	if ( RS.wa.status ) RS.wa.status.innerHTML = RS.label.allValuesWA;
	RS.rmField( RS.wa.fieldName );
};
RS.wa.add = function( a ) {
	try {
		RS.internal.cleanFields();
		var e, oldVals;
		try {
			oldVals = RS.obj.fakeFormMapValues.getAttribute('value').split(' ');
		} catch (e) {
			oldVals = RS.obj.fakeFormMapValues.value.split(' ');
		}
		var newVals = new Array();
		var found = false;
		for ( var i = 0; i < oldVals.length; i++ ) {
			if ( oldVals[i] == a ) {
				found = true;
			} else if ( oldVals[i] != '' ) {
				newVals[ newVals.length ] = oldVals[i];
			}
		}
		if ( ! found ) newVals[ newVals.length ] = a;
		newVals.sort( function(a,b) { return a - b; } );
		RS.wa.reset();
		var vals = newVals.join(' ').replace(/ $/,'');
		RS.obj.fakeFormMapValues.setAttribute('value', vals );
		if ( newVals.length > 0 ) {
			if ( RS.obj.fakeFormMapList ) for ( var i = 0; i < newVals.length; i++ ) {
				var txt = String(newVals[ i ]);
				var li = document.createElement('li');
				li.appendChild( document.createTextNode( txt ) );
				li.onclick = function() { RS.wa.add( this.innerHTML ) };
				li.className = 'bold pointer';
				li.setAttribute( 'onclick', 'RS.wa.add('+newVals[i]+')');
				li.setAttribute( 'title', '[' + RS.label.clear + '] ' + txt );
				RS.obj.fakeFormMapList.appendChild( li );
			}
			RS.setField( RS.wa.fieldName, vals );
			if ( RS.wa.status ) RS.wa.status.innerHTML = '[<b><a onclick="RS.wa.reset()">'+ RS.label.clear +'</a></b>]<b> ' + newVals.join(', ');
		}
		RS.tgtFormUpdate();
	} catch(e) {
		alert( e );
	}
};

RS.spc = new Object();

RS.spc.init = function() {
	RS.spc.opts = RS.obj.filteredSpecies.getElementsByTagName('a');
	RS.spc.optsearch = new Array();
	for ( var i = 0; i < RS.spc.opts.length; i++ ) RS.spc.optsearch[ i ] = RS.spc.opts[i].innerHTML.replace(/<[^>]*>/g,'').toLowerCase();
	RS.spc.timeoutDelay = RS.spc.opts.length;
	RS.spc.timeout = false;
	RS.spc.lastfilter = '';
	RS.spc.status = document.getElementById('searchBySpeciesStatus');
	if ( RS.spc.status ) RS.spc.status.innerHTML = RS.label.allValuesSPC;
	RS.spc.execute();
};
RS.spc.add = function( code ) {
	var oldVals = RS.getFieldObj( 'species' );
	var newVals = new Array();
	var newDescs = new Array();
	var maximumExceeded = false;
	var countOfSelected = RS.getFieldArray('species').length;
	for ( var i = 0; i < RS.spc.opts.length; i++ ) {
		var a = RS.spc.opts[i];
		var c = a.getAttribute('alt');
		var isSel = ( a.className == 'selected' );
		var isIt = ( c == code );
		if ( isIt && isSel ) {
			a.className = '';
		} else if ( isIt && countOfSelected >= RS.maxSpecies ) {
			alert( 'A maximum of ' + RS.maxSpecies +' species can be represented on the map at the same time.' );
			maximumExceeded = true;
		} else if ( isIt || isSel ) {
			newVals[ newVals.length ] = c;
			newDescs[ newDescs.length ] = a.innerHTML;
			a.className = 'selected';
		}
	}
	if ( maximumExceeded ) return void(0);
	if ( newVals.length > 0 ) {
		var re = /[ \t\n\r]+/g;
		var relong = /\<b\>(.+)\<\/b\> \- (.+)/i;
		var areLong = !! ( newDescs.length > 4 );
		for ( var i = 0; i < newDescs.length; i++ ) {
			var val = newVals[i].replace(/\-.+$/,'');
			var t = String(newDescs[i]); 
			t = t.replace(re," ").replace(/^ /,'').replace(/ $/,'');
			if ( areLong ) t = t.replace(relong,'<b title="$2">$1</b>');
			var t2 = '<a onclick="RS.spc.add(\''+newVals[i]+'\')" title="'+RS.label.deselectOne+'">ⓧ</a> ';
// 			if ( RS.spLinkable[ val ] ) t2 += '<a href="http://www.fao.org/fishery/species/search/3alpha/'+val+'/en" target="speciesInfo" title="'+RS.label.browseFS+'">'+RS.label.iconFS+'</a> ';
			t2 += '<a href="http://www.fao.org/fishery/species/'+RS.spLinkable[ val ]+'/en" target="speciesInfo" title="'+RS.label.browseFS+'">'+RS.label.iconFS+'</a> ';
			t = t2 + t;
			newDescs[i] = t;
		}
		if ( RS.spc.status ) RS.spc.status.innerHTML = '[<b><a onclick="RS.spc.reset()">'+ RS.label.clear +'</a></b>]   ' + newDescs.join(', ');
		RS.addField( 'species', newVals.join(' ') );
	} else {
		if ( RS.spc.status ) RS.spc.status.innerHTML = RS.label.allValuesSPC;
		RS.rmField( 'species' );
	}
	return void(0);
};
RS.spc.reset = function() {
	RS.rmField( 'species' );
	RS.obj.speciesFilter.value ='';
	if ( RS.spc.status ) RS.spc.status.innerHTML = RS.label.allValuesSPC;
	for ( var i = 0; i < RS.spc.opts.length; i++ ) RS.spc.opts[i].className = '';
	RS.spc.execute();
};
RS.spc.filter = function( force ) {
	if ( RS.spc.timeout ) clearTimeout( RS.spc.timeout );
	if ( force ) {
		RS.spc.execute();
	} else {
		RS.spc.timeout = setTimeout('RS.spc.execute()',RS.spc.timeoutDelay);
	}
};
RS.spc.execute = function( force ) {
	RS.spc.timeout = false;
	var text = RS.obj.speciesFilter.value.toLowerCase();
	var showAll = false;
	if ( text == '') showAll = true;
	if ( force || ( text != RS.spc.lastfilter ) ) {
		var h = '';
		for ( var i = 0; i < RS.spc.opts.length; i++ ) {
			var ins = showAll;
			if ( ! ins ) ins = ( RS.spc.optsearch[ i ].indexOf( text ) > -1 );
			RS.spc.opts[i].style.display = ins ? 'block' : 'none';
		}
		RS.spc.lastfilter = text;
	}
};

// END Script
// -->
