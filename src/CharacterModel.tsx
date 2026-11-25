import React, {useEffect, useMemo} from 'react';
import {useGLTF, useAnimations} from '@react-three/drei';
import {staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {clone as cloneSkinned} from 'three/examples/jsm/utils/SkeletonUtils.js';

// Blueprint animation names -> clips that actually exist in
// RobotExpressive.glb (verified: Dance, Death, Idle, Jump, No, Punch,
// Running, Sitting, Standing, ThumbsUp, Walking, WalkJump, Wave, Yes).
const ANIM_MAP: Record<string, string> = {
	Idle_Smug: 'Idle',
	Run: 'Running',
	Victory: 'Dance',
	Fall: 'Death',
	Walk: 'Walking',
	Idle_Happy: 'Wave',
};

interface CharacterProps {
	position: [number, number, number];
	rotation: [number, number, number];
	animationName: string; // Blueprint name, e.g. 'Idle_Smug', 'Run', 'Fall', 'Walk'
	scale?: number;
}

export const CharacterModel: React.FC<CharacterProps> = ({
	position,
	rotation,
	animationName,
	scale = 1,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	// Load the .glb file from the public/ folder
	const {scene, animations} = useGLTF(staticFile('character.glb'));
	// Clone with SkeletonUtils, NOT scene.clone(). A plain Object3D clone
	// does NOT re-bind SkinnedMesh skeletons: the robot's hands (the only
	// SkinnedMeshes) stay at the world origin, rendered ~100x too big by
	// the armature's 100x scale — they showed up as a giant golden blob
	// in shot 5 and two stray golden figures in the valley in shot 6
	// (verified 25 Nov: hand bboxes measured at (0,0,0) in the clone).
	// SkeletonUtils.clone re-binds the skeleton so the hands follow the
	// wrists like every other body part.
	const clonedScene = useMemo(() => cloneSkinned(scene), [scene]);
	const {actions, mixer} = useAnimations(animations, clonedScene);

	useEffect(() => {
		// Stop all previous actions
		Object.values(actions).forEach((action) => action?.stop());
		// Find the matching animation clip (via the verified mapping),
		// or fall back to the first clip in the .glb
		const clipName = ANIM_MAP[animationName] ?? animationName;
		const targetAction =
			actions[clipName] || Object.values(actions)[0];
		if (targetAction) {
			targetAction.reset().play();
		}
	}, [actions, animationName]);

	// Deterministic sync of the 3D skeletal animation to the Remotion frame
	// number. Never use useFrame((_, delta) => mixer.update(delta)) here:
	// Remotion renders frames in parallel and out of order.
	useEffect(() => {
		if (mixer) {
			mixer.setTime(frame / fps);
		}
	}, [frame, fps, mixer]);

	// Rotation order 'ZYX' (attempt 4, 25 Nov): the scene passes
	// [0, π/2, slopeAngle*0.25] so the robot yaws to face +X and the
	// slope term pitches about world Z. With the default 'XYZ' order
	// the matrix is Rx*Ry*Rz, so the slope term is applied FIRST in
	// the robot's local frame — about its forward (+Z) axis — which
	// rolls it SIDEWAYS; after the yaw that lean points toward world
	// -Z, i.e. the robot leans BACKWARD away from the camera, behind
	// the track plane (measured 25 Nov: bbox z to −0.86, head z ≈ −0.5;
	// that's why shot 2 hid the robot behind the peak no matter where
	// the camera went). With 'ZYX' the matrix is Rz*Ry*Rx: yaw first,
	// then the slope term is a pitch about world Z.
	//
	// The slope factor is −0.25, NOT the blueprint's +0.5 (attempt 4,
	// measured): a FORWARD slope pitch lays the body almost parallel
	// to the steep 68° slope of shot 2, and the body axis converges
	// ONTO the track centerline — probe at frame 330 (Running, pitch
	// 0.5) found the feet-to-head axis 0.02–0.16 from the centerline
	// along its whole length, i.e. the body is threaded INSIDE the
	// 0.30-radius tube, so no camera can show it. The Running clip
	// itself already leans the body ~11° forward (measured: effective
	// lean 45.4° with pitch 34.1°), so a slight BACKWARD pitch
	// (factor −0.25, +17° at the steepest slope) cancels the clip
	// lean: the body stands nearly upright, ~0.47/unit clear of the
	// centerline, outside the tube from the knees up. Only the feet
	// stay inside the tube (they sit 0.42 above the curve line, which
	// is 0.16 perpendicular on a 68° slope) — the legs read as
	// emerging from the road surface, as in the passing shots.
	const euler = useMemo(
		() => new THREE.Euler(rotation[0], rotation[1], rotation[2], 'ZYX'),
		[rotation]
	);

	return (
		<primitive
			object={clonedScene}
			position={position}
			rotation={euler}
			scale={scale}
		/>
	);
};

useGLTF.preload(staticFile('character.glb'));
