import React, {useLayoutEffect} from 'react';
import {
	AbsoluteFill,
	Audio,
	interpolate,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Environment} from '@react-three/drei';
import {useThree} from '@react-three/fiber';
import {getCurveY, getCurveSlopeAngle} from './curveMath';
import {CharacterModel} from './CharacterModel';
import {EnvironmentProps} from './EnvironmentProps';

// Character scale, MEASURED not guessed (measure-character.mjs):
// RobotExpressive.glb bind-pose height is 4.7914 units in GLB scene
// space (rigid body-part meshes; the RobotArmature node carries a
// 100x scale on 0.02-0.07-unit geometry). Target standing height
// ~1.1 units in the Remotion scene => 1.1 / 4.7914 = 0.2296.
// The old blueprint value 0.85 made the robot ~4.1 units tall, which
// is why no shot ever showed it whole (QC: torso fragments only).
// Feet sit at ~y 0 in GLB space, so charY = curve + 0.42 still plants
// the feet on the track tube (radius 0.45).
const CHAR_SCALE = 0.23;

// The English voiceover is 58.1s long; the video is 62s.
// The last ~4s (frame 1743 = 58.1s) are a silent outro with the end card.
const END_CARD_START_FRAME = 1743;

// Positions the default camera synchronously in the layout phase.
// The old code set the camera in a useEffect, which runs AFTER
// @remotion/three's ManualFrameRenderer advances the frame — so a still
// (one fresh frame) captured the camera at its default position (0,0,0),
// i.e. a blank frame. Video rendering masked this with a 1-frame lag.
// A layout effect runs before the advance effect, so every frame —
// including frame 0 and any still — is rendered with the right camera.
//
// Camera source: the camera MUST come from R3F's Canvas `camera` prop
// (INITIAL_CAMERA below), NOT from drei's <PerspectiveCamera makeDefault/>.
// Verified 25 Nov: drei swaps the default camera in ITS OWN layout
// effect, so a sibling rig's layout effect captures the STALE Canvas
// default camera and positions the wrong object — the rendered camera
// stays at (0,0,0) looking down -z and every still comes out blank navy.
// With the `camera` prop the default camera object is stable from
// creation, so this rig positions exactly the camera that gets rendered.
const INITIAL_CAMERA = {fov: 45, position: [0, 0, 5] as [number, number, number]};
const CameraRig: React.FC<{
	camPos: [number, number, number];
	lookTarget: [number, number, number];
}> = ({camPos, lookTarget}) => {
	const camera = useThree((s) => s.camera);
	useLayoutEffect(() => {
		camera.position.set(...camPos);
		camera.lookAt(...lookTarget);
	});
	return null;
};

export const DunningKrugerScene: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height} = useVideoConfig();

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
		// SHOT 1: Low-angle close-up on the hook.
		// ATTEMPT 3-2: camera from the PEAK side looking back
		// (charX+2.5, charY+1.8, z 4.0). Attempt 3-1 (straight front,
		// z 5.0) still hid the legs behind the track tube: on the steep
		// slope the tube's tilted cross-section puts its near surface
		// right where the robot's shins are, and a front ray grazes it.
		// From the peak side the sightline runs ALONG the slope and
		// passes well over the tube's near lip, so the legs clear it;
		// the robot reads against the low descending track + sky.
		camPos = [charX + 2.5, charY + 1.8, 4.0];
		lookTarget = [charX, charY + 0.5, 0];
	} else if (frame < 510) {
		// SHOT 2: Side-tracking following the run up Mount Stupid
		// ATTEMPT 4-1: LOW FRONT camera [charX, charY+0.8, 5.5] looking
		// slightly right/up at the robot's mid-body. The ZYX fix (see
		// CharacterModel) put the body back at z ≈ 0, so a front view
		// can work now — attempt 3's a1 failed under the OLD XYZ lean
		// (body at z ≈ -0.6, behind the tube). A LOW camera looks
		// slightly UP at the robot, so the tube's silhouette top edge
		// sits low in screen space and the feet (0.42 above the curve
		// line) clear it; the peak + GUNUNG sign stay upper-right.
		// (a2 peak-side camera kept the robot behind the peak flank
		// even with ZYX — see frame-330-a4.)
		camPos = [charX, charY + 0.8, 5.5];
		lookTarget = [charX + 0.4, charY + 0.5, 0];
	} else if (frame < 810) {
		// SHOT 3: Crane pull-back from the Mount Stupid peak, revealing the
		// chasm ahead
		const pull = interpolate(frame, [510, 810], [0, 1]);
		camPos = [
			charX + pull * 1.8,
			charY + 1.5 + pull * 2.2,
			3.2 + pull * 4.5,
		];
		lookTarget = [charX + pull * 1.2, charY + 0.5 - pull * 0.8, 0];
	} else if (frame < 1230) {
		// SHOT 4: Dramatic high-angle drop into the Valley of Despair
		// REFRAMED (v3): v2 (cam charY+3.6, z 5.5) showed the falling
		// robot's head/torso but the lower legs still grazed the valley's
		// near lip. Higher still (charY+4.2, ~38 deg down) so the whole
		// falling body clears the lip.
		camPos = [charX + 0.5, charY + 4.2, 5.0];
		lookTarget = [charX, charY + 0.3, 0];
	} else if (frame < 1650) {
		// SHOT 5: Over-the-shoulder facing the climb to mastery.
		// REFRAMED (v3): v2's camera was fine in distance, but it aimed
		// ahead-right ([charX+1.5, ...]) which pushed the robot to the
		// very left edge, half cut off — and the frame was dominated by
		// a giant golden blob (a misplaced robot HAND, see CharacterModel:
		// scene.clone() broke the SkinnedMesh skeleton; fixed with
		// SkeletonUtils.clone). Aim closer to the robot ([charX+0.8, ...])
		// so it sits at the left third, whole, with the climb ahead.
		camPos = [charX - 3.5, charY + 2.5, 3.5];
		lookTarget = [charX + 0.8, charY + 0.6, 0];
	} else {
		// SHOT 6: Wide panoramic pan showing the whole Dunning-Kruger curve
		// REFRAMED: FOV 45deg vertical, 9:16 aspect => visible width at
		// distance d is 2 x d x tan(22.5deg) x (1080/1920) = 0.466 x d.
		// The curve spans x -6.45..6.95 (13.4 units incl. tube radius),
		// so d >= 28.7 is needed. Old z=11.5 showed only ~5.4 units wide
		// (just the valley). z=32 gives ~14.9 units of width.
		const panX = interpolate(frame, [1650, 1860], [2.5, 0.2]);
		camPos = [panX, 2.2, 32];
		lookTarget = [0, 0.5, 0];
	}

	// (Camera is positioned by <CameraRig> inside the canvas — see above.)

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
			<ThreeCanvas
				width={width}
				height={height}
				camera={INITIAL_CAMERA}
			>
				<CameraRig camPos={camPos} lookTarget={lookTarget} />
				{/* Cinematic lighting */}
				<ambientLight intensity={0.6} />
				<directionalLight position={[6, 10, 6]} intensity={1.5} castShadow />
				<Environment preset="city" />
				{/* Environment & 3D props */}
				<EnvironmentProps frame={frame} />
				{/* Cartoon .glb character */}
				<CharacterModel
					position={[charX, charY, 0]}
					// Interpreted as a 'ZYX' Euler inside CharacterModel:
					// yaw to face +X first, then the slope term pitches
					// about world Z. Factor −0.25 (not the blueprint's
					// +0.5): a forward pitch lays the body along the
					// steep slope and inside the track tube — measured
					// at frame 330, the body axis sits 0.02–0.16 from
					// the centerline, i.e. inside the 0.30 tube. The
					// clips already lean forward (~11° for Running), so
					// a slight backward pitch leaves the body nearly
					// upright and clear of the tube (see CharacterModel).
					rotation={[
						0,
						frame < 150 || frame >= 1650 ? 0 : Math.PI / 2,
						frame < 150 || frame >= 1650 ? 0 : slopeAngle * 0.25,
					]}
					animationName={currentAnim}
					scale={CHAR_SCALE}
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
