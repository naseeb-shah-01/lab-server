// const bulidCategoryTree = (categories) => {
// 	let categoryTree = [];
// 	categories.sort((a, b) => a.level - b.level);
// 	categories.map((element) => {
// 		if (element.level === 1) {
// 			let ojb = {
// 				...element,
// 				sub: []
// 			};
// 			categoryTree.push(ojb);
// 		}
// 		if (element.level == 2) {
// 			let levelCate = element.level1;
// 			let levelOneIndex = categoryTree.findIndex((e) => e._id == levelCate);
// 			categoryTree[levelOneIndex].sub.push({
// 				...element,
// 				sub: []
// 			});
// 		}
// 		if (element.level == 3) {
// 			let levelId = element.level1;
// 			let levelOneIndex = categoryTree.findIndex((e) => e._id == levelId);
// 			let level2Id = element.level2;
// 			let levelTwoIndex = categoryTree[levelOneIndex].sub.findIndex((e) => e._id == level2Id);
// 			;
// 			categoryTree[levelOneIndex].sub[levelTwoIndex].sub.push({
// 				...element,
// 				sub: []
// 			});
// 		}
// 		if (element.level === 4) {
// 			let levelId = element.level1;
// 			let levelOneIndex = categoryTree.findIndex((e) => e._id == levelId);
// 			let level2Id = element.level2;
// 			let levelTwoIndex = categoryTree[levelOneIndex].sub.findIndex((e) => e._id == level2Id);
// 			let level3Id = element.level3;
// 			let level3Index = categoryTree[levelOneIndex].sub[levelTwoIndex].sub.findIndex(
// 				(e) => e._id === level3Id
// 			);
// 			categoryTree[levelOneIndex].sub[levelTwoIndex].sub[level3Index].sub.push({
// 				...element,
// 				sub: []
// 			});
// 		}
// 	});
// 	return categoryTree;
// };
// export default bulidCategoryTree;
