import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import WaveParticles from './components/WaveParticles';

// Fix for missing R3F types in JSX.IntrinsicElements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      color: any;
    }
  }
}

const App: React.FC = () => {
  return (
    <div className="relative w-full h-screen bg-black overflow-hidden text-white font-sans selection:bg-white selection:text-black">
      
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 5, 12], fov: 45 }}
          dpr={[1, 2]} // Optimize pixel ratio for performance
          gl={{ antialias: false, alpha: false }} // Explicitly disable alpha on gl for performance since bg is black
        >
          <color attach="background" args={['#000000']} />
          
          <Suspense fallback={null}>
            <WaveParticles />
          </Suspense>
          
          {/* Controls to let user look around, but restricted for a curated view */}
          <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 3}
            rotateSpeed={0.5}
          />
        </Canvas>
      </div>

      {/* UI Overlay Layer */}
      <div className="relative z-10 pointer-events-none flex flex-col justify-end h-full p-8 md:p-16">
        {/* Footer */}
        <footer className="pb-8">
          <div className="text-xs font-mono text-gray-500">
            <span>COORDINATES: 42.00 N, 14.00 E</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;