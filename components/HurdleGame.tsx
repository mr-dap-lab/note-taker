import React, { useRef, useEffect, useState } from 'react';
import { Play, RotateCcw, Trophy, Briefcase, X } from 'lucide-react';

/**
 * HurdleGame Component
 * 
 * An "Endless Runner" style minigame designed as an easter egg for the application.
 * It is rendered when the user has no recordings in their history.
 * 
 * TECHNICAL ARCHITECTURE FOR JUNIORS:
 * 1. HTML5 Canvas: We use the <canvas> element for rendering graphics. It's much faster
 *    for games than manipulating thousands of DOM elements (divs).
 * 2. Game Loop: We use `requestAnimationFrame` to create a loop that runs ~60 times per second.
 *    This loop handles (1) updating logic (physics, positions) and (2) drawing to the canvas.
 * 3. Refs vs State: You'll notice we use `useRef` for almost all game data (player position,
 *    obstacles). We do NOT use `useState` for these. Why?
 *    - `useState` triggers a React component re-render every time it changes.
 *    - Re-rendering the whole component 60 times a second is too slow and causes stuttering.
 *    - `useRef` allows us to mutate values instantly without alerting React, which is perfect
 *      for the internal physics loop. We only use `useState` for UI overlays like Score.
 */
export const HurdleGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // React State: Only used for UI overlays (Start Screen, Game Over, Score Display)
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [showTooltip, setShowTooltip] = useState(true);
  
  // Game Loop Refs
  // Stores the ID of the current animation frame so we can cancel it if the component unmounts
  const requestRef = useRef<number>(0);
  // Mirrors the gameState for use inside the loop (refs are accessible inside closures, state sometimes isn't fresh)
  const gameStateRef = useRef<'start' | 'playing' | 'gameover'>('start');
  // Mirrors score for the loop
  const scoreRef = useRef(0);
  
  // --- Physics & Gameplay Constants ---
  const GRAVITY = 0.5;    // Downward acceleration per frame
  const JUMP_FORCE = -9.5; // Upward velocity applied on jump
  const SPEED = 4;        // Horizontal speed of obstacles moving left
  const GROUND_HEIGHT = 20; // Height of the floor in pixels
  
  // --- Entity State ---
  // The player character (an executive with a suitcase)
  const playerRef = useRef({
    x: 50,
    y: 0, 
    width: 34,
    height: 34,
    dy: 0,            // Vertical velocity
    grounded: false,  // Is the player touching the ground?
    rotation: 0       // Visual tilt when jumping
  });
  
  // Array of active obstacles
  const obstaclesRef = useRef<Array<{
      x: number, 
      width: number, 
      height: number, 
      passed: boolean, // Has the player successfully jumped over this?
      type: 'coffee' | 'paperwork' | 'chair' | 'clock' // Visual style
  }>>([]);
  
  // Frame counter to time obstacle spawns
  const frameCountRef = useRef(0);

  /**
   * Resets all game variables to their starting state.
   */
  const resetGame = () => {
    if (canvasRef.current) {
        // Reset player to ground level
        playerRef.current = {
            x: 50,
            y: canvasRef.current.height - GROUND_HEIGHT - 34,
            width: 34,
            height: 34,
            dy: 0,
            grounded: true,
            rotation: 0
        };
        // Clear enemies
        obstaclesRef.current = [];
        frameCountRef.current = 0;
        scoreRef.current = 0;
        setScore(0);
        setShowTooltip(false);
        
        // Start the loop
        setGameState('playing');
        gameStateRef.current = 'playing';
    }
  };

  /**
   * Applies jump force to the player if they are on the ground.
   */
  const jump = () => {
    // If on start screen, first click starts the game
    if (gameStateRef.current !== 'playing') {
        resetGame();
        return;
    }
    
    // Logic: Can only jump if standing on the ground (no double jumps)
    if (playerRef.current.grounded) {
        playerRef.current.dy = JUMP_FORCE;
        playerRef.current.grounded = false;
    }
  };

  // --- Input Handling ---
  // Listen for Spacebar or Up Arrow to jump
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault(); // Prevent scrolling page
            jump();
        }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /**
   * The Main Game Loop
   * Called ~60 times per second by requestAnimationFrame.
   */
  const update = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Clear Canvas & Draw Background (Sky)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#f0f9ff'); // Light Blue
    gradient.addColorStop(1, '#ffffff'); // White
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Update Game Logic (Physics & Collisions)
    if (gameStateRef.current === 'playing') {
        frameCountRef.current++;

        // Spawn logic: Randomly add an obstacle every 100-160 frames
        if (frameCountRef.current % Math.floor(100 + Math.random() * 60) === 0) {
             const typeRoll = Math.random();
             let type: 'coffee' | 'paperwork' | 'chair' | 'clock';
             let width = 0;
             let height = 0;

             // Determine obstacle type based on probability
             if (typeRoll < 0.3) {
                 type = 'coffee';
                 width = 20;
                 height = 26;
             } else if (typeRoll < 0.55) {
                 type = 'paperwork';
                 width = 24;
                 height = 30;
             } else if (typeRoll < 0.8) {
                 type = 'chair';
                 width = 26;
                 height = 32;
             } else {
                 type = 'clock';
                 width = 30;
                 height = 30;
             }
             
             obstaclesRef.current.push({
                 x: canvas.width, // Start off-screen to the right
                 width: width,
                 height: height,
                 passed: false,
                 type: type
             });
        }

        // Iterate through obstacles backwards (so we can remove items without breaking loop index)
        for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
            let obs = obstaclesRef.current[i];
            obs.x -= SPEED; // Move left

            // Remove if off screen
            if (obs.x + obs.width < 0) {
                obstaclesRef.current.splice(i, 1);
                continue;
            }

            // Score logic: If obstacle passes behind player
            if (!obs.passed && obs.x + obs.width < playerRef.current.x) {
                scoreRef.current++;
                setScore(scoreRef.current);
                obs.passed = true;
            }

            // Collision Detection: Axis-Aligned Bounding Box (AABB)
            // We verify if the player's rectangle overlaps with the obstacle's rectangle.
            const p = playerRef.current;
            const padding = 6; // Hitbox forgiveness (makes game feel fairer)
            
            const playerBottom = p.y + p.height - padding;
            const playerRight = p.x + p.width - padding;
            const playerLeft = p.x + padding;
            const playerTop = p.y + padding;

            const obsLeft = obs.x + 2; 
            const obsRight = obs.x + obs.width - 2;
            const obsTop = canvas.height - GROUND_HEIGHT - obs.height + 2;
            
            if (playerRight > obsLeft && 
                playerLeft < obsRight && 
                playerBottom > obsTop) {
                
                // Collision happened!
                gameStateRef.current = 'gameover';
                setGameState('gameover');
                if (scoreRef.current > highScore) {
                    setHighScore(scoreRef.current);
                }
            }
        }

        // Apply Physics to Player
        const p = playerRef.current;
        p.dy += GRAVITY; // Apply gravity
        p.y += p.dy;     // Move position

        // Ground Collision Check
        if (p.y + p.height >= canvas.height - GROUND_HEIGHT) {
            p.y = canvas.height - GROUND_HEIGHT - p.height; // Snap to ground
            p.dy = 0;
            p.grounded = true;
            p.rotation = 0; 
        } else {
            // Animation: Tilt nose up when jumping, down when falling
            p.rotation = Math.min(Math.PI / 8, p.dy * 0.05);
        }
    }

    // 3. Render Objects

    // Draw Ground
    ctx.fillStyle = '#86efac';
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
    ctx.beginPath();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.moveTo(0, canvas.height - GROUND_HEIGHT);
    ctx.lineTo(canvas.width, canvas.height - GROUND_HEIGHT);
    ctx.stroke();

    // Draw Obstacles
    obstaclesRef.current.forEach(obs => {
        const y = canvas.height - GROUND_HEIGHT - obs.height;
        const centerX = obs.x + obs.width/2;
        
        // Custom drawing code for each obstacle type
        if (obs.type === 'coffee') {
            // Paper Coffee Cup
            ctx.fillStyle = '#f97316'; // orange cup
            ctx.beginPath();
            ctx.moveTo(obs.x + 3, y + 4);
            ctx.lineTo(obs.x + obs.width - 3, y + 4);
            ctx.lineTo(obs.x + obs.width - 5, y + obs.height);
            ctx.lineTo(obs.x + 5, y + obs.height);
            ctx.closePath();
            ctx.fill();
            
            // Lid
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(obs.x + 1, y + 2, obs.width - 2, 3);
            
            // Sleeve/Band
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(obs.x + 4, y + 10, obs.width - 8, 8);
        } else if (obs.type === 'paperwork') {
            // Manila Folder bottom
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(obs.x, y + 14, obs.width, obs.height - 14);
            ctx.strokeStyle = '#ca8a04';
            ctx.lineWidth = 1;
            ctx.strokeRect(obs.x, y + 14, obs.width, obs.height - 14);

            // White sheet middle
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(obs.x + 2, y + 6, obs.width - 4, 12);
            ctx.strokeStyle = '#cbd5e1';
            ctx.strokeRect(obs.x + 2, y + 6, obs.width - 4, 12);

            // White sheet top, slightly rotated
            ctx.save();
            ctx.translate(centerX, y + 6);
            ctx.rotate(0.08);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-obs.width/2 + 2, -4, obs.width - 4, 10);
            ctx.strokeStyle = '#94a3b8';
            ctx.strokeRect(-obs.width/2 + 2, -4, obs.width - 4, 10);
            
            // Text lines
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(-obs.width/2 + 5, -1, obs.width - 10, 1.5);
            ctx.fillRect(-obs.width/2 + 5, 2, obs.width - 12, 1.5);
            ctx.restore();
        } else if (obs.type === 'chair') {
            // Office Rolling Chair
            ctx.fillStyle = '#334155';
            ctx.fillRect(obs.x + 2, y + obs.height - 4, obs.width - 4, 3);
            
            // Castor wheels
            ctx.beginPath();
            ctx.arc(obs.x + 4, y + obs.height - 2, 2.5, 0, Math.PI * 2);
            ctx.arc(obs.x + obs.width - 4, y + obs.height - 2, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Chair stem
            ctx.fillRect(centerX - 2, y + 18, 4, 8);

            // Seat pad
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(obs.x, y + 14, obs.width, 4);

            // Armrests
            ctx.fillStyle = '#475569';
            ctx.fillRect(obs.x, y + 8, 3, 6);
            ctx.fillRect(obs.x + obs.width - 3, y + 8, 3, 6);

            // Back cushion
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(obs.x + 3, y, obs.width - 6, 14);
        } else if (obs.type === 'clock') {
            // Alarm/Deadline clock
            ctx.fillStyle = '#334155';
            ctx.fillRect(obs.x + 4, y + obs.height - 4, 4, 4);
            ctx.fillRect(obs.x + obs.width - 8, y + obs.height - 4, 4, 4);
            
            // Bell top pieces
            ctx.beginPath();
            ctx.arc(obs.x + 6, y + 4, 4, 0, Math.PI * 2);
            ctx.arc(obs.x + obs.width - 6, y + 4, 4, 0, Math.PI * 2);
            ctx.fill();

            // Outer ring (Urgent red)
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(centerX, y + 16, 11, 0, Math.PI * 2);
            ctx.fill();

            // Main face
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(centerX, y + 16, 8, 0, Math.PI * 2);
            ctx.fill();

            // Hands
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(centerX, y + 16);
            ctx.lineTo(centerX + 5, y + 16);
            ctx.moveTo(centerX, y + 16);
            ctx.lineTo(centerX, y + 11);
            ctx.stroke();
        }
    });

    // Draw Player (Executive with Suitcase)
    const p = playerRef.current;
    ctx.save();
    // Move canvas origin to player center to handle rotation easily
    ctx.translate(p.x + p.width/2, p.y + p.height/2);
    ctx.rotate(p.rotation);
    
    // 1. Head (centered at X=0, Y=-9, radius=5)
    ctx.fillStyle = '#fdba74'; // Peach / light skin tone
    ctx.beginPath();
    ctx.arc(0, -9, 5, 0, Math.PI * 2);
    ctx.fill();

    // 2. Hair (dark brown)
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(0, -10, 5.5, Math.PI, 0); // top half arc
    ctx.fill();

    // 3. Body / Suit Jacket (navy blue)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-6, -4, 12, 14);

    // 4. White collar and red tie
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-3, -4);
    ctx.lineTo(3, -4);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ef4444'; // Red tie
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-1.5, 4);
    ctx.lineTo(0, 6);
    ctx.lineTo(1.5, 4);
    ctx.closePath();
    ctx.fill();

    // 5. Suitcase (held in right hand, displayed to the right side)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(6, 1, 3, 6); // Arm

    ctx.fillStyle = '#78350f'; // Brown suitcase
    ctx.fillRect(7, 4, 10, 9);
    ctx.fillStyle = '#cbd5e1'; // Silver locks
    ctx.fillRect(9, 3.5, 2, 1);
    ctx.fillRect(13, 3.5, 2, 1);
    ctx.strokeStyle = '#451a03'; // Handle
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(12, 4, 2.5, Math.PI, 0);
    ctx.stroke();

    // Left arm (on the back side)
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-6, -2);
    ctx.lineTo(-9, 4);
    ctx.stroke();

    // 6. Legs & Shoes
    ctx.fillStyle = '#111827'; // Dark pants
    ctx.fillRect(-4, 10, 3, 6);
    ctx.fillRect(1, 10, 3, 6);

    ctx.fillStyle = '#000000'; // Black shoes
    ctx.fillRect(-5, 15, 4, 2);
    ctx.fillRect(1, 15, 4, 2);
    
    ctx.restore(); // Undo rotation/translation for next frame

    // Schedule next frame
    requestRef.current = requestAnimationFrame(update);
  };

  // Start the loop when component mounts
  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    // Cleanup: Stop loop when component unmounts
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return (
    <div className="mt-8 w-full max-w-md mx-auto relative group select-none">
        
        {/* Game Canvas */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-inner relative" onClick={jump}>
            <canvas 
                ref={canvasRef}
                width={400} 
                height={220} 
                className="w-full h-auto cursor-pointer block"
            />
            
            {/* Score Overlay */}
            <div className="absolute top-3 right-4 font-mono font-bold text-slate-500 text-lg bg-white/50 px-2 rounded">
                {String(score).padStart(3, '0')}
            </div>
            
            {/* High Score */}
            {highScore > 0 && (
                <div className="absolute top-3 left-4 flex items-center text-xs font-bold text-amber-500 bg-white/50 px-2 rounded">
                    <Trophy className="w-3 h-3 mr-1" />
                    HI: {highScore}
                </div>
            )}

            {/* Controls Tooltip */}
            {showTooltip && gameState === 'start' && (
                <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-20 bg-slate-900/90 text-white text-[10px] py-1.5 pl-3 pr-2 rounded-full shadow-lg flex items-center gap-2 border border-slate-700 backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
                    <span className="font-medium whitespace-nowrap">Press <kbd className="font-mono bg-slate-700 px-1 rounded mx-0.5">Space</kbd> or <kbd className="font-mono bg-slate-700 px-1 rounded mx-0.5">↑</kbd> to jump</span>
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setShowTooltip(false); 
                        }}
                        className="p-0.5 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
                        title="Dismiss"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* Start Screen Overlay */}
            {gameState === 'start' && (
                <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center p-4">
                    <p className="text-fs-primary font-bold text-xs animate-pulse mb-2 tracking-wide">Play me!</p>
                    <div className="bg-fs-primary text-white p-3 rounded-full mb-3 shadow-lg hover:scale-110 transition-transform duration-200">
                        <Play className="w-6 h-6 ml-1" />
                    </div>
                    <div className="flex items-center text-slate-800 font-bold text-sm uppercase tracking-wider mb-1">
                        <Briefcase className="w-4 h-4 mr-2 text-fs-primary" />
                        Executive Hurdles
                    </div>
                    <p className="text-slate-400 text-xs text-center px-8">
                        Jump over coffee spills, piled paperwork, rolling chairs, and tight deadlines!
                    </p>
                </div>
            )}

            {/* Game Over Overlay */}
            {gameState === 'gameover' && (
                <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] flex flex-col items-center justify-center p-4">
                    <div className="bg-white p-4 rounded-xl shadow-xl flex flex-col items-center animate-in zoom-in duration-200">
                        <p className="text-slate-800 font-bold text-lg mb-1">Missed the Meeting!</p>
                        <p className="text-slate-500 text-xs mb-3 text-center px-4">You tripped on office obstacles.</p>
                        <p className="text-fs-primary font-mono font-bold text-xl mb-4">Score: {score}</p>
                        <button 
                            onClick={(e) => { e.stopPropagation(); resetGame(); }}
                            className="flex items-center bg-fs-primary text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors shadow-md text-sm font-medium"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reschedule & Retry
                        </button>
                    </div>
                </div>
            )}
        </div>
        <p className="text-center text-[10px] text-slate-300 mt-2 font-mono">
             Waiting for the meeting to start? Skip the business hurdles.
        </p>
    </div>
  );
};