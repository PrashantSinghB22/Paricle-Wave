import React, { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Fix for missing R3F types in JSX.IntrinsicElements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      points: any;
      planeGeometry: any;
      shaderMaterial: any;
    }
  }
}

// Vertex Shader: Handles the wave movement and interaction logic
const vertexShader = `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uNoiseDensity;
  uniform float uNoiseStrength;
  uniform float uFrequency;
  uniform float uAmplitude;
  uniform vec2 uMouse;     // Normalized mouse position (-1 to 1)
  uniform float uHoverState; // 0.0 to 1.0 based on hover interaction
  
  varying vec2 vUv;
  varying float vElevation;
  varying float vDistance;

  // Simple pseudo-random function
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    vUv = uv;
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    // Base Wave Animation
    // We combine two sine waves for a more organic flowing surface
    float elevation = sin(modelPosition.x * uFrequency + uTime * uSpeed) * uAmplitude;
    elevation += sin(modelPosition.y * uFrequency * 0.5 + uTime * uSpeed * 0.5) * uAmplitude * 0.5;

    // Interaction Logic
    // Calculate distance from this vertex to the mouse position (projected roughly to plane)
    // We assume the plane is around z=0, so we use x/y coords.
    // The plane is large, so we scale mouse coords to match world coords roughly.
    vec2 interactionVec = uMouse * vec2(15.0, 10.0) - modelPosition.xy;
    float dist = length(interactionVec);
    
    // Create a localized ripple/bulge effect where the mouse is
    // uHoverState smoothly transitions from 0 to 1
    float influence = max(0.0, 1.0 - dist / 3.0); // 3.0 is the radius of influence
    float distortion = sin(dist * 3.0 - uTime * 5.0) * influence * 2.0 * uHoverState;
    
    // Apply interaction distortion on top of base wave
    modelPosition.z += elevation + distortion;
    
    // Vary point size based on depth for "bokeh" feel
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    
    gl_Position = projectedPosition;
    
    // Size attenuation: Points further away appear smaller
    gl_PointSize = 3.0 * (15.0 / -viewPosition.z);
    
    // Pass values to fragment shader
    vElevation = modelPosition.z;
    vDistance = dist; // Pass distance for coloring if needed
  }
`;

// Fragment Shader: Handles the color and shape of points
const fragmentShader = `
  uniform vec3 uColor;
  
  varying float vElevation;
  varying float vDistance;

  void main() {
    // Circular particle shape
    // gl_PointCoord is (0,0) to (1,1) within the point
    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
    if (distanceToCenter > 0.5) discard;

    // Optional: Make particles fade slightly based on their height (elevation)
    // deeper parts are darker
    float alpha = 0.8 + vElevation * 0.1; 
    
    gl_FragColor = vec4(uColor, alpha);
  }
`;

interface WaveParticlesProps {
  color?: string;
}

const WaveParticles: React.FC<WaveParticlesProps> = ({ color = '#ffffff' }) => {
  // Reference to the shader material to update uniforms
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Points>(null);
  
  // Track mouse state
  const { viewport } = useThree();
  const [hovered, setHovered] = useState(false);
  
  // Uniforms object - useMemo ensures we don't recreate it every render
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uSpeed: { value: 0.8 },
      uNoiseDensity: { value: 1.5 },
      uNoiseStrength: { value: 0.2 },
      uFrequency: { value: 0.5 },
      uAmplitude: { value: 1.2 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uHoverState: { value: 0.0 },
    }),
    [color]
  );

  // Animation Loop
  useFrame((state) => {
    if (!materialRef.current) return;

    // Update time
    materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();

    // Smoothly interpolate hover state
    const targetHover = hovered ? 1.0 : 0.0;
    materialRef.current.uniforms.uHoverState.value = THREE.MathUtils.lerp(
      materialRef.current.uniforms.uHoverState.value,
      targetHover,
      0.1
    );

    // Update mouse position (normalized -1 to 1) if hovered
    if (hovered) {
        // pointer is normalized -1 to 1 by default in R3F
        materialRef.current.uniforms.uMouse.value.set(
            state.pointer.x,
            state.pointer.y
        );
    }
  });

  return (
    <points
      ref={meshRef}
      rotation={[-Math.PI / 3, 0, 0]} // Rotate to give it a floor/curtain perspective
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onPointerMove={(e) => {
        // We let the useFrame loop handle the actual uniform update for smoothness,
        // but the event ensures we capture the interaction.
        setHovered(true);
      }}
    >
      {/* 
        PlaneGeometry gives us a nice grid of vertices.
        Args: [width, height, segmentsX, segmentsY] 
        Higher segments = more particles 
      */}
      <planeGeometry args={[35, 20, 128, 128]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

export default WaveParticles;