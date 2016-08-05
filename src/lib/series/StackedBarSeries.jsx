"use strict";

import d3 from "d3";
import React, { PropTypes, Component } from "react";

import GenericChartComponent, { getAxisCanvas } from "../GenericChartComponent";
import { identity, hexToRGBA, first, last, isDefined } from "../utils";


class StackedBarSeries extends Component {
	constructor(props) {
		super(props);
		this.renderSVG = this.renderSVG.bind(this);
		this.drawOnCanvas = this.drawOnCanvas.bind(this);
	}
	drawOnCanvas(ctx, moreProps) {
		var { yAccessor } = this.props;
		var { xAccessor } = this.context;
		// var { xScale, chartConfig: { yScale }, plotData } = moreProps;

		drawOnCanvasHelper(ctx, this.props, moreProps, xAccessor, d3.layout.stack());
	}
	renderSVG(moreProps) {
		var { xAccessor } = this.context;

		return <g>{svgHelper(this.props, moreProps, xAccessor, d3.layout.stack())}</g>;
	}
	render() {
		return <GenericChartComponent
			canvasToDraw={getAxisCanvas}
			svgDraw={this.renderSVG}
			canvasDraw={this.drawOnCanvas}
			drawOnPan
			/>;
	}
}

StackedBarSeries.propTypes = {
	baseAt: PropTypes.oneOfType([
		PropTypes.number,
		PropTypes.func,
	]).isRequired,
	direction: PropTypes.oneOf(["up", "down"]).isRequired,
	stroke: PropTypes.bool.isRequired,
	widthRatio: PropTypes.number.isRequired,
	opacity: PropTypes.number.isRequired,
	fill: PropTypes.oneOfType([
		PropTypes.func, PropTypes.string
	]).isRequired,
	className: PropTypes.oneOfType([
		PropTypes.func, PropTypes.string
	]).isRequired,
};

StackedBarSeries.contextTypes = {
	xAccessor: PropTypes.func.isRequired,
};

StackedBarSeries.defaultProps = {
	baseAt: (xScale, yScale/* , d*/) => first(yScale.range()),
	direction: "up",
	className: "bar",
	stroke: true,
	fill: "#4682B4",
	opacity: 0.5,
	widthRatio: 0.8,
};

export function drawOnCanvasHelper(ctx, props, moreProps, xAccessor, stackFn, defaultPostAction = identity, postRotateAction = rotateXY) {
	var { xScale, chartConfig: { yScale }, plotData } = moreProps;

	var bars = doStuff(props, xAccessor, plotData, xScale, yScale, stackFn, postRotateAction, defaultPostAction);
	drawOnCanvas2(props, ctx, bars);
}

function convertToArray(item) {
	return Array.isArray(item) ? item : [item];
}

export function svgHelper(props, moreProps, xAccessor, stackFn, defaultPostAction = identity, postRotateAction = rotateXY) {
	var { xScale, chartConfig: { yScale }, plotData } = moreProps;
	var bars = doStuff(props, xAccessor, plotData, xScale, yScale, stackFn, postRotateAction, defaultPostAction);
	return getBarsSVG2(props, bars);
}

function doStuff(props, xAccessor, plotData, xScale, yScale, stackFn, postRotateAction, defaultPostAction) {
	var { yAccessor, swapScales } = props;

	var modifiedYAccessor = swapScales ? convertToArray(props.xAccessor) : convertToArray(yAccessor);
	var modifiedXAccessor = swapScales ? yAccessor : xAccessor;

	var modifiedXScale = swapScales ? yScale : xScale;
	var modifiedYScale = swapScales ? xScale : yScale;

	var postProcessor =  swapScales ? postRotateAction : defaultPostAction;

	var bars = getBars(props, modifiedXAccessor, modifiedYAccessor, modifiedXScale, modifiedYScale, plotData, stackFn, postProcessor);
	return bars;
}

export const rotateXY = (array) => array.map(each => {
	return {
		...each,
		x: each.y,
		y: each.x,
		height: each.width,
		width: each.height
	};
});

export function getBarsSVG2(props, bars) {
	/* eslint-disable react/prop-types */
	var { opacity } = props;
	/* eslint-enable react/prop-types */

	return bars.map((d, idx) => {
		if (d.width <= 1) {
			return <line key={idx} className={d.className}
						stroke={d.fill}
						x1={d.x} y1={d.y}
						x2={d.x} y2={d.y + d.height} />;
		}
		return <rect key={idx} className={d.className}
					stroke={d.stroke}
					fill={d.fill}
					x={d.x}
					y={d.y}
					width={d.width}
					fillOpacity={opacity}
					height={d.height} />;
	});
}

export function drawOnCanvas2(props, ctx, bars) {
	var { stroke } = props;

	var nest = d3.nest()
		.key(d => d.fill)
		.entries(bars);

	nest.forEach(outer => {
		var { key, values } = outer;
		if (values[0].width < 1) {
			ctx.strokeStyle = key;
		} else {
			ctx.strokeStyle = key;
			ctx.fillStyle = hexToRGBA(key, props.opacity);
		}
		values.forEach(d => {
			if (d.width < 1) {
				/* <line key={idx} className={d.className}
							stroke={stroke}
							fill={fill}
							x1={d.x} y1={d.y}
							x2={d.x} y2={d.y + d.height} />*/
				ctx.beginPath();
				ctx.moveTo(d.x, d.y);
				ctx.lineTo(d.x, d.y + d.height);
				ctx.stroke();
			} else {
				/* <rect key={idx} className={d.className}
						stroke={stroke}
						fill={fill}
						x={d.x}
						y={d.y}
						width={d.width}
						height={d.height} /> */
				ctx.beginPath();
				ctx.rect(d.x, d.y, d.width, d.height);
				ctx.fill();
				if (stroke) ctx.stroke();
			}

		});
	});
}

export function getBars(props, xAccessor, yAccessor, xScale, yScale, plotData, stack = identity, after = identity) {
	var { baseAt, className, fill, stroke, widthRatio, spaceBetweenBar = 0 } = props;

	var getClassName = d3.functor(className);
	var getFill = d3.functor(fill);
	var getBase = d3.functor(baseAt);

	var width = Math.abs(xScale(xAccessor(last(plotData))) - xScale(xAccessor(first(plotData))));
	var bw = (width / (plotData.length - 1) * widthRatio);
	var barWidth = Math.round(bw);

	var eachBarWidth = (barWidth - spaceBetweenBar * (yAccessor.length - 1)) / yAccessor.length;

	var offset = (barWidth === 1 ? 0 : 0.5 * bw);

	var layers = yAccessor
		.map((eachYAccessor, i) => plotData
			.map(d => ({
				series: xAccessor(d),
				datum: d,
				x: i,
				y: eachYAccessor(d),
				className: getClassName(d, i),
				stroke: stroke ? getFill(d, i) : "none",
				fill: getFill(d, i),
			}))
		);
	var data = stack(layers);

	var bars = d3.merge(data)
			.filter(d => isDefined(d.y))
			.map(d => {
				// let baseValue = yScale.invert(getBase(xScale, yScale, d.datum));
				let y = yScale(d.y + (d.y0 || 0));
				/* let h = isDefined(d.y0) && d.y0 !== 0 && !isNaN(d.y0)
					? yScale(d.y0) - y
					: getBase(xScale, yScale, d.datum) - yScale(d.y)*/
				var h = getBase(xScale, yScale, d.datum) - yScale(d.y);

				// let h = ;
				// if (d.y < 0) h = -h;
				if (h < 0) {
					y = y + h;
					h = -h;
				}
				/* console.log(d.series, d.datum.date, d.x,
					getBase(xScale, yScale, d.datum), `d.y=${d.y}, d.y0=${d.y0}, y=${y}, h=${h}`)*/
				return {
					className: d.className,
					stroke: d.stroke,
					fill: d.fill,
					// series: d.series,
					// i: d.x,
					x: Math.round(xScale(d.series) - bw / 2),
					y: y,
					groupOffset: Math.round(offset - (d.x > 0 ? (eachBarWidth + spaceBetweenBar) * d.x : 0)),
					groupWidth: Math.round(eachBarWidth),
					offset: Math.round(offset),
					height: h,
					width: barWidth,
				};
			});
	// console.log(bars)

	return after(bars);
}

export default StackedBarSeries;
