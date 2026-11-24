import React, {useMemo} from 'react';
import {Text, Float, Cloud} from '@react-three/drei';
import * as THREE from 'three';
import {getCurveY} from './curveMath';

// 3D sign post
const SignPost: React.FC<{x: number; label: string; color: string}> = ({
	x,
	label,
	color,
}) => {
	const y = getCurveY(x);
	return (
		<group position={[x, y + 0.3, -0.7]}>
			{/* Wooden post */}
			<mesh position={[0, 0.5, 0]} castShadow>
				<cylinderGeometry args={[0.04, 0.05, 1.1, 8]} />
				<meshStandardMaterial color="#78350F" />
			</mesh>
			{/* Name board */}
			<mesh position={[0, 0.95, 0]} castShadow>
				<boxGeometry args={[1.35, 0.42, 0.08]} />
				<meshStandardMaterial color={color} roughness={0.4} />
			</mesh>
			<Text
				position={[0, 0.95, 0.05]}
				fontSize={0.13}
				color="#FFFFFF"
				maxWidth={1.2}
				textAlign="center"
				anchorX="center"
				anchorY="middle"
			>
				{label}
			</Text>
		</group>
	);
};

// 3D rain particles above the Valley of Despair
const DespairRain: React.FC<{frame: number}> = ({frame}) => {
	const drops = useMemo(
		() =>
			Array.from({length: 35}, (_, i) => ({
				x: -1.3 + (i % 7) * 0.36,
				z: -0.6 + Math.floor(i / 7) * 0.3,
				offset: i * 13,
			})),
		[]
	);
	return (
		<group>
			{/* Dark drifting cloud */}
			<Cloud
				position={[-0.2, 1.8, -0.3]}
				opacity={0.75}
				speed={0}
				segments={12}
				color="#334155"
			/>
			{drops.map((d, idx) => {
				const dropY = 1.4 - ((frame * 0.12 + d.offset) % 3.2);
				return (
					<mesh key={idx} position={[d.x, dropY, d.z]}>
						<cylinderGeometry args={[0.012, 0.012, 0.25, 6]} />
						<meshBasicMaterial color="#60A5FA" transparent opacity={0.65} />
					</mesh>
				);
			})}
		</group>
	);
};

export const EnvironmentProps: React.FC<{frame: number}> = ({frame}) => {
	// Main curve track geometry
	const trackGeo = useMemo(() => {
		const pts: THREE.Vector3[] = [];
		for (let x = -6; x <= 6.5; x += 0.1) {
			pts.push(new THREE.Vector3(x, getCurveY(x), 0));
		}
		const curve = new THREE.CatmullRomCurve3(pts);
		return new THREE.TubeGeometry(curve, 180, 0.45, 20, false);
	}, []);

	// Giant books & question marks in the Valley of Despair
	const valleyBooks = [
		{x: -0.9, rot: 0.2, color: '#EF4444'},
		{x: -0.4, rot: -0.15, color: '#8B5CF6'},
		{x: 0.3, rot: 0.3, color: '#EC4899'},
	];

	// Stone steps / pillars towards the mastery peak
	const masterySteps = [1.4, 1.9, 2.4, 2.9, 3.4, 3.9, 4.4];

	return (
		<group>
			{/* Main track */}
			<mesh geometry={trackGeo} receiveShadow>
				<meshStandardMaterial color="#10B981" roughness={0.6} />
			</mesh>

			{/* Phase sign posts */}
			<SignPost x={-3.0} label="GUNUNG KEBODOHAN" color="#D97706" />
			<SignPost x={-0.2} label="LEMBAH KEPUTUSASAAN" color="#4F46E5" />
			<SignPost x={4.2} label="DATARAN KEAHLIAN" color="#059669" />

			{/* Peak 1 prop: floating crown / fake trophy */}
			<Float speed={0} floatIntensity={0}>
				<mesh
					position={[
						-3.0,
						getCurveY(-3.0) + 1.8 + Math.sin(frame * 0.08) * 0.1,
						0,
					]}
					rotation={[0, frame * 0.04, 0]}
				>
					<octahedronGeometry args={[0.25, 0]} />
					<meshStandardMaterial
						color="#FACC15"
						emissive="#EAB308"
						emissiveIntensity={0.5}
					/>
				</mesh>
			</Float>

			{/* Valley props: rain & pile of thick books */}
			<DespairRain frame={frame} />
			{valleyBooks.map((b, i) => (
				<mesh
					key={i}
					position={[b.x, getCurveY(b.x) + 0.4, 0.55]}
					rotation={[0, b.rot, 0.1]}
					castShadow
				>
					<boxGeometry args={[0.45, 0.16, 0.35]} />
					<meshStandardMaterial color={b.color} />
				</mesh>
			))}

			{/* Final climb props: crystal / light pillars of achievement */}
			{masterySteps.map((sx, idx) => (
				<mesh
					key={idx}
					position={[sx, getCurveY(sx) - 0.1, -0.55]}
					castShadow
				>
					<boxGeometry args={[0.35, 0.8, 0.35]} />
					<meshStandardMaterial color="#34D399" roughness={0.3} />
				</mesh>
			))}
		</group>
	);
};
