import React, {useEffect, useMemo} from 'react';
import {useGLTF, useAnimations} from '@react-three/drei';
import {staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';

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
	const clonedScene = useMemo(() => scene.clone(), [scene]);
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

	return (
		<primitive
			object={clonedScene}
			position={position}
			rotation={rotation}
			scale={scale}
		/>
	);
};

useGLTF.preload(staticFile('character.glb'));
