import { Schema } from 'mongoose';

// Create interface for a geoJson point
export interface IPoint {
	type: string;
	coordinates: number[];
}

// Create interface for a geoJson polygon
export interface IPolygon {
	type: string;
	coordinates: number[][][];
}

// Create schema for the above geoJson point and polygon
export const Point = new Schema(
	{
		type: {
			type: String,
			enum: ['Point'],
			required: true,
			default: 'Point'
		},
		coordinates: {
			type: [Number],
			required: true
		}
	},
	{ _id: false }
);

export const Polygon = new Schema(
	{
		type: {
			type: String,
			enum: ['Polygon'],
			required: true,
			default: 'Polygon'
		},
		coordinates: {
			type: [[[Number]]], // Array of arrays of arrays of numbers
			required: true
		}
	},
	{ _id: false }
);
