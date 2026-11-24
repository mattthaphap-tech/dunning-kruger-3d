import React from 'react';
import {Composition} from 'remotion';
import {DunningKrugerScene} from './DunningKrugerScene';

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="DunningKruger3D"
				component={DunningKrugerScene}
				durationInFrames={1860}
				fps={30}
				width={1080}
				height={1920}
			/>
		</>
	);
};
