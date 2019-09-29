/* eslint-disable func-names */
// 1. Fix drag
import { selection, select, selectAll } from 'd3-selection'; // event
// import { drag } from 'd3-drag';
import { scaleLinear } from 'd3-scale';
import { transition } from 'd3-transition';
import { partition, stratify } from 'd3-hierarchy';
import { json } from 'd3-fetch';
import { easeLinear } from 'd3-ease';

const timescale = (function () {
  // Via http://stackoverflow.com/questions/14167863/how-can-i-bring-a-circle-to-the-front-with-d3
  // Necessary for highlighting time intervals properly
  selection.prototype.moveToFront = function () {
    return this.each(function () {
      this.parentNode.appendChild(this);
    });
  };

  // Via https://stackoverflow.com/questions/9133500/how-to-find-a-node-in-a-tree-with-javascript
  function searchTree(node, property, match) {
    if (property === 'name' || 'id' || 'start' || 'end' || '') {
      if (node.data[property] === match) {
        return node;
      } if (node.children != null) {
        let result = null;
        for (let i = 0; result == null && i < node.children.length; i++) {
          result = searchTree(node.children[i], property, match);
        }
        return result;
      }
      return null;
    } else {
      console.warn("Property can't be used to search");
    }
  }

  let width = window.innerWidth - 4;
  const height = 150;

  // Initialize data
  let root;
  let x;
  // let dragStart;
  // let transformStart;

  return {

    init: (divId) => {
      /*       let newX = 0.01;
      let transformStart;
      let dragStart;

      const dragFunc = drag()
        .subject(function() {
          // const t = select(".timescale g");
          return {x: newX, y: 0};
        })
        .on("start", function() {
          dragStart = event.pageX;
          // console.log("timescale > g", select(".timescale").select("g"))
          // console.log("attr transform", select(".timescale").select("g").attr("transform")) // Only show a scale transform no translate
          transformStart = getTransformation(select(".timescale").select("g").attr("transform"));
          // console.log({transformStart})
          event.sourceEvent.stopPropagation();
        })
        .on("drag", function() {
        	const currentDrag = event.pageX;

         	newX = (dragStart - currentDrag);

          select(".timescale").select("g")
            .attr("transform", function() {
              return `translate(${[ parseInt(transformStart[0] + -newX), 0 ]}) scale(${parseInt(select(".timescale").style("width"))/width})`;
            });
        }); */

      // Add class timescale to whatever divId was supplied
      select(`#${divId}`).attr('class', 'timescale');

      // Create the SVG for the chart
      const time = select(`#${divId}`).append('svg')
        .attr('width', width)
        .attr('height', height + 40)
        .append('g');

      // Move whole tick SVG group down 125px
      const scale = time.append('g')
        .attr('id', 'tickBar')
        .attr('transform', `translate(0,${height - 5})`);

      x = scaleLinear()
        .range([5, width])
        .domain([5, width]);

      // Create a new partition layout
      const partitionFunc = partition()
        .size([width, height])
        .padding(0);

      // Load the time scale data
      json('jsons/intervals.json').then((result) => {
        root = stratify()
          .id((d) => d.id)
          .parentId((d) => d.parentId)(result.records); // ? add time for Holocene

        // Only sum lowest level timespans
        partition(root.sum((d) => ((d.level === 5) ? d.start - d.end : 0)));

        partitionFunc(root);

        const rectGroup = time.append('g')
          .attr('id', 'rectGroup');

        const cell = rectGroup
          .selectAll('rect')
          .data(root.descendants())
          .join('rect')
          .attr('x', (d) => d.x0)
          .attr('y', (d) => d.y0)
          .attr('width', (d) => (d.x1 - d.x0))
          .attr('height', (d) => (d.y1 - d.y0))
          .attr('fill', (d) => d.data.color)
          .attr('id', (d) => `t${d.data.id}`)
          .style('opacity', 0.83)
          // .call(drag)
          .on('click', (d) => timescale.goTo(d));

        cell.append('title')
          .text((d) => `${d.ancestors().map((e) => e.data.name).reverse().join(' > ')}`);

        const uniqueAgesSet = new Set(root.descendants().map((node) => node.data.start));
        const uniqueAgesArray = Array.from(uniqueAgesSet)
          .map((start) => (root.descendants()).find((node) => node.data.start === start));

        // Scale bar for the bottom of the graph
        const scaleBar = scale.selectAll('rect')
          .data(uniqueAgesArray);

        const hash = scaleBar.enter().append('g')
          .attr('class', (d) => `tickGroup s${d.depth}`)
          .attr('transform', (d) => `translate(${d.x0}, 0)`);

        hash.append('line')
          .attr('x1', 0)
          .attr('y1', 7.5)
          .attr('x2', 0)
          .attr('y2', (d) => 52 - d.depth * 8)
          .style('stroke-width', (d) => '0.05em');

        hash.append('text')
          .attr('x', 0)
          .attr('y', (d) => 60 - d.depth * 8)
          .style('text-anchor', (d) => ((d.data.start !== 0.0117) ? 'middle' : 'end'))
          .style('font-size', (d) => `${0.9 - 0.08 * d.depth}em`)
          .attr('paint-order', 'stroke')
          .attr('stroke-width', '1.5px')
          .attr('stroke', '#fff')
          .attr('stroke-linecap', 'butt')
          .attr('stroke-linejoin', 'miter')
          .text((d) => d.data.start);

        // Create a tick for year 0
        const now = scale.append('g')
          .data([{ x0: width, y0: 0 }])
          .attr('class', 'tickGroup s1 s2 s3 s4 s5')
          .attr('transform', `translate(${width}, 0)`);

        now.append('line')
          .attr('x1', 0)
          .attr('y1', 6)
          .attr('x2', 0)
          .attr('y2', 12)
          .style('stroke-width', '0.05em');

        now.append('text')
          .attr('x', 4)
          .attr('y', 25)
          .attr('id', 'now')
          .style('fill', 'white')
          .style('text-anchor', 'end')
          .style('font-size', '1.2em')
          .style('fill', '#777')
          .text('0');

        const textGroup = time.append('g')
          .attr('id', 'textGroup');

        // Add the full labels
        textGroup.append('g').attr('id', 'fullNames').selectAll('text')
          .data(root.descendants())
          .join('text')
          .text((d) => d.data.name)
          .attr('y', (d) => d.y0 + 15)
          .attr('width', 40) // function() {return this.getComputedTextLength();})
          .attr('height', (d) => d.y1 - d.y0)
          .attr('class', (d) => `fullName level${d.depth}`)
          .attr('id', (d) => `l${d.data.id}`)
          .attr('x', (d) => timescale.labelX(d))
          .on('click', (d) => timescale.goTo(d));

        // Add the abbreviations
        textGroup.append('g').attr('id', 'abbrevs')
          .selectAll('text')
          .data(root.descendants())
          .join('text')
          .text((d) => d.data.abr || d.data.name.charAt(0))
          .attr('y', (d) => d.y0 + 15)
          .attr('width', 30)
          .attr('height', (d) => d.y1 - d.y0)
          .attr('class', (d) => `abbr level${d.depth}`)
          .attr('id', (d) => `a${d.data.id}`)
          .attr('x', (d) => timescale.labelAbbrX(d))
          .on('click', (d) => timescale.goTo(d));

        // Position the labels for the first time
        timescale.goTo(root);

        // Remove the Geologic time abbreviation
        select('.abbr.levelundefined').remove();

        // Open to Phanerozoic
        timescale.goToName('Phanerozoïcum');
      }); // End PaleoDB json callback
      // attach window resize listener to the window
      select(window).on('resize', timescale.resize);
    },

    // Calculates x-position for label abbreviations
    labelAbbrX(d) {
      const rectWidth = x(d.x1) - x(d.x0);
      const rectX = x(d.x0);

      const abbrevWidth = select(`#a${d.data.id}`).node().getComputedTextLength();

      if (rectWidth - 8 < abbrevWidth) {
        select(`#a${d.data.id}`).style('display', 'none');
      }

      return rectX + (rectWidth - abbrevWidth) / 2;
    },

    labelX(d) {
      const rectWidth = x(d.x1) - x(d.x0);
      const rectX = x(d.x0);

      let labelWidth;
      try {
        labelWidth = select(`#l${d.data.id}`).node().getComputedTextLength(); // this?
      } catch(err) {
        labelWidth = 25;
      }

      // Hide full names if they are too small for their rectangles
      if (rectWidth - 8 < labelWidth) {
        select(`#l${d.data.id}`).style('display', 'none');
      } else {
        select(`#a${d.data.id}`).style('display', 'none');
      }

      return rectX + (rectWidth - labelWidth) / 2;
    },

    goToName(periodName) {
      const periodNode = searchTree(root, 'name', periodName);
      timescale.goTo(periodNode);
    },

    // Zooms the graph to a given time interval
    // Accepts a data point or a named interval
    goTo(node) {
      // Stores the currently focused time interval for state restoration purposes
      timescale.currentInterval = node;

      selectAll('.fullName, .abbr')
        .style('display', 'block');

      x = scaleLinear()
        .range([5, width])
        .domain([node.x0, node.x1]);

      // Define transition for concurrent animation
      const t = transition()
        .duration(300)
        .ease(easeLinear);

      // Hide lowest two time labels
      if (node.depth === 0 || node.depth === 1) {
        selectAll('.s5, .s4').transition(t).style('display', 'none');
      } else {
        selectAll('.s5, .s4').transition(t).style('display', 'block');
      }

      // Transition the rectangles
      selectAll('rect').transition(t)
        .attr('x', (d) => x(d.x0))
        .attr('width', (d) => x(d.x1) - x(d.x0));

      // Transition tick groups
      selectAll('.tickGroup').transition(t)
        .attr('transform', function (d) {
          select(this).selectAll('text')
            .style('text-anchor', 'middle');

          if (x(d.x0) === 5) {
            select(this).select('text')
              .style('text-anchor', 'start');
          } else if (x(d.x0) === width) {
            select(this).select('text')
              .style('text-anchor', 'end');
          }

          return `translate(${x(d.x0)}, 0)`;
        });

      // Move the full names,
      selectAll('.fullName').transition(t)
        .attr('x', (d) => this.labelX(d))
        .attr('height', (d) => d.y1 - d.y0);

      // Move the abbreviations
      selectAll('.abbr').transition(t)
        .attr('x', (d) => this.labelAbbrX(d))
        .attr('height', (d) => d.y1 - d.y0);

      // Center whichever interval was clicked
      select(`#l${node.data.id}`).transition(t)
        .attr('x', width / 2);

      // Position all the ancestors labels in the middle of the scale
      if (node.parent) {
        const ancestors = node.ancestors();
        ancestors.forEach((ancestor) => {
          select(`#l${ancestor.id}, #a${ancestor.id}`).transition(t)
            .attr('x', width / 2);
        });
      }
    },

    resize() {
      width = window.innerWidth - 4;

      select('.timescale svg')
        .style('width', width);

    },
  };
}());

export default timescale;
