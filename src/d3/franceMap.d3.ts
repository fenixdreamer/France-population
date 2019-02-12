import { select } from "d3-selection";
import { geoMercator, geoPath } from "d3-geo";
import { json, tsv } from "d3-fetch";
import { FeatureCollection, Feature, Geometry } from 'geojson';
import { interpolateBlues } from "d3-scale-chromatic";
import { scaleSqrt } from "d3-scale";
import { mouse, event } from "d3";
import { zoom } from "d3-zoom";
import { defineGlowEffect } from './glowEffect.d3';

const width = 960;
const height = 460;
const padding = 20;

const card = select("#root")
  .append("div")
  .attr("class", "card");

const svg = card
  .append("svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .attr("viewBox", `${-padding} ${-padding} ${width + 2 * padding} ${height + 2 * padding}`);

const tooltip = select("#root")
  .append("div")
  .style("display", "none")
  .style("position", "absolute")
  .style("padding", "10px")
  .style("border-radius", "3px")
  .style("background-color", "black")
  .style("color", "white")
  .style("opacity", "0.7");

const zoomCreator = zoom()
  .scaleExtent([1, 15])
  .on("zoom", onZoom);

svg.call(zoomCreator);
function onZoom() {
  regionsGroup
    .attr("transform", event.transform);
}

const regionsGroup = svg
  .append("g");
const scale = 1800
const mercatorProjection = geoMercator()
  .center([2.450, 46.260])
  .scale(scale)
  .translate([width / 2, height / 2]);

const populationScale = scaleSqrt().exponent(1 / 3) 
  .domain([0, 3000000])
  .range([0, 1]);

const colorScale = (population) => interpolateBlues(populationScale(population));
const glowUrl = defineGlowEffect(svg.append("defs"));


Promise.all([
  json(require("../data/france.geojson")),
  tsv(require("../data/populationFrance.tsv"))
]).then(onDataReady as any)

interface FranceProps {
  NOM_DEPT: string;
}

interface PopulationRecord {
  name: string;
  population: number;
}

function onDataReady([countries, population]: [FeatureCollection<Geometry, FranceProps>, PopulationRecord[]]) {

  const pathCreator = geoPath()
    .projection(mercatorProjection);


  const populationMap = population.reduce(
    (acc, record) => {
      acc[record.name] = record.population;
      return acc;
    }, {}
  );

  regionsGroup.selectAll("path")
    .data(countries.features, (d: Feature<Geometry, FranceProps>) => d.properties.NOM_DEPT)
    .enter()
    .append("path")
    .attr("d", pathCreator)
    .attr("fill", d => colorScale(populationMap[d.properties.NOM_DEPT]))
    .style("stroke", "white")
    .style("stroke-width", "0.5px")
    .style("opacity", 0.8)
    .on("mouseenter", onMouseEnter)
    .on("mousemove", onMouseMove)
    .on("mouseleave", onMouseLeave);

  function onMouseEnter(d: Feature<Geometry, FranceProps>) {
    tooltip
      .style("display", "block")
      .html(`
                <p><b>Region</b>: ${d.properties.NOM_DEPT}</p>
                <p><b>Population</b>: ${populationMap[d.properties.NOM_DEPT].toLocaleString()}</p>
              `);

    select(this)
      .raise() 
      .transition()
      .ease(Math.sqrt)
      .duration(400)
      .style("opacity", 1)
      .style("stroke", "red")
      .style("stroke-width", "1.5px")
      .attr("filter", glowUrl);
  };

  function onMouseMove() {
    const [mx, my] = mouse(document.body);

    tooltip
      .style("left", `${mx + 10}px`)
      .style("top", `${my + 10}px`);
  };

  function onMouseLeave() {
    tooltip
      .style("display", "none");

    select(this)
      .transition()
      .style("opacity", 0.8)
      .style("stroke", "white")
      .style("stroke-width", "0.5px");
  }

}