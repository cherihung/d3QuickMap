/* d3QuickMap plugin: core js
 * This is for use with simple choropleth US map that requires the most basic of user interaction
 * Uses Topojson for full US states and counties boundaries
 * version 1.0.1
 * author: Chienyi Cheri Hung @cyhung
 * Licensed under the MIT licenses.
 * http://www.opensource.org/licenses/mit-license.php
 */

function d3QuickMap() {

/* check if variable is a true number */
function isNumber(n) {
  n = n.replace(/,/,".");
  return !isNaN(parseFloat(n)) && isFinite(n);
}  
  
d3QuickMap.prototype.drawMap = function(param_m, s) {

/**************************************************************************
*********************** CONFIG SETTINGS AS PASSED *************************
**************************************************************************/

   Config = Backbone.Model.extend({
        defaults: {
	     w: 800,
	     h: 600,
	     bm: 'us-states',
	     nf: ',',
	     cs: "blue"
        }
    });

   var config = new Config({
            w: s.width, //map width
	    h: s.height, //map height
	    bm: s.mapType, //base map type
	    ds: s.dataSource, //data source
	    dp: s.dataPoint, //data point
	    nf: s.numberFormat, //number format
	    cs: s.colorScheme, //color scheme
	    ls: s.legend //legend setting
    })
    
   var width = config.get("w"), //map width
      height = config.get("h"), //map height
      bm = config.get("bm"), //base map type
      ds = config.get("ds"), //data source
      dp = config.get("dp"), //data point
      nf = config.get("nf"), //number format
      cs = config.get("cs"), //color scheme to use with autoColor = true
      ls = config.get("ls"); //legend setting
      

/**************************************************************************
********************** VARIABLES, ARRAYS, COLORS *************************
**************************************************************************/

  /* Default presentation variables */
  var mapid = param_m;
  var default_w = 946; //default width made up from ds states' projection
  var centered;
  var map_scale = width/default_w; //calcuate how to rescale the map based on user defined map width and height
  var projection = d3.geo.albersUsa();
  var path = d3.geo.path().projection(projection);
  var basemapsource = "../json/us.json"; //us.json only now; can extend to world or other json files later 
  var basemap; //what objections to use
  var numformat = d3.format(nf);
  
  /* Arrays to collect legend data */
  var keys = {}; //array to catch item keys for each legend occurence
  var legends = [];  //array to formulate legends automatically
  
  /* Array to collect choropleth data for map */
  var data = []; 
  var MapData = Backbone.Collection.extend();
  var mapdata = new MapData;
    
  /* Colors */
  var linearColors = {
	    "blue": ["#EFF3FF","#084594"],
	    "red": ["#FEE5D9","#99000D"],
	    "green": ["#EDF8E9","#005A32"],
	    "orange": ["#FEEDDE","#D94801"],
	    "purple": ["#F2F0F7","#4A1486"],
	    "gray": ["#F7F7F7","#252525"]
   }
  var autoCatColor = d3.scale.category10(); //default automatic categorical coloring
  var autoLinColor = d3.scale.linear() 
	    .range(linearColors[cs]); //default automatic linear coloring
  var LinClassed = d3.scale.quantize()
	    .range(d3.range(9).map(function(i) { return "q" + i + "-9"; }));
  
/* for later versions, a conditional to set base map data source depending on type parameter
  if (bm == "us-states" || bm == "us-counties") {
    basemapsource = "../json/us.json";
  } */

  
/*******************************************************************
***************************** CREATE MAP ***************************
********************************************************************/

//SET UP MAP TILES AND TOOL TIP
  var maps = d3.select('#'+mapid).append('svg')
	 .attr('width', width)
	 .attr('height', height);
  var tiles = maps.append('g')
	.attr('id', 'tiles') 
	.attr('transform', 'scale('+map_scale+','+map_scale+')');

//QUEUE UP ALL DATA FILES
queue()
      .defer(d3.json, basemapsource)
      .defer(d3.csv, ds, function(d) {
		    data.push(d);
	})
      .await(draw);
 
//DRAW THE MAP
function draw(error, us) {
    
    mapdata.add(data); //update mapdata collection
   
    //set base map data source depending on type parameter
    if (bm == "us-states") {
      basemap = topojson.feature(us, us.objects.states).features;
    } else if (bm == "us-counties") {
      basemap = topojson.feature(us, us.objects.counties).features;
    }

    //check if first row is numeric or not
    if (isNumber(mapdata.at(0).get(dp)) == true) {
	var colorType = "Lin";
	autoLinColor.domain([0, d3.max(data, function(d) { return +d[dp]; })]);
	LinClassed.domain([0, d3.max(data, function(d) { return +d[dp]; })]);
    } else {
	var colorType = "Cat";
    }

 var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
    //switcher based on categorical or linear
     var labeltxt = mapdata.get(d.id).get("fullname") != null ? mapdata.get(d.id).get("fullname")+": " : "";
     
     return colorType == "Lin" ? '<span class="label">'+labeltxt+'</span><span class="value">' + numformat(mapdata.get(d.id).get(dp)) + '</span>' : '<span class="label">'+labeltxt+'</span>'+mapdata.get(d.id).get(dp).replace(/\s/g, ""); //if is linear quantize to class the tile, else use
  })    
    maps.call(tip); //tie in tool tip
    
    var tile = tiles.selectAll('path') 
	.data(basemap)
	.enter().append('path')
	.attr('d', path)
	.on('mouseover', tip.show)
        .on('mouseout', tip.hide)
	.attr("class", function(d) {
	    
	    if((mapdata.get(d.id) != null)) {
		  return colorType == "Lin" ? LinClassed(mapdata.get(d.id).get(dp)) : mapdata.get(d.id).get(dp).replace(/\s/g, ""); //if is linear quantize to class the tile, else use the data value after stripping all whitespaces
	    } else {
		return null;
	    }
	    }) //set data value as the class 
	.attr("fill", function(d) {
	    
	    if((mapdata.get(d.id) != null)) {
		return colorType == "Lin" ? autoLinColor(mapdata.get(d.id).get(dp)) : autoCatColor(mapdata.get(d.id).get(dp)) //automatic color as default
	    } else {
		return null;
	    }
	    })
	.attr("id", function(d) { return  d.id }) //give each path an id = state fip, using fip to better connect path between the two data sets

     /*states' borders overlay for when displaying a counties map*/
     if (bm == "us-counties") {
	tiles.append("path")
	 .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
	 .attr("class", "states-overlay")
	 .attr("d", path)
	 .attr("fill","none");
     }
	

/************************************************************
****************** CREATE MAP LEGEND ************************
************************************************************/

//keys occurence of each value category in dataset; collection used to generate a legend dynamically and to append proper class to each state svg
    data.forEach(function(d) {
      var k = d[dp]; // = data.value
     
      //skip null or empty values
      if (k != null && k != "") {
	  if(keys.hasOwnProperty(k)) {
	   keys[k]++;
	 }
	 else {
	   keys[k] = 1;
	 }
      }

    });

if (ls['showLegend'] === true) {
    
    var ls_type = ls['type'];
    var ls_count = ls['showCount'];
    
    //generate legends dataset to be used, following Golden JSON format for easy of integration with d3.js
    for (var k in keys ) {
      legends.push({name:k, count:keys[k]});
    }     
     
      /**CHART TYPE: CATEGORICAL**/
      if(colorType == "Cat") {

        //draw the legend
	var legend = d3.select('#'+mapid+' svg').selectAll("svg")
	    .data(legends)
	    .enter()
	    .append('g')
	    .attr('class', 'legend')
	    .attr('cursor','pointer');
	
	    legend.append('rect')
		  .attr('x', (width / 2) + 10)
		  .attr('y', function(d, i){ return (height / 2) + (height / 4) + (i * 20);})
		  .attr('width', 10)
		  .attr('height', 10)
		  .attr("class", function(d) {
		      return d.name.replace(/\s/g, "");
		      })
		  .attr("fill", function(d) {
		      return autoCatColor(d.name) //automatic color as default
		  });
      
	    legend.append('text')
		.attr('x', (width / 2) + 25)
		.attr('y', function(d, i){ return (height / 2) + (height / 4) + (i * 20) + 10;})
		.attr('font-size','11px')
		.text(function(d){
		  var keyCounts = ls_count === true ? " (" + d.count + ")" : ''; //set key counts string based on setting
		  //if type is default
		  if (ls_type == 'default') {   
      		    return d.name.toUpperCase() + keyCounts;
		  //if type is custom
		  } else if (ls_type == 'custom') {
		    //map custom key values to key in data
		    for (ckey in ls['customKeys']) {
		      if (ckey == d.name.toLowerCase()) {
			return ls['customKeys'][ckey] + keyCounts;
		      }
		    }
		      
		  }
		  return null
		  }) //end text return for legend
		  .on('mouseover', function(d) {
			//legend.attr('font-weight','bold');
			d3.select(this.parentNode)
			    .attr('font-weight','bold');
			tiles.selectAll("path."+d.name)
			    .attr("opacity","0.8");
			    
		    })
		  .on('mouseout',function(d){
			d3.select(this.parentNode)
			    .attr('font-weight','normal');
			tiles.selectAll("path")
			    .attr("opacity","1");
		  })
	} //END if color type is categorical
	
	/**CHART TYPE: LINEAR**/
	else if (colorType == "Lin") {

	//draw the legend
	var datamax = d3.max(legends,function(d){return +d.name});
	var datamin = d3.min(legends, function(d){return +d.name});
	var lposition = (width*map_scale)-200;
	
	var legend = d3.select('#'+mapid)
	    .append('div')
		  .attr("class", "legend-scale")
		  .attr("style","background-image: linear-gradient(right,"+autoLinColor(datamax)+" 35%, #FFFFFF 100%);background-image: -o-linear-gradient(right, "+autoLinColor(datamax)+" 35%,#FFFFFF 100%);background-image: -moz-linear-gradient(right, "+autoLinColor(datamax)+" 35%, #FFFFFF 100%);background-image: -webkit-linear-gradient(right, "+autoLinColor(datamax)+" 35%, #FFFFFF 100%);background-image: -ms-linear-gradient(right, "+autoLinColor(datamax)+" 35%, #FFFFFF 100%);filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='"+autoLinColor(datamax)+"', endColorstr='"+autoLinColor(datamin)+"'); -ms-filter: 'progid:DXImageTransform.Microsoft.gradient(startColorstr='"+autoLinColor(datamax)+"', endColorstr='"+autoLinColor(datamin)+"')';left:"+lposition+"px")

	legend.append('span')
		  .attr("class","min")
		  .text(numformat(datamin));
		  
	legend.append('span')
		  .attr("class","max")
		.text(numformat(datamax));

	} //END if color type is linear
	
} //END if show legend

function legendFilter() {

} 
  

} //ready()


}; //end drawmap();

}; //end d3QuickMap class

