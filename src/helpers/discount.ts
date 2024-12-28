import { Types } from 'mongoose';
import { tf2 } from './number';
const ObjectId = Types.ObjectId;

export const calculateDiscount = (priceTable, total) => {
	const table = priceTable.sort((a, b) => a.price - b.price);
	if (table.length) {
		if (total >= table[0].price) {
			let index = 0;
			for (let [i, item] of table.entries()) {
				if (item.price > total) {
					break;
				}
				index = i;
			}
			if (total === table[index].price || index === table.length - 1) {
				return table[index].discount;
			}
			const baseDisc = table[index].discount;
			const totalAmtDiff = table[index + 1].price - table[index].price;
			const amtDiff = total - table[index].price;
			const discDiff = table[index + 1].discount - table[index].discount;
			const disc = (amtDiff * discDiff) / totalAmtDiff;
			const finalDisc = tf2(baseDisc + disc);
			return finalDisc > 0 ? finalDisc : 0;
		}
	}
	return 0;
};

export const buildCategoryTree = (categories) => {
	let categoryTree = [];
	categories.sort((a, b) => a.level - b.level);
	let randomArray = [];
	categories.map((element, index) => {
		if (element.level === 1) {
			let obj = {
				...element,
				expand: true,

				sub: []
			};
			categoryTree.push(obj);
		}
		if (element.level == 2) {
			let levelCate = element.level1;
			if (undefined !== element.level1) {
				let levelOneIndex = categoryTree.findIndex((e) => e._id.toString() == levelCate);
				if (levelOneIndex !== -1) {
					let checkHasSubCategory = categories.find(
						(cat) => cat?.level2?.toString() === element._id.toString()
					);
					categoryTree[levelOneIndex].sub.push({
						...element,
                        edit : false,
						canProductAdd: checkHasSubCategory ? false : true,
						sub: []
					});
				}
			} else {
				randomArray.push(element);
			}
		}
		if (element.level == 3) {
			let levelId = element.level1;
			let levelOneIndex = categoryTree.findIndex((e) => e._id.toString() == levelId);
			let level2Id = element.level2;
			if (levelOneIndex !== -1) {
				let levelTwoIndex = categoryTree[levelOneIndex].sub.findIndex(
					(e) => e._id.toString() == level2Id
				);
				if (levelTwoIndex !== -1) {
					let checkHasSubCategory = categories.find(
						(cat) => cat?.level3?.toString() === element._id.toString()
					);
					categoryTree[levelOneIndex].sub[levelTwoIndex].sub.push({
						...element,
						canProductAdd: checkHasSubCategory ? false : true,
						sub: [],
                        edit : false,
					});
				}
			}
		}
		if (element.level === 4) {
			let levelId = element.level1;
			let levelOneIndex = categoryTree.findIndex((e) => e._id.toString() == levelId);
			if (levelOneIndex !== -1) {
				let level2Id = element.level2;
				let levelTwoIndex = categoryTree[levelOneIndex].sub.findIndex(
					(e) => e._id.toString() == level2Id
				);
				if (levelTwoIndex !== -1) {
					let level3Id = element.level3;
					let level3Index = categoryTree[levelOneIndex].sub[levelTwoIndex].sub.findIndex(
						(e) => e._id.toString() == level3Id
					);

					if (level3Index !== -1) {
						categoryTree[levelOneIndex].sub[levelTwoIndex].sub[level3Index].sub.push({
							...element
						});
					}
				}
			}
		}
	});

	return categoryTree;
};

export const withCanProductAddCategoryTree = (categories) => {
	let categoryTree = [];
	categories.sort((a, b) => a.level - b.level);
	let randomArray = [];
	categories.map((element, index) => {
		if (element.level === 1) {
			let ojb = {
				...element,
				canProductAdd: false,
				sub: []
			};
			categoryTree.push(ojb);
		}
		if (element.level == 2) {
			let levelCate = element.level1;

			if (undefined !== element.level1) {
				let levelOneIndex = categoryTree.findIndex((e) => e._id.toString() == levelCate);

				let checkHasSubCategory = categories.find(
					(cat) => cat?.level2?.toString() === element._id.toString()
				);

				categoryTree[levelOneIndex].sub.push({
					...element,
					canProductAdd: checkHasSubCategory ? false : true,
					sub: []
				});
			} else {
				randomArray.push(element);
			}
		}
		if (element.level == 3) {
			let levelId = element.level1;
			let levelOneIndex = categoryTree.findIndex((e) => e._id.toString() == levelId);
			let level2Id = element.level2;
			let levelTwoIndex = categoryTree[levelOneIndex].sub.findIndex(
				(e) => e._id.toString() == level2Id
			);
			let checkHasSubCategory = categories.find(
				(cat) => cat?.level3?.toString() === element._id.toString()
			);
			categoryTree[levelOneIndex].sub[levelTwoIndex].sub.push({
				...element,
				sub: [],
				canProductAdd: checkHasSubCategory ? false : true
			});
		}
		if (element.level === 4) {
			let levelId = element.level1;
			let levelOneIndex = categoryTree.findIndex((e) => e._id.toString() == levelId);
			let level2Id = element.level2;
			let levelTwoIndex = categoryTree[levelOneIndex].sub.findIndex(
				(e) => e._id.toString() == level2Id
			);
			let level3Id = element.level3;
			let level3Index = categoryTree[levelOneIndex].sub[levelTwoIndex].sub.findIndex(
				(e) => e._id.toString() == level3Id
			);

			categoryTree[levelOneIndex].sub[levelTwoIndex].sub[level3Index].sub.push({
				...element,
				sub: [],
				canProductAdd: true
			});
		}
	});

	return categoryTree;
};

export const discountedAmount = (amt, disc) => tf2(amt - amt * 0.01 * (disc || 0));
