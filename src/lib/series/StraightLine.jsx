"use strict";

import React from "react";

import wrap from "./wrap";
import { hexToRGBA } from "../utils/utils";

class StraightLine extends React.Component {
	render() {
		var { props } = this;
		var { stroke, className, opacity } = props;
		var { xScale, yScale, xAccessor, plotData, yValue } = props;

		var first = xAccessor(plotData[0]);
		var last = xAccessor(plotData[plotData.length - 1]);

		return (
			<line className={className}
				stroke={stroke} opacity={opacity}
				x1={xScale(first)} y1={yScale(yValue)}
				x2={xScale(last)} y2={yScale(yValue)} />
		);
	}
}

StraightLine.propTypes = {
	className: React.PropTypes.string,
	xScale: React.PropTypes.func.isRequired,
	yScale: React.PropTypes.func.isRequired,
	xAccessor: React.PropTypes.func.isRequired,
	stroke: React.PropTypes.string,
	opacity: React.PropTypes.number.isRequired,
	yValue: React.PropTypes.number.isRequired,
};

StraightLine.defaultProps = {
	className: "line ",
	stroke: "black",
	opacity: 0.5,
};

StraightLine.drawOnCanvas = (props, ctx, xScale, yScale, plotData) => {

	var { stroke, opacity } = props;
	var { xAccessor, yValue } = props;

	var first = xAccessor(plotData[0]);
	var last = xAccessor(plotData[plotData.length - 1]);

	ctx.beginPath();

	ctx.strokeStyle = hexToRGBA(stroke, opacity);

	ctx.moveTo(xScale(first), yScale(yValue));
	ctx.lineTo(xScale(last), yScale(yValue));
	ctx.stroke();
};

export default wrap(StraightLine);
