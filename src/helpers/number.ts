export const tf2 = (input: any) => {
	return parseFloat(parseFloat(input).toFixed(2));
};
export const tf0 = (input: any) => {
	return parseFloat(parseFloat(input).toFixed(0));
};

export const formatRupee = (amount, symbol = true, space = false) => {
	let decimal = '';
	amount = amount || 0;
	if (amount % 1 > 0) {
		decimal =
			'.' +
			tf2(amount % 1)
				.toString()
				.split('.')[1]
				.slice(0, 2);
		amount = parseInt(amount);
	}
	amount = amount.toString();
	var lastThree = amount.substring(amount.length - 3);
	var otherNumbers = amount.substring(0, amount.length - 3);
	if (otherNumbers != '') lastThree = ',' + lastThree;
	let res = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
	return (symbol ? '\u20B9' : '') + (space ? ' ' : '') + res + decimal;
};

export const shortNumber = (value: number) => {
	if (value <= 999) {
		return value;
	} else if (value > 999 && value <= 99999) {
		return `${formatRupee(Math.floor(value * 100) / 100, false)}`;
	} else if (value > 99999 && value <= 9999999) {
		return `${Math.floor(value / 1000) / 100}L`;
	} else if (value > 9999999) {
		return `${Math.floor(value / 100000) / 100}Cr`;
	}
};
