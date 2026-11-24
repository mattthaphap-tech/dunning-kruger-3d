import React, {useRef, useEffect} from 'react';
import {
	AbsoluteFill,
	Audio,
	interpolate,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {PerspectiveCamera, Environment} from '@react-three/drei';
import * as THREE from 'three';
import {getCurveY, getCurveSlopeAngle} from './curveMath';
import {CharacterModel} from './CharacterModel';
import {EnvironmentProps} from './EnvironmentProps';

// The English voiceover is 58.1s long; the video is 62s.
// The last ~4s (frame 1743 = 58.1s) are a silent outro with the end card.
const END_CARD_START_FRAME = 1743;

export const DunningKrugerScene: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();
	const camRef = useRef<THREE.PerspectiveCamera>(null);

	// 1. Character position along the 1860-frame (62s) timeline
	const charX = interpolate(
		frame,
		[0, 150, 510, 810, 1020, 1230, 1650, 1860],
		[-4.8, -4.5, -3.0, -3.0, -0.2, -0.2, 4.2, 4.6],
		{extrapolateRight: 'clamp'}
	);
	const charY = getCurveY(charX) + 0.42;
	const slopeAngle = getCurveSlopeAngle(charX);

	// 2. .glb animation clip per act (blueprint names; mapped to real clips
	// inside CharacterModel)
	const currentAnim =
		frame < 150
			? 'Idle_Smug'
			: frame < 510
				? 'Run'
				: frame < 810
					? 'Victory'
					: frame < 1100
						? 'Fall'
						: frame < 1650
							? 'Walk'
							: 'Idle_Happy';

	// 3. Multi-shot camera rig (camera position & look-at target)
	let camPos: [number, number, number] = [charX, charY + 1.5, 5];
	let lookTarget: [number, number, number] = [charX, charY + 0.8, 0];

	if (frame < 150) {
		// SHOT 1: Low-angle close-up orbit on the hook
		const angle = interpolate(frame, [0, 150], [-0.4, 0.4]);
		camPos = [
			charX + Math.sin(angle) * 2.2,
			charY + 0.6,
			Math.cos(angle) * 2.2,
		];
		lookTarget = [charX, charY + 1.1, 0];
	} else if (frame < 510) {
		// SHOT 2: Side-tracking following the run up Mount Stupid
		camPos = [charX - 0.5, charY + 1.4, 4.5];
		lookTarget = [charX + 0.6, charY + 0.9, 0];
	} else if (frame < 810) {
		// SHOT 3: Crane pull-back from the Mount Stupid peak, revealing the
		// chasm ahead
		const pull = interpolate(frame, [510, 810], [0, 1]);
		camPos = [
			charX + pull * 1.8,
			charY + 1.2 + pull * 2.2,
			3.2 + pull * 4.5,
		];
		lookTarget = [charX + pull * 1.2, charY - pull * 0.8, 0];
	} else if (frame < 1230) {
		// SHOT 4: Dramatic high-angle drop into the Valley of Despair
		camPos = [charX + 0.8, charY + 2.8, 4.2];
		lookTarget = [charX, charY + 0.4, 0];
	} else if (frame < 1650) {
		// SHOT 5: Over-the-shoulder facing the climb to mastery
		camPos = [charX - 2.1, charY + 1.5, 1.8];
		lookTarget = [charX + 2.5, charY + 1.4, -0.2];
	} else {
		// SHOT 6: Wide panoramic pan showing the whole Dunning-Kruger curve
		const panX = interpolate(frame, [1650, 1860], [2.5, 0.2]);
		camPos = [panX, 2.2, 11.5];
		lookTarget = [0, 0.5, 0];
	}

	// Update the camera look direction deterministically every frame
	useEffect(() => {
		if (camRef.current) {
			camRef.current.position.set(...camPos);
			camRef.current.lookAt(...lookTarget);
		}
	});

	// Background atmosphere colour
	const bgColor =
		frame < 810 ? '#0F172A' : frame < 1230 ? '#1E1B4B' : '#064E3B';

	// End-card fade-in over the first 0.5s of the outro
	const endCardOpacity =
		frame >= END_CARD_START_FRAME
			? interpolate(
					frame,
					[END_CARD_START_FRAME, END_CARD_START_FRAME + 15],
					[0, 1],
					{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
				)
			: 0;

	return (
		<AbsoluteFill style={{backgroundColor: bgColor}}>
			<Audio src={staticFile('voiceover-dk.mp3')} />
			<ThreeCanvas width={width} height={height}>
				<PerspectiveCamera ref={camRef} makeDefault fov={45} />
				{/* Cinematic lighting */}
				<ambientLight intensity={0.6} />
				<directionalLight position={[6, 10, 6]} intensity={1.5} castShadow />
				<Environment preset="city" />
				{/* Environment & 3D props */}
				<EnvironmentProps frame={frame} />
				{/* Cartoon .glb character */}
				<CharacterModel
					position={[charX, charY, 0]}
					rotation={[
						0,
						frame < 150 || frame >= 1650 ? 0 : Math.PI / 2,
						frame < 150 || frame >= 1650 ? 0 : -slopeAngle * 0.5,
					]}
					animationName={currentAnim}
					scale={0.85}
				/>
			</ThreeCanvas>

			{/* End card: silent outro, last ~4 seconds */}
			{frame >= END_CARD_START_FRAME ? (
				<AbsoluteFill
					style={{
						justifyContent: 'flex-end',
						alignItems: 'center',
						paddingBottom: 240,
						pointerEvents: 'none',
					}}
				>
					<div
						style={{
							opacity: endCardOpacity,
							fontFamily: 'Arial, Helvetica, sans-serif',
							fontSize: 62,
							fontWeight: 800,
							lineHeight: 1.25,
							color: '#FFFFFF',
							textAlign: 'center',
							maxWidth: 920,
							textShadow:
								'0 3px 0 rgba(0,0,0,0.55), 0 0 24px rgba(0,0,0,0.65)',
						}}
					>
						So, where on the curve are you right now?
					</div>
				</AbsoluteFill>
			) : null}
		</AbsoluteFill>
	);
};
