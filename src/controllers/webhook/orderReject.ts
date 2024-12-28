import { model, Types } from 'mongoose';
import { IOrder } from '../../models/order/order';
import { IProduct } from '../../models/seller/product';
import config from '../../../config.json';
import axios from 'axios';
import { IWhatsapp } from '../../models/whatsapp/whatsappMessage';
import { ICustomer } from '../../models/customer/customer';
import { ISeller } from '../../models/customer/seller';

const Order = model<IOrder>('Order');
const NewProduct = model<IProduct>('NewProduct');
const WhatsApp = model<IWhatsapp>('Whatsapp');
const Customer = model<ICustomer>('Customer');
const ObjectId = Types.ObjectId;
const Seller = model<ISeller>('NewCustomer');

const headers = {
	Authorization: `Bearer ${config.whatsappApiToken}`,
	'Content-Type': 'application/json'
};

export const sendAlternateShopOption = async (id: string) => {
	try {
		const rejectedOrder: any = await Order.findById({
			_id: id
		});

		if (rejectedOrder.rejected.status === true) {
			searchRejectedProducts(
				rejectedOrder.items,
				rejectedOrder.seller,
				rejectedOrder.buyerDetails.contact
			);
		} else if (rejectedOrder.rejectedItems.length > 0) {
			searchRejectedProducts(
				rejectedOrder.items,
				rejectedOrder.seller,
				rejectedOrder.buyerDetails.contact
			);
		}
	} catch (error) {
		console.error(error);
	}
};

// export const searchRejectedProducts = async (items: any, sellerId: any, contact: any) => {
// 	try {
// 		let resultsArray = [];
// 		for (const item of items) {
// 			// Validate product name
// 			if (!item.name || typeof item.name !== 'string') {
// 				console.log('Invalid product name:', item.name);
// 				continue;
// 			}

// 			const search = `\"${item.name}\"`; // Search for each product individually
// 			const results = await NewProduct.find({
// 				$text: { $search: search },
// 				seller: { $nin: [sellerId] }, // Exclude the sellerId
// 				status: 'active'
// 				// ...filter.product
// 			})
// 				.populate('seller') // Populate the seller field
// 				.limit(1); // Limit the results to 2 products

// 			// Check if any products were found
// 			if (results.length === 0) {
// 				console.log('No products found for:', item.name);
// 				continue;
// 			}

// 			// Add the results to the results array
// 			resultsArray.push(...results);
// 		}

// 		// Limit the results array to the first 4 products
// 		resultsArray = resultsArray.slice(0, 4);

// 		console.log(`Search results:`, resultsArray);
// 		if (resultsArray.length) {
// 			sendMessageOfAlternativeShops(resultsArray, contact);
// 		}
// 	} catch (error) {
// 		console.error(error);
// 	}
// };

export const sendMessageOfAlternativeShops = async (resultsArray, buyerContact) => {
	try {
		let productNames = resultsArray.map((product) => product.name);
		let sentence = productNames.join(', ');
		const seller: any = Seller.findById(ObjectId(resultsArray[0].seller));
		const requestData = {
			messaging_product: 'whatsapp',
			recipient_type: 'individual',
			to: buyerContact,
			type: 'template',
			template: {
				name: 'alternate_shops_order_reject',
				language: {
					code: 'en'
				},
				components: [
					{
						type: 'body',
						parameters: [
							{
								type: 'text',
								text: `Shop Name : ${seller.businessName}`
							},
							{
								type: 'text',
								text: `Products : ${sentence}`
							}
						]
					},
					{
						type: 'button',
						sub_type: 'url',
						index: '0',
						parameters: [
							{
								type: 'text',
								text: `seller/${seller._id}`
							}
						]
					}
				]
			}
		};

		try {
			const response: any = await axios.post(
				'https://graph.facebook.com/v17.0/101557882761538/messages',
				requestData,
				{ headers }
			);

			const newMessage: any = {
				reply: requestData?.template?.name,
				sentTime: new Date()
			};

			const whatsappCustomer = await WhatsApp.findOne({ contact: buyerContact });
			const customer = await Customer.findOne({ contact: buyerContact });

			let updateObject = {
				'whatsAppSmsCount.updatedTime': new Date(),
				'whatsAppSmsCount.lastTemplateType': requestData?.template?.name
			};

			updateObject['whatsAppSmsCount.utility'] = customer.whatsAppSmsCount.utility + 1;

			const x = await Customer.updateOne(
				{ _id: customer._id },
				{
					$set: updateObject
				},
				{ upsert: true }
			);

			if (response.status == '200') {
				whatsappCustomer.message.push(newMessage);
				await whatsappCustomer.save();

				return newMessage;
			}
		} catch (error) {
			console.error('Error in sending Message', error);
		}
	} catch (error) {
		console.error(error);
	}
};
const searchRejectedProducts = async (items: any, sellerId: any, contact: any) => {
	try {
		let allResults: any = []; // Array to store all results

		for (const item of items) {
			const search = item.name; // Search for each product individually
			const results = await NewProduct.aggregate([
				{
					$search: {
						index: 'newproducts',
						compound: {
							must: [
								{
									text: {
										query: search,
										path: 'name',
										score: {
											boost: {
												value: 5
											}
										},
										fuzzy: {
											maxEdits: 1,
											prefixLength: 2
										}
									}
								}
							],
							should: [
								{
									text: {
										query: search,
										path: 'description',
										fuzzy: {
											maxEdits: 1,
											prefixLength: 2
										},
										score: {
											boost: {
												value: 2
											}
										}
									}
								}
							]
						}
					}
				},
				{
					$match: {
						seller: { $nin: [ObjectId(sellerId)] }, // Exclude the sellerId
						status: 'active',
						shopStatus: 'open'
					}
				}
			]).limit(1);

			allResults.push(results); // Add the results to the allResults array
		}
		if (allResults.length) {
			allResults = allResults.flat();
			sendMessageOfAlternativeShops(allResults, contact);
		}
	} catch (error) {
		console.error(error);
	}
};
