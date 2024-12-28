//  that file not in use
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

export interface ICustomer extends Document, CommonSchemaProps {
	contact?: string; //mobile Number
	contactPerson?: string; //owner
	name?: string; //username
	businessName?: string; //shopname
	avatar?: string; //url
	ownerWhatsapp?: string;
	whatsapp?: string;
	managerNumber?: string;
	managerEmail?: string;
	shopPhotos?: { thumb: string; image: string }[];
	gst?: string;
	deliveryMode?: {
		platform?: {
			deliveryCharges?: String;
		};
		selfdelivery?: {
			deliveryTime?: String;
			deliveryRadius?: String;
			deliveryCharges?: String;
			deliveryAmount?: String;
		};
		pickup?: String;
	};
	packingTime?: string;
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
	shopLocation?: IPoint; //shoplocation
	fcmTokens?: string[]; //firebase push notification  identity
	sessions?: string[]; //past login
	sockets?: string[]; //
	otp?: number;
	email?: string;
	yearOfEstablishment?: number;
	shopName?: string;

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
		bankAccountNumber?: string;
		reEnterBankAccountNumber?: string;
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
	productCategory?: {
		l1: string | ICategory;
		name?: string;
		level?: number;
		thumb?: string;
		isActive?: boolean;
		sub: {
			l2: string | ICategory;
			name?: string;
			level?: number;
			thumb?: string;
			isActive?: boolean;
			sub?: {
				l3: string | ICategory;
				name?: string;
				level?: number;
				thumb?: string;
				isActive?: boolean;
				sub?: {
					l4: string | ICategory;
					name?: string;
					level?: number;
					thumb?: string;
					isActive?: boolean;
				}[];
			}[];
		}[];
	}[];
	level4?: string[] | ICategory[];
	sellerInvoiceNumber?: number;
	subscription?: string | ISubscription;
	runningItems?: {
		product?: string | IProduct;
		itemType?: 'set' | 'single';
		variant?: string | IVariant;
		itemSet?: string | ISet;
		initialQty?: number;
		availableQty?: number;
	}[]; //legacy
	minimumOrder?: number;
	deliveryCharge?: number;
	contract?: string[];
}

const Customer = new Schema(
	{
		contact: {
			type: String,
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
			type: String,
			trim: true
		},
		deliveryMode: {
			platform: {
				deliveryAmount: {
					type: String,
					default: null
				}
			},
			selfdelivery: {
				deliveryTime: {
					type: String,
					default: null
				},
				deliveryRadius: {
					type: String,
					default: null
				},
				deliveryCharges: {
					type: String,
					default: null
				},
				deliveryAmount: {
					type: String,
					default: null
				}
			},
			pickup: {
				type: String,
				default: null,
				trim: true
			}
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
		schedulerInactiveTime: {
			type: Date,
			default: null
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
		subscription: {
			type: Schema.Types.ObjectId,
			ref: 'Subscription'
		},
		bankDetails: {
			accountNumber: String,
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
			bankAccountNumber: {
				type: String,
				trim: true
			},
			reEnterBankAccountNumber: {
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
		priceTable: [
			{
				price: Number,
				discount: Number
			}
		],

		minimumOrder: {
			type: Number
		},

		contract: [
			{
				type: String,
				trim: true
			}
		],
		deliveryCharge: {
			type: Number
		},
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

		parentCategory: {
			type: []
		},

		productCategory: [
			{
				name: String,
				level: Number,
				thumb: String,
				isActive: Boolean,
				l1: String,

				sub: [
					{
						name: String,
						level: Number,
						thumb: String,
						l2: String,
						isActive: Boolean,
						sub: [
							{
								name: String,
								level: Number,
								thumb: String,
								l3: String,
								isActive: Boolean,
								sub: [
									{
										name: String,
										level: Number,
										thumb: String,
										l4: String,
										isActive: Boolean
									}
								]
							}
						]
					}
				]
			}
		],
		rating: {
			overAll: Number,
			buyerCount: Number,
			sellerCount: Number
		},
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

const newCustomerModel = model('NewCustomer', Customer);
export default newCustomerModel;
