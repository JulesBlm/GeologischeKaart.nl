// 1. Fix drag
// 2. Fix ticks

import { selection, select, selectAll, event } from "d3-selection";
import { drag } from "d3-drag"
import { scaleLinear } from "d3-scale";
import { transition } from "d3-transition";
import { partition, hierarchy } from "d3-hierarchy";
import { json } from "d3-fetch";
import { easeLinear } from "d3-ease";

const timescale = (function() {

  // Via http://stackoverflow.com/questions/14167863/how-can-i-bring-a-circle-to-the-front-with-d3
  // Necessary for highlighting time intervals properly
  selection.prototype.moveToFront = function() {
    return this.each(function(){
      this.parentNode.appendChild(this);
    });
  };



  // Via https://stackoverflow.com/questions/9133500/how-to-find-a-node-in-a-tree-with-javascript
  function searchTree(node, property, match){
    if (property === "nam" || "oid" || "mid" || "lag" || "") {
      if (node.data[property] == match){
        return node;
      } else if (node.children != null){
          let result = null;
          for (let i=0; result == null && i < node.children.length; i++) {
            result = searchTree(node.children[i], property, match);
          }
          return result;
      }
      return null;
    } else {
      console.warn("Property can't be used to search")
    }
  }

  const width = window.innerWidth - 4;
  const height = 130;

  // Initialize data
  const data = { oid: 0, nam: "Geologic Time", children: [] };
  const interval_hash = { 0: data };
  let currentInterval;
  let root;

  return {

    "init": function(div) {
      // Via https://stackoverflow.com/questions/38224875/replacing-d3-transform-in-d3-v4
      function getTransformation(transform) {
        // Create a dummy g for calculation purposes only. This will never
        // be appended to the DOM and will be discarded once this function returns.
        var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        
        // Set the transform attribute to the provided string value.
        g.setAttributeNS(null, "transform", transform);
        
        // consolidate the SVGTransformList containing all transformations
        // to a single SVGTransform of type SVG_TRANSFORM_MATRIX and get its SVGMatrix. 
        var matrix = g.transform.baseVal.consolidate().matrix;
        
        // Below calculations are taken and adapted from the private function transform/decompose.js of D3's module d3-interpolate.
        var {a, b, c, d, e, f} = matrix;
        var scaleX, scaleY, skewX;
        if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
        if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
        if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
        if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
        return {
          translateX: e,
          translateY: f,
          rotate: Math.atan2(b, a) * 180 / Math.PI,
          skewX: Math.atan(skewX) * 180 / Math.PI,
          scaleX: scaleX,
          scaleY: scaleY
        };
      }
      

      let newX = 0.01;
      let transformStart;
      let dragStart;

      const dragFunc = drag()
        .subject(function() { 
          // const t = select(".timescale g");
          return {x: newX, y: 0};
        })
        .on("start", function() {
          dragStart = event.pageX;
          console.log("timescale > g", select(".timescale").select("g"))
          console.log("attr transform", select(".timescale").select("g").attr("transform")) // Only show a scale transform no translate
          transformStart = getTransformation(select(".timescale").select("g").attr("transform"));
          console.log({transformStart})
          event.sourceEvent.stopPropagation();
        })
        .on("drag", function() {
        	const currentDrag = event.pageX;

         	newX = (dragStart - currentDrag);

          select(".timescale").select("g")
            .attr("transform", function() {
              return `translate(${[ parseInt(transformStart[0] + -newX), 0 ]}) scale(${parseInt(select(".timescale").style("width"))/width})`;
            });
        });
      
      // Add class timescale to whatever div was supplied
     select("#" + div).attr("class", "timescale");

      // !!!Move into draw!
      // Create the SVG for the chart
      const time = select("#" + div).append("svg")
          .attr("width", width)
          .attr("height", height)
          .append("g");

      // Move whole tick SVG group down 125px
      const scale = time.append("g")
        .attr("id", "tickBar")
        .attr("transform", "translate(0,125)");

      // Create a new d3 partition layout
      const partitionFunc = partition()
        .size([width, height])
        .padding(0);

      // Load the time scale data
      json("jsons/intervals.json").then(function(result) {

        // Construct hierarchy variable 'data' by oid's from paleoJSON
        result.records.forEach(i => {
          i.children = [];
          i.pid = i.pid || 0; // Check if i is not a highest level period
          i.abr = i.abr || i.nam.charAt(0);
          i.mid = parseInt((i.eag + i.lag) / 2); //length of period
          i.total = i.eag - i.lag;
          interval_hash[i.oid] = i;
          interval_hash[i.pid].children.push(i);
        })
        
        root = hierarchy(data)
          .sum(d => (d.children.length === 0) ? d.total + 0.117 : 0 ); //? add time for Holocene

        // console.log(
        //   {result}, 
        //   {interval_hash},
        //   {data},   // created hierarchy
        //   {root}  // d3 hierarchy with Node types
        //   )

        partitionFunc(root);

        const rectGroup = time.append("g")
          .attr("id", "rectGroup");

        // Create the rectangles
        rectGroup.selectAll("rect")
            .data( root.descendants() )
          .enter().append("rect")
            .attr("x", function(d) { return d.x0; })
            .attr("y", function(d) { return d.y0; })
            .attr("width", function(d) { return d.x1 - d.x0; })
            .attr("height", function(d) { return d.y1 - d.y0; })
            .attr("fill", function(d) { return d.data.col || "#000"; })
            .attr("id", function(d) { return "t" + d.data.oid; })
            .style("opacity", 0.83)
            .call(dragFunc)
            .on("click", function(d) { timescale.goTo(d); });

        // Scale bar for the bottom of the graph
        const scaleBar = scale.selectAll("rect")
          .data(root.descendants());

        const hash = scaleBar.enter().append("g")
          .attr("class", function(d) { return "tickGroup s" + d.data.lvl})
          .attr("transform", function(d) { return `translate(${d.x0}, 0)`}); 

        hash.append("line")
          .attr("x1", 0)
          .attr("y1", 7.5)
          .attr("x2", 0)
          .attr("y2", 12)
          .style("stroke-width", "0.05em");

        hash.append("text")
          .attr("x", 0)
          .attr("y", 20)
          .style("text-anchor", function(d) { return (d.data.eag !== 0.0117) ? "middle" : "end"; })
          .style("font-size", "0.65em")
          .style("fill", "#000")
          .text(function(d) { return d.data.eag; });

        // Create a tick for year 0
        const now = scale.append("g")
          .data([{x0: width, y0: 0 }])
          .attr("class", "tickGroup s1 s2 s3 s4 s5")
          .attr("transform",`translate(${width}, 0)`);

        now.append("line")
          .attr("x1", 0)
          .attr("y1", 7.5)
          .attr("x2", 0)
          .attr("y2", 12)
          .style("stroke-width", "0.05em");

        now.append("text")
          .attr("x", 0)
          .attr("y", 20)
          .attr("id", "now")
          .style("fill", "white")
          .style("text-anchor", "end")
          .style("font-size", "0.65em")
          .style("fill", "#777")
            .text("0");

        const textGroup = time.append("g")
          .attr("id", "textGroup");

        // Add the full labels
        textGroup.selectAll("fullName")
            .data( root.descendants() )
          .enter().append("text")
            .text(function(d) { return d.data.nam; })
            .attr("x", 1)
            .attr("y", function(d) { return d.y0 + 15;})
            .attr("width", function() { return this.getComputedTextLength(); })
            .attr("height", function(d) { return d.y1 - d.y0; })
            .attr("class", function(d) { return "fullName level" + d.data.lvl; })
            .attr("id", function(d) { return "l" + d.data.oid; })
            .attr("x", function(d) { return timescale.labelX(d); })
            .on("click", function(d) { timescale.goTo(d); });

        // Add the abbreviations
        textGroup.selectAll("abbrevs")
            .data( root.descendants() )
          .enter().append("text")
            .attr("x", 1)
            .attr("y", function(d) { return d.y0 + 15; })
            .attr("width", 30)
            .attr("height", function(d) { return d.y1 - d.y0; })
            .text(function(d) { return d.data.abr; }) //charAt(0)
            .attr("class", function(d) { return "abbr level" + d.data.lvl; })
            .attr("id", function(d) { return "a" + d.data.oid; })
            .attr("x", function(d) { return timescale.labelAbbrX(d); })
            .on("click", function(d) { timescale.goTo(d); });

        // Position the labels for the first time
        timescale.goTo(root);

        // Remove the Geologic time abbreviation
        select(".abbr.levelundefined").remove();
        
        // Open to Phanerozoic 
        timescale.goTo("Phanerozoïcum");
      }); // End PaleoDB json callback
      //attach window resize listener to the window
      select(window).on("resize", timescale.resize);

      // Size time scale to window
      timescale.resize();
    },

    // Calculates x-position for label abbreviations
    "labelAbbrX": function(d) {
      const rectWidth = parseFloat(select("#t" + d.data.oid).attr("width")),
          rectX = parseFloat(select("#t" + d.data.oid).attr("x"));

      let labelWidth = select("#a" + d.data.oid).node().getComputedTextLength();

      if (rectWidth - 8 < labelWidth) {
       select("#a" + d.data.oid).style("display", "none");
      }

      return rectX + (rectWidth - labelWidth) / 2;
    },
    
    "labelX": function(d) {
      const rectWidth = d.x1 - d.x0;
      const rectX = d.x0;

      let labelWidth;
      try {
        labelWidth = select("#l" + d.data.oid).node().getComputedTextLength();
      } catch(err) {
        labelWidth = 25;
      }

      // Hide full names if they are too small for their rectangles
      if (rectWidth - 10 < labelWidth) {
       select("#l" + d.data.oid).style("display", "none");
      } else {
       select("#a" + d.data.oid).style("display", "none");
      }

      return rectX + (rectWidth - labelWidth) / 2;
    },

    // Zooms the graph to a given time interval
    // Accepts a data point or a named interval
    "goTo": function(d) {
      if (typeof d == "string") {
        d = searchTree(root, "nam", d)
      } else if (d.children) {
          if (d.children.length < 1) {
            const d = d.data.parent;
          }
      }

      // Stores the currently focused time interval for state restoration purposes
      timescale.currentInterval = d;

     selectAll(".fullName")
      .style("display", "block");

     selectAll(".abbr")
        .style("display", "block");
      
      // Adjust the bottom scale
      const depth = (d.depth !== 'undefined') ? parseInt(d.depth) + 1 : 1;
     selectAll(".scale").style("display", "none");
     selectAll(".tickGroup").style("display", "none");
     selectAll(".s" + depth).style("display", "block");

      const x = scaleLinear()
        .range([5, width])
        .domain([d.x0, d.x1]); 

      // Define transition for concurrent animation
      const t = transition()
        .duration(300)
        .ease(easeLinear);

      // Transition the rectangles
     selectAll("rect").transition(t)
        .attr("x", function(d) { return x(d.x0); })
        .attr("width", function(d) { return x(d.x1) - x(d.x0); })    

      // Transition tick groups
     selectAll(".tickGroup").transition(t)
        .attr("transform", function(d) {
         select(this).selectAll("text").style("text-anchor", "middle");
          if (x(d.x0) === 5) {
           select(this).select("text")
              .style("text-anchor", "start");
          } else if (d.x0 === width) {
           select(this).select("text")
              .style("text-anchor", "end");
          }
          if (typeof x(d.x0) === 'number') {return `translate(${x(d.x0)}, 0)`}
        });
        
      // Move the full names, to keep animation concurrent labelX has to be calculated inside to goTo function
     selectAll(".fullName").transition(t)
        .attr("x", function(d) { 
            const rectWidth = x(d.x1) - x(d.x0),
                  rectX = x(d.x0);

            let labelWidth;
            try {
              labelWidth = select("#l" + d.data.oid).node().getComputedTextLength(); //this?
            } catch(err) {
              labelWidth = 25;
            }

            if (rectWidth - 8 < labelWidth) {
             select("#l" + d.data.oid).style("display", "none");
           } else {
             select("#a" + d.data.oid).style("display", "none");
           }

            return rectX + (rectWidth - labelWidth) / 2;
        })
        .attr("height", function(d) { return d.y1 - d.y0; })

      //Move the abbreviations
      selectAll(".abbr").transition(t)
        .attr("x", function(d) {
          const rectWidth = x(d.x1) - x(d.x0);
          const rectX = x(d.x0);

          let abbrevWidth = select("#a" + d.data.oid).node().getComputedTextLength();
          
          if (rectWidth - 8 < abbrevWidth) {
           select("#a" + d.data.oid).style("display", "none");
          }
          
          return rectX + (rectWidth - abbrevWidth) / 2;
        })
        .attr("height", function(d) { return d.y1 - d.y0; })
        .on("end", function() { 
         selectAll(".fullName").style("fill", "#333");
         selectAll(".abbr").style("fill", "#333");
        });

      // Center whichever interval was clicked
     select("#l" + d.data.oid).transition(t)
        .attr("x", width/2);

      // Position all the parent labels in the middle of the scale
      if (d.parent !== null) {
        const depth = d.depth;
        let loc = "d.parent";
        for (let i=0; i < depth; i++) {
          const parent = eval(loc).data.nam;
         selectAll('.abbr').filter(d => d.data.nam === parent ).transition(t)
            .attr("x", width/2);
         selectAll('.fullName').filter(d => d.data.nam === parent ).transition(t)
            .attr("x", width/2);
          loc += ".parent";
        }
       selectAll('.abbr').filter(d => d.data.nam === parent).transition(t)
          .attr("x", width/2);
       selectAll('.fullName').filter(d => d.data.nam === parent).transition(t)
          .attr("x", width/2);
      }        

      timescale.resize();
    },

    // Highlight a given time interval
    "highlight": function(d) {

     selectAll("rect").style("stroke", "#fff");
      if (d.cxi) {
        let id = d.cxi;
       selectAll("rect#t" + d.cxi).style("stroke", "#000").moveToFront();
       selectAll("#l" + d.cxi).moveToFront();
      } else if (typeof d == "string") {
        let id = selectAll('rect').filter(function(e) {
          return e.nam === d;
        }).attr("id");
        id = id.replace("t", "");
      } else {
        let id = select(d).attr("id");
        id = id.replace("p", "");
      }

     selectAll(`rect#t${id}`).style("stroke", "#000").moveToFront();
     selectAll("#l" + id).moveToFront();
     selectAll(".abbr").moveToFront();
    },

    // Unhighlight a time interval by resetting the stroke of all rectangles
    "unhighlight": function() {
     selectAll("rect").style("stroke", "#fff");
    },

    "resize": function() {
     select(".timescale g")
        .attr("transform", function() {
          return `scale(${parseInt(select(".timescale").style("width"))/width})`;
        });

     select(".timescale svg")
        .style("width", function() { return select(".timescale").style("width"); })
    },

    /* Interval hash can be exposed publically so that the time scale data can be used 
       for other things, such as maps */
    // https://github.com/d3/d3-hierarchy/issues/58 
    "interval_hash": interval_hash, 

    // Method for getting the currently zoomed-to interval - useful for preserving states
    "currentInterval": currentInterval
  }
})();

export default timescale;