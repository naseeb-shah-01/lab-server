import { model, Document, Schema } from 'mongoose';
import { ICategory } from '../category/category';
import {
	CommonSchemaProps,
	mongooseSchemaProps,
	mongooseSchemaOptions
} from '../common-schema-props';
import { IProduct, ISet, IVariant } from '../seller/product';
import { ILocation } from '../seller/location';
import { IPoint, Point } from '../locations/geoJson';

export interface ICustomer extends Document, CommonSchemaProps {
	contact?: string; //mobile Number
	contactPerson?: string; //owner
	name?: string; //username
	businessName?: string; //shopname
	avatar?: string; //url
	codBlock?: number;
	shopPhotos?: { thumb: string; image: string }[];
	gst?: string;
	kycType?: string; //buyer|seller
	register?: boolean; //Plat
	buyer?: boolean; //to determined buyer or not
	seller?: boolean; //to determined seller or not
	servicableLocations?: (string | ILocation)[]; //legacy field
	shopStatus?: 'open' | 'closed';
	registerStage?: string; //legacy
	kyc?: boolean; //complate or not
	kycStage?: string; //which stage pending kyc
	approved?: boolean; //approved from platform
	kycDocument?: any; //url
	addresses?: {
		billing?: boolean;
		primary?: boolean;
		line1?: string;
		line2?: string;
		state?: string;
		city?: string;
		pincode?: string;
		location?: IPoint;
		googlePlaceId?: string; //shop place id provided by googledatabase
		googleFormattedAddress?: string;
	}[];
	location?: IPoint;
	latestLocation?: IPoint;
	shopLocation?: IPoint; //shoplocation
	fcmTokens?: string[]; //firebase push notification  identity
	sessions?: string[]; //past login
	sockets?: string[];

	rewardBalance?: number;
	balance?: number;
	walletDiscountPercent?: number;
	otp?: number;
	email?: string;
	yearOfEstablishment?: number;
	shopName?: string;
	bankDetails?: {
		accountNumber?: string;
		ifsc?: string;
	};
	vacation?: {
		startDate?: {
			date?: number;
			month?: string;
		};
		endDate?: {
			date?: number;
			month?: string;
		};
	};
	schedulerInactiveTime?: Date;
	shopTiming?: {
		sunday?: {
			startTime?: string;
			endTime?: string;
		}[];
		monday?: {
			startTime?: string;
			endTime?: string;
		}[];
		tuesday?: {
			startTime?: string;
			endTime?: string;
		}[];
		wednesday?: {
			startTime?: string;
			endTime?: string;
		}[];
		thursday?: {
			startTime?: string;
			endTime?: string;
		}[];
		friday?: {
			startTime?: string;
			endTime?: string;
		}[];
		saturday?: {
			startTime?: string;
			endTime?: string;
		}[];
	};
	priceTable?: {
		price?: number;
		discount?: number;
	}[];
	categories?: {
		l1: string | ICategory;
		sub: {
			l2: string | ICategory;
			sub: {
				l3: string | ICategory;
				sub: (string | ICategory)[];
			}[];
		}[];
	}[];
	level4?: string[] | ICategory[];
	sellerInvoiceNumber?: number;
	runningItems?: {
		product?: string | IProduct;
		itemType?: 'set' | 'single';
		variant?: string | IVariant;
		itemSet?: string | ISet;
		initialQty?: number;
		availableQty?: number;
	}[]; //legacy
	minimumOrder?: number;
	inelegibleCoupons?: string[];
	appliedCoupon?: string;
	sellerSelected?: string;
	walletUsed?: boolean;
	sourceOfDiscovery: string[];
	orderCount?: {
		total?: number;
		delivery?: number;
		cancel?: number;
		pending?: number;
	};

	referral?: {
		mycode?: string;
		limit?: number;
		count?: number;
		usedcode?: string;
	};

	whatsAppSmsCount?: {
		lastTemplateType: string;
		marketing: number;
		utility: number;
		updatedTime: Date;
		sendTime?: Date;
		deliveredTime?: Date;
		readTime?: Date;
		sentCount?: number;
		readCount?: number;
		deliveredCount?: number;
	};
	DND?: boolean;
	deviceInfo?: {
		platform?: string;
		version?: string;
	}[];
}

const Customer = new Schema(
	{
		contact: {
			type: String,
			required: true,
			trim: true
		},
		contactPerson: {
			type: String,
			trim: true
		},
		name: {
			type: String,
			trim: true
		},
		businessName: {
			type: String,
			trim: true
		},
		avatar: {
			type: String,
			default: null
		},
		shopPhotos: {
			type: [{ image: String, thumb: String }],
			default: []
		},
		gst: {
			type: String,
			default: null
		},
		kycType: {
			type: String,
			default: null
		},
		register: {
			type: Boolean,
			default: false
		},
		walletUsed: {
			type: Boolean,
			default: false
		},
		codBlock: Number,
		buyer: {
			type: Boolean,
			default: true
		},
		seller: {
			type: Boolean,
			default: false
		},
		servicableLocations: [
			{
				type: Schema.Types.ObjectId,
				ref: 'Location'
			}
		],
		shopStatus: {
			type: String,
			default: 'closed'
		},
		registerStage: {
			type: String,
			default: null
		},
		schedulerInactiveTime: {
			type: Date,
			default: null
		},
		kyc: {
			type: Boolean,
			default: false
		},
		kycStage: {
			type: String,
			default: null
		},
		approved: {
			type: Boolean,
			default: false
		},
		kycDocument: {
			type: Schema.Types.Mixed
		},
		addresses: [
			{
				billing: Boolean,
				primary: Boolean,
				line1: String,
				line2: String,
				state: String,
				city: String,
				pincode: String,
				location: Point,
				googlePlaceId: String,
				googleFormattedAddress: String
			}
		],
		location: Point,
		latestLocation: Point,
		shopLocation: Point,
		sessions: { type: [String], default: [] },
		sockets: { type: [String], default: [] },
		fcmTokens: [String],

		rewardBalance: { type: Number, default: 0 },
		balance: { type: Number, default: 0 },
		walletDiscountPercent: { type: Number, default: null },
		otp: { type: Number, default: null },
		email: { type: String, default: null },
		yearOfEstablishment: { type: Number, default: null },
		shopName: { type: String, default: null },
		bankDetails: {
			accountNumber: String,
			ifsc: String
		},
		vacation: {
			startDate: {
				date: Number,
				month: String
			},
			endDate: {
				date: Number,
				month: String
			}
		},
		shopTiming: {
			sunday: [
				{
					startTime: String,
					endTime: String
				}
			],
			monday: [
				{
					startTime: String,
					endTime: String
				}
			],
			tuesday: [
				{
					startTime: String,
					endTime: String
				}
			],
			wednesday: [
				{
					startTime: String,
					endTime: String
				}
			],
			thursday: [
				{
					startTime: String,
					endTime: String
				}
			],
			friday: [
				{
					startTime: String,
					endTime: String
				}
			],
			saturday: [
				{
					startTime: String,
					endTime: String
				}
			]
		},
		priceTable: [
			{
				price: Number,
				discount: Number
			}
		],
		categories: {
			type: [
				{
					l1: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
					sub: {
						type: [
							{
								l2: {
									type: Schema.Types.ObjectId,
									ref: 'Category',
									required: true
								},
								sub: {
									type: [
										{
											l3: {
												type: Schema.Types.ObjectId,
												ref: 'Category',
												required: true
											},
											sub: {
												type: [
													{
														type: Schema.Types.ObjectId,
														ref: 'Category',
														required: true
													}
												],
												validate: [
													(val) => val && val.length > 0,
													'{PATH} requires at least one element.'
												]
											}
										}
									],
									validate: [
										(val) => val && val.length > 0,
										'{PATH} requires at least one element.'
									]
								}
							}
						],
						validate: [
							(val) => val && val.length > 0,
							'{PATH} requires at least one element.'
						]
					}
				}
			]
		},
		level4: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
		sellerInvoiceNumber: { type: Number, default: 1 },
		runningItems: [
			{
				product: { type: Schema.Types.ObjectId, ref: 'Product' },
				itemType: String,
				variant: Schema.Types.ObjectId,
				itemSet: Schema.Types.ObjectId,
				initialQty: Number,
				availableQty: Number
			}
		],
		minimumOrder: {
			type: Number
		},
		inelegibleCoupons: { type: [Schema.Types.ObjectId], default: [] },
		appliedCoupon: { type: String },
		sellerSelected: { type: String },
		// how to customer  discover app
		sourceOfDiscovery: [String],

		// order Details,
		orderCount: {
			total: Number,
			delivery: Number,
			cancel: Number,
			pending: Number
		},
		referral: {
			mycode: String,
			limit: {
				default: 5,
				type: Number
			},
			count: {
				default: 0,
				type: Number
			},
			usedcode: String
		},

		whatsAppSmsCount: {
			lastTemplateType: String,
			marketing: {
				default: 0,
				type: Number
			},
			utility: {
				default: 0,
				type: Number
			},
			updatedTime: Date,
			deliveredTime: Date,
			readTime: Date,
			sendTime: Date,
			sentCount: {
				default: 0,
				type: Number
			},
			readCount: {
				default: 0,
				type: Number
			},
			deliveredCount: {
				default: 0,
				type: Number
			}
		},
		DND: {
			type: Boolean,
			default: false
		},
		deviceInfo: [
			{
				platform: String,
				version: String
			}
		],
		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

Customer.index(
	{
		status: 1,
		contact: 1
	},
	{
		name: 'main'
	}
);

Customer.index(
	{
		contact: 'text',
		businessName: 'text'
	},
	{
		name: 'search',
		collation: {
			locale: 'simple'
		}
	}
);

Customer.index({
	shopLocation: '2dsphere'
});

Customer.virtual('runningOrder', {
	ref: 'GroupOrder',
	localField: '_id',
	foreignField: 'seller',
	justOne: true,
	match: { completed: false }
});

const CustomerModel = model<ICustomer>('Customer', Customer);
export default CustomerModel;
