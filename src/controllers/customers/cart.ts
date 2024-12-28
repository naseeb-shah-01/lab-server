import { model, Types } from 'mongoose';
import { deletePrivateProps } from '../../helpers/query';
import { throwError } from '../../helpers/throw-errors';
import { ICart } from '../../models/customer/cart';
import { ICustomer } from '../../models/customer/customer';
import { ISeller } from '../../models/customer/seller';
import { IOrder } from '../../models/order/order';
import { IPrice } from '../../models/seller/price';
import { IProduct } from '../../models/seller/product';
import { getCustomerCoupon } from './coupons';
import { setCustomerType } from './customer';
import { checkNextOrderRiderAvailable } from './order';
import { tf2 } from '../../helpers/number';
const Cart = model<ICart>('Cart');
const Customer = model<ICustomer>('Customer');
const Price = model<IPrice>('Price');
const ObjectId = Types.ObjectId;
const Order = model<IOrder>('Order');
const Seller = model<ISeller>('NewCustomer');
const NewProduct = model<IProduct>('NewProduct');

export const getCart = async (data, user) => {
	try {
		data.sellers = data?.sellers?.filter((e) => e != '');

		if (!data.sellers.length) return [];
		let seller = data.sellers.map((seller) => ObjectId(seller));
		let results = await Cart.aggregate([
			{
				$match: {
					buyer: ObjectId(user._id),
					status: 'active',
					seller: { $in: seller }
				}
			}
		]);

		let cartData = await NewProduct.populate(results, {
			path: 'product',
			select: {
				minPrice: 1,
				currentStock: 1,
				name: 1,
				description: 1,
				thumbImages: 1,
				minimumOrderQuantity: 1
			}
		});
		let cartRawData = await Seller.populate(cartData, {
			path: 'seller',
			select: { name: 1, businessName: 1, shopStatus: 1, priceTable: 1, deliveryMode: 1 }
		});
		let cart = [];
		let sellers: any = {};
		cartRawData.forEach((item: any) => {
			if (sellers[item?.seller?._id]) {
				sellers[item?.seller?._id]['products'] = [
					...sellers[item?.seller?._id]['products'],
					{ ...item.product._doc, itemType: item.itemType, quantity: item.quantity }
				];
			} else {
				sellers[item?.seller?._id] = {
					...item.seller._doc,

					products: [
						{ ...item?.product?._doc, itemType: item.itemType, quantity: item.quantity }
					]
				};
			}
		});
		let showScript = await checkNextOrderRiderAvailable();

		for (let x in sellers) {
			if (showScript) {
				let products = sellers[x].products;
				const freeDeliveryAmount =
					sellers[x].deliveryMode?.platform?.freeDeliveryAmount || 0;
				if (freeDeliveryAmount) {
					const total = products.reduce((accumulator, currentItem) => {
						return (
							accumulator + currentItem.minPrice.sellingPrice * currentItem.quantity
						);
					}, 0);

					let amtToGetFreeDelivery =
						tf2((freeDeliveryAmount - total) / freeDeliveryAmount) * 100;

					if (amtToGetFreeDelivery < 26 && amtToGetFreeDelivery > 0) {
						let amt = freeDeliveryAmount - total;

						let addCartString = `Get free delivery on order above ₹${amt} !`;
						sellers[x].addCartString = addCartString;
					} else if (amtToGetFreeDelivery <= 0) {
						let addCartString = `Congratulations! you get free delivery!`;
						sellers[x].addCartString = addCartString;
						sellers[x].icon = 'truck-fast';
						sellers[x].color = 'green';
					}
				}
			}

			cart.push(sellers[x]);
		}

		return cart;
	} catch (error) {
		throw error;
	}
};

export const addItemsToCart = async (data: ICart[], user) => {
	try {
		if (!data || !data.length) {
			throwError(400);
		}
		for (let item of data) {
			if (
				!item ||
				!item.product ||
				!item.seller ||
				!['set', 'single'].includes(item.itemType) ||
				(item.itemType === 'set' && !item.itemSet) ||
				!item.quantity
			) {
				throwError(400);
			}
		}
		for (let item of data) {
			deletePrivateProps(item);
			item.buyer = user._id;
			const existing = await Cart.findOne({
				status: 'active',

				buyer: user._id,
				itemType: item.itemType,
				product: item.product,
				...(item.itemType === 'set' ? { itemSet: item.itemSet } : {})
			});
			if (existing) {
				existing.quantity += item.quantity;
				await existing.save();
			} else {
				const newItem = new Cart(item);
				await newItem.save();
			}
		}
		setCustomerType(user._id, 'buyer');
		checkAndNotifyCartChange(user._id);
		return {};
	} catch (error) {
		throw error;
	}
};

export const updateItemsInCart = async (data: ICart[], user: any) => {
	try {
		if (!data || !data.length) {
			throwError(500);
		}
		for (let item of data) {
			if (
				!item ||
				!item.product ||
				!item.seller ||
				!['set', 'single'].includes(item.itemType) ||
				(item.itemType === 'set' && !item.itemSet) ||
				!(item.quantity >= 0)
			) {
				throwError(400);
			}
		}
		for (let item of data) {
			deletePrivateProps(item);
			if (await isOutOfStock(item.product as string, item.seller, item.quantity)) {
				throwError(409, "You've reached the max quantity for this item.");
			}
			const cartItem = await Cart.findOne({
				status: 'active',
				buyer: user._id,
				itemType: item.itemType,
				product: item.product,
				seller: item.seller,
				...(item.itemType === 'set' ? { itemSet: item.itemSet } : {})
			});
			delete item._id;
			if (cartItem) {
				if (item.quantity > 0) {
					await cartItem.updateOne({
						$set: item
					});
				} else {
					await cartItem.remove();
				}
			} else {
				if (item.quantity) {
					const newItem = new Cart({
						...item,
						buyer: user._id
					});
					await newItem.save();
				}
			}
		}
		checkAndNotifyCartChange(user._id);
		return {};
	} catch (error) {
		throw error;
	}
};

export const removeProductFromCart = async (id: string, user: any) => {
	try {
		await Cart.remove({
			buyer: user._id,
			product: id
		});
		checkAndNotifyCartChange(user._id);
		return {};
	} catch (error) {
		throw error;
	}
};

export const checkAndNotifyCartChange = async (id: string) => {
	let cart = await getBasicCart(id);
	const customer = await Customer.findById(id);
	if (customer) {
		for (let socket of customer.sockets || []) {
			global.io.to(socket).emit('cartUpdate', { cart });
		}
	}
};

export const getBasicCart = async (id: string) => {
	try {
		const cart = await Cart.find({
			buyer: id,
			status: 'active'
		});
		return cart;
	} catch (error) {
		console.error(error);
		return 0;
	}
};

const getOrderProductsByStatus = async (orderId, status) => {
	let arr = [];
	// get items from orderId
	const order = await Order.findById(orderId);

	const productIds = order.items.map((item) => item.product);

	const sellerProductsByStatus = (
		await NewProduct.find({
			_id: { $in: productIds },
			seller: order.seller,
			status
		}).select({ _id: 1 })
	).map((product) => String(product._id));

	arr = order.items.filter((orderItem) =>
		sellerProductsByStatus.includes(String(orderItem.product))
	);

	return { arr, seller: order.seller };
};

export const checkProductStatus = async (orderId, user) => {
	// Get order items that have been disabled by the seller
	let { arr } = await getOrderProductsByStatus(orderId, 'inactive');

	if (arr.length == 0) arr = null;
	else {
		arr = arr.map((item) => item.name);
	}

	return arr;
};

export const resetAndUpdateCart = async (orderId, user) => {
	let rollBackItems = [];
	try {
		// get active items from orderId
		let { arr: activeItems, seller } = await getOrderProductsByStatus(orderId, 'active');

		// resetting cart
		const cartItem = await Cart.find({
			buyer: user._id,
			seller: seller
		});

		for (let item of cartItem) {
			rollBackItems.push(item);
			item.delete();
		}

		// adding items to cart
		for (const item of activeItems) {
			if (await isOutOfStock(item.product as string, seller, item.quantity)) {
				throwError(409, "You've reached the max quantity for this item.");
			}
			if (item.quantity) {
				const newItem = new Cart({
					seller: seller,
					itemType: item.itemType,
					product: item.product,
					quantity: item.quantity,
					buyer: user._id
				});
				await newItem.save();
			}
		}

		// updating globally
		checkAndNotifyCartChange(user._id);
	} catch (error) {
		// reverting order details on transaction failure
		for (const item of rollBackItems) {
			const newItem = new Cart({
				seller: item.seller,
				itemType: item.itemType,
				product: item.product,
				quantity: item.quantity,
				buyer: user._id
			});
			await newItem.save();
		}
		throw error;
	}
};

function isOutOfStock(productId: string, sellerId: string | ISeller, quantity: number) {
	return new Promise(async (resolve, reject) => {
		try {
			const product = await NewProduct.findOne({
				_id: productId,
				seller: sellerId
			}).lean();
			if (!product?.currentStock) {
				resolve(false);
			} else if (product?.currentStock < quantity) {
				{
					resolve(true);
				}
			} else {
				resolve(false);
			}
		} catch (error) {
			reject(error);
		}
	});
}
