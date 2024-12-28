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
import { ISubscription } from './subscription';
import { ISellerCategory } from '../seller/seller-category';

export interface ISeller extends Document, CommonSchemaProps {
	contact?: string; //mobile Number
	contactPerson?: string; //owner
	name?: string; //username
	businessName?: string; //shopname
	avatar?: string; //url
	position?: number;
	shopPhotos?: { thumb: string; image: string }[];
	gst?: string;
	pan?: string;
	drugNumber?: string;
	aadharNumber?: string;
	kycType?: string; //buyer|seller
	register?: boolean; //
	premium?: boolean; //
	buyer?: boolean; //to determined buyer or not
	seller?: boolean; //to determined seller or not
	servicableLocations?: (string | ILocation)[]; //legacy field
	shopStatus?: 'open' | 'closed';
	registerStage?: string; //legacy
	kyc?: boolean; //complate or not
	kycStage?: string; //which stage pending kyc
	approved?: boolean; //approved from platform
	beneficiaryCreated?: boolean;
	kycDocument?: any; //url
	featured?: boolean; //
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
	averageDiscount?: number;
	location?: IPoint;
	shopLocation?: IPoint; //shoplocation
	fcmTokens?: string[]; //firebase push notification  identity
	sessions?: string[]; //past login
	sockets?: string[]; //
	otp?: number;
	email?: string;
	yearOfEstablishment?: number;
	shopName?: string;
	bankDetails?: {
		accountNumber?: string;
		ifsc?: string;
		benCode?: string;
		beneficiaryName?: string;
		bankName?: string;
		address1?: string;
		address2?: string;
		city?: string;
		state?: string;
		branch?: string;
		zip_code?: string;
		confirmAccountNumber?: string;
		Input_Only_Internal_Fund_Transfer_Account_No?: string;
		Delivery_Address1?: string;
		Delivery_Address2?: string;
		Delivery_City?: string;
		Delivery_State?: string;
		Delivery_Zip_Code?: string;
		PrintLocation?: string;
		CustomerID?: string;
		ifscNumber?: string;
		MailTo?: string;
		neft?: string;
		rtgs?: string;
		CHQ?: string;
		DD?: string;
		ifto?: string;
		FirstLinePrint?: string;
		imps?: string;
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
	parentCategory?: [string | ICategory];

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
	rating: {
		overAll: number;
		buyerCount: number;
		riderCount: number;
	};
	schedulerOff: boolean;
	averagePrice?: number;

	pureVeg?: boolean;
	sourceOfDiscovery: string[];
	contract?: string[];
	ownerWhatsapp?: string;
	whatsapp?: string;
	managerNumber?: string;
	managerEmail?: string;
	deliveryMode?: {
		platform?: {
			freeDeliveryAmount?: number;
		};
		selfdelivery?: {
			deliveryTime?: number;
			deliveryRadius?: number;
			deliveryCharges?: String;
			freeDeliveryAmount?: String;
		};
		takeaway?: String;
	};
	packingTime?: string;
	subscription?: string | ISubscription;
	deliveryCharge?: number;
	referral?: {
		mycode?: string;
		usedcode?: string;
		referredBy?: string;
	};
	referredDiscount?: number;
	orders?: {
		total?: number;
		returned?: number;
		delivered?: number;
		cancelled?: number;
		abandoned?: number;
		return_accepted: number;
		return_rejected: number;
		rejected?: number;
		partialAccepted?: number;
		not_received: number;
		return_pickup?: number;
		totalAmt?: number;
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
	productCategory?: ISellerCategory[];
}
const Seller = new Schema(
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
		pan: {
			type: String,
			default: null
		},
		premium: {
			type: Boolean,
			default: false
		},
		drugNumber: {
			type: String,
			default: null
		},
		featured: {
			type: Boolean,
			default: false
		},
		aadharNumber: {
			type: String,
			default: null
		},
		position: {
			type: Number
		},
		kycType: {
			type: String,
			default: null
		},
		register: {
			type: Boolean,
			default: false
		},
		// buyer: {
		// 	type: Boolean,
		// 	default: true
		// },
		// seller: {
		// 	type: Boolean,
		// 	default: false
		// },
		averageDiscount: {
			type: Number,
			default: 0
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
		beneficiaryCreated: {
			type: Boolean,
			default: false
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
		shopLocation: Point,
		sessions: { type: [String], default: [] },
		sockets: { type: [String], default: [] },
		fcmTokens: [String],
		otp: { type: Number, default: null },
		email: { type: String, default: null },
		yearOfEstablishment: { type: Number, default: null },
		shopName: { type: String, default: null },
		bankDetails: {
			accountNumber: {
				type: String,
				trim: true
			},
			ifsc: String,
			benCode: {
				type: String,
				trim: true
			},
			beneficiaryName: {
				type: String,
				trim: true
			},
			bankName: {
				type: String,
				trim: true
			},
			address1: {
				type: String,
				trim: true
			},
			address2: {
				type: String,
				trim: true
			},
			city: {
				type: String,
				trim: true
			},
			state: {
				type: String,
				trim: true
			},
			branch: {
				type: String,
				trim: true
			},
			zip_code: {
				type: String,
				trim: true
			},
			confirmAccountNumber: {
				type: String,
				trim: true
			},
			Input_Only_Internal_Fund_Transfer_Account_No: {
				type: String,
				trim: true
			},
			Delivery_Address1: {
				type: String,
				trim: true
			},
			Delivery_Address2: {
				type: String,
				trim: true
			},
			Delivery_City: {
				type: String,
				trim: true
			},
			Delivery_State: {
				type: String,
				trim: true
			},
			Delivery_Zip_Code: {
				type: String,
				trim: true
			},
			PrintLocation: {
				type: String,
				trim: true
			},
			CustomerID: {
				type: String,
				trim: true
			},
			ifscNumber: {
				type: String,
				trim: true
			},
			MailTo: {
				type: String,
				trim: true
			},
			neft: {
				type: String,
				trim: true
			},
			rtgs: {
				type: String,
				trim: true
			},
			CHQ: {
				type: String,
				trim: true
			},
			DD: {
				type: String,
				trim: true
			},
			ifto: {
				type: String,
				default: null,
				trim: true
			},
			FirstLinePrint: {
				type: String,
				trim: true
			},
			imps: {
				type: String,
				trim: true
			}
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
		schedulerInactiveTime: {
			type: Date,
			default: null
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

		minimumOrder: {
			type: Number
		},

		parentCategory: [
			{
				type: Schema.Types.ObjectId,
				ref: 'Category'
			}
		],
		sellerInvoiceNumber: { type: Number, default: 1 },
		pureVeg: Boolean,
		rating: {
			overAll: Number,
			buyerCount: Number,
			riderCount: Number
		}, // how to customer know about app

		sourceOfDiscovery: [String],
		contract: [
			{
				type: String,
				trim: true
			}
		],
		referral: {
			mycode: String,
			usedcode: String,
			referredBy: String
		},
		referredDiscount: Number,
		ownerWhatsapp: {
			type: String,
			trim: true,
			default: null
		},
		whatsapp: {
			type: String,
			trim: true,
			default: null
		},
		managerNumber: {
			type: String,
			trim: true
		},
		managerEmail: {
			type: String,
			trim: true
		},
		packingTime: {
			type: Number,
			trim: true,
			default: 10
		},
		deliveryMode: {
			platform: {
				freeDeliveryAmount: {
					type: Number
				}
			},
			selfdelivery: {
				deliveryTime: {
					type: Number
				},
				deliveryRadius: {
					type: Number
				},
				deliveryCharges: {
					type: Number
				},
				freeDeliveryAmount: {
					type: Number
				}
			},
			takeaway: {
				type: String,
				trim: true
			}
		},
		subscription: {
			type: Schema.Types.ObjectId,
			ref: 'Subscription'
		},

		deliveryCharge: {
			type: Number
		},
		orders: {
			total: {
				type: Number,
				default: 0
			},
			returned: {
				type: Number,
				default: 0
			},
			delivered: {
				type: Number,
				default: 0
			},
			cancelled: {
				type: Number,
				default: 0
			},
			not_received: {
				type: Number,
				default: 0
			},
			return_accepted: {
				type: Number,
				default: 0
			},
			return_rejected: {
				type: Number,
				default: 0
			},
			abandoned: {
				type: Number,
				default: 0
			},
			return_pickup: { type: Number, default: 0 }
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
			},
			updatedTime: Date,
			deliveredTime: Date,
			readTime: Date,
			sendTime: Date
		},

		...mongooseSchemaProps
	},
	{
		...mongooseSchemaOptions
	}
);

Seller.virtual('productCount', {
	ref: 'NewProduct',
	localField: 'productCategory._id',
	foreignField: 'leafCategory',
	justOne: false,
	count: true,
	options: {
		match: {
			status: 'active'
		}
	}
});

Seller.virtual('productCategory', {
	ref: 'SellerCategory',
	localField: '_id',
	foreignField: 'seller',
	justOne: false
});

Seller.index(
	{
		status: 1,
		contact: 1
	},
	{
		name: 'main'
	}
);

Seller.index(
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

Seller.index({
	shopLocation: '2dsphere'
});

Seller.virtual('runningOrder', {
	ref: 'GroupOrder',
	localField: '_id',
	foreignField: 'seller',
	justOne: true,
	match: { completed: false }
});

const SellerModel = model('NewCustomer', Seller);
export default SellerModel;
