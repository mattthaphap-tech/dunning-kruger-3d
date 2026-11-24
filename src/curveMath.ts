// Central curve math for the Dunning-Kruger journey.
// Used by the character path, the track geometry and the props so that
// everything sits precisely on the same 3D road.
export const getCurveY = (x: number): number => {
	// Peak 1: Mount Stupid at x = -3.0
	const mountStupid = 3.2 * Math.exp(-Math.pow((x + 3.0) / 1.1, 2));
	// Valley: Valley of Despair at x = -0.2
	const valley = -2.2 * Math.exp(-Math.pow((x + 0.2) / 1.2, 2));
	// Gentle climb: Slope of Enlightenment towards the high plateau at x > 2.5
	const mastery = 2.6 / (1 + Math.exp(-(x - 2.2) * 1.1));
	return mountStupid + valley + mastery - 0.5;
};

// Slope angle (pitch) so the character's feet follow the climb/descent.
export const getCurveSlopeAngle = (x: number): number => {
	const delta = 0.05;
	const dy = getCurveY(x + delta) - getCurveY(x - delta);
	return Math.atan2(dy, delta * 2);
};
