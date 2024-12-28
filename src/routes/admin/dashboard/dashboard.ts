import { Router } from 'express';
import { imposePenalty } from '../../../controllers/rider/rider';
import { Types, model } from 'mongoose';
import { ISeller } from '../../../models/customer/seller';
import {
	buyerRefund,
	changeSellerPosition,
	clearRiderSessions,
	createGoodArea,
	filterBuyer,
	getAreaByPincode,
	getDashboard,
	getGoodAreas,
	getSellerWithPositions,
	removeGoodAreaById,
	sendWhatsAppMessageFinal,
	updateCustomerDND
} from '../../../controllers/users/dashboard';
import * as XLSX from 'xlsx';

const Seller = model<ISeller>('NewCustomer');
const fs = require('fs');

import {
	allSettlementsBatch,
	beneficiaryExcel,
	createRiderSettlementUsingTimeBatch,
	createSellerSettlementUsingTimeBatch,
	deleteSettlement,
	getRiderLongDistanceDetails,
	monthPaidSettlement,
	riderBeneficiary,
	riderBeneficiaryExcel,
	riderSettlements,
	riderSettlementsExcel,
	salesReport,
	sellerBeneficiary,
	sellerProductExcel,
	sellerSettelement,
	sellerSettlements,
	sellerSettlementsExcel,
	settlementById,
	updateSellerSettlementPaidStatus
} from '../../../controllers/general/settlement';
import { throwError } from '../../../helpers/throw-errors';
// import { migrationScript } from '../../../helpers/script';
import {
	getReturnRequests,
	getOrderRequestDetail,
	penalty,
	codBlock
} from '../../../controllers/users/dashboard';
import { getSellerStats } from '../../../controllers/seller/stats';
import { getWeek } from 'date-fns';
import {
	getAllSmsCustomer,
	getCustomerSmsById,
	markCustomerSmsReadById
} from '../../../controllers/webhook/webhook';
import { reCalculateAmount } from '../../../controllers/seller/orders';
const router = Router();

router.get('/', (req, res) => {
	res.handle(getDashboard, [req.query, req.getUser()]);
});
router.post('/create-goodarea', (req, res) => {
	res.handle(createGoodArea, [req.body]);
});
router.delete('/removegoodarea/:id', (req, res) => {
	res.handle(removeGoodAreaById, [req.params.id]);
});
router.get('/goodareas', (req, res) => {
	res.handle(getGoodAreas, [req.query]);
});
router.get('/area/bypincode/:pincode', (req, res) => {
	res.handle(getAreaByPincode, [req.params.pincode]);
});
router.post('/approvepenalty/onrider', (req, res) => {
	res.handle(imposePenalty, [req.body]);
});
router.post('/rider-settlements', (req, res) => {
	res.handle(riderSettlements, [req.body]);
});
router.post('/seller-settlements', (req, res) => {
	res.handle(sellerSettlements, [req.body]);
});
router.get('/excel/seller-products/:id', async (req, res) => {
	try {
		const filename = `${req.params.id}_Products.xlsx`;
		const wbOpts = { bookType: 'xlsx', type: 'buffer' } as const;
		const result = await sellerProductExcel(req.params.id);
		XLSX.writeFile(result, filename, wbOpts);

		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
		res.setHeader('Content-Type', 'application/octet-stream');

		const stream = fs.createReadStream(filename);
		stream.pipe(res);

		res.on('finish', () => {
			fs.unlink(filename, (err) => {
				if (err) {
					console.error(err);
				} else {
				}
			});
		});
	} catch (err) {}
});
router.get('/excel/seller-settlements', async (req, res) => {
	try {
		const filename = `settlement_batch_${req.query.timeBatch}_${req.query.year}.xlsx`;
		const wbOpts = { bookType: 'xlsx', type: 'buffer' } as const;
		const result = await sellerSettlementsExcel(res, req.query);
		XLSX.writeFile(result, filename, wbOpts);

		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
		res.setHeader('Content-Type', 'application/octet-stream');

		const stream = fs.createReadStream(filename);
		stream.pipe(res);

		res.on('finish', () => {
			fs.unlink(filename, (err) => {
				if (err) {
					console.error(err);
				} else {
				}
			});
		});
	} catch (e) {
		console.error(e);
	}
});

router.get('/excel/rider-settlements', async (req, res) => {
	try {
		const filename = `settlement_${req.query?.timeBatch || getWeek(new Date())}.xlsx`;
		const wbOpts = { bookType: 'xlsx', type: 'buffer' } as const;
		let result = await riderSettlementsExcel(res, req.query);
		XLSX.writeFile(result, filename, wbOpts);
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
		res.setHeader('Content-Type', 'application/octet-stream');
		const stream = fs.createReadStream(filename);
		stream.pipe(res);
		res.on('finish', () => {
			fs.unlink(filename, (err) => {
				if (err) {
					console.error(err);
				} else {
				}
			});
		});
	} catch (e) {
		console.error(e);
	}
});
router.get('/excel/seller-beneficiary', async (req, res) => {
	try {
		const filename = `beni_${new Date().toISOString().replace(/:/g, '-')}.xlsx`;

		const wb_opts = { bookType: 'xlsx', type: 'buffer' } as const;
		let result = await beneficiaryExcel(res, req.body);
		XLSX.writeFile(result, filename, wb_opts);
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
		res.setHeader('Content-Type', 'application/octet-stream');
		const stream = fs.createReadStream(filename);
		stream.pipe(res);
		res.on('finish', () => {
			fs.unlink(filename, (err) => {
				if (err) {
					console.error(err);
				} else {
				}
			});
		});
	} catch (e) {
		console.error(e);
	}
});
router.get('/excel/rider-beneficiary', async (req, res) => {
	try {
		let filename = 'settlement.xlsx';
		const wb_opts = { bookType: 'xlsx', type: 'buffer' } as const;
		let result = await riderBeneficiaryExcel(res, req.query);
		XLSX.writeFile(result, filename, { ...wb_opts });
		const stream = fs.createReadStream(filename);
		stream.pipe(res);
		res.on('finish', () => {
			fs.unlink(filename, (err) => {
				if (err) {
					console.error(err);
				} else {
				}
			});
		});
	} catch (e) {
		console.error(e);
	}
});

router.post('/seller-settlement-order-report', async (req, res) => {
	let { seller, timeBatch, startDate, endDate } = req.body;
	try {
		seller = await Seller.findOne({ _id: seller._id });
		let filename = 'seller_settlement_order_report.xlsx';
		let result = await sellerSettelement(
			seller._id,
			true,
			seller?.deliveryMode?.platform.freeDeliveryAmount || Number.MAX_SAFE_INTEGER,
			timeBatch,
			startDate,
			endDate,
			seller.email,
			true
		);

		const wb_opts = { bookType: 'xlsx', type: 'buffer' } as const;
		XLSX.writeFile(result, filename, { ...wb_opts });
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
		res.setHeader('Content-Type', 'application/octet-stream');
		const stream = fs.createReadStream(filename);
		stream.pipe(res);
		res.on('finish', () => {
			fs.unlink(filename, (err) => {
				if (err) {
					console.error(err);
				} else {
				}
			});
		});
	} catch (e) {
		console.error(e);
	}
});

router.post('/rider-beneficiary', async (req, res) => {
	res.handle(riderBeneficiary, [req.body]);
});

router.post('/seller-beneficiary', async (req, res) => {
	res.handle(sellerBeneficiary, [req.body]);
});
router.post('/create-seller-settlement', async (req, res) => {
	res.handle(createSellerSettlementUsingTimeBatch, [req.body]);
});
router.post('/create-rider-settlement', async (req, res) => {
	res.handle(createRiderSettlementUsingTimeBatch, [req.body]);
});

router.post('/return-reject', (req, res) => {
	res.handle(getReturnRequests, [req.body]);
});
router.get('/return-order/:id', (req, res) => {
	res.handle(getOrderRequestDetail, [req.params.id]);
});

router.post('/impose-penalty', (req, res) => {
	res.handle(penalty, [req.body, req.getUser()]);
});

router.post('/cod-block', (req, res) => {
	res.handle(codBlock, [req.body, req.getUser()]);
});

router.post('/buyer-refund', (req, res) => {
	res.handle(buyerRefund, [req.body, req.getUser()]);
});
router.post('/getstats', (req, res) => {
	res.handle(getSellerStats, [req.query, req.body]);
});
router.get('/excel/sales-report', async (req, res) => {
	try {
		let filename = 'sales.xlsx';
		const wb_opts = { bookType: 'xlsx', type: 'buffer' } as const;
		let result = await salesReport(req.query);
		XLSX.writeFile(result, filename, { ...wb_opts });
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
		res.setHeader('Content-Type', 'application/octet-stream');
		const stream = fs.createReadStream(filename);
		stream.pipe(res);
		res.on('finish', () => {
			fs.unlink(filename, (err) => {
				if (err) {
					console.error(err);
				} else {
				}
			});
		});
	} catch (e) {
		console.error(e);
	}
});

router.post('/filter-buyer', (req, res) => {
	res.handle(filterBuyer, [req.body, req.getUser()]);
});

router.put('/paid/:id/:status', (req, res) => {
	res.handle(updateSellerSettlementPaidStatus, [req.params.id, req.params.status, req.getUser()]);
});
router.get('/whatsapp/customers', (req, res) => {
	res.handle(getAllSmsCustomer, [req.query]);
});
router.get('/whatsapp/customers/:id', (req, res) => {
	res.handle(getCustomerSmsById, [req.params.id]);
});
router.put('/whatsapp/customers/read/:id/:status', (req, res) => {
	res.handle(markCustomerSmsReadById, [req.params.id, req.params.status]);
});

router.put('/DND/:id/:status', (req, res) => {
	res.handle(updateCustomerDND, [req.params.id, req.params.status, req.getUser()]);
});

router.post('/order-recalculation', (req, res) => {
	res.handle(reCalculateAmount, [req.body, req.getUser()]);
});
router.get('/all-settlements-batch', (req, res) => {
	res.handle(allSettlementsBatch, [req.query]);
});
router.get('/settlement-id/:id', (req, res) => {
	res.handle(settlementById, [req.params.id]);
});
router.delete('/settlement-delete/:id', (req, res) => {
	res.handle(deleteSettlement, [req.params.id]);
});
router.get('/seller-position/:id', (req, res) => {
	res.handle(getSellerWithPositions, [req.params.id]);
});
router.post('/change-seller-position', (req, res) => {
	res.handle(changeSellerPosition, [req.body]);
});
router.get('/clear-rider-sessions/:id', (req, res) => {
	res.handle(clearRiderSessions, [req.params.id]);
});
router.get('/rider-long-distance-excel', async (req, res) => {
	const filename = `settlement_batch_${req.query.timeBatch}_${req.query.year}.xlsx`;
	const wbOpts = { bookType: 'xlsx', type: 'buffer' } as const;
	const result = await getRiderLongDistanceDetails({});
	XLSX.writeFile(result, filename, wbOpts);

	res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
	res.setHeader('Content-Type', 'application/octet-stream');

	const stream = fs.createReadStream(filename);
	stream.pipe(res);

	res.on('finish', () => {
		fs.unlink(filename, (err) => {
			if (err) {
				console.error(err);
			} else {
			}
		});
	});
});
router.get('/monthly-seller-payment-excel', async (req, res) => {
	const filename = `Payment_${req.query.month || new Date().getMonth()}_${req.query.year}.xlsx`;
	const wbOpts = { bookType: 'xlsx', type: 'buffer' } as const;
	const result = await monthPaidSettlement({});
	XLSX.writeFile(result, filename, wbOpts);

	res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
	res.setHeader('Content-Type', 'application/octet-stream');

	const stream = fs.createReadStream(filename);
	stream.pipe(res);

	res.on('finish', () => {
		fs.unlink(filename, (err) => {
			if (err) {
				console.error(err);
			} else {
			}
		});
	});
});
export default router;
