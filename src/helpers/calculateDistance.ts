import { IRider } from '../models/rider/rider';
import { IOrder } from '../models/order/order';
import { model } from 'mongoose';
import { minDistance } from './haversineDistance';
const Rider = model<IRider>('Rider');
const Order = model<IOrder>('Order');
import config from '../../config.json';
import axios from 'axios';
import { tf2 } from './number';
import { orderRating } from '../controllers/buyer/orders';

export const calculateDistance = async (riderId: string) => {
	const rider = await Rider.findById(riderId);
	const ArrayOrderId = rider.activeOrders;
	const riderLocation = rider.latestLocation;

	let distance = 2;
	let prev = [];
	for (let i = 0; i < ArrayOrderId.length; i++) {
		const order = await Order.findById(ArrayOrderId[i]);
		let [la, lo] = order.buyerDetails.shippingAddress.location.coordinates;
		let [la0, lo0] = order.sellerDetails.shopLocation.coordinates;
		let [la1, lo1] = riderLocation.coordinates;
		let [la2, lo2] = prev;
		if (i == 0) {
			distance += minDistance(la0, la1, lo0, lo1) + minDistance(la, la0, lo, lo0);
		} else {
			distance += minDistance(la2, la0, lo2, lo0) + minDistance(la0, la, lo0, lo);
		}
		prev = [la, lo];
	}
	return distance;
};

export const calculateDistanceTwo = (
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number
): number => {
	const R: number = 6371; // Earth's radius in kilometers
	const phi1: number = lat1 * (Math.PI / 180);
	const phi2: number = lat2 * (Math.PI / 180);
	const deltaPhi: number = (lat2 - lat1) * (Math.PI / 180);
	const deltaLambda: number = (lon2 - lon1) * (Math.PI / 180);

	const a: number =
		Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
		Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

	const c: number = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	let distance: number = R * c;
	distance = +distance.toFixed(2);
	return distance;
};

export const getDistanceWithGoogle = async (origins, destinations) => {
	try {
		const apiKey = config.googleDistanceApiKey;
		const hasMultipleOriginsDestinations = origins.length === 4 && destinations.length === 4;
		const formattedOrigins = formatCoordinates(origins);
		const formattedDestinations = formatCoordinates(destinations);

		const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${formattedOrigins}&destinations=${formattedDestinations}&units=imperial&key=${"AIzaSyBX95UP_7JsSTKZavZEX-RWnliA3fAwI0Q"}`;
		const response = await axios.get(url);
		const data = response.data;

		if (!hasMultipleOriginsDestinations) {
			const distanceAB = data.rows[0].elements[0].distance.value;
			const durationAB = data.rows[0].elements[0].duration.text;

			return {
				distance: distanceAB / 1000,
				duration: durationAB
			};
		} else {
			const distanceAC = data.rows[0].elements[0].distance.value;
			const durationAC = data.rows[0].elements[0].duration.text;
			const distanceBD = data.rows[1].elements[1].distance.value;
			const durationBD = data.rows[1].elements[1].duration.text;

			return {
				distance1: distanceAC / 1000,
				distance2: distanceBD / 1000,
				duration1: durationAC,
				duration2: durationBD
			};
		}
	} catch (error) {
		console.log(error);
	}
};

const formatCoordinates = (coordinates) => {
	let formattedString = '';
	coordinates.forEach((coordinate, index) => {
		if (index % 2 === 1 && index !== coordinates.length - 1) {
			formattedString += coordinate + '|';
		} else if (index % 2 === 0 && index !== coordinates.length - 1) {
			formattedString += coordinate + ',';
		} else {
			formattedString += coordinate;
		}
	});
	return formattedString;
};

export const calculateNewRating = (oldRating: number, currentRating: number, oldCount): number => {
	// Return the new computed rating

	let totalOldRating = oldRating * oldCount;
	let newRating = (totalOldRating + currentRating) / (oldCount + 1);

	return +newRating.toFixed(1);
};
function haversineDistance(point1, point2) {
    const R = 6371; // Earth radius in km
    const lat1 = point1.latitude * (Math.PI / 180); // Convert latitude to radians
    const lon1 = point1.longitude * (Math.PI / 180); // Convert longitude to radians
    const lat2 = point2.latitude * (Math.PI / 180); 
    const lon2 = point2.longitude * (Math.PI / 180);
  
    const dlat = lat2 - lat1;
    const dlon = lon2 - lon1;
  
    const a = Math.sin(dlat / 2) * Math.sin(dlat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dlon / 2) * Math.sin(dlon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Returns the distance in kilometers
  }
  
 export  function findBestRoute(buyer, sellers) {
    const visited = new Set();  // Track visited sellers
    const route = [];  // Store the route (sellers' IDs and distances)
    let currentLocation = buyer;
    let totalDistance = 0; // To keep track of the total distance covered
  
    while (visited.size < sellers.length) {
      let nearestSellerIndex = -1;
      let nearestDistance = Infinity;
      let nearestSellerId = null;
  
      // Find the nearest unvisited seller
      sellers.forEach((seller, index) => {
        if (!visited.has(index)) {
          const distance = haversineDistance(currentLocation, seller);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestSellerIndex = index;
            nearestSellerId = seller.id;
          }
        }
      });
  
      if (nearestSellerIndex !== -1) {
        visited.add(nearestSellerIndex);
        route.push({
          sellerId: nearestSellerId,
          sellerName: sellers[nearestSellerIndex].name,
          distance: nearestDistance,
        });
        totalDistance += nearestDistance;
        currentLocation = sellers[nearestSellerIndex];
      }
    }
  
    return { route, totalDistance };
  }
  

  
  