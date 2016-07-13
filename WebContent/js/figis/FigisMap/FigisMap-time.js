FigisMap.time = new Object();

/**
 * Get the current year 
 * default: the system Date() year
 */
FigisMap.time.getFullYear = function(){
	return new Date().getFullYear();
}

/**
 * Stores the current selected year 
 * default: the system Date() year
 */
FigisMap.time.selectedYear = FigisMap.time.getFullYear();


/**
* Sets the minimum year
*/
FigisMap.time.setMinYear = function(year){
	FigisMap.time.minYear = year;
}

/**
* Sets the maximum year
*/
FigisMap.time.setMaxYear = function(year){
	FigisMap.time.maxYear = year;
}

FigisMap.time.setMinYear(2006);
FigisMap.time.setMaxYear(FigisMap.time.getFullYear());


//handlers
FigisMap.time.incrementHandler = function(newyear){};
FigisMap.time.decrementHandler = function(newyear){};
FigisMap.time.selectionHandler = function(newyear){};


/**
 * Move year selector forward by 1
 */
FigisMap.time.incrementYear = function(){
    var newyear = FigisMap.time.selectedYear + 1;
    if(newyear <= FigisMap.time.maxYear && newyear != FigisMap.time.selectedYear){
        FigisMap.time.setSelectedYear(newyear);
        FigisMap.time.incrementHandler(newyear);
    }
};

/*
 * Move year selector backward by 1
 */
FigisMap.time.decrementYear = function(){
    var newyear = FigisMap.time.selectedYear - 1;
    if(newyear >= FigisMap.time.minYear && newyear != FigisMap.time.selectedYear){
        FigisMap.time.setSelectedYear(newyear);
        FigisMap.time.decrementHandler(newyear);
    }
};

/**
 * FigisMap.time.getSelectedYear returns the selected year in the slider
 */
FigisMap.time.getSelectedYear= function(){
	return FigisMap.time.selectedYear;
};

/**
 * FigisMap.time.getSelectedYear returns the selected year in the slider
 */
FigisMap.time.setSelectedYear = function(newyear){
	if(newyear){
		if(newyear <= FigisMap.time.maxYear && newyear >= FigisMap.time.minYear && newyear != FigisMap.time.selectedYear){
        		FigisMap.time.selectedYear = newyear;
			FigisMap.time.selectionHandler(newyear);
    		}
	}else{
		FigisMap.time.selectedYear = FigisMap.time.getFullYear();
		FigisMap.time.selectionHandler(FigisMap.time.selectedYear);
	}
    
};
