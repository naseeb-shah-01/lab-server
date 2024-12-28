import { Schema, model } from 'mongoose';

export interface IAreas {
	type: string;
	coordinates: number[][][];
	name: string;
	city: string;
	pincode: number;
	state: string;
	deliveryFee: {
		surge?: boolean;
		base: {
			start: number;
			end: number;
			charges: number;
			surge: number;
		};
		mid: {
			start: number;
			end: number;
			charges: number;
			surge: number;
		};
		long: {
			start: number;
			end: number;
			charges: number;
			surge: number;
		};
		extraLong: {
			start: number;
			end: number;
			charges: number;
			surge: number;
		};
	};
}

export const Areas = new Schema({
	loc: {
		type: {
			type: String,
			enum: ['Polygon'],
			requiredd: true,
			default: 'Polygon'
		},
		coordinates: {
			type: [[[Number]]], // Array of arrays of arrays of numbers
			requiredd: true
		}
	},
	name: {
		type: String,
		required: true
	},
	city: {
		type: String,
		required: true
	},
	state: {
		type: String,
		required: true
	},
	pincode: {
		type: Number,
		required: true
	},

	deliveryFee: {
		surge: {
			type: Boolean,
			default: false
		},
		base: {
			start: {
				type: Number,
				required: true
			},
			end: {
				type: Number,
				required: true
			},
			charges: {
				type: Number,
				required: true
			},
			surge: {
				type: Number,
				default: 0
			}
		},
		mid: {
			start: {
				type: Number,
				required: true
			},
			end: {
				type: Number,
				required: true
			},
			charges: {
				type: Number,
				required: true
			},
			surge: {
				type: Number,
				default: 0
			}
		},
		long: {
			start: {
				type: Number,
				required: true
			},
			end: {
				type: Number,
				required: true
			},
			charges: {
				type: Number,
				required: true
			},
			surge: {
				type: Number,
				default: 0
			}
		},
		extraLong: {
			start: {
				type: Number,
				required: true
			},
			end: {
				type: Number,
				required: true
			},
			charges: {
				type: Number,
				required: true
			},
			surge: {
				type: Number,
				default: 0
			}
		}
	}
});

Areas.index({
	name: 'text',
	city: 'text'
});
const goodAreas = model<IAreas>('Areas', Areas);
export default goodAreas;
