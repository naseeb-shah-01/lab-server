import { model, Document, Schema } from 'mongoose';
import { ICategory } from '../category/category';
import { ISpecification } from '../category/specification';
import { ISpecificationValue } from '../category/specification-value';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';
import { ICustomer } from '../customer/customer';
import { IPoint, Point } from '../locations/geoJson';
import { IRider } from '../rider/rider';
import { IProduct, ISet, IVariant } from '../seller/product';
import { IUser } from '../user/user';
import { ICoupon } from '../customer/coupons';
import { IGroupOrder } from './group-order';
import { ISeller } from '../customer/seller';

export type OrderStatus =
	| 'turnedin'
	| 'checkout_pending'
	| 'failed'
	| 'ready'
	| 'placed'
	| 'accepted'
	| 'rejected'
	| 'cancelled'
	| 'dispatch'
	| 'abandoned'
	| 'delivered'
	| 'arrived'
	| 'not_received'
	| 'returned'
	| 'return_requested'
	| 'return_accepted'
	| 'return_rejected' // don't set return rejected to currentStatus only add in the history
	| 'return_pickup'
	| 'refund_completed' // don't set refund completed to currentStatus only add in the history
	| 'rider_accepted';

export type ratingType =
	| 'ratingBuyerToSeller'
	| 'ratingBuyerToRider'
	| 'ratingSellerToBuyer'
	| 'ratingSellerToRider'
	| 'ratingRiderToBuyer'
	| 'ratingRiderToSeller';
export type IOrderItem = {
	product?: string | IProduct;
	name?: string;
	mainCategory?: string | ICategory;
	returnPeriod?: number;
	itemType?: 'set' | 'single';
	unitPrice?: number;
	gstType?: 'inc' | 'exc' | 'none';
	gst?: number; // percentage
	discount?: number; // percentage
	quantity?: number;
	insurance?: number; // percentage
	amounts?: {
		main?: number;
		discount?: number;
		net?: number;
		gst?: number;
		total?: number;
		margin?: number;
	};
	commission?: {
		percentage?: number; // from item category
		gst?: number; // percentage
		tcs?: number; // percentage
		amounts?: {
			net?: number;
			gst?: number;
			tcs?: number;
			total?: number;
		};
	};
	variant?: {
		_id?: string | IVariant;
		specifications?: {
			specification?: string | ISpecification;
			value?: string | ISpecificationValue;
			specificationName?: string;
			valueName?: string;
		}[];
	};
	itemSet?: {
		_id?: string | ISet;
		variants?: {
			quantity?: number;
			specifications?: {
				specification?: string | ISpecification;
				value?: string | ISpecificationValue;
				specificationName?: string;
				valueName?: string;
			}[];
		}[];
	};
	service?: string;
	insured?: boolean;
	accepted: boolean;
	rejected: boolean;
};

export interface IOrder extends Document, CommonSchemaProps {
	invoiceNumber?: number;
	seller?: string | ISeller;
	buyer?: string | ICustomer;
	rider?: string | IRider;
	processed?: boolean;
	isGroupOrder?: boolean;
	runningDuration?: number; // hours
	groupOrder?: string | IGroupOrder;
	paymentMode?: 'online-cod' | 'cod' | 'online';
	deliveryCharges?: number;
	selfDeliveryCharge?: number;
	packingCharges?: number;
	freeDeliveryAmt?: number;
	buyerReceivable?: number;
	sellerPayable?: number;
	returnPeriod?: number;
	coupon?: ICoupon;
	deliveryMode?: {
		display?: string;
		details?: string;
		value?: number;
		charges?: number;
		base?: number;
		surge?: number;
		distance?: number;
		longDistance?: number;
		methodChanged?: boolean;
	};
	amount?: number;
	type?: string;
	orderType?: {
		type?: string;
		currentStatus?: string;
	}[];
	packingTime?: number;
	onlinePayment?: {
		paymentId?: string;
		orderId?: string;
		signature?: string;
		amount?: number;
		gatewayGST?: Number;
		gatewayCommission?: Number;
		netSettlement?: Number;
		status?: {
			status?: 'pending' | 'started' | 'completed' | 'captured' | 'failed';
			date?: Date;
			remarks?: string;
		}[];
	};
	codPayment?: {
		amount?: number;
		completed?: boolean;
		date?: Date;
		remarks?: string;
		by?: string | IUser;
	};
	order?: {
		mainAmt?: number;
		mainGst?: number;
		discount?: number; // percentage
		discountAmt?: number;
		netAmt?: number;
		gstAmt?: number;
		totalAmt?: number;
		tokenAmt?: number;
		codAmt?: number;
	};
	commission?: {
		netAmt?: number;
		gst?: number; // percentage
		gstAmt?: number;
		tcs?: number; // percentage
		tcsAmt?: number;
		totalAmt?: number;
		restaurantGst?: number;
		insurance?: number;
		insuredRestItemValue?: number;
		discountBy?: 'platform' | 'seller';
		gstExampted?: number;
		insuredItemValue?: number;
		insuredItemCommission?: number;
	};
	delivery?: {
		amount?: number;
		period?: number;
	};
	invoices?: {
		aekatra?: string;
		buyer?: string;
		delivery?: string;
	};
	refund?: {
		amount?: number;
		completed?: boolean;
		date?: Date;
		remarks?: string;
		by?: string | IUser;
	};
	weight?: number;
	length?: number;
	breadth?: number;
	height?: number;
	items?: IOrderItem[];
	rejectedItems?: IOrderItem[];
	buyerDetails?: {
		firstOrder?: boolean;

		gst?: string;
		name?: string;
		contact?: string;
		billingAddress?: {
			line1?: string;
			line2?: string;
			state?: string;
			city?: string;
			pincode?: string;
			location?: IPoint;
			googlePlaceId?: string;
			googleFormattedAddress?: string;
		};
		shippingAddress?: {
			line1?: string;
			line2?: string;
			state?: string;
			city?: string;
			pincode?: string;
			location?: IPoint;
			googlePlaceId?: string;
			googleFormattedAddress?: string;
		};
	};
	sellerDetails?: {
		gst?: string;
		name?: string;
		contact?: string;
		shopLocation?: IPoint;
		billingAddress?: {
			line1?: string;
			line2?: string;
			state?: string;
			city?: string;
			pincode?: string;
		};
	};
	currentStatus?: {
		status?: OrderStatus;
		date?: Date;
		by?: string;
		remarks?: string;
	};
	statusHistory?: {
		status?: OrderStatus;
		date?: Date;
		by?: string;
		remarks?: string;
	}[];
	placed?: { status?: boolean; date?: Date };
	couponDeduction?: number;
	couponProvidedBy?: string;

	accepted?: { status?: boolean; date?: Date };
	matured?: { status?: boolean; date?: Date };
	rejected?: { status?: boolean; date?: Date; remarks?: string };
	ready?: { status?: boolean; date?: Date };
	dispatched?: { status?: boolean; date?: Date };
	arrived?: { status?: boolean; date?: Date; location?: IPoint };
	riderAccepted?: { accepeted?: boolean; rejected: boolean; date?: Date };
	abandoned?: { status?: boolean; date?: Date };
	delivered?: { status?: boolean; date?: Date };
	notReceived?: { status?: boolean; date?: Date };
	returned?: { status?: boolean; date?: Date; remarks?: string; returnSettlement?: number };
	returnRequest?: {
		created?: { status?: boolean; date?: Date; reason?: string; remarks?: string };
		approved?: {
			status?: boolean;
			date?: Date;
			dueTo?: string;
			returnTo?: string;
			remarks?: string;
		};
		rejected?: { status?: boolean; date?: Date; dueTo?: string; remarks?: string };
	};
	returnPickup?: { status?: boolean; date?: Date };

	cancelled?: { status?: boolean; date?: Date; reason?: string; remarks?: string };
	rating?: {
		buyerToRider: {
			rating: number;
			remarks: string[];
		};
		buyerToSeller: {
			rating: number;
			remarks: string[];
		};
		riderToSeller: {
			rating: number;
			remarks: string[];
		};
		riderToBuyer: {
			rating: number;
			remarks: string[];
		};
		sellerToBuyer: {
			rating: number;
			remarks: string[];
		};
		sellerToRider: {
			rating: number;
			remarks: string[];
		};
		overAll: number;
	};
	distanceTraveled?: {
		riderToSeller: number;
		buyerToSeller: number;
		totalDistance: number;
	};
	walletUse?: number;
	rewardUse?: number;
	ETA?: Date; //Expected Delivery time
}

const OrderItem = new Schema({
	product: { type: Schema.Types.ObjectId, ref: 'NewProduct' },
	name: String,
	mainCategory: { type: Schema.Types.ObjectId, ref: 'Category' },
	returnPeriod: Number,
	itemType: String,
	unitPrice: Number,
	gstType: String,
	gst: Number,
	discount: Number,
	quantity: Number,
	insurance: Number,
	amounts: {
		main: Number,
		discount: Number,
		net: Number,
		gst: Number,
		total: Number
	},
	commission: {
		percentage: Number,
		gst: Number,
		tcs: Number,
		amounts: {
			net: Number,
			gst: Number,
			tcs: Number,
			total: Number
		}
	},
	variant: {
		_id: { type: Schema.Types.ObjectId },
		specifications: [
			{
				specification: { type: Schema.Types.ObjectId, ref: 'Specification' },
				value: { type: Schema.Types.ObjectId, ref: 'SpecificationValue' },
				specificationName: String,
				valueName: String
			}
		]
	},
	itemSet: {
		_id: { type: Schema.Types.ObjectId },
		variants: [
			{
				quantity: Number,
				specifications: [
					{
						specification: { type: Schema.Types.ObjectId, ref: 'Specification' },
						value: { type: Schema.Types.ObjectId, ref: 'SpecificationValue' },
						specificationName: String,
						valueName: String
					}
				]
			}
		]
	},
	insured: { default: false, type: Boolean },
	service: String,
	accepted: { type: Boolean, default: false },
	rejected: { type: Boolean, default: false }
});

const Order = new Schema(
	{
		invoiceNumber: Number,
		seller: { type: Schema.Types.ObjectId, ref: 'NewCustomer' },
		buyer: { type: Schema.Types.ObjectId, ref: 'Customer' },
		rider: { type: Schema.Types.ObjectId, ref: 'Rider' },
		processed: { type: Boolean, default: false },
		isGroupOrder: { type: Boolean, default: false },
		runningDuration: Number,
		groupOrder: { type: Schema.Types.ObjectId, ref: 'GroupOrder' },
		paymentMode: String,
		deliveryCharges: Number,
		selfDeliveryCharge: Number,
		buyerReceivable: Number,
		sellerPayable: Number,
		returnPeriod: Number,
		coupon: { type: Schema.Types.ObjectId, ref: 'Coupon' },
		deliveryMode: {
			display: String,
			details: String,
			value: Number,
			charges: Number,
			base: Number,
			surge: Number,
			distance: Number,
			longDistance: { type: Number, default: 0 },
			methodChanged: { type: Boolean, default: false }
		},
		packingTime: Number,
		onlinePayment: {
			paymentId: String,
			orderId: String,
			signature: String,
			amount: Number,
			gatewayGST: Number,
			gatewayCommission: Number,
			netSettlement: Number,
			status: [
				{
					status: String,
					date: Date,
					remarks: String
				}
			]
		},
		codPayment: {
			amount: Number,
			completed: Boolean,
			date: Date,
			remarks: String,
			by: { type: Schema.Types.ObjectId, ref: 'User' }
		},
		order: {
			mainAmt: Number,
			mainGst: Number,
			discount: Number, // percentage
			discountAmt: Number,
			netAmt: Number,
			gstAmt: Number,
			totalAmt: Number,
			tokenAmt: Number,
			codAmt: Number
		},
		freeDeliveryAmt: Number,
		commission: {
			netAmt: Number,
			gst: Number,
			gstAmt: Number,
			tcs: Number,
			tcsAmt: Number,
			totalAmt: Number,
			restaurantGst: {
				type: Number,
				default: 0
			},
			insurance: {
				type: Number,
				default: 0
			},
			gstExampted: {
				type: Number,
				default: 0
			},
			insuredRestItemValue: {
				type: Number,
				default: 0
			},
			discountBy: String,
			insuredItemValue: {
				type: Number,
				default: 0
			},
			insuredItemCommission: {
				type: Number,
				default: 0
			}
		},
		delivery: {
			amount: Number,
			period: Number
		},
		invoices: {
			aekatra: String,
			buyer: String,
			delivery: String
		},
		refund: {
			amount: Number,
			completed: Boolean,
			date: Date,
			remarks: String,
			by: { type: Schema.Types.ObjectId, ref: 'User' }
		},
		weight: Number,
		length: Number,
		breadth: Number,
		height: Number,
		items: { type: [OrderItem], default: [] },
		rejectedItems: { type: [OrderItem], default: [] },
		buyerDetails: {
			firstOrder: {
				type: Boolean,
				default: false
			},
			gst: String,
			name: String,
			contact: String,
			billingAddress: {
				line1: String,
				line2: String,
				state: String,
				city: String,
				pincode: String,
				location: Point,
				googlePlaceId: String,
				googleFormattedAddress: String
			},
			shippingAddress: {
				line1: String,
				line2: String,
				state: String,
				city: String,
				pincode: String,
				location: Point,
				googlePlaceId: String,
				googleFormattedAddress: String
			}
		},
		sellerDetails: {
			gst: String,
			name: String,
			contact: String,
			shopLocation: Point,
			billingAddress: {
				line1: String,
				line2: String,
				state: String,
				city: String,
				pincode: String
			}
		},
		currentStatus: {
			status: String,
			date: Date,
			by: { type: Schema.Types.ObjectId },
			remarks: String
		},
		statusHistory: [
			{
				status: String,
				date: Date,
				by: { type: Schema.Types.ObjectId },
				remarks: String
			}
		],
		couponProvidedBy: String,
		couponDeduction: { type: Number, defaultValue: 0 },
		placed: { status: Boolean, date: Date },
		accepted: { status: Boolean, date: Date },
		matured: { status: Boolean, date: Date },
		rejected: { status: Boolean, date: Date, remarks: String },
		sellerDispatched: { status: Boolean, date: Date },
		ready: { status: Boolean, date: Date },
		dispatched: { status: Boolean, date: Date },
		riderAccepted: { accepeted: Boolean, rejected: Boolean, date: Date },
		arrived: { status: Boolean, date: Date, location: Point },
		abandoned: { status: Boolean, date: Date },
		delivered: { status: Boolean, date: Date },
		notReceived: { status: Boolean, date: Date },
		returned: { status: Boolean, date: Date, remarks: String, returnSettlement: Number },
		rating: {
			buyerToSeller: {
				rating: Number,
				remarks: [String]
			},
			buyerToRider: {
				rating: Number,
				remarks: [String]
			},
			sellerToRider: {
				rating: Number,
				remarks: [String]
			},
			sellerToBuyer: {
				rating: Number,
				remarks: [String]
			},
			riderToBuyer: {
				rating: Number,
				remarks: [String]
			},
			riderToSeller: {
				rating: Number,
				remarks: [String]
			},
			overAll: Number
		},
		packingCharges: {
			type: Number,
			default: 0
		},
		returnRequest: {
			created: { status: Boolean, date: Date, reason: String, remarks: String },
			approved: {
				status: Boolean,
				date: Date,
				dueTo: String,
				returnTo: String,
				remarks: String
			},
			rejected: { status: Boolean, date: Date, dueTo: String, remarks: String }
		},
		returnPickup: { status: Boolean, date: Date },
		cancelled: { status: Boolean, date: Date, reason: String, remarks: String },
		distanceTraveled: {
			riderToSeller: { type: Number, default: 0 },
			buyerToSeller: { type: Number, default: 0 },
			totalDistance: { type: Number, default: 0 }
		},
		walletUse: { type: Number, default: 0 },
		rewardUse: { type: Number, default: 0 },
		ETA: { type: Date, default: null },
		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
	// rating: [
	//     {
	//         type: String,
	//         value: Number,
	//         notes: String,
	//     },
	// ],
);

Order.index(
	{
		status: 1,
		seller: 1,
		groupOrder: 1
	},
	{
		name: 'main'
	}
);

Order.index(
	{
		buyer: 1
	},
	{
		name: 'buyer'
	}
);

const OrderModel = model<IOrder>('Order', Order);
export default OrderModel;
